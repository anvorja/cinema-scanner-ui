import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { LOGIN_URL, validateTicket } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

const QR_REGION_ID = 'cinema-qr-reader';

// ── Audio + vibration feedback ─────────────────────────────────────────────────

function playBeep(ok: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    if (ok) {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(); osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    }
  } catch { /* browser without AudioContext */ }
  try {
    navigator.vibrate?.(ok ? [80] : [100, 60, 100]);
  } catch { /* ignore */ }
}

// ── Result display ─────────────────────────────────────────────────────────────
// Un veredicto por código HTTP. Se lee a distancia: panel de color, título enorme,
// datos clave en cifras grandes. El color nunca va solo: cada estado lleva icono y texto.

const ICON_PATHS = {
  ok: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  warn: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
  bad: 'm9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  lock: 'M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z',
};

function ValidationResult({ result, onReset }) {
  if (!result) return null;

  const isValid     = result.ok;                              // 2xx: quedó marcada como usada
  const isUsed      = !result.ok && result.status === 409;    // ya usada o cancelada
  const isInvalid   = !result.ok && result.status === 404;    // ticket_code inexistente
  const isForbidden = !result.ok && result.status === 403;    // sin permiso

  let panel, tone, icon, title, subtitle;
  if (isValid) {
    panel = 'bg-board-okbg border-board-ok'; tone = 'text-board-okink'; icon = ICON_PATHS.ok;
    title = 'Boleta válida';
    subtitle = 'Acceso autorizado. Boleta marcada como utilizada.';
  } else if (isUsed) {
    panel = 'bg-board-panel2 border-board-amber'; tone = 'text-board-amberink'; icon = ICON_PATHS.warn;
    title = 'Ya utilizada';
    subtitle = result.detail || 'Esta boleta ya fue escaneada anteriormente.';
  } else if (isInvalid) {
    panel = 'bg-board-alarmbg border-board-alarm'; tone = 'text-board-alarmink'; icon = ICON_PATHS.bad;
    title = 'Boleta no encontrada';
    subtitle = 'El código QR no corresponde a ninguna boleta registrada.';
  } else if (isForbidden) {
    panel = 'bg-board-panel2 border-board-line2'; tone = 'text-board-ink2'; icon = ICON_PATHS.lock;
    title = 'Sin permiso';
    subtitle = 'Tu cuenta no tiene permisos para validar boletas.';
  } else {
    panel = 'bg-board-alarmbg border-board-alarm'; tone = 'text-board-alarmink'; icon = ICON_PATHS.bad;
    title = 'Error';
    subtitle = result.detail || 'No se pudo validar la boleta.';
  }

  const details = isValid && result.data ? [
    result.data.movie_title  && { label: 'Película', value: result.data.movie_title },
    result.data.showtime     && { label: 'Función',  value: result.data.showtime },
    result.data.room         && { label: 'Sala',     value: result.data.room },
    result.data.seat_number  && { label: 'Asiento',  value: result.data.seat_number },
    result.data.ticket_code  && { label: 'Código',   value: result.data.ticket_code },
  ].filter(Boolean) : [];

  return (
    <div role="alert" className={`rounded-[4px] border-2 ${panel} p-6 flex flex-col gap-4`}>
      <div className="flex items-center gap-4">
        <svg className={`w-16 h-16 shrink-0 ${tone}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
        <h2 className={`font-board text-5xl font-bold leading-[0.95] tracking-wide ${tone}`}>{title}</h2>
      </div>
      {subtitle && <p className="text-board-ink2 text-lg leading-snug">{subtitle}</p>}

      {details.length > 0 && (
        <dl className="border-t border-board-line2 divide-y divide-board-line">
          {details.map(({ label, value }) => (
            <div key={label} className="flex items-baseline justify-between gap-4 py-3">
              <dt className="font-data text-[11px] uppercase text-board-mute">{label}</dt>
              <dd className="font-data text-xl font-bold text-board-ink text-right break-words">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <button
        onClick={onReset}
        className="w-full min-h-[56px] bg-board-amber hover:bg-board-amberpress active:translate-y-px
                   text-board-onamber font-board text-xl font-bold tracking-[0.08em] uppercase rounded-[3px]"
      >
        Escanear siguiente
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ScannerPage() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('scanner_user') || '{}');

  const scannerRef    = useRef(null);
  const detectedRef   = useRef(false);
  const lastScanRef   = useRef(0);

  const [hasCam,         setHasCam]         = useState(false);
  const [camState,       setCamState]       = useState('idle'); // idle | starting | active | error
  const [camError,       setCamError]       = useState('');
  const [wantStart,      setWantStart]      = useState(false);
  const [manualCode,     setManualCode]     = useState('');
  const [validating,     setValidating]     = useState(false);
  const [result,         setResult]         = useState(null);
  const [resetSecs,      setResetSecs]      = useState<number | null>(null);
  const resetTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const [stats,          setStats]          = useState({ valid: 0, rejected: 0 });

  // Detect camera presence
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices()
      .then(devices => setHasCam(devices.some(d => d.kind === 'videoinput')))
      .catch(() => setHasCam(false));
  }, []);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setCamState('idle');
  }, []);

  // Validate a raw code string (from camera or manual input)
  const validate = useCallback(async (code) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    const now = Date.now();
    if (now - lastScanRef.current < 1000) return;
    lastScanRef.current = now;
    setValidating(true);
    await stopCamera();
    const res = await validateTicket(trimmed);
    playBeep(res.ok);
    setResult(res);
    setStats(s => res.ok ? { ...s, valid: s.valid + 1 } : { ...s, rejected: s.rejected + 1 });
    setValidating(false);
    // Start 3-second auto-reset countdown
    const TOTAL = 3;
    setResetSecs(TOTAL);
    let remaining = TOTAL;
    resetTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(resetTimerRef.current!);
        resetTimerRef.current = null;
        setResetSecs(null);
        setResult(null);
        setManualCode('');
        detectedRef.current = false;
        setWantStart(true);
      } else {
        setResetSecs(remaining);
      }
    }, 1000);
  }, [stopCamera]);

  // Signal-based camera start (renders div first, then starts scanner in effect)
  useEffect(() => {
    if (!wantStart) return;
    setWantStart(false);

    const el = document.getElementById(QR_REGION_ID);
    if (!el) { setCamError('Error interno al montar el escáner.'); setCamState('error'); return; }

    detectedRef.current = false;
    setCamState('starting');
    setCamError('');

    const scanner = new Html5Qrcode(QR_REGION_ID, {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false,
    });
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
      (decodedText) => {
        if (detectedRef.current || validating) return;
        detectedRef.current = true;
        void validate(decodedText);
      },
      () => { /* frame without QR — ignore */ }
    )
      .then(() => setCamState('active'))
      .catch((err) => {
        scannerRef.current = null;
        const msg = String(err?.message || err);
        if (/permission|notallowed/i.test(msg)) {
          setCamError('Permiso de cámara denegado. Habilítalo en la configuración del navegador.');
        } else if (/notfound|no camera|devicenotfound/i.test(msg)) {
          setCamError('No se encontró cámara en este dispositivo.');
        } else {
          setCamError('No se pudo iniciar la cámara. Recarga la página.');
        }
        setCamState('error');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantStart]);

  // Stop camera on unmount
  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  // Auto-logout after 30 min of inactivity
  useEffect(() => {
    const TIMEOUT = 30 * 60 * 1000;
    let timer = setTimeout(() => {
      sessionStorage.removeItem('scanner_token');
      sessionStorage.removeItem('scanner_user');
      window.location.replace(LOGIN_URL);
    }, TIMEOUT);
    const reset = () => { clearTimeout(timer); timer = setTimeout(() => {
      sessionStorage.removeItem('scanner_token');
      sessionStorage.removeItem('scanner_user');
      window.location.replace(LOGIN_URL);
    }, TIMEOUT); };
    const events = ['pointerdown', 'keydown', 'touchstart'] as const;
    events.forEach(e => document.addEventListener(e, reset));
    return () => { clearTimeout(timer); events.forEach(e => document.removeEventListener(e, reset)); };
  }, []);

  // Keep screen on while the scanner is open
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const acquire = () => (navigator as any).wakeLock.request('screen')
      .then((l: WakeLockSentinel) => { lock = l; })
      .catch(() => {});
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      document.removeEventListener('visibilitychange', acquire);
      lock?.release();
    };
  }, []);

  const handleReset = (restartCam = true) => {
    if (resetTimerRef.current) {
      clearInterval(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setResetSecs(null);
    setResult(null);
    setManualCode('');
    detectedRef.current = false;
    if (restartCam && hasCam) setWantStart(true);
  };

  const handleLogout = () => {
    stopCamera();
    sessionStorage.removeItem('scanner_token');
    sessionStorage.removeItem('scanner_user');
    navigate('/login', { replace: true });
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) validate(manualCode);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const btnPrimary = 'w-full min-h-[56px] bg-board-amber hover:bg-board-amberpress active:translate-y-px text-board-onamber font-board text-xl font-bold tracking-[0.08em] uppercase rounded-[3px] disabled:opacity-40 disabled:cursor-not-allowed';
  const btnGhost = 'w-full min-h-[48px] border border-board-line2 hover:border-board-ink text-board-ink2 hover:text-board-ink font-board text-lg font-semibold tracking-[0.06em] uppercase rounded-[3px]';

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between gap-2 px-3 py-2 bg-board-ground border-b border-board-line">
        <span className="font-board text-2xl font-bold tracking-[0.08em]">
          CINEMA<span className="text-board-amberink">PLUS</span>
        </span>

        <div className="flex items-center gap-2">
          {/* Contadores de la sesión */}
          <div className="flex items-center gap-1.5 font-data text-sm font-bold" aria-label={`Válidas ${stats.valid}, rechazadas ${stats.rejected}`}>
            <span className="border border-board-ok/60 text-board-okink px-2 py-1 rounded-[2px] flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              {stats.valid}
            </span>
            <span className="border border-board-alarm/60 text-board-alarmink px-2 py-1 rounded-[2px] flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              {stats.rejected}
            </span>
          </div>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="h-11 px-3 border border-board-line2 hover:border-board-ink text-board-ink2 hover:text-board-ink
                       font-board text-base font-semibold tracking-[0.06em] uppercase rounded-[3px]"
            title={user.email || 'Salir'}
          >
            Salir
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-stretch justify-start px-4 py-5 max-w-md mx-auto w-full gap-5">

        <h1 className="font-board text-4xl font-bold tracking-[0.06em]">Validar boleta</h1>

        {/* Validation result */}
        {result && !validating && (
          <>
            <ValidationResult result={result} onReset={handleReset} />
            {resetSecs !== null && (
              <div className="w-full space-y-1">
                <div className="h-2 w-full bg-board-panel2 overflow-hidden">
                  <div
                    className="h-full bg-board-amber transition-all duration-1000 ease-linear"
                    style={{ width: `${(resetSecs / 3) * 100}%` }}
                  />
                </div>
                <p className="font-data text-xs text-board-mute" aria-live="polite">
                  Siguiente escaneo en {resetSecs}s…
                </p>
              </div>
            )}
          </>
        )}

        {/* Validando */}
        {validating && (
          <div className="flex flex-col items-start gap-4 py-10" role="status">
            <span className="flex items-end gap-1.5" aria-hidden="true">
              <span className="w-3 h-8 bg-board-amber animate-pulse" />
              <span className="w-3 h-8 bg-board-amber animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-3 h-8 bg-board-amber animate-pulse" style={{ animationDelay: '300ms' }} />
            </span>
            <p className="font-board text-2xl font-semibold tracking-wide text-board-ink2">Validando boleta…</p>
          </div>
        )}

        {/* Escáner — visible cuando no hay resultado ni validación en curso */}
        {!result && !validating && (
          <>
            {hasCam && (
              <div className="w-full">
                {/* Visor: el div existe siempre porque html5-qrcode se adjunta a él */}
                <div className="relative w-full overflow-hidden bg-board-panel border border-board-line rounded-[4px]"
                     style={{ minHeight: camState === 'idle' || camState === 'error' ? 'auto' : '300px' }}>

                  <div
                    id={QR_REGION_ID}
                    className={camState === 'active' || camState === 'starting' ? 'w-full' : 'hidden'}
                  />

                  {/* Esquinas guía cuando la cámara está activa */}
                  {camState === 'active' && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="relative w-56 h-56">
                        {[
                          'top-0 left-0 border-t-4 border-l-4',
                          'top-0 right-0 border-t-4 border-r-4',
                          'bottom-0 left-0 border-b-4 border-l-4',
                          'bottom-0 right-0 border-b-4 border-r-4',
                        ].map((cls, i) => (
                          <div key={i} className={`absolute w-10 h-10 border-board-amber ${cls}`} />
                        ))}
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-board-amber/80 animate-pulse" />
                      </div>
                    </div>
                  )}

                  {/* Reposo / error */}
                  {(camState === 'idle' || camState === 'error') && (
                    <div className="flex flex-col items-stretch gap-4 py-8 px-4">
                      {camState === 'error' ? (
                        <div className="flex items-start gap-3 text-board-alarmink" role="alert">
                          <svg className="w-8 h-8 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
                              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                          </svg>
                          <p className="text-base leading-snug">{camError}</p>
                        </div>
                      ) : (
                        <p className="text-board-ink2 text-base">Apunta la cámara al código QR de la boleta.</p>
                      )}
                      <button onClick={() => setWantStart(true)} className={btnPrimary}>
                        {camState === 'error' ? 'Reintentar cámara' : 'Abrir cámara'}
                      </button>
                    </div>
                  )}

                  {/* Iniciando */}
                  {camState === 'starting' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-board-ground/70" role="status">
                      <span className="flex items-end gap-1.5" aria-hidden="true">
                        <span className="w-3 h-8 bg-board-amber animate-pulse" />
                        <span className="w-3 h-8 bg-board-amber animate-pulse" style={{ animationDelay: '150ms' }} />
                        <span className="w-3 h-8 bg-board-amber animate-pulse" style={{ animationDelay: '300ms' }} />
                      </span>
                    </div>
                  )}
                </div>

                {camState === 'active' && (
                  <button onClick={() => stopCamera()} className={`mt-3 ${btnGhost}`}>
                    Detener cámara
                  </button>
                )}
              </div>
            )}

            {/* Separador */}
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-board-line" />
              <span className="font-data text-[11px] font-bold uppercase text-board-mute">
                {hasCam ? 'o ingresa el código' : 'Ingresa el código'}
              </span>
              <div className="flex-1 h-px bg-board-line" />
            </div>

            {/* Código manual */}
            <form onSubmit={handleManualSubmit} className="w-full space-y-3">
              <label htmlFor="codigo" className="sr-only">Código de la boleta</label>
              <input
                id="codigo"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="CINE-XXXXXXXX"
                autoCapitalize="characters"
                autoComplete="off"
                className="w-full min-h-[56px] px-4 rounded-[3px] bg-board-panel border border-board-line2
                           text-board-ink placeholder-board-mute font-data text-lg font-bold tracking-wider
                           focus:outline-none focus:border-board-amber"
              />
              <button type="submit" disabled={!manualCode.trim()} className={btnPrimary}>
                Validar código
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
