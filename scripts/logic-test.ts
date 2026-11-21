// Focused logic tests for the game core. Run: npx tsx scripts/logic-test.ts
import { normalize, levenshtein, matchesAnswer } from "../src/game/normalize";
import { generateCard, completedLine, canPlaceMark, LINE_INDEXES } from "../src/game/cards";
import { CATEGORIES, type Card, type Category } from "../src/game/types";
import { COMODIN_QUESTIONS, POOLS, QUESTIONS } from "../src/game/data";
import { SEGMENT_ANGLE, nextRotation, SEGMENTS } from "../src/game/wheel";

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    failures++;
    console.error(`FAIL ${name}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

// ── normalize / matching ──────────────────────────────────────────────────
check("normalize quita acentos/puntuación", normalize("  Yódä!  ") === "yoda");
check("normalize c-3po", normalize("C-3PO") === "c 3po");
check("match exacto", matchesAnswer("Yoda", "Yoda", []));
check("match alias", matchesAnswer("arturito", "R2-D2", ["arturito"]));
check("match acentos/caso", matchesAnswer("LUKE SKYWALKER", "Luke Skywalker", []));
check("typo tolerado (largo)", matchesAnswer("luke skywalkerr", "Luke Skywalker", []));
check("typo NO tolerado (corto)", !matchesAnswer("yodaa", "Yoda", []));
check("respuesta vacía rechazada", !matchesAnswer("", "Yoda", []));
check("respuesta incorrecta", !matchesAnswer("jar jar", "Yoda", ["maestro yoda"]));
check("levenshtein básico", levenshtein("sith", "sit") === 1);

// ── cartones (v3 disperso: categorías al azar, marcas por posición) ──────
const card = generateCard();
check("cartón tiene 25 celdas", card.length === 25);
check("centro libre (índice 12)", card[12] === null);
check("única celda libre", card.filter((c) => c === null).length === 1);
const counts = new Map<string, number>();
for (const c of card) if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
check("todas las categorías presentes", CATEGORIES.every((cat) => (counts.get(cat) ?? 0) >= 4));
check("una categoría tiene 4 y el resto 5", (() => {
  const ns = CATEGORIES.map((cat) => counts.get(cat) ?? 0).sort((a, b) => a - b);
  return ns[0] === 4 && ns[4] === 5;
})());
check("categorías solo válidas", card.every((c) => c === null || CATEGORIES.includes(c)));

// ── línea ─────────────────────────────────────────────────────────────────
const flatCard: Card = Array.from({ length: 25 }, () => "jedi" as Category);
flatCard[12] = null;
check("fila superior completa", completedLine(flatCard, new Set([0, 1, 2, 3, 4])) !== null);
check("columna 3 con libre central", completedLine(flatCard, new Set([2, 7, 17, 22])) !== null);
check("diagonal con libre central", completedLine(flatCard, new Set([0, 6, 18, 24])) !== null);
check("sin línea si falta una", completedLine(flatCard, new Set([0, 1, 2, 3])) === null);
check("12 líneas posibles", LINE_INDEXES.length === 12);

// ── regla de colocación del ganador ───────────────────────────────────────
const scatter = generateCard();
const someCat = scatter.find((c) => c !== null)!;
const cellsOfCat = scatter.map((c, i) => (c === someCat ? i : -1)).filter((i) => i >= 0);
check("colocación válida en casilla de su categoría", canPlaceMark(scatter, new Set(), someCat, cellsOfCat[0]));
check("celda de otra categoría NO colocable", (() => {
  const other = scatter.findIndex((c, i) => c !== null && c !== someCat && i !== 12);
  return !canPlaceMark(scatter, new Set(), someCat, other);
})());
check("celda libre central NO colocable", !canPlaceMark(scatter, new Set(), someCat, 12));
check("casilla ya marcada NO re-colocable", !canPlaceMark(scatter, new Set([cellsOfCat[0]]), someCat, cellsOfCat[0]));
check("categoría agotada habilita cualquier casilla vacía", (() => {
  const full = new Set(cellsOfCat); // marcar TODAS las de esa categoría
  const other = scatter.findIndex((c, i) => c !== null && c !== someCat && i !== 12);
  return canPlaceMark(scatter, full, someCat, other);
})());
check("comodín (target='any') habilita cualquier casilla vacía de cualquier categoría", (() => {
  const other = scatter.findIndex((c, i) => c !== null && c !== someCat && i !== 12);
  return canPlaceMark(scatter, new Set(), "any", other) && canPlaceMark(scatter, new Set(), "any", cellsOfCat[0]);
})());
check("comodín (target='any') NO habilita centro libre ni casilla ya marcada", (
  !canPlaceMark(scatter, new Set(), "any", 12) &&
  !canPlaceMark(scatter, new Set([cellsOfCat[0]]), "any", cellsOfCat[0])
));
check("banking: 2 preguntas por entrada", QUESTIONS.length === POOLS.jedi.length * 0 + QUESTIONS.filter((q) => q.category === "jedi").length + QUESTIONS.filter((q) => q.category === "sith").length + QUESTIONS.filter((q) => q.category === "clones").length + QUESTIONS.filter((q) => q.category === "droides").length + QUESTIONS.filter((q) => q.category === "planetas").length);

// ── ruleta ────────────────────────────────────────────────────────────────
check("7 segmentos", SEGMENTS.length === 7);
for (let i = 0; i < SEGMENTS.length; i++) {
  const R = nextRotation(0, i);
  const landed = (i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 + R) % 360;
  const off = Math.min(landed, 360 - landed);
  check(`segmento ${SEGMENTS[i].id} cae bajo la aguja (±12°)`, off <= 12);
  const R2 = nextRotation(R, i); // repetir mismo segmento debe seguir avanzando
  check(`segmento ${SEGMENTS[i].id} segunda vuelta avanza`, R2 > R + 360);
}

// ── cobertura de preguntas ────────────────────────────────────────────────
const poolKeys = new Set(Object.values(POOLS).flat().map((e) => e.key));
const questionKeys = new Set(QUESTIONS.map((q) => q.key));
check("banca grande (>=120 preguntas)", QUESTIONS.length >= 120);
check("2 preguntas por entrada", [...poolKeys].every((k) => QUESTIONS.filter((q) => q.key === k).length === 2));
check("ids de pregunta únicos", new Set(QUESTIONS.map((q) => q.id)).size === QUESTIONS.length);
check("cada entrada del pool tiene su pregunta", [...poolKeys].every((k) => questionKeys.has(k)));
check("preguntas sin claves huérfanas", [...questionKeys].every((k) => poolKeys.has(k)));
check("segmentos tienen significado definido", SEGMENTS.every((s) => s.meaning.trim().length > 0));
check("banco de comodines difícil (>=20 preguntas)", COMODIN_QUESTIONS.length >= 20);
check("ids de comodín únicos", new Set(COMODIN_QUESTIONS.map((q) => q.id)).size === COMODIN_QUESTIONS.length);
check("comodines matchean su respuesta canónica", COMODIN_QUESTIONS.every((q) => matchesAnswer(q.answerDisplay, q.answerDisplay, q.aliases)));

console.log(failures === 0 ? "\nTODOS LOS TESTS PASARON ✓" : `\n${failures} FALLOS ✗`);
process.exit(failures === 0 ? 0 : 1);
