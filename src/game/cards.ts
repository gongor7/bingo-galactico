// Cartón generation and line detection.
// New model: the cartón has only CATEGORIES, one per column, in random order
// per player. Marks are position-based (cell indexes), placed by the winner.

import { CATEGORIES, type Card, type Category } from "./types";

export function generateCard(): Card {
  // Random column order per player; free center at row 2, col 2.
  const cols = [...CATEGORIES].sort(() => Math.random() - 0.5);
  const cells: Card = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      cells.push(r === 2 && c === 2 ? null : cols[c]);
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

/** Returns the first completed line given the marked cell indexes, or null. */
export function completedLine(card: Card, marked: Set<number>): number[] | null {
  for (const line of LINE_INDEXES) {
    if (line.every((i) => card[i] === null || marked.has(i))) {
      return line;
    }
  }
  return null;
}

/** Indexes of the cells belonging to a category column. */
export function categoryColumnIndexes(card: Card, cat: Category): number[] {
  const out: number[] = [];
  for (let i = 0; i < card.length; i++) if (card[i] === cat) out.push(i);
  return out;
}

/** True when every markable cell of a category column is already marked. */
export function columnFull(card: Card, marked: Set<number>, cat: Category): boolean {
  return categoryColumnIndexes(card, cat).every((i) => marked.has(i));
}

/** May `cell` be used to place a mark won in category `cat`? */
export function canPlaceMark(card: Card, marked: Set<number>, cat: Category, cell: number): boolean {
  if (cell < 0 || cell >= card.length) return false;
  if (card[cell] === null) return false; // free center, not placeable
  if (marked.has(cell)) return false;
  return card[cell] === cat || columnFull(card, marked, cat);
}
