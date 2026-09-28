export type BoardTheme = 'dark' | 'light';
// Misma clave que cinema_ui: si se sirven bajo el mismo origen, la preferencia se comparte.
const KEY = 'cinema-board-theme';

export const readTheme = (): BoardTheme => {
  try { return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
};

export const applyTheme = (theme: BoardTheme) => {
  document.body.classList.toggle('board-light', theme === 'light');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f2f1ec' : '#0c0c0d');
};

export const saveTheme = (theme: BoardTheme) => {
  try { localStorage.setItem(KEY, theme); } catch { /* sin almacenamiento */ }
  applyTheme(theme);
};
