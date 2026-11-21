"use client";

import { useEffect, useRef, useState } from "react";
import { SEGMENTS } from "@/game/wheel";
import { CATEGORY_LABEL, type PublicQuestion } from "@/game/types";
import type { RevealWinner } from "@/game/types";

function TimerRing({ endsAt }: { endsAt: number }) {
  // null hasta montar: Date.now() en el prerender no coincide con el cliente.
  const [left, setLeft] = useState<number | null>(null);
  const raf = useRef(0);
  useEffect(() => {
    const loop = () => {
      setLeft(Math.max(0, endsAt - Date.now()));
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [endsAt]);

  const secs = left === null ? null : Math.ceil(left / 1000);
  const frac = left === null ? 1 : Math.min(1, left / 1000 / 35);
  const C = 2 * Math.PI * 26;
  const danger = secs !== null && secs <= 8;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r="26" fill="rgba(0,0,0,.5)" stroke="rgba(102,217,255,.25)" strokeWidth="4" />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke={danger ? "#ff4b3e" : "#ffe81f"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          style={{ filter: `drop-shadow(0 0 6px ${danger ? "#ff4b3e" : "#ffe81f"}88)` }}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-display text-lg font-bold ${danger ? "text-sith" : "text-swyellow"}`}
      >
        {secs ?? "··"}
      </span>
    </div>
  );
}

export interface RevealInfo {
  winner: RevealWinner | null;
  answerDisplay: string;
  answerKey: string;
  points: number;
}

export default function QuestionPanel({
  q,
  reveal,
  buzzes,
  big,
}: {
  q: PublicQuestion | null;
  reveal?: RevealInfo | null;
  buzzes?: string[];
  big?: boolean;
}) {
  if (!q && !reveal) {
    return (
      <div className="holo-panel holo-corners flex min-h-[280px] flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="anim-float text-4xl">🛰️</span>
        <p className="font-display text-xs tracking-[0.3em] text-dim">ESPERANDO SEÑAL...</p>
      </div>
    );
  }

  const segment = q ? SEGMENTS.find((s) => s.id === q.segment) : null;

  return (
    <div className="holo-panel holo-corners relative overflow-hidden p-4 sm:p-5">
      {q ? (
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="border px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.2em]"
                style={{ color: segment?.color, borderColor: `${segment?.color}66`, background: `${segment?.color}14` }}
              >
                {segment?.icon} {segment?.label}
              </span>
              {q.mode === "silueta" && (
                <span className="border border-swyellow/50 bg-swyellow/10 px-2 py-0.5 font-display text-[10px] font-bold tracking-[0.2em] text-swyellow">
                  SILUETA · ×2 PTS
                </span>
              )}
              <span className="px-1 font-display text-[10px] tracking-[0.2em] text-dim">
                RONDA {q.roundNo} · {CATEGORY_LABEL[q.category]}
              </span>
            </div>
            {reveal ? null : <TimerRing endsAt={q.endsAt} />}
          </div>

          <div className={`flex flex-col items-center gap-4 ${big ? "sm:flex-row sm:items-start" : ""}`}>
            {reveal ? (
              <div
                key={reveal.answerKey}
                className="anim-pop relative flex aspect-square w-full max-w-[240px] items-center justify-center overflow-hidden border border-swyellow/50 bg-black/60"
                style={{ boxShadow: "0 0 34px rgba(255,232,31,.25)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={q.image} alt="Respuesta revelada" className="h-full w-full object-cover" />
                <span className="absolute bottom-0 w-full bg-black/70 py-1 text-center font-display text-[11px] tracking-[0.25em] text-swyellow">
                  {reveal.answerDisplay}
                </span>
              </div>
            ) : (
              <div
                className={`relative flex aspect-square w-full max-w-[240px] items-center justify-center overflow-hidden border border-holo/40 bg-black/70 ${
                  q.mode === "silueta" ? "silueta-wrap" : ""
                }`}
                style={{ boxShadow: q.mode === "silueta" ? "0 0 26px rgba(102,217,255,.25)" : "0 0 26px rgba(77,180,255,.2)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={q.image}
                  alt={q.mode === "silueta" ? "Silueta del objetivo" : "Objetivo de la ronda"}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                {q.mode === "silueta" && (
                  <span className="absolute right-1 top-1 font-display text-[9px] tracking-[0.3em] text-holo/70">
                    IDENTIFICA
                  </span>
                )}
              </div>
            )}

            <div className="flex w-full flex-1 flex-col gap-3">
              <p className={`font-body font-semibold leading-snug text-starlight ${big ? "text-lg sm:text-xl" : "text-base"}`}>
                {q.prompt}
              </p>

              {reveal ? (
                <div className="anim-banner">
                  {reveal.winner ? (
                    <p className="title-sw text-xl sm:text-2xl">¡{reveal.winner.nick} gana +{reveal.points}!</p>
                  ) : (
                    <p className="font-display text-lg tracking-[0.2em] text-dim">SIN GANADOR · SE ACABÓ EL TIEMPO</p>
                  )}
                  <p className="mt-1 text-xs text-dim">
                    Todos los que tengan <span className="text-swyellow">{reveal.answerDisplay}</span> en su cartón lo marcan.
                  </p>
                </div>
              ) : (
                <p className="font-display text-[11px] tracking-[0.25em] text-holo/80">
                  EL PRIMERO EN ACERTAR GANA · SILENCIO EN LA FRECUENCIA
                </p>
              )}

              {buzzes && buzzes.length > 0 && !reveal && (
                <div className="flex flex-col gap-1">
                  {buzzes.map((n, i) => (
                    <span key={`${n}-${i}`} className="ticker-row text-xs text-sith/90">
                      ✗ {n} falló la transmisión
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
