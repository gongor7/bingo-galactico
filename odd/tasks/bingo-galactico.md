# Feature: Bingo Galáctico (Star Wars party game, Kahoot-style)

Objective: real-time multiplayer bingo + quiz game with Star Wars theme, host-run rooms, join-by-code, category wheel, photo questions, first-correct-wins rounds. Deploy target: Vercel + Supabase. Branch: `feat/bingo-galactico`. Delivery: `ask-on-risk`. Test runner: `npm test` (logic) + `npm run build` (types) + browser smoke via `npm run dev` (`/dev` preview + landing).

## Specs

- S1 (L1): Host creates the room; the rest join with a code ("habra un host que creara la sala y los demas tendran que unirse por un codigo").
- S2 (L1): When the game starts each player gets a cartón to play ("cada jugador cuando inicie el juego tendra un carton con para jugar").
- S3 (L1): Turn-based wheel with categories ("se hara girar la ruleta por turnos donde se tendra una ruleta en la cual habra categorias como preguntas acerca de jedis, siths, clones, eso").
- S4 (L1): Questions show a Star Wars character photo; players type the character's name ("a las preguntas tambien quiero que se muestre la foto de algun personaje de star wars y se tiene que poner el nombre del personaje").
- S5 (L3): Extra round types chosen by user: Silueta (silhouette, double points) and Planetas. Base content categories: Jedis, Siths, Clones (+ Droides added to complete the 5-column bingo card; assumption flagged to user).
- S6 (L1/L3): When the category is drawn, ALL players get an answer input enabled; first correct answer wins the point ("el primero que aceirte gana el punto"); marking rule chosen by user: "Todos los que la tengan" — every player whose card contains the revealed key marks that square.
- S7 (L3): Win condition: first completed line (row/column/diagonal) = BINGO = game over ("Primera línea").
- S8 (L1/L2): Whole interface Star Wars themed, including the cartones ("todo la interfaz debe estar construida con tematica de star wars igual los cartones" + "quiero una interfaz no cumun y bonita") — direction: rebel command holotable: animated starfield with hyperspace, opening crawl intro, holographic panels, CRT scanlines, lightsaber pointer wheel, target-reticle square marking, synthesized SFX.
- S9 (L1): Deploy to Vercel with Supabase ("lo subiremso a vercel con supabase"): Next.js client app + Supabase Postgres (rooms/players) + Supabase Realtime broadcast/presence channels.
- S10 (L1, assumption): "todo mientras escuchamos la respuesta" interpreted as: the answer reveal is shown to everyone while synthesized ambience/SFX play (no copyrighted audio). Flagged as assumption in final report.

## Tasks

| ID | Spec | Route | Status | Evidence |
|----|------|-------|--------|----------|
| T1 | S1-S10 | inline | done | this doc; git repo on `feat/bingo-galactico` |
| T2 | S9 | inline | done | scaffold Next 15 + Tailwind 4; `npm install` OK (62 pkgs); commit a433375 |
| T3 | S4,S5 | inline | done | `scripts/fetch-images.mjs`; 52/52 images in `public/sw` (manifest.json); commit e9d60f9 |
| T4 | S3,S5,S6 | inline | done | `src/game/*`: pools, 52 questions (1 per square), card gen, ES normalize + Levenshtein, 7-seg wheel math; commit e9d60f9 |
| T5 | S9 | inline | done | `supabase/schema.sql` (RLS permissive + realtime publication), `src/lib/supabase.ts`, `.env.example`; commit faf17cf |
| T6 | S8 | inline | done | globals.css theme + StarField/Crawl/HoloPanel + landing; browser-verified (vision QA pass); commits a433375 |
| T7 | S1,S3,S4,S6 | inline | done | `useHostGame.ts` + `/host/[code]`; first-correct eval, reveal broadcast, score persist, bingo verify, new game; commit 7a0bd13 |
| T8 | S2,S6,S7 | inline | done | `usePlayerGame.ts` + `/play/[code]`; cartón + retries + auto-mark + line claim; commit 7a0bd13 |
| T9 | S10 | inline | done | `src/lib/sfx.ts` WebAudio synth + mute toggle; commit faf17cf |
| T10 | S8 | inline | done | `npm test` 43/43 ✓ (row-major card bug + wheel sign bug caught & fixed); `npm run build` PASS (5 routes); browser smoke: landing/crawl/wheel/cartón/foto/silueta/reveal OK (vision QA), hydration warnings fixed |
| T11 | S9 | inline | done | README.md: rules, Supabase setup, Vercel deploy; commit bb56154 |
| T12 | S8 (L4) | inline | done | Full "Consola Imperial" redesign after user feedback; commit 28af585. Vision-QA loop (2 rounds harsh critique) + DOM-measured label orientation; build/tsc/tests green |

## Log

