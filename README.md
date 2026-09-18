# cinema-scanner-ui

UI de staff para escanear códigos QR de boletas y validarlas en la entrada del cine.

## Stack

React 19 + TypeScript, Vite 7, Tailwind CSS, `html5-qrcode` para lectura de QR
vía cámara, `axios` para el cliente HTTP. Node 18 (ver `Dockerfile`).

## Estructura

- `src/pages/LoginPage.tsx` — login de staff contra `auth-service` (mismo
  endpoint que el resto del sistema).
- `src/pages/ScannerPage.tsx` — cámara + lectura de QR, feedback sonoro/háptico
  (`playBeep`, `navigator.vibrate`) y la UI de resultado por código HTTP.
- `src/services/api.ts` — cliente `axios` único: adjunta el Bearer token
  (`sessionStorage.scanner_token`) a cada request y redirige a `/login` si
  responde 401.
- `src/App.tsx` — dos rutas: `/login` pública, `/` protegida (`PrivateRoute`
  basado en la presencia del token en `sessionStorage`).

## Cómo valida un ticket

Al escanear un QR, `validateTicket(ticketCode)` llama:

```
POST /purchases/tickets/{ticket_code}/validate
```

contra `booking-service` (vía el gateway Traefik). La respuesta se interpreta
por código HTTP:

| Código | Significado en la UI |
|--------|----------------------|
| 2xx    | Boleta válida — quedó marcada `USED` |
| 409    | Ya estaba usada o cancelada |
| 404    | `ticket_code` no existe |
| 403    | El usuario autenticado no tiene permiso |

Marcar el ticket como `USED` dispara el evento Kafka `ticket.validated`
(lo publica `booking-service`, no este frontend) — contrato completo en
`../kafka-schemas-cinema/event_contracts_operativos.md`.

## Variables de entorno

Una sola: `VITE_API_BASE_URL`, la base del gateway (`/api/v1` incluido). Se
resuelve en build time (Vite la inyecta como constante), así que cambiarla
requiere reconstruir, no solo reiniciar.

- Local nativo: `.env` (`http://localhost:8090/api/v1`)
- Local en Docker: se pasa como build arg (`VITE_API_BASE_URL`/`SCANNER_API_URL`
  en `../infra-cinema/docker-compose.yml`) — necesario para el flujo de
  "probar E2E desde el celular con IP local" de `../WORKFLOW.md`.
- Producción: `.env.production`, usado por el build de Netlify.

## Correr en local

**Nativo** (recarga más rápida para iterar en la UI):

```bash
npm install
npm run dev   # http://localhost:5200
```

**Vía Docker**, como parte del stack completo — ver `../infra-cinema` y la
sección "Desarrollar en local" de `../WORKFLOW.md` (no se repite aquí el
procedimiento).

## Build y despliegue

`Dockerfile` construye con Vite y sirve el resultado con `nginx` (puerto 5200,
`nginx.conf` en esta carpeta) — usado por `docker-compose` local. En
producción, Netlify construye directo desde `netlify.toml`
(`npm run build` → publica `dist/`), sin pasar por este `Dockerfile`. Flujo de
ramas y contextos de despliegue: `../WORKFLOW.md`.
