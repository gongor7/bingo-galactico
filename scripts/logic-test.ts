// Focused logic tests for the game core. Run: npx tsx scripts/logic-test.ts
import { normalize, levenshtein, matchesAnswer } from "../src/game/normalize";
import { generateCard, completedLine, hasKey, LINE_INDEXES } from "../src/game/cards";
import { CATEGORIES, type Card } from "../src/game/types";
import { POOLS, QUESTIONS, poolEntry } from "../src/game/data";
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

// ── cartones ──────────────────────────────────────────────────────────────
const card = generateCard();
check("cartón tiene 25 celdas", card.length === 25);
check("centro libre (índice 12)", card[12] === null);
check("única celda libre", card.filter((c) => c === null).length === 1);
check("columnas por categoría", card.every((c, i) => c === null || c.cat === CATEGORIES[i % 5]));
// unicidad de claves por columna
for (let col = 0; col < 5; col++) {
  const keysInCol = new Set<string>();
  for (let row = 0; row < 5; row++) {
    const cell = card[row * 5 + col];
    if (cell) {
      if (keysInCol.has(cell.key)) failures++;
      keysInCol.add(cell.key);
    }
  }
  check(`columna ${CATEGORIES[col]} sin duplicados`, keysInCol.size === (col === 2 ? 4 : 5));
}
check("todas las claves existen en pools", card.every((c) => c === null || poolEntry(c.key) !== undefined));

// ── línea ─────────────────────────────────────────────────────────────────
const flatCard: Card = Array.from({ length: 25 }, (_, i) => ({ key: `k${i}`, cat: "jedi" }));
flatCard[12] = null;
check("fila superior completa", completedLine(flatCard, new Set(["k0", "k1", "k2", "k3", "k4"])) !== null);
check("columna 3 con libre central", completedLine(flatCard, new Set(["k2", "k7", "k17", "k22"])) !== null);
check("diagonal con libre central", completedLine(flatCard, new Set(["k0", "k6", "k18", "k24"])) !== null);
check("sin línea si falta una", completedLine(flatCard, new Set(["k0", "k1", "k2", "k3"])) === null);
check("hasKey", hasKey(flatCard, "k7") && !hasKey(flatCard, "nope"));
check("12 líneas posibles", LINE_INDEXES.length === 12);

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
