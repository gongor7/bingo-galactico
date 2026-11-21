# 🌌 Bingo Galáctico

Bingo multijugador estilo **Kahoot** con temática de **Star Wars**, presentado como una
*holomesa de comando rebelde*: campo de estrellas con hipersalto, rótulo de apertura en
perspectiva (crawl), paneles holográficos con scanlines CRT, ruleta con aguja de sable
láser y cartones que se marcan con retícula de tiro. Todo el audio es sintetizado
(WebAudio), sin material con copyright.

- **Host** crea la sala → los jugadores se unen con un **código**.
- Al iniciar, cada jugador recibe un **cartón 5×5** con columnas por facción:
  `JEDI · SITH · CLONES · DROIDES · PLANETAS` (+ estrella libre central).
- Por turnos se gira la **ruleta** de categorías: Jedis, Siths, Clones, Droides,
  Planetas, **Silueta** (×2 puntos, el personaje aparece en negro) y **Comodín** (cualquier categoría).
- La pregunta (foto, silueta o planeta) llega a **todos a la vez**: se abre un campo de
  respuesta con reintento hasta que alguien acierte. **El primero en acertar gana el punto**
  (1 o 2 en silueta) y **todos los que tengan esa casilla en su cartón la marcan**.
- La primera **línea completa** (fila, columna o diagonal) grita **¡BINGO!** y gana la partida.

## Stack

- **Next.js 15** (App Router) + React 19 + Tailwind CSS v4 — todo client-side.
- **Supabase**: Postgres (salas/jugadores, persistencia de cartones y puntos) +
  **Realtime** (canal de broadcast por sala + presence). Sin servidor propio: perfecto para Vercel.
- Motor **host-autoritativo**: el navegador del host dirige la partida y transmite los
  eventos; los clientes solo reflejan. Modelo de confianza de juego de fiesta (ver nota de seguridad).

## Puesta en marcha (local)

1. `npm install`
2. Crea un proyecto en [supabase.com](https://supabase.com) (gratis).
3. En *SQL Editor* ejecuta todo `supabase/schema.sql`.
4. `cp .env.example .env.local` y completa `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
5. `npm run dev` → <http://localhost:3000>

Vista previa de componentes sin Supabase: <http://localhost:3000/dev>

## Deploy en Vercel

1. Sube el repo a GitHub.
2. En [vercel.com](https://vercel.com) → *Add New Project* → importa el repo (Next.js se detecta solo).
3. En *Environment Variables* agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy. Listo: el host entra en `/`, crea la sala y comparte el código.

> Las imágenes ya viven en `public/sw/` (descargadas de Wookieepedia vía
> `npm run images`), así que no hay dependencias externas en runtime.

## Reglas y parámetros

| Parámetro | Valor |
|---|---|
| Ronda de pregunta | 35 s (o hasta el primer acierto) |
| Giro de ruleta | ~4,2 s |
| Puntos | 1 normal · 2 en SILUETA |
| Reintento | Permitido hasta que alguien acierte (rate-limit 0,9 s) |
| Tolerancia de respuesta | sin acentos/mayúsculas, alias aceptados, 1 error de tipeo en respuestas largas |
| Victoria | primera línea (fila/columna/diagonal) |
| Banca de preguntas | 52 (cada casilla posible tiene su pregunta) |

## Notas de diseño y seguridad

- **RLS permisiva**: es un juego de fiesta sin login; el anon key es público en el
  cliente y las políticas permiten escribir salas/jugadores. Endurece con auth antes
  de exponerlo a desconocidos en producción.
- **Confianza en el host**: las respuestas correctas viven solo en el bundle y las
  valida el host (no el servidor). Suficiente para jugar entre amigos.
- **Host juega como director**, no participa (tú lo pediste así: «el host crea la sala
  y los demás se unen»).
- Refresh del jugador: recupera cartón/marcas/puntos desde Postgres. Refresh del host
  a mitad de partida: recupera lobby y estado persistido; la ronda en vuelo se pierde.
- Next 15 (estable) aunque ya existe Next 16; actualizar es opcional y no requerido para Vercel.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm run build` / `npm start` | build de producción / servidor |
| `npm test` | tests de lógica (matching, cartones, líneas, ruleta) |
| `npm run images` | re-descarga las imágenes de Wookieepedia a `public/sw` |

Proyecto fan sin afiliación con Lucasfilm/Disney, para uso personal y fiestas.
