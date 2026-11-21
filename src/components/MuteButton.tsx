"use client";

import { useState } from "react";
import { isMuted, sfx, toggleMute } from "@/lib/sfx";

export default function MuteButton() {
  const [muted, setMuted] = useState(isMuted());
  return (
    <button
      onClick={() => setMuted(toggleMute())}
      onMouseEnter={() => sfx.hover()}
      className="btn-ghost bg-black/50 px-3 py-1.5 text-[10px]"
      title={muted ? "Activar sonido" : "Silenciar"}
      aria-label={muted ? "Activar sonido" : "Silenciar"}
    >
      {muted ? "🔇 SFX OFF" : "🔊 SFX ON"}
    </button>
  );
}
