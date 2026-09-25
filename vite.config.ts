import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // Ruta donde se sirve la app. '/' en Netlify y en `npm run dev`; detrás de
  // Traefik (infra-cinema) va en '/scanner/', junto a la app de clientes.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5200,
  },
  preview: {
    host: '0.0.0.0',
    port: 5200,
  },
});
