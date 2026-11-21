// Cartón generation and line detection.
// v3 "disperso": every cell has a random category (5 per category, minus the
// free center). Marks are position-based; the winner places them anywhere the
// category matches (or anywhere free if that category is exhausted).

import { CATEGORIES, type Card, type Category } from "./types";

export function generateCard(): Card {
  // 25 cells: 5 per category; one cell becomes the free center (index 12).
  const bag: Category[] = [];
  for (const cat of CATEGORIES) {
    for (let i = 0; i < 5; i++) bag.push(cat);
  }
  // shuffle (Fisher-Yates)
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  const cells: Card = [...bag];
  cells[12] = null; // free center
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

/** True when every markable cell of a category is already marked. */
export function categoryExhausted(card: Card, marked: Set<number>, cat: Category): boolean {
  return !card.some((c, i) => c === cat && !marked.has(i));
}

/** May `cell` be used to place a mark won in category `cat`? */
export function canPlaceMark(card: Card, marked: Set<number>, cat: Category, cell: number): boolean {
  if (cell < 0 || cell >= card.length) return false;
  if (card[cell] === null) return false; // free center, not placeable
  if (marked.has(cell)) return false;
  return card[cell] === cat || categoryExhausted(card, marked, cat);
}
