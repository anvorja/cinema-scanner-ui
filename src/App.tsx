import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ScannerPage from './pages/ScannerPage';

function PrivateRoute({ children }) {
  const token = sessionStorage.getItem('scanner_token');
  return token ? children : <Navigate to="/login" replace />;
}

// Ruta base sin la barra final ("/scanner"): así react-router acepta /scanner,
// /scanner/ y /scanner/login. Con "/scanner/" la URL sin barra queda en blanco.
// En Netlify y `npm run dev` la base es "/" y queda "" (equivale a la raíz).
const ROUTER_BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function App() {
  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <ScannerPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
