"use client";

import type { PlayerPub } from "@/game/types";
import { IconTrophy } from "./Icons";

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
      <div className="flex flex-wrap gap-1.5">
        {sorted.map((p, i) => (
          <span
            key={p.id}
            className={`chip anim-pop ${p.id === highlightId ? "anim-pulse" : ""}`}
            style={p.id === highlightId ? { color: "#ffe81f", borderColor: "rgba(255,232,31,.4)" } : undefined}
          >
            {String(i + 1).padStart(2, "0")} {p.nick}
            <b className="text-cyan">{p.score}</b>
          </span>
        ))}
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-px bg-line/50">
      {sorted.map((p, i) => (
        <li
          key={p.id}
          className={`anim-pop relative flex items-center justify-between gap-3 bg-surface px-3 py-2.5 ${
            p.id === highlightId ? "anim-pulse" : ""
          }`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="w-6 shrink-0 text-center font-display text-xs text-ink-dim">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="truncate font-display text-xs tracking-wider text-ink">{p.nick}</span>
            {p.id === highlightId && <IconTrophy size={14} style={{ color: "#58e6ff", flex: "none" }} />}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-[2px] w-10 bg-surface2 sm:w-16">
              <span
                className="block h-full"
                style={{ width: `${Math.max(12, (p.score / Math.max(top, 1)) * 100)}%`, background: "#58e6ff" }}
              />
            </span>
            <b className="w-6 text-right font-display text-sm text-ink">{p.score}</b>
          </span>
        </li>
      ))}
    </ol>
  );
}
