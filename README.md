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
- Local en Docker: `/api/v1` (mismo origen que Traefik) como build arg en
  `../infra-cinema/docker-compose.yml`; sirve igual en localhost, la IP local
  y el túnel de ngrok.

`VITE_BASE_PATH` (opcional, build time) es la ruta donde se sirve la app: `/`
por defecto (Netlify, `npm run dev`) y `/scanner/` en Docker, detrás de
Traefik (`http://localhost:8090/scanner/`).
- Producción: `.env.production`, usado por el build de Netlify.

## Correr en local

**Nativo** (recarga más rápida para iterar en la UI):

```bash
npm install
npm run dev   # http://localhost:5200
```

**Vía Docker** (`http://localhost:8090/scanner/`), como parte del stack completo — ver `../infra-cinema` y la
sección "Desarrollar en local" de `../WORKFLOW.md` (no se repite aquí el
procedimiento).

**Probando desde el celular en la misma red** (para escanear QR de compras
locales, no producción): `../WORKFLOW.md` sección 3. Si la cámara no se
activa por ser HTTP en vez de HTTPS, ver `MANUAL-CAMARA-LAN.md`.

## Build y despliegue

`Dockerfile` construye con Vite y sirve el resultado con `nginx` (puerto 5200
dentro de la red de Docker, `nginx.conf` en esta carpeta) — usado por
`docker-compose` local, donde Traefik lo publica en `/scanner/`. En
producción, Netlify construye directo desde `netlify.toml`
(`npm run build` → publica `dist/`), sin pasar por este `Dockerfile`. Flujo de
ramas y contextos de despliegue: `../WORKFLOW.md`.

## Flujo de trabajo: Gitflow

| Rama        | Sale de   | Entra a (vía PR)         | Método en GitHub | Para |
| ----------- | --------- | ------------------------ | ---------------- | ---- |
| `main`      | —         | —                        | —                | Lo que está en producción. Cada merge es una versión. |
| `develop`   | `main`    | —                        | —                | Integración de lo próximo a publicar. Rama por defecto. |
| `feature/*` | `develop` | `develop`                | **Squash**       | Una funcionalidad o cambio: `feature/mi-cambio`. |
| `release/*` | `develop` | `main` y luego `develop` | **Merge** a `main`; **Squash** a `develop` | Preparar una versión: `release/1.0.0`. Solo ajustes finales. |
| `hotfix/*`  | `main`    | `main` y luego `develop` | **Merge** a `main`; **Squash** a `develop` | Corrección urgente en producción. |

- **Nadie hace push directo** a `main` ni a `develop`: todo entra por pull request, con los checks de CI en verde.
- **En `develop` se usa squash:** cada feature queda como un solo commit con el título del PR.
- **En `main` se usa merge commit:** cada release o hotfix queda visible como una unidad.
- **Todavía no hay releases:** la app no está completa, así que `main` se queda como está hasta el
  primer `release/*`. Desde entonces, cada versión se etiqueta en `main` (`git tag -a v1.0.0`) con
  [versionado semántico](https://semver.org/lang/es/).

```bash
git switch develop && git pull
git switch -c feature/mi-cambio
# ...commits...
git push -u origin feature/mi-cambio   # abrir PR hacia develop → Squash and merge
```

## CI/CD

GitHub Actions (`.github/workflows/`) corre en cada PR hacia `main` o `develop`. Los rulesets exigen
estos checks; si se renombra un job, hay que actualizar `.github/rulesets/*.json`.

| Check | Qué revisa |
| ----- | ---------- |
| `Lint` | ESLint. |
| `Calidad y build` | Tipos con `tsc` y build de producción con Vite. |
| `Imagen Docker` | Construye la imagen y comprueba que nginx sirve la app, también en rutas internas y en `/health`. |

Con cada push a `develop` o `main` (es decir, al fusionar un PR), y solo si pasaron los checks, se
publica en Docker Hub **la misma imagen que se probó** (no se reconstruye):

- `develop` → `<usuario>/cinema-scanner-ui:develop` y `:<sha>`
- `main` → `<usuario>/cinema-scanner-ui:latest` y `:<sha>`

El sitio lo despliega **Netlify** desde `develop` (*Site configuration → Build & deploy → Branches*).
Como `develop` solo acepta PRs con los checks en verde, a Netlify solo llega código aprobado.
El flujo no despliega nada en Render.

### Configuración en GitHub (una vez)

- **Rulesets:** `main` y `develop` se protegen importando `.github/rulesets/main.json` y
  `.github/rulesets/develop.json` en *Settings → Rules → Rulesets → Import a ruleset*. Exigen PR, los
  checks de la tabla de arriba, y no permiten borrar la rama ni forzar pushes. `main` solo acepta
  merge commit y `develop` solo squash.
- **Settings → General:** rama por defecto `develop`; permitir merge commits y squash (no rebase);
  activar *Automatically delete head branches*.
- **Secrets** (*Settings → Secrets and variables → Actions*): `DOCKER_USERNAME` y `DOCKER_TOKEN`
  (token de acceso de Docker Hub con permiso de escritura).