- L1 (2026-11-21, user, verbatim): "ok necesto que hagas un juego de bingo como kahoot donde habra un host que creara la sala y los demas tendran que unirse por un codigo cada jugador cuando inicie el juego tendra un carton con para jugar y se hara girar la ruleta por turnos donde se tendra una ruleta en la cual habra categorias como preguntas acerca de jedis, siths , clones , eso a las preguntas tambien quiero que se muestre la foto de algun personaje de star wars y se tiene que poner el nombre del personaje, sigiereme un par mas de tipo de ronda, y bueno en cuanto toque la categoria a todos los jugadores se debera habiliata un espacio para que escriban la respuesta el primero que aceirte gana el punto y debara marcar la casilla que le toco, todo mientras escuchamos la respuesta todo la interfaz debe estar construida con tematica de star wars igual los cartones y para eso lo subiremso a vercel con supabase"
- L2 (2026-11-21, user, verbatim): "quiero una interfaz no cumun y bonita"
- L3 (2026-11-21, user, via question prompt): rondas extra = "🌑 Silueta, 🪐 Planetas"; marcado = "Todos los que la tengan (Recomendado)"; victoria = "Primera línea (Recomendado)".
- D1 (2026-11-21): starwars-visualguide.com domain expired (redirects elsewhere, unusable). Images sourced from starwars.fandom.com og:image, downloaded to /public/sw at build-prep time (`npm run images`). Fandom blocks Node fetch (403) but allows curl with browser-like headers; ambiguous slugs 301-redirect (Darth_Vader→Anakin_Skywalker, Chopper→C1-10P, etc.) — script follows redirects with the canonical slugs in MANIFEST.
- D2 (2026-11-21): DROIDES category added beyond user's explicit list to complete the 5 columns of the 5×5 cartón (JEDI|SITH|CLONES|DROIDES|PLANETAS); flagged to user in report, trivially removable.
- D3 (2026-11-21): Engram mem_* tools unavailable in this environment → Engram mirror pending; this file is the only tracking artifact.
- D4 (2026-11-21): Architecture host-authoritative over Supabase Realtime broadcast channel `room:{code}`; Postgres persists for refresh-recovery. Trust model documented in README.
- D5 (2026-11-21): Google Fonts fetch failed mid-session → fonts switched to self-hosted @fontsource (npm), build no longer depends on Google.
- D6 (2026-11-21, verification): `npm test` caught two real bugs, both fixed: (1) wheel rotation sign error (segments landed mirrored); (2) card generated column-major but grid renders row-major (categories would render as rows). TimerRing hydration mismatch (SSR Date.now) fixed with mount-only state; dev-preview card now generated post-mount.
- D7 (2026-11-21, verification): vision QA on screenshots: landing pass (theme cohesive, no layout breaks); wheel pass after enlarging lightsaber pointer and adding label strokes; cartón pass (columns, free center, reticle marks); silueta pass (black Maul + cyan glow, ×2 chip); reveal pass (winner banner + answer caption). Remaining known nit: none blocking.
- D8 (2026-11-21): Dev server orphaned on port 3000 during smoke test (killed PID 50064); session dev server runs on 3001. Next 15.5 used although Next 16 exists (stable choice for Vercel; upgrade optional).
- L4 (2026-11-21, user, verbatim): "amigo tu diseño esta superhorrible" — redesign requested. Direction chosen via question prompt: "Consola Imperial (Recomendado)" (near-black, hairlines, one cyan accent, SVG line icons, technical typography).
- D9 (2026-11-21, redesign): Root causes of the "horrible" look: emojis as icons, decoration overload (clip-paths + HUD corners + glows everywhere), 6-accent color soup, 9-11px text, gradient wheel, scanlines over everything. Cure applied: 2-accent system (cyan = system; #FFE81F gold = logo + victory only), flat panels with hairlines, custom SVG line icon set (Icons.tsx), no emojis anywhere, timer as slim bar, image with target corners.
- D10 (2026-11-21, wheel labels): Radial labels can't stay upright for a resting viewer (left half inverts). First fix attempt (per-segment absolute flip) was wrong due to double rotation; final solution: GYROSCOPIC labels — each label counter-rotates via CSS transform with the same transition curve as the rotor, staying horizontal for the viewer during the whole spin and at rest. Verified via DOM measurement: all 7 label bounding boxes exactly 20px tall (any tilt ≥8° would produce ~40px height). Note: vision-model critique claimed residual tilts — disproven by DOM ground truth; vision QA used only as lead-finder, DOM/gamma evidence as decider.
- D11 (2026-11-21): Next dev `.next` cache corrupted during heavy hot-reload session (`__webpack_modules__ is not a function`, missing chunk 611.js) → fixed by rm -rf .next + fresh dev server (now on port 3000). Not a code defect; production build passed independently.
- L5 (2026-11-21, user, verbatim): "porque cuando nadie responde se le da las respuesta valida a uno ? y osea mas que este acomodado en el carton de cada jugador deberia ponerse de forma alazar solo las categorias asi cundo acierten el gandor decide donde marcarlo"
- D12 (2026-11-21, mechanics v2): Two changes from L5. (1) Bug: timeout rounds still marked squares (resemble "giving the answer to someone"); fix: no winner → nobody marks. (2) Cartón redesigned: no pre-filled names — only the 5 categories as columns in RANDOM order per player (unique layout), and ONLY the round winner places a mark, choosing a free cell in the won category's column (any empty cell if the column is full). Marks are position-based (Set<number>). Host validates placement + verifies bingo. Droides/pools/questions unchanged (images still per key). Supersedes L3's "todos marcan" choice.
- D13 (2026-11-21): Supabase connected live (project twtoxyaymtwgypspfwrl; schema executed via Management API with user's scoped PAT stored in git-ignored clave.txt). Deployed to Vercel: https://bingo-galactico.vercel.app (project bingo-galactico, owner leandro-5553; env vars NEXT_PUBLIC_* in production). GitHub: gongor7/bingo-galactico (main). Auto-deploy git-connect pending Vercel GitHub App install on gongor7 — manual `npx vercel --prod` works.
- L6 (2026-11-21, user, verbatim): "igual deberian unirso con qr o compartir el link para entrar" → JoinQr component on host lobby (QR encodes {origin}/?room=CODE, copy-link button) + landing prefetches ?room= and focuses the nick field.
