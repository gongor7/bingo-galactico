"use client";

import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/sfx";

/**
 * Terminal-style answer input. Parent controls `enabled`; the input keeps
 * itself rate-limited (0.9s) and plays its own feedback sounds.
 */
export default function AnswerInput({
  enabled,
  onSend,
  shakeKey,
  label = "RESPUESTA",
}: {
  enabled: boolean;
  onSend: (text: string) => void;
  shakeKey: number;
  label?: string;
}) {
  const [text, setText] = useState("");
  const [locked, setLocked] = useState(false);
  const [shake, setShake] = useState(0);
  const lastSend = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (enabled) inputRef.current?.focus();
  }, [enabled]);

  useEffect(() => {
    if (shakeKey > 0) {
      setShake((s) => s + 1);
      sfx.wrong();
      setLocked(false); // retry allowed until someone nails it
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shakeKey]);

  const submit = () => {
    const t = text.trim();
    if (!t || locked || !enabled) return;
    const now = Date.now();
    if (now - lastSend.current < 900) return;
    lastSend.current = now;
    sfx.send();
    onSend(t);
    setText("");
    setLocked(true);
    setTimeout(() => setLocked(false), 700);
  };

  return (
    <div className={`holo-panel holo-corners p-4 ${shake ? "" : ""}`} key-data="">
      <div className={`flex items-stretch gap-2 ${shake ? "anim-shake" : ""}`} key={shake}>
        <div className="pointer-events-none flex items-center pl-3 font-display text-xs tracking-[0.3em] text-holo/70">
          ▸
        </div>
        <input
          ref={inputRef}
          className="input-sw bg-transparent px-2 py-3 font-display text-sm tracking-wider"
          style={{ clipPath: "none" }}
          placeholder={enabled ? `${label}...` : "ESPERANDO PREGUNTA..."}
          value={text}
          disabled={!enabled}
          maxLength={40}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          onClick={submit}
          onMouseEnter={() => sfx.hover()}
          disabled={!enabled || !text.trim() || locked}
          className="btn-sw shrink-0 bg-swyellow px-4 text-[11px] text-black sm:px-6"
        >
          Transmitir
        </button>
      </div>
      <p className="mt-2 px-1 font-display text-[9px] tracking-[0.25em] text-dim">
        {enabled
          ? locked
            ? "TRANSMISIÓN ENVIADA..."
            : "PUEDES REINTENTAR · EL PRIMERO EN ACERTAR GANA"
          : "EL CANAL SE ABRIRÁ CUANDO CAIGA LA PREGUNTA"}
      </p>
    </div>
  );
}
