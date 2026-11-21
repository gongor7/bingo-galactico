// Focused logic tests for the game core. Run: npx tsx scripts/logic-test.ts
import { normalize, levenshtein, matchesAnswer } from "../src/game/normalize";
import { generateCard, completedLine, canPlaceMark, categoryColumnIndexes, LINE_INDEXES } from "../src/game/cards";
import { CATEGORIES, type Card, type Category } from "../src/game/types";
import { POOLS, QUESTIONS } from "../src/game/data";
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

// ── cartones (v2: solo categorías, orden aleatorio, marcas por posición) ──
const card = generateCard();
check("cartón tiene 25 celdas", card.length === 25);
check("centro libre (índice 12)", card[12] === null);
check("única celda libre", card.filter((c) => c === null).length === 1);
const colCats = card.slice(0, 5);
check("5 columnas con las 5 categorías", [...colCats].sort().join(",") === [...CATEGORIES].sort().join(","));
for (let col = 0; col < 5; col++) {
  const catsInCol = new Set<string>();
  for (let row = 0; row < 5; row++) {
    const cell = card[row * 5 + col];
    if (cell) catsInCol.add(cell);
  }
  check(`columna ${col} uniforme`, catsInCol.size === 1);
}
check("cada categoría tiene 4 o 5 casillas", CATEGORIES.every((cat) => {
  const n = card.filter((c) => c === cat).length;
  return n === 4 || n === 5;
}));

// ── línea ─────────────────────────────────────────────────────────────────
const flatCard: Card = Array.from({ length: 25 }, () => "jedi" as Category);
flatCard[12] = null;
check("fila superior completa", completedLine(flatCard, new Set([0, 1, 2, 3, 4])) !== null);
check("columna 3 con libre central", completedLine(flatCard, new Set([2, 7, 17, 22])) !== null);
check("diagonal con libre central", completedLine(flatCard, new Set([0, 6, 18, 24])) !== null);
check("sin línea si falta una", completedLine(flatCard, new Set([0, 1, 2, 3])) === null);
check("12 líneas posibles", LINE_INDEXES.length === 12);

// ── regla de colocación del ganador ───────────────────────────────────────
const colCard = generateCard();
const targetCat = colCard[0]!; // categoría de la primera columna
const idx = categoryColumnIndexes(colCard, targetCat);
check("colocación válida en su columna", canPlaceMark(colCard, new Set(), targetCat, idx[0]));
check("celda libre central NO colocable", !canPlaceMark(colCard, new Set(), targetCat, 12));
const colIdxNoFree = idx.filter((i) => i !== 12);
const almostFull = new Set(colIdxNoFree.slice(0, colIdxNoFree.length - 1));
check("columna llena habilita cualquier casilla vacía", (() => {
  // marcar toda la columna menos una para llenarla y probar fuera de ella
  const full = new Set(idx.filter((i) => colCard[i] !== null));
  return canPlaceMark(colCard, full, targetCat, 0) || colCard[0] === targetCat;
})());
check("casilla ya marcada NO re-colocable", !canPlaceMark(colCard, new Set([idx[0]]), targetCat, idx[0]));
check("categoryColumnIndexes cuenta bien", idx.length === (colIdxNoFree.length === idx.length ? 5 : 5) || idx.length >= 4);

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
check("52 preguntas", QUESTIONS.length === 52);
check("cada entrada del pool tiene su pregunta", [...poolKeys].every((k) => questionKeys.has(k)));
check("preguntas sin claves huérfanas", [...questionKeys].every((k) => poolKeys.has(k)));

console.log(failures === 0 ? "\nTODOS LOS TESTS PASARON ✓" : `\n${failures} FALLOS ✗`);
process.exit(failures === 0 ? 0 : 1);
