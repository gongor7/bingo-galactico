"use client";

import { useEffect, useRef } from "react";
import { SEGMENTS, SEGMENT_ANGLE } from "@/game/wheel";
import { sfx } from "@/lib/sfx";

const CX = 200;
const CY = 200;
const R = 188;

function polar(angleDeg: number, radius: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
}

function segmentPath(index: number): string {
  const a0 = index * SEGMENT_ANGLE;
  const a1 = (index + 1) * SEGMENT_ANGLE;
  const [x0, y0] = polar(a0, R);
  const [x1, y1] = polar(a1, R);
  const large = SEGMENT_ANGLE > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
}

/**
 * Holoprojector wheel. Rotation is an absolute degree value (set by the host
 * engine); the CSS transition animates there and rAF ticks play per segment.
 */
export default function Wheel({
  rotation,
  spinning,
  durMs = 4200,
  className = "",
}: {
  rotation: number;
  spinning: boolean;
  durMs?: number;
  className?: string;
}) {
  const rotorRef = useRef<SVGGElement>(null);
  const lastTickSeg = useRef<number>(-1);

  // Play a tick each time the rotation crosses a segment boundary.
  useEffect(() => {
    if (!spinning || typeof window === "undefined") return;
    let raf = 0;
    const tick = () => {
      const el = rotorRef.current;
      if (el) {
        const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
        const angle = ((Math.atan2(m.b, m.a) * 180) / Math.PI + 360) % 360;
        const seg = Math.floor(angle / SEGMENT_ANGLE);
        if (lastTickSeg.current >= 0 && seg !== lastTickSeg.current) sfx.tick();
        lastTickSeg.current = seg;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spinning]);

  return (
    <div className={`relative mx-auto aspect-square w-full max-w-[420px] ${className}`}>
      {/* Lightsaber pointer */}
      <div
        className="saber-pointer absolute left-1/2 top-[-12px] z-10 flex -translate-x-1/2 flex-col items-center"
        style={{ filter: spinning ? "drop-shadow(0 0 12px rgba(255,60,60,.95))" : "drop-shadow(0 0 6px rgba(255,60,60,.55))" }}
        aria-hidden
      >
        <div className="h-10 w-5 rounded-sm bg-gradient-to-b from-[#aab4c5] via-[#3c4454] to-[#141821] shadow-inner" />
        <div
          className="w-[7px] rounded-full transition-all"
          style={{
            height: spinning ? 92 : 64,
            background: "linear-gradient(90deg, #fff5f5, #ff4b3e 45%, #b31212)",
            boxShadow: spinning ? "0 0 22px 5px rgba(255,70,60,.85)" : "0 0 12px 3px rgba(255,70,60,.5)",
          }}
        />
      </div>

      <svg viewBox="0 0 400 400" className="h-full w-full" role="img" aria-label="Ruleta de categorías">
        <defs>
          <radialGradient id="hub" cx="50%" cy="35%">
            <stop offset="0%" stopColor="#22304d" />
            <stop offset="100%" stopColor="#060a14" />
          </radialGradient>
          {SEGMENTS.map((s) => (
            <radialGradient key={s.id} id={`seg-${s.id}`} cx="50%" cy="50%" r="75%">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="70%" stopColor={s.color} stopOpacity="0.5" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.85" />
            </radialGradient>
          ))}
        </defs>

        {/* outer ring */}
        <circle cx={CX} cy={CY} r={R + 9} fill="#0a0f1c" stroke="rgba(102,217,255,.4)" strokeWidth="2" />
        <circle cx={CX} cy={CY} r={R + 3} fill="#0d1424" stroke="rgba(255,232,31,.35)" strokeWidth="1.5" />

        <g
          ref={rotorRef}
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "200px 200px",
            transition: `transform ${durMs}ms cubic-bezier(.12,.82,.06,1)`,
          }}
        >
          {SEGMENTS.map((s, i) => {
            const center = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
            return (
              <g key={s.id}>
                <path d={segmentPath(i)} fill={`url(#seg-${s.id})`} stroke="#04070f" strokeWidth="2.5" />
                <g transform={`rotate(${center} ${CX} ${CY})`}>
                  <text
                    x={CX}
                    y={CY - R + 62}
                    textAnchor="middle"
                    fontSize="20"
                    fontWeight="800"
                    fill="#eaf4ff"
                    stroke="#04070f"
                    strokeWidth="3.5"
                    paintOrder="stroke"
                    style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}
                  >
                    {s.label}
                  </text>
                  <text x={CX} y={CY - R + 104} textAnchor="middle" fontSize="31">
                    {s.icon}
                  </text>
                  {s.id === "silueta" && (
                    <text
                      x={CX}
                      y={CY - R + 130}
                      textAnchor="middle"
                      fontSize="13"
                      fill="#ffe81f"
                      stroke="#04070f"
                      strokeWidth="2.5"
                      paintOrder="stroke"
                      fontWeight="700"
                    >
                      ×2 PTS
                    </text>
                  )}
                </g>
              </g>
            );
          })}
          {/* rivets */}
          {SEGMENTS.map((_, i) => {
            const [x, y] = polar(i * SEGMENT_ANGLE, R - 4);
            return <circle key={i} cx={x} cy={y} r="2.6" fill="rgba(255,255,255,.55)" />;
          })}
        </g>

        {/* hub + rebel star */}
        <circle cx={CX} cy={CY} r="52" fill="url(#hub)" stroke="rgba(255,232,31,.5)" strokeWidth="2" />
        <g transform={`translate(${CX} ${CY})`}>
          <path
            d="M 0 -26 L 7 -8 L 26 -8 L 11 4 L 17 23 L 0 11 L -17 23 L -11 4 L -26 -8 L -7 -8 Z"
            fill="none"
            stroke="#ffe81f"
            strokeWidth="2.4"
            opacity="0.95"
          />
        </g>
      </svg>
    </div>
  );
}
