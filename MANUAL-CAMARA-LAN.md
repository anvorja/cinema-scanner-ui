# Manual: cámara del celular no funciona al escanear por HTTP en la LAN

## El problema

Para probar el scanner E2E desde el celular contra el backend local (ver
`../WORKFLOW.md` sección 3, "Probar E2E desde el celular"), accedes a
`http://<tu-ip-local>:5200` — por ejemplo `http://192.168.1.5:5200`.

La app carga y el login funciona, pero al entrar a la pantalla de escaneo la
cámara no se activa (o el navegador ni siquiera pide el permiso).

**Causa:** `html5-qrcode` (la librería que usa `ScannerPage.tsx` para leer el
QR) depende de `getUserMedia`, y los navegadores solo permiten `getUserMedia`
en un **contexto seguro**: HTTPS, o el propio `localhost`. Una IP de LAN por
HTTP (`http://192.168.1.5:5200`) no cuenta como contexto seguro, así que el
navegador bloquea el acceso a la cámara — no es un bug de la app, es una
restricción de seguridad del navegador.

## Solución rápida: marcar el origen como seguro en Chrome (solo tu celular)

Esto le dice a Chrome "confía en este origen HTTP puntual como si fuera
HTTPS". Solo afecta tu propio navegador/dispositivo, no cambia nada del
servidor ni del código.

1. En Chrome del celular, ve a:
   ```
   chrome://flags/#unsafely-treat-insecure-origin-as-secure
   ```
2. En el flag **"Insecure origins treated as secure"**, escribe en el cuadro
   de texto la URL exacta que usas para el scanner (con protocolo, sin barra
   final):
   ```
   http://192.168.1.5:5200
   ```
   (ajusta la IP a la que te dé `ip a | grep "inet 192"` en tu PC — ver
   `../WORKFLOW.md` sección 3).
3. Cambia el desplegable de **"Inhabilitado"** a **"Habilitado"**.
4. Toca **"Reiniciar"** en el banner azul de abajo (reinicia Chrome, no el
   teléfono).
5. Vuelve a abrir `http://192.168.1.5:5200`, loguéate de nuevo y entra al
   scanner — ahora sí debería pedir permiso de cámara normalmente.

Verificado funcionando 2026-09-20 (Chrome Android).

**Limitaciones de esta solución:**
- Es por navegador y por dispositivo — si escaneas desde otro celular o con
  otro navegador (Firefox, Samsung Internet, etc.), hay que repetir el paso
  ahí también.
- Si tu IP local cambia (reinicio de router, otra red WiFi), hay que
  actualizar la URL en el flag y también `SCANNER_API_URL` en
  `../infra-cinema/.env` (ver `../WORKFLOW.md` sección 3).
- Solo sirve para pruebas propias — no es algo que le pidas hacer a un
  empleado real en producción (ahí el scanner corre en Netlify con HTTPS
  real, este problema no existe).

## Otras opciones (no usadas, mencionadas por si hace falta más adelante)

- **Túnel HTTPS con `cloudflared`** (`cloudflared tunnel --url
  http://localhost:5200`): da una URL `https://*.trycloudflare.com` real que
  cualquier navegador acepta sin configurar nada, pero expone el scanner
  local a internet mientras el túnel esté abierto.
- **Certificado local con `mkcert`**: sirve el scanner por HTTPS real en la
  LAN con un certificado de confianza instalado como CA en el celular. Más
  pasos de setup, pero queda resuelto de forma permanente y sin depender de
  flags por navegador.

Se optó por el flag de Chrome por ser inmediato y no requerir exponer nada a
internet ni instalar certificados — suficiente para pruebas puntuales en el
propio celular.
