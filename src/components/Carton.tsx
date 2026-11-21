"use client";

import type { Card as CardData, Category } from "@/game/types";
import { IconCheck, IconStarFree } from "./Icons";

export const CAT_COLORS: Record<Category, string> = {
  jedi: "#6cb6f2",
  sith: "#f07f7f",
  clones: "#7dd8d0",
  droides: "#e6c266",
  planetas: "#b9a3f2",
};

const CAT_SHORT: Record<Category, string> = {
  jedi: "JEDI",
  sith: "SITH",
  clones: "CLON",
  droides: "DROID",
  planetas: "PLANETA",
};

/**
 * Cartón v3 "disperso": sin columnas fijas — las 25 casillas llevan una
 * categoría al azar (5 de cada una). El ganador de la ronda marca cualquier
 * casilla vacía de la categoría ganada (resaltada y clicable hasta colocarla).
 */
export default function Carton({
  card,
  marks,
  justMarkedCell,
  pendingCategory,
  markable,
  onMark,
  nick,
  winLine,
}: {
  card: CardData;
  marks: Set<number>;
  justMarkedCell?: number | null;
  pendingCategory?: Category | null;
  markable?: Set<number>;
  onMark?: (cell: number) => void;
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

      <div className="grid grid-cols-5 gap-px border border-line bg-line/60">
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
          const isMarked = marks.has(i);
          const color = CAT_COLORS[cell];
          const clickable = Boolean(pendingCategory && markable?.has(i) && onMark);
          return (
            <button
              key={i}
              onClick={clickable ? () => onMark?.(i) : undefined}
              disabled={!clickable}
              title={clickable ? `Marcar aquí (${CAT_SHORT[cell]})` : CAT_SHORT[cell]}
              className={[
                "carton-cell relative flex h-[4.4rem] flex-col items-center justify-center bg-surface px-1 text-center sm:h-[4.8rem]",
                isMarked ? "marked" : "",
                isMarked && justMarkedCell === i ? "just-marked" : "",
                clickable ? "markable" : "",
                winSet.has(i) ? "anim-pulse" : "",
              ].join(" ")}
              style={{ color, cursor: clickable ? "pointer" : "default", borderTop: `3px solid ${color}` }}
            >
              {isMarked ? (
                <span style={{ color }}>
                  <IconCheck size={20} />
                </span>
              ) : (
                <span className="font-display text-[8px] font-bold tracking-[0.14em] opacity-80 sm:text-[9px]" style={{ color }}>
                  {CAT_SHORT[cell]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {pendingCategory && (
        <p className="mt-2.5 px-0.5 font-display text-[9px] tracking-[0.24em]" style={{ color: CAT_COLORS[pendingCategory] }}>
          GANASTE · MARCA UNA CASILLA {pendingCategory.toUpperCase()} (OBLIGATORIO)
        </p>
      )}
    </div>
  );
}
