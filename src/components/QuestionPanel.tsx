"use client";

import { useEffect, useRef, useState } from "react";
import { SEGMENTS } from "@/game/wheel";
import { CATEGORY_LABEL, ROUND_MS, type PublicQuestion, type RevealWinner } from "@/game/types";
import {
  IconClone,
  IconComodin,
  IconDroid,
  IconJedi,
  IconPlanet,
  IconSilueta,
  IconSith,
  IconTrophy,
} from "./Icons";

const ICONS: Record<string, (p: { size?: number }) => React.ReactElement> = {
  jedi: IconJedi,
  sith: IconSith,
  clones: IconClone,
  droides: IconDroid,
  planetas: IconPlanet,
  silueta: IconSilueta,
  comodin: IconComodin,
};

/** Barra de tiempo (carga del superláser): fina, cian → rojo en los últimos 8s. */
function TimerBar({ endsAt }: { endsAt: number }) {
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

  const frac = left === null ? 1 : Math.min(1, left / ROUND_MS);
  const secs = left === null ? null : Math.ceil(left / 1000);
  const danger = secs !== null && secs <= 8;
  return (
    <div className="flex items-center gap-3 sm:w-64">
      <div className="h-[3px] flex-1 bg-surface2">
        <div
          className="h-full transition-[width] duration-100"
          style={{
            width: `${frac * 100}%`,
            background: danger ? "#e85555" : "#58e6ff",
            boxShadow: danger ? "0 0 8px rgba(232,85,85,.7)" : "0 0 8px rgba(88,230,255,.5)",
          }}
        />
      </div>
      <span
        className={`w-7 text-right font-display text-sm font-bold leading-none ${danger ? "text-sith" : "text-cyan"}`}
        style={{ fontVariantNumeric: "tabular-nums" }}
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
      <div className="panel flex min-h-[280px] flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="anim-float text-ink-faint">
          <IconComodin size={30} />
        </span>
        <p className="font-display text-[10px] tracking-[0.4em] text-ink-faint">ESPERANDO SEÑAL</p>
      </div>
    );
  }

  const segment = q ? SEGMENTS.find((s) => s.id === q.segment) : null;
  const Icon = segment ? ICONS[segment.id] : null;

  return (
    <div className="panel p-4 sm:p-5">
      {/* Filtro SVG para siluetas holográficas sobre imágenes opacas */}
      <svg aria-hidden className="pointer-events-none absolute h-0 w-0 overflow-hidden">
        <defs>
          <filter id="sw-silueta" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0" result="gray" />
            <feGaussianBlur in="gray" stdDeviation="1.35" result="blurred" />
            <feComponentTransfer in="blurred" result="darkBase">
              <feFuncR type="linear" slope="0.18" intercept="-0.02" />
              <feFuncG type="linear" slope="0.28" intercept="-0.02" />
              <feFuncB type="linear" slope="0.38" intercept="0.01" />
            </feComponentTransfer>
            <feConvolveMatrix
              in="blurred"
              order="3"
              kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1"
              preserveAlpha="true"
              result="edges"
            />
            <feColorMatrix
              in="edges"
              type="matrix"
              values="0.32 0 0 0 0
                      0 1.45 0 0 0
                      0 0 1.9 0 0
                      0 0 0 1 0"
              result="cyanEdges"
            />
            <feBlend in="darkBase" in2="cyanEdges" mode="screen" />
          </filter>
        </defs>
      </svg>
      {q ? (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip" style={{ color: segment?.color }}>
                {Icon ? <Icon size={13} /> : null}
                {segment?.label}
              </span>
              {q.mode === "silueta" && (
                <span className="chip" style={{ color: "#ffe81f", borderColor: "rgba(255,232,31,.35)" }}>
                  <IconSilueta size={13} /> SILUETA ×2
                </span>
              )}
              {q.mode === "comodin" && (
                <span className="chip" style={{ color: "#ffe81f", borderColor: "rgba(255,232,31,.45)" }}>
                  <IconComodin size={13} /> DESAFÍO EXTREMO · ×3 PTS
                </span>
              )}
              <span className="font-display text-[10px] tracking-[0.28em] text-ink-faint">
                R{String(q.roundNo).padStart(2, "0")} ·{" "}
                {q.mode === "comodin" ? "CASILLA LIBRE" : CATEGORY_LABEL[q.category]}
              </span>
            </div>
            {reveal ? null : <TimerBar endsAt={q.endsAt} />}
          </div>

          <div className={`flex flex-col items-start gap-5 ${big ? "sm:flex-row sm:items-center" : ""}`}>
            {q.mode === "comodin" ? (
              <div
                key={reveal ? reveal.answerKey : `comodin-${q.roundNo}`}
                className="frame-target relative flex aspect-square w-full max-w-[230px] shrink-0 flex-col items-center justify-center overflow-hidden border bg-surface2 px-4 text-center"
                style={{ borderColor: "rgba(255,232,31,.4)" }}
              >
                <span className="anim-float" style={{ color: "#ffe81f" }}>
                  <IconComodin size={48} />
                </span>
                {reveal ? (
                  <>
                    <span className="mt-3 font-display text-[9px] tracking-[0.3em] text-ink-faint">
                      RESPUESTA DESCIFRADA
                    </span>
                    <span className="anim-pop mt-1.5 font-display text-base font-bold tracking-wide" style={{ color: "#ffe81f" }}>
                      {reveal.answerDisplay}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="mt-3 font-display text-[10px] font-bold tracking-[0.28em]" style={{ color: "#ffe81f" }}>
                      ARCHIVO CLASIFICADO
                    </span>
                    <span className="mt-1 text-[11px] leading-snug text-ink-dim">
                      Sin pista visual · Nivel Maestro
                    </span>
                  </>
                )}
              </div>
            ) : reveal ? (
              <div
                key={reveal.answerKey}
                className="anim-pop frame-target relative aspect-square w-full max-w-[230px] shrink-0 overflow-hidden border border-line-strong bg-surface2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={q.image} alt="Respuesta revelada" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-void/85 px-2 py-1.5 text-center">
                  <span className="font-display text-sm font-bold tracking-wide" style={{ color: "#ffe81f" }}>
                    {reveal.answerDisplay}
                  </span>
                </div>
              </div>
            ) : (
              <div
                className={`frame-target relative aspect-square w-full max-w-[230px] shrink-0 overflow-hidden border border-line bg-surface2 ${
                  q.mode === "silueta" ? "silueta-wrap" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={q.image}
                  alt={q.mode === "silueta" ? "Silueta del objetivo" : "Objetivo de la ronda"}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </div>
            )}

            <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
              <p className={`font-body font-semibold leading-snug text-ink ${big ? "text-lg sm:text-xl" : "text-base"}`}>
                {q.prompt}
              </p>

              {reveal ? (
                <div className="anim-banner border-l-2 border-cyan pl-4">
                  {reveal.winner ? (
                    <>
                      <p className="flex items-center gap-2 font-display text-lg font-bold tracking-wide text-ink sm:text-xl">
                        <IconTrophy size={20} style={{ color: "#58e6ff" }} />
                        {reveal.winner.nick} +{reveal.points}
                      </p>
                      <p className="mt-1 text-xs text-ink-dim">
                        {q.markTarget === "any" ? (
                          <>
                            ¡Comodín! El ganador elige <span style={{ color: "#ffe81f" }}>CUALQUIER CASILLA VACÍA</span> de su cartón.
                          </>
                        ) : (
                          <>
                            El ganador marca una casilla de <span className="text-ink">{q.category.toUpperCase()}</span> en su cartón.
                          </>
                        )}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-display text-sm tracking-[0.2em] text-ink-dim">SIN GANADOR · TIEMPO AGOTADO</p>
                      <p className="mt-1 text-xs text-ink-dim">Nadie marca en esta ronda.</p>
                    </>
                  )}
                </div>
              ) : (
                <p className="font-display text-[10px] tracking-[0.3em] text-ink-faint">
                  {q.mode === "comodin"
                    ? "DESAFÍO COMODÍN · QUIEN ACIERTE ELIGE CUALQUIER CASILLA"
                    : "EL PRIMERO EN ACERTAR GANA EL PUNTO"}
                </p>
              )}

              {buzzes && buzzes.length > 0 && !reveal && (
                <div className="flex flex-col gap-0.5">
                  {buzzes.map((n, i) => (
                    <span key={`${n}-${i}`} className="ticker-row text-xs text-ink-faint">
                      {n} falló la transmisión
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
