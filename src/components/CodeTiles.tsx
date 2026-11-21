"use client";

/** Room code rendered as cockpit tiles. */
export default function CodeTiles({ code, size = "md" }: { code: string; size?: "md" | "lg" }) {
  const cls =
    size === "lg"
      ? "h-16 w-12 text-3xl sm:h-20 sm:w-16 sm:text-5xl"
      : "h-10 w-8 text-xl sm:h-12 sm:w-10 sm:text-2xl";
  return (
    <div className="flex justify-center gap-2" aria-label={`Código de sala ${code}`}>
      {code.split("").map((ch, i) => (
        <span
          key={i}
          className={`title-sw anim-pop flex items-center justify-center border border-swyellow/40 bg-black/50 ${cls}`}
          style={{ animationDelay: `${i * 90}ms`, clipPath: "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)" }}
        >
          {ch}
        </span>
      ))}
    </div>
  );
}
