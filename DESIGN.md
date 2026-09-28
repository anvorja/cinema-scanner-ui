---
name: CinemaPlus - Escáner (Tablero de Salidas)
system: tablero-v1
description: Escáner de entrada con el mismo sistema visual que la app del comprador y el panel admin.
---

# Design System: Escáner (`tablero-v1`)

Este módulo **no define un estilo propio**: usa el sistema **Tablero de Salidas, código `tablero-v1`**, cuya especificación completa vive en `cinema_ui/DESIGN.md` (rama `feature/rediseno-tablero-comprador`). Lo mantienen en sincronía tres módulos:

| Módulo | Repositorio | Rama |
|---|---|---|
| Comprador y administración | `cinema_ui` | `feature/rediseno-tablero-comprador` |
| Escáner (este) | `cinema-scanner-ui` | `feature/rediseno-tablero-escaner` |

Etiqueta común en ambos repositorios: `diseno-tablero-v1`.

## Qué se replica aquí

- **Tokens:** `src/index.css` y `tailwind.config.js` copian los canales RGB `--b-*` y los colores `board-*` de `cinema_ui`. Oscuro por defecto; `body.board-light` activa el claro. La preferencia usa la clave `cinema-board-theme` (`src/theme.ts`).
- **Tipografía:** Barlow Condensed en mayúsculas para títulos y botones, B612 tabular para datos, Barlow para texto.
- **Aletas:** `src/components/FlapText.tsx` es una copia de `cinema_ui/src/components/board/FlapText.tsx`. Solo se usa en el título del login; el veredicto de validación es estático para leerse al instante.

## Reglas propias del escáner

- Objetivos táctiles de 48 a 56px; un solo botón primario ámbar por pantalla; pensado para usarse de pie y con una mano.
- El veredicto siempre combina **color, ícono y texto**: Boleta válida (verde), Ya utilizada (ámbar), No encontrada o Error (alarma), Sin permiso (neutro). Nunca solo color.
- Datos clave (película, función, sala, asiento, código) en B612 de 20px, alineados a la derecha.
- Ámbar como relleno con texto `onamber` (oscuro); el texto ámbar usa `amberink`.

## Al cambiar el sistema

Si un token o componente cambia en `cinema_ui`, replica el cambio aquí en el mismo commit o abre un cambio a `tablero-v2` en ambos. Los colores no se escriben como hex en los componentes: se usan los tokens `board-*`.
