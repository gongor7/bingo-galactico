"use client";

import { CATEGORIES, CATEGORY_LABEL, type Card as CardData, type Category } from "@/game/types";
import { poolEntry } from "@/game/data";

export const CAT_COLORS: Record<Category, string> = {
  jedi: "#4db4ff",
  sith: "#ff4b3e",
  clones: "#37c8c0",
  droides: "#e0a92e",
  planetas: "#9a6dff",
};

/**
 * El cartón: 5×5 con columnas por facción y estrella libre central.
 * Las casillas marcadas reciben la retícula de tiro (CSS ::before/::after).
 */
export default function Carton({
  card,
  marked,
  justMarkedKey,
  nick,
  winLine,
}: {
  card: CardData;
  marked: Set<string>;
  justMarkedKey?: string | null;
  nick: string;
  winLine?: number[] | null;
}) {
  const winSet = new Set(winLine ?? []);
  return (
    <div className="holo-panel holo-corners carton-grid p-3 sm:p-4">
      <div className="mb-3 flex items-baseline justify-between px-1">
        <span className="holo-title" style={{ letterSpacing: "0.28em" }}>
          Cartón de combate
        </span>
        <span className="font-display text-[10px] tracking-widest text-dim">// {nick}</span>
      </div>

      <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
        {CATEGORIES.map((cat) => (
          <div
            key={cat}
            className="py-1 text-center font-display text-[9px] font-bold tracking-[0.2em] sm:text-[11px]"
            style={{ color: CAT_COLORS[cat], textShadow: `0 0 10px ${CAT_COLORS[cat]}66` }}
          >
            {CATEGORY_LABEL[cat]}
          </div>
        ))}

        {card.map((cell, i) => {
          if (cell === null) {
            return (
              <div
                key={i}
                className="free flex h-16 flex-col items-center justify-center border border-swyellow/40 bg-swyellow/10 sm:h-20 lg:h-[4.6rem]"
                style={{ color: "#ffe81f" }}
              >
                <span className="text-lg leading-none sm:text-xl">★</span>
                <span className="mt-0.5 font-display text-[8px] tracking-[0.25em] sm:text-[9px]">LIBRE</span>
              </div>
            );
          }
          const entry = poolEntry(cell.key);
          const isMarked = marked.has(cell.key);
          const color = CAT_COLORS[cell.cat];
          return (
            <div
              key={i}
              title={entry?.display ?? cell.key}
              className={[
                "carton-cell flex h-16 items-center justify-center border border-white/10 bg-black/45 px-1 text-center sm:h-20 lg:h-[4.6rem]",
                isMarked ? "marked" : "",
                isMarked && justMarkedKey === cell.key ? "just-marked" : "",
                winSet.has(i) ? "anim-glow" : "",
              ].join(" ")}
              style={{ color, borderLeft: `3px solid ${color}${isMarked ? "" : "88"}` }}
            >
              <span
                className={[
                  "pointer-events-none text-[9px] font-semibold leading-tight sm:text-[11px]",
                  isMarked ? "opacity-45" : "text-starlight/90",
                ].join(" ")}
              >
                {entry?.display ?? cell.key}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
