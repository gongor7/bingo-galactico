"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { sfx } from "@/lib/sfx";

/**
 * QR + enlace compartible para unirse a la sala (?room=CODE precarga el código).
 * La URL usa el origen actual: funciona igual en local y en producción.
 */
export default function JoinQr({ code }: { code: string }) {
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const u = `${window.location.origin}/?room=${code}`;
    setUrl(u);
    QRCode.toDataURL(u, {
      width: 320,
      margin: 1,
      color: { dark: "#e9eff6ff", light: "#0a0d12ff" },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      sfx.send();
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard no disponible: el usuario puede copiar el texto a mano */
    }
  };

  return (
    <div className="mt-5 flex items-center gap-4 border-t border-line pt-4">
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qr}
          alt={`Código QR para unirse a la sala ${code}`}
          className="h-28 w-28 flex-none border border-line-strong"
          width={112}
          height={112}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-display text-[9px] tracking-[0.3em] text-ink-faint">
          ESCANEA EL QR O COMPARTE EL ENLACE
        </p>
        <p className="mt-1 truncate font-body text-xs text-cyan">{url}</p>
        <button onClick={copy} onMouseEnter={() => sfx.hover()} className="btn-ghost mt-2 px-3 py-1.5 text-[10px]">
          {copied ? "¡Copiado!" : "Copiar enlace"}
        </button>
      </div>
    </div>
  );
}
