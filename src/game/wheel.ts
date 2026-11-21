// Wheel segments and rotation math. The host decides the outcome and
// broadcasts an absolute rotation; every client animates to the same angle.
//
// Segment i spans [i*SA, (i+1)*SA) measured clockwise from the top pointer.
// After rotating the wheel by R degrees, segment i's center sits at
// i*SA + SA/2 + R, so it lands under the pointer when R ≡ -(i*SA + SA/2).

import type { Category, SegmentId } from "./types";

export interface SegmentDef {
  id: SegmentId;
  label: string;
  color: string;
  icon: string;
}

export const SEGMENTS: SegmentDef[] = [
  { id: "jedi", label: "JEDI", color: "#2f8fff", icon: "⚔️" },
  { id: "sith", label: "SITH", color: "#ff2f2f", icon: "💀" },
  { id: "clones", label: "CLONES", color: "#37c8c0", icon: "🪖" },
  { id: "droides", label: "DROIDES", color: "#e0a92e", icon: "🤖" },
  { id: "planetas", label: "PLANETAS", color: "#9a6dff", icon: "🪐" },
  { id: "silueta", label: "SILUETA", color: "#8b97b8", icon: "🌑" },
  { id: "comodin", label: "COMODÍN", color: "#ffe81f", icon: "❓" },
];

export const SEGMENT_ANGLE = 360 / SEGMENTS.length;

/** Absolute rotation (deg) that lands segment `index` under the top pointer. */
export function nextRotation(current: number, index: number, minTurns = 5): number {
  const target = (360 - (index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2)) % 360;
  const currentMod = ((current % 360) + 360) % 360;
  let delta = target - currentMod;
  if (delta <= 0) delta += 360;
  // Jitter stays well inside the segment (±11.6° of a ±25.7° half-segment).
  const jitter = (Math.random() - 0.5) * SEGMENT_ANGLE * 0.45;
  return current + minTurns * 360 + delta + jitter;
}

export function pickSegment(
  availableCategories: Category[],
  charQuestionsLeft: boolean,
  anyQuestionsLeft: boolean,
): SegmentId {
  const pool: SegmentId[] = [...availableCategories];
  if (charQuestionsLeft) pool.push("silueta");
  if (anyQuestionsLeft) pool.push("comodin", "comodin"); // comodín is fun: let it show up a bit more
  return pool[Math.floor(Math.random() * pool.length)];
}
