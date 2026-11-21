"use client";

import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/sfx";
import { IconSend } from "./Icons";

/**
 * Input de respuesta tipo terminal. El padre controla `enabled`;
 * rate-limit propio de 0.9s y feedback de error integrado.
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
      setLocked(false);
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
    <div className="panel p-4">
      <div className={`flex items-stretch gap-2 ${shake ? "anim-shake" : ""}`} key={shake}>
        <span className="pointer-events-none flex items-center pl-3 font-display text-xs" style={{ color: "#58e6ff" }}>
          ▸
        </span>
        <input
          ref={inputRef}
          className="input-sw border-0 bg-transparent px-1 font-display text-sm tracking-wider focus:border-0"
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
          className="btn-primary flex shrink-0 items-center gap-2 px-4 text-[11px]"
        >
          <IconSend size={14} />
          Enviar
        </button>
      </div>
      <p className="mt-2.5 px-1 font-display text-[9px] tracking-[0.28em] text-ink-faint">
        {enabled
          ? locked
            ? "TRANSMISIÓN ENVIADA"
            : "REINTENTO PERMITIDO · GANA EL PRIMERO EN ACERTAR"
          : "EL CANAL SE ABRE CUANDO CAIGA LA PREGUNTA"}
      </p>
    </div>
  );
}
