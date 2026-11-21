// Shared game types and the realtime broadcast contract between host and players.

export type Category = "jedi" | "sith" | "clones" | "droides" | "planetas";
export type SegmentId = Category | "silueta" | "comodin";

/** Column order of the 5x5 cartón. Column index 2 (clones) holds the free center. */
export const CATEGORIES: Category[] = ["jedi", "sith", "clones", "droides", "planetas"];

export const CATEGORY_LABEL: Record<Category, string> = {
  jedi: "JEDI",
  sith: "SITH",
  clones: "CLONES",
  droides: "DROIDES",
  planetas: "PLANETAS",
};

export interface PoolEntry {
  key: string;
  display: string;
  aliases: string[];
}

export interface Question {
  id: string;
  category: Category;
  /** Pool key that players mark on their cartón. */
  key: string;
  prompt: string;
}

/** Question as sent over the wire: answers never leave the host until reveal. */
export interface PublicQuestion {
  roundNo: number;
  segment: SegmentId;
  category: Category;
  mode: "foto" | "silueta";
  prompt: string;
  image: string;
  points: number;
  endsAt: number;
}

/**
 * 25 cells, row-major. Each column is one of the 5 categories in RANDOM order
 * (unique cartón per player); null = free center at index 12.
 */
export type Card = (Category | null)[];

export interface PlayerPub {
  id: string;
  nick: string;
  score: number;
}

export interface RevealWinner {
  id: string;
  nick: string;
}

/** Host -> players. */
export type HostEvent =
  | { t: "start"; players: { id: string; nick: string; card: Card }[] }
  | { t: "spin"; roundNo: number; segment: SegmentId; rotation: number; durMs: number }
  | { t: "question"; q: PublicQuestion }
  | { t: "wrong"; nick: string }
  | {
      t: "reveal";
      roundNo: number;
      answerKey: string;
      answerDisplay: string;
      winner: RevealWinner | null;
      points: number;
      prompt: string;
      image: string;
      mode: "foto" | "silueta";
      category: Category;
    }
  | { t: "scores"; players: PlayerPub[] }
  | { t: "gameover"; winner: RevealWinner | null; reason: "bingo" | "host"; players: PlayerPub[] };

/** Players -> host. */
export type PlayerEvent =
  | { t: "answer"; pid: string; nick: string; roundNo: number; text: string; ts: number }
  | { t: "mark"; pid: string; cell: number }
  | { t: "bingo"; pid: string; nick: string };

export const ROUND_MS = 35_000;
export const SPIN_MS = 4_200;
export const REVEAL_BREAK_MS = 6_500;
