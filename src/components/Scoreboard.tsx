"use client";

import type { PlayerPub } from "@/game/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Scoreboard({
  players,
  highlightId,
  compact,
}: {
  players: PlayerPub[];
  highlightId?: string | null;
  compact?: boolean;
}) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const top = sorted[0]?.score ?? 1;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {sorted.map((p, i) => (
          <span
            key={p.id}
            className={`anim-pop flex items-center gap-1.5 border px-2 py-1 font-display text-[10px] tracking-wider ${
              p.id === highlightId ? "border-swyellow bg-swyellow/15 text-swyellow" : "border-holo/30 bg-black/40 text-starlight/85"
            }`}
          >
            {MEDALS[i] ?? `${i + 1}.`} {p.nick}
            <b className="text-swyellow">{p.score}</b>
          </span>
        ))}
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-1.5">
      {sorted.map((p, i) => (
        <li
          key={p.id}
          className={`anim-pop relative overflow-hidden border px-3 py-2 ${
            p.id === highlightId ? "border-swyellow/70" : "border-holo/25"
          }`}
        >
          <div
            className="absolute inset-y-0 left-0 bg-holo/10 transition-all duration-500"
            style={{ width: `${Math.max(6, (p.score / Math.max(top, 1)) * 100)}%` }}
          />
          <div className="relative flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-display text-xs tracking-wider text-starlight/90">
              <span className="w-6 text-center">{MEDALS[i] ?? i + 1}</span> {p.nick}
              {p.id === highlightId && <span className="text-swyellow">◄ ¡GANÓ!</span>}
            </span>
            <b className="font-display text-sm text-swyellow">{p.score}</b>
          </div>
        </li>
      ))}
    </ol>
  );
}
