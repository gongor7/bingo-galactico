"use client";

import { CATEGORIES, CATEGORY_LABEL, type Card as CardData, type Category } from "@/game/types";
import { poolEntry } from "@/game/data";
import { IconCheck, IconStarFree } from "./Icons";

export const CAT_COLORS: Record<Category, string> = {
  jedi: "#6cb6f2",
  sith: "#f07f7f",
  clones: "#7dd8d0",
  droides: "#e6c266",
  planetas: "#b9a3f2",
};

/**
 * Cartón 5×5 con columnas por facción y estrella libre central.
 * Marcado: tinte de facción + anillo fino + check.
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
    <div className="panel p-3 sm:p-4">
      <div className="mb-3 flex items-baseline justify-between px-0.5">
        <span className="panel-title">Cartón de combate</span>
        <span className="font-display text-sm font-bold tracking-wider text-ink">{nick}</span>
      </div>

      <div className="grid grid-cols-5 gap-px bg-line/60 border border-line">
        {CATEGORIES.map((cat) => (
          <div
            key={cat}
            className="flex items-center justify-center gap-1.5 bg-surface py-1.5 font-display text-[9px] font-bold tracking-[0.22em] sm:text-[10px]"
            style={{ color: CAT_COLORS[cat] }}
          >
            <span className="mt-px inline-block h-1.5 w-1.5 flex-none" style={{ background: CAT_COLORS[cat] }} />
            {CATEGORY_LABEL[cat]}
          </div>
        ))}

        {card.map((cell, i) => {
          if (cell === null) {
            return (
              <div
                key={i}
                className="free flex h-[4.4rem] flex-col items-center justify-center bg-surface2 sm:h-[4.8rem]"
                style={{ color: "#ffe81f" }}
              >
                <IconStarFree size={20} />
                <span className="mt-1 font-display text-[8px] tracking-[0.3em] text-ink-dim">LIBRE</span>
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
                "carton-cell relative flex h-[4.4rem] items-center justify-center bg-surface px-1 text-center sm:h-[4.8rem]",
                isMarked ? "marked" : "",
                isMarked && justMarkedKey === cell.key ? "just-marked" : "",
                winSet.has(i) ? "anim-pulse" : "",
              ].join(" ")}
              style={{ color }}
            >
              <span
                className={`pointer-events-none px-1 text-[11px] font-semibold leading-tight sm:text-[12.5px] ${
                  isMarked ? "text-ink" : "text-ink/90"
                }`}
              >
                {entry?.display ?? cell.key}
              </span>
              {isMarked && (
                <span className="absolute right-1.5 top-1.5">
                  <IconCheck size={16} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
