"use client";

import { useState } from "react";
import { isMuted, sfx, toggleMute } from "@/lib/sfx";
import { IconSpeaker, IconSpeakerOff } from "./Icons";

export default function MuteButton() {
  const [muted, setMuted] = useState(isMuted());
  return (
    <button
      onClick={() => setMuted(toggleMute())}
      onMouseEnter={() => sfx.hover()}
      className="btn-ghost flex items-center gap-2 px-3 py-1.5 text-[10px]"
      title={muted ? "Activar sonido" : "Silenciar"}
      aria-label={muted ? "Activar sonido" : "Silenciar"}
    >
      {muted ? <IconSpeakerOff size={14} /> : <IconSpeaker size={14} />}
      SFX {muted ? "OFF" : "ON"}
    </button>
  );
}
