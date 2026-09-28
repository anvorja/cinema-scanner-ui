import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import FlapText from '../components/FlapText';
import ThemeToggle from '../components/ThemeToggle';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);

      // Only allow scanner (or admin) accounts
      const role = data.user?.role;
      if (role !== 'scanner' && role !== 'admin') {
        setError('Esta cuenta no tiene permisos de escaneo.');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('scanner_token', data.access_token);
      sessionStorage.setItem('scanner_user', JSON.stringify(data.user));
      navigate('/', { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail || 'Credenciales incorrectas.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const field = 'w-full min-h-[52px] px-4 py-3 rounded-[3px] bg-board-panel border border-board-line2 text-board-ink placeholder-board-mute focus:outline-none focus:border-board-amber text-base';
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="absolute right-3 top-3"><ThemeToggle /></div>
      <div className="w-full max-w-sm">

        <div className="mb-10">
          <p className="font-board text-4xl font-bold tracking-[0.08em]">CINEMA<span className="text-board-amberink">PLUS</span></p>
          <h1 className="mt-4">
            <FlapText text="Escáner" size="clamp(2.5rem, 12vw, 3.5rem)" />
          </h1>
          <p className="mt-3 text-board-ink2 text-base">Validación de boletas en la entrada</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block font-data text-[11px] font-bold uppercase text-board-mute mb-1.5">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="empleado@cinema.com"
              className={field}
            />
          </div>

          <div>
            <label htmlFor="password" className="block font-data text-[11px] font-bold uppercase text-board-mute mb-1.5">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={field}
            />
          </div>

          {error && (
            <div role="alert" className="bg-board-alarmbg border border-board-alarm text-board-alarmink rounded-[3px] px-4 py-3 text-base">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[56px] bg-board-amber hover:bg-board-amberpress active:translate-y-px
                       text-board-onamber font-board text-xl font-bold tracking-[0.08em] uppercase rounded-[3px]
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-8 font-data text-xs text-board-mute">
          Cinema · Control de acceso
        </p>
      </div>
    </div>
  );
}
