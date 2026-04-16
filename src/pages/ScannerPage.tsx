import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { validateTicket } from '../services/api';

const QR_REGION_ID = 'cinema-qr-reader';

// ── Result display ─────────────────────────────────────────────────────────────

function ValidationResult({ result, onReset }) {
  if (!result) return null;

  // HTTP 2xx → ticket just validated (status changed to "used")
  const isValid     = result.ok;
  // 409 → already used or cancelled
  const isUsed      = !result.ok && result.status === 409;
  // 404 → ticket_code not found
  const isInvalid   = !result.ok && result.status === 404;
  // 403 → no permission
  const isForbidden = !result.ok && result.status === 403;

  let bg, border, icon, title, subtitle;

  if (isValid) {
    bg = 'bg-green-900/60';
    border = 'border-green-500';
    icon = (
      <svg className="w-16 h-16 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
    title = 'BOLETA VÁLIDA';
    subtitle = 'Acceso autorizado. Boleta marcada como utilizada.';
  } else if (isUsed) {
    bg = 'bg-orange-900/60';
    border = 'border-orange-500';
    icon = (
      <svg className="w-16 h-16 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    );
    title = 'YA UTILIZADA';
    subtitle = result.detail || 'Esta boleta ya fue escaneada anteriormente.';
  } else if (isInvalid) {
    bg = 'bg-red-900/60';
    border = 'border-red-500';
    icon = (
      <svg className="w-16 h-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
    title = 'BOLETA NO ENCONTRADA';
    subtitle = 'El código QR no corresponde a ninguna boleta registrada.';
  } else if (isForbidden) {
    bg = 'bg-slate-800';
    border = 'border-slate-600';
    icon = (
      <svg className="w-16 h-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    );
    title = 'SIN PERMISO';
    subtitle = 'Tu cuenta no tiene permisos para validar boletas.';
  } else {
    bg = 'bg-red-900/60';
    border = 'border-red-500';
    icon = (
      <svg className="w-16 h-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
    title = 'ERROR';
    subtitle = result.detail || 'No se pudo validar la boleta.';
  }

  // Ticket details from TicketResponse: { ticket_code, seat_number, status, created_at }
  const details = isValid && result.data ? [
    result.data.ticket_code && { label: 'Código',   value: result.data.ticket_code },
    result.data.seat_number && { label: 'Asiento',  value: result.data.seat_number },
  ].filter(Boolean) : [];

  return (
    <div className={`rounded-2xl border-2 ${bg} ${border} p-8 flex flex-col items-center gap-4 text-center`}>
      {icon}
      <h2 className="text-2xl font-black tracking-widest">{title}</h2>
      {subtitle && <p className="text-slate-300 text-sm">{subtitle}</p>}

      {details.length > 0 && (
        <div className="w-full mt-2 divide-y divide-white/10 text-left">
          {details.map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2 text-sm">
              <span className="text-slate-400">{label}</span>
              <span className="text-white font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onReset}
        className="mt-4 w-full py-3 bg-slate-700 hover:bg-slate-600 active:bg-slate-800
                   rounded-xl font-semibold text-sm transition-colors"
      >
        Escanear siguiente
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ScannerPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('scanner_user') || '{}');

  const scannerRef  = useRef(null);
  const detectedRef = useRef(false);

  const [hasCam,         setHasCam]         = useState(false);
  const [camState,       setCamState]       = useState('idle'); // idle | starting | active | error
  const [camError,       setCamError]       = useState('');
  const [wantStart,      setWantStart]      = useState(false);
  const [manualCode,     setManualCode]     = useState('');
  const [validating,     setValidating]     = useState(false);
  const [result,         setResult]         = useState(null);

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
    setValidating(true);
    await stopCamera();
    const res = await validateTicket(trimmed);
    setResult(res);
    setValidating(false);
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

  const handleReset = () => {
    setResult(null);
    setManualCode('');
    detectedRef.current = false;
  };

  const handleLogout = () => {
    stopCamera();
    localStorage.removeItem('scanner_token');
    localStorage.removeItem('scanner_user');
    navigate('/login', { replace: true });
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) validate(manualCode);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-800/80 backdrop-blur border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5Z" />
            </svg>
          </div>
          <span className="font-bold text-white text-sm">Cinema Scanner</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-xs hidden sm:block">{user.email}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-white border border-slate-700
                       hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 py-6 max-w-md mx-auto w-full gap-5">

        <h1 className="text-xl font-bold text-white text-center">Validar boleta</h1>

        {/* Validation result */}
        {result && !validating && (
          <ValidationResult result={result} onReset={handleReset} />
        )}

        {/* Loading spinner */}
        {validating && (
          <div className="flex flex-col items-center gap-4 py-10">
            <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-300 text-sm">Validando boleta...</p>
          </div>
        )}

        {/* Scanner UI — shown when no result and not validating */}
        {!result && !validating && (
          <>
            {/* Camera section */}
            {hasCam && (
              <div className="w-full">
                {/* Camera viewport — always rendered so the div exists for html5-qrcode */}
                <div className="relative w-full rounded-2xl overflow-hidden bg-slate-800 border border-slate-700"
                     style={{ minHeight: camState === 'idle' || camState === 'error' ? 'auto' : '300px' }}>

                  {/* The div html5-qrcode attaches to */}
                  <div
                    id={QR_REGION_ID}
                    className={camState === 'active' || camState === 'starting' ? 'w-full' : 'hidden'}
                  />

                  {/* Overlay corner guides when active */}
                  {camState === 'active' && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="relative w-56 h-56">
                        {/* Corner brackets */}
                        {[
                          'top-0 left-0 border-t-2 border-l-2 rounded-tl-lg',
                          'top-0 right-0 border-t-2 border-r-2 rounded-tr-lg',
                          'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg',
                          'bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg',
                        ].map((cls, i) => (
                          <div key={i} className={`absolute w-8 h-8 border-blue-400 ${cls}`} />
                        ))}
                        {/* Scan line */}
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-400/70 animate-pulse" />
                      </div>
                    </div>
                  )}

                  {/* Idle / error placeholder */}
                  {(camState === 'idle' || camState === 'error') && (
                    <div className="flex flex-col items-center gap-4 py-10 px-4">
                      {camState === 'error' ? (
                        <>
                          <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                          </svg>
                          <p className="text-red-300 text-sm text-center">{camError}</p>
                        </>
                      ) : (
                        <svg className="w-12 h-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                        </svg>
                      )}
                      <button
                        onClick={() => setWantStart(true)}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700
                                   text-white font-semibold rounded-xl text-sm transition-colors"
                      >
                        {camState === 'error' ? 'Reintentar cámara' : 'Abrir cámara'}
                      </button>
                    </div>
                  )}

                  {/* Starting state */}
                  {camState === 'starting' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70">
                      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Stop button */}
                {camState === 'active' && (
                  <button
                    onClick={() => stopCamera()}
                    className="mt-3 w-full py-2.5 border border-slate-600 hover:border-slate-400
                               text-slate-300 hover:text-white rounded-xl text-sm transition-colors"
                  >
                    Detener cámara
                  </button>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-slate-500 text-xs font-semibold tracking-widest uppercase">
                {hasCam ? 'o ingresa el código' : 'Ingresa el código'}
              </span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            {/* Manual input */}
            <form onSubmit={handleManualSubmit} className="w-full space-y-3">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="CINE-XXXXXXXX"
                className="w-full px-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700
                           text-white placeholder-slate-500 font-mono text-sm tracking-wider
                           focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700
                           disabled:opacity-40 disabled:cursor-not-allowed
                           text-white font-bold rounded-xl text-sm transition-colors"
              >
                Validar código
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
