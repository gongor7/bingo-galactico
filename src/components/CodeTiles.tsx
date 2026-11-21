"use client";

/** Código de sala como display segmentado (una pieza, divisores hairline). */
export default function CodeTiles({ code, size = "md" }: { code: string; size?: "md" | "lg" }) {
  const box =
    size === "lg" ? "h-14 text-2xl sm:h-16 sm:text-4xl" : "h-10 text-lg sm:h-11 sm:text-xl";
  const cell = size === "lg" ? "w-13 sm:w-15" : "w-9 sm:w-10";
  return (
    <div className="flex justify-center" aria-label={`Código de sala ${code}`}>
      <div className="panel anim-pop flex items-stretch divide-x divide-line" style={{ borderColor: "rgba(168,196,224,.32)" }}>
        {code.split("").map((ch, i) => (
          <span
            key={i}
            className={`flex items-center justify-center font-display font-bold tracking-normal text-ink ${box} ${cell}`}
            style={{ animationDelay: `${i * 70}ms` }}
          >
            {ch}
          </span>
        ))}
      </div>
    </div>
  );
}
