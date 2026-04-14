import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api.js';

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

      localStorage.setItem('scanner_token', data.access_token);
      localStorage.setItem('scanner_user', JSON.stringify(data.user));
      navigate('/', { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail || 'Credenciales incorrectas.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">

        {/* Logo / header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cinema Scanner</h1>
          <p className="text-slate-400 text-sm mt-1">Validación de boletas en entrada</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="empleado@cinema.com"
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700
                         text-white placeholder-slate-500 focus:outline-none focus:border-blue-500
                         focus:ring-1 focus:ring-blue-500 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700
                         text-white placeholder-slate-500 focus:outline-none focus:border-blue-500
                         focus:ring-1 focus:ring-blue-500 transition-colors text-sm"
            />
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700/60 text-red-300 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700
                       text-white font-semibold rounded-xl transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-center text-slate-600 text-xs mt-8">
          Cinema · Control de acceso
        </p>
      </div>
    </div>
  );
}
