// Cartón generation and line detection.

import { CATEGORIES, type Card, type Category } from "./types";
import { POOLS } from "./data";

export function generateCard(): Card {
  // Build column-by-column (column 2 = clones holds the free center at row 2)…
  const cols: ({ key: string; cat: Category } | null)[][] = CATEGORIES.map((cat, col) => {
    const need = col === 2 ? 4 : 5;
    const shuffled = [...POOLS[cat]].sort(() => Math.random() - 0.5).slice(0, need);
    const entries: ({ key: string; cat: Category } | null)[] = shuffled.map((e) => ({ key: e.key, cat }));
    if (col === 2) entries.splice(2, 0, null);
    return entries;
  });
  // …but emit ROW-MAJOR: the CSS grid fills cells row by row.
  const cells: Card = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      cells.push(cols[c][r]);
    }
  }
  return cells;
}

export const LINE_INDEXES: number[][] = (() => {
  const lines: number[][] = [];
  for (let r = 0; r < 5; r++) lines.push([0, 1, 2, 3, 4].map((c) => r * 5 + c));
  for (let c = 0; c < 5; c++) lines.push([0, 1, 2, 3, 4].map((r) => r * 5 + c));
  lines.push([0, 6, 12, 18, 24]);
  lines.push([4, 8, 12, 16, 20]);
  return lines;
})();

/** Returns the first completed line given the set of marked keys, or null. */
export function completedLine(card: Card, marked: Set<string>): number[] | null {
  for (const line of LINE_INDEXES) {
    if (line.every((i) => {
      const cell = card[i];
      return cell === null || marked.has(cell.key);
    })) {
      return line;
    }
  }
  return null;
}

export function hasKey(card: Card, key: string): boolean {
  return card.some((c) => c?.key === key);
}
