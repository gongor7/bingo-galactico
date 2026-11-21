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

/**
 * Cartón v2: solo categorías (una por columna, en orden aleatorio por jugador).
 * Las casillas están vacías; el ganador de cada ronda elige dónde marcar en la
 * columna de la categoría ganada (resaltada y clicable mientras esté pendiente).
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
  // Column header categories = row 0 of the (row-major) card.
  const headers = card.slice(0, 5);

  return (
    <div className="panel p-3 sm:p-4">
      <div className="mb-3 flex items-baseline justify-between px-0.5">
        <span className="panel-title">Cartón de combate</span>
        <span className="font-display text-sm font-bold tracking-wider text-ink">{nick}</span>
      </div>

      <div className="grid grid-cols-5 gap-px border border-line bg-line/60">
        {headers.map((cat, c) => (
          <div
            key={c}
            className="flex items-center justify-center gap-1.5 bg-surface py-1.5 font-display text-[9px] font-bold tracking-[0.18em] sm:text-[10px]"
            style={{
              color: cat ? CAT_COLORS[cat] : undefined,
              opacity: pendingCategory && cat !== pendingCategory ? 0.35 : 1,
            }}
          >
            <span className="mt-px inline-block h-1.5 w-1.5 flex-none" style={{ background: cat ? CAT_COLORS[cat] : undefined }} />
            {cat}
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
          const isMarked = marks.has(i);
          const color = CAT_COLORS[cell];
          const clickable = Boolean(pendingCategory && markable?.has(i) && onMark);
          return (
            <button
              key={i}
              onClick={clickable ? () => onMark?.(i) : undefined}
              disabled={!clickable}
              title={clickable ? "Marcar aquí" : undefined}
              className={[
                "carton-cell relative flex h-[4.4rem] items-center justify-center bg-surface px-1 text-center sm:h-[4.8rem]",
                isMarked ? "marked" : "",
                isMarked && justMarkedCell === i ? "just-marked" : "",
                clickable ? "markable" : "",
                winSet.has(i) ? "anim-pulse" : "",
              ].join(" ")}
              style={{ color, cursor: clickable ? "pointer" : "default" }}
            >
              {isMarked ? (
                <span style={{ color }}>
                  <IconCheck size={20} />
                </span>
              ) : clickable ? (
                <span className="font-display text-lg leading-none opacity-70" style={{ color }}>
                  +
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {pendingCategory && (
        <p className="mt-2.5 px-0.5 font-display text-[9px] tracking-[0.24em]" style={{ color: CAT_COLORS[pendingCategory] }}>
          GANASTE · ELIGE UNA CASILLA EN LA COLUMNA {pendingCategory.toUpperCase()}
        </p>
      )}
    </div>
  );
}
