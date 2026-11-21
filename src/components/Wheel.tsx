"use client";

import { useEffect, useRef } from "react";
import { SEGMENTS, SEGMENT_ANGLE } from "@/game/wheel";
import type { SegmentId } from "@/game/types";
import { sfx } from "@/lib/sfx";
import {
  IconClone,
  IconComodin,
  IconDroid,
  IconJedi,
  IconPlanet,
  IconSilueta,
  IconSith,
} from "./Icons";

const CX = 200;
const CY = 200;
const R = 184;
const EASE = "cubic-bezier(.12,.82,.06,1)";

const ICONS: Record<string, (p: { size?: number }) => React.ReactElement> = {
  jedi: IconJedi,
  sith: IconSith,
  clones: IconClone,
  droides: IconDroid,
  planetas: IconPlanet,
  silueta: IconSilueta,
  comodin: IconComodin,
};

function polar(angleDeg: number, radius: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
}

function segmentPath(index: number): string {
  const a0 = index * SEGMENT_ANGLE;
  const a1 = (index + 1) * SEGMENT_ANGLE;
  const [x0, y0] = polar(a0, R);
  const [x1, y1] = polar(a1, R);
  return `M ${CX} ${CY} L ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1} Z`;
}

/**
 * Ruleta minimalista de solo iconos con estabilización giroscópica.
 * Al detenerse muestra debajo el nombre y significado del destino elegido.
 */
export default function Wheel({
  rotation,
  spinning,
  selectedSegment = null,
  durMs = 4200,
  className = "",
}: {
  rotation: number;
  spinning: boolean;
  selectedSegment?: SegmentId | null;
  durMs?: number;
  className?: string;
}) {
  const rotorRef = useRef<SVGGElement>(null);
  const lastTickSeg = useRef<number>(-1);

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

  const gyroStyle = (c: number): React.CSSProperties => ({
    transform: `rotate(${-(rotation + c)}deg)`,
    transformBox: "fill-box",
    transformOrigin: "center",
    transition: `transform ${durMs}ms ${EASE}`,
  });

  const landed = !spinning && selectedSegment ? SEGMENTS.find((s) => s.id === selectedSegment) ?? null : null;
  const LandedIcon = landed ? ICONS[landed.id] : null;

  return (
    <div className={`mx-auto flex w-full max-w-[400px] flex-col items-center ${className}`}>
      <div className="relative aspect-square w-full">
        {/* Soporte maquinado + aguja-sable */}
        <div className="absolute left-1/2 top-[-14px] z-10 flex -translate-x-1/2 flex-col items-center" aria-hidden>
          <div
            className="flex h-3 w-11 items-center justify-between border px-1.5"
            style={{ borderTopWidth: 0, borderColor: "rgba(168,196,224,.4)", background: "#10141b" }}
          >
            <span className="h-1 w-1 rounded-full" style={{ background: "#9aa8bb" }} />
            <span className="h-1 w-1 rounded-full" style={{ background: "#9aa8bb" }} />
          </div>
          <div className="flex flex-col items-center pt-0.5">
            <div className="h-5 w-3 bg-gradient-to-b from-[#8b95a5] via-[#333a47] to-[#10141b]" />
            <div
              className="w-[4px] rounded-full transition-all duration-300"
              style={{
                height: spinning ? 62 : 44,
                background: "linear-gradient(90deg,#fff6f6,#ff4b3e 45%,#8f1010)",
                boxShadow: spinning ? "0 0 18px 4px rgba(255,70,60,.65)" : "0 0 10px 2px rgba(255,70,60,.45)",
              }}
            />
          </div>
        </div>

        <svg viewBox="0 0 400 400" className="h-full w-full" role="img" aria-label="Ruleta de categorías">
          <defs>
            <radialGradient id="wheel-core-vignette" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#05070a" stopOpacity="0.6" />
              <stop offset="72%" stopColor="#05070a" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#05070a" stopOpacity="0.45" />
            </radialGradient>
          </defs>

          {/* Anillo exterior calibrado */}
          <circle cx={CX} cy={CY} r={R + 12} fill="none" stroke="rgba(168,196,224,.16)" strokeWidth="1" />
          <circle cx={CX} cy={CY} r={R + 5} fill="#070a0e" stroke="rgba(168,196,224,.32)" strokeWidth="1.2" />
          {SEGMENTS.map((_, i) => {
            const [tx, ty] = polar(i * SEGMENT_ANGLE, R + 8.5);
            return <circle key={i} cx={tx} cy={ty} r="1.6" fill="rgba(88,230,255,.55)" />;
          })}

          <g
            ref={rotorRef}
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "200px 200px",
              transition: `transform ${durMs}ms ${EASE}`,
            }}
          >
            {SEGMENTS.map((s, i) => {
              const c = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
              const Icon = ICONS[s.id];
              const isSelected = landed?.id === s.id;
              return (
                <g key={s.id}>
                  <path
                    d={segmentPath(i)}
                    fill={s.color}
                    fillOpacity={isSelected ? 0.36 : 0.16}
                    stroke={isSelected ? s.color : "rgba(168,196,224,.26)"}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  {/* Solo icono, centrado en un medallón limpio y estabilizado */}
                  <g transform={`rotate(${c} ${CX} ${CY})`}>
                    <g transform={`translate(${CX} ${CY - 118})`}>
                      <circle
                        cx={0}
                        cy={0}
                        r={27}
                        fill="#080c12"
                        fillOpacity={isSelected ? 0.92 : 0.72}
                        stroke={s.color}
                        strokeOpacity={isSelected ? 0.95 : 0.45}
                        strokeWidth={isSelected ? 2 : 1.2}
                      />
                      <g transform="translate(-17 -17)">
                        <g style={gyroStyle(c)} color={s.color}>
                          <Icon size={34} />
                        </g>
                      </g>
                    </g>
                  </g>
                </g>
              );
            })}
            <circle cx={CX} cy={CY} r={R} fill="url(#wheel-core-vignette)" pointerEvents="none" />
          </g>

          {/* Hub central maquinado */}
          <circle cx={CX} cy={CY} r="44" fill="#070a0e" stroke="rgba(168,196,224,.38)" strokeWidth="1.2" />
          <circle cx={CX} cy={CY} r="34" fill="none" stroke="rgba(88,230,255,.45)" strokeWidth="1" />
          <circle cx={CX} cy={CY} r="24" fill="none" stroke="rgba(168,196,224,.18)" strokeWidth="1" />
          {Array.from({ length: 6 }, (_, k) => {
            const [x1, y1] = polar((k * 360) / 6, 24);
            const [x2, y2] = polar((k * 360) / 6, 31);
            return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(88,230,255,.8)" strokeWidth="1.6" />;
          })}
          <circle cx={CX} cy={CY} r="3.5" fill="#58e6ff" />
        </svg>
      </div>

      {/* Significado del segmento cuando la ruleta se detiene */}
      <div className="mt-3 min-h-[64px] w-full">
        {landed && LandedIcon ? (
          <div
            key={landed.id}
            className="anim-pop flex items-center gap-3 border bg-surface2/90 px-3.5 py-2.5"
            style={{ borderColor: `${landed.color}66` }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center border bg-surface"
              style={{ color: landed.color, borderColor: `${landed.color}55` }}
            >
              <LandedIcon size={20} />
            </span>
            <div className="min-w-0 text-left">
              <p className="font-display text-xs font-bold tracking-[0.22em]" style={{ color: landed.color }}>
                {landed.label}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-ink-dim">{landed.meaning}</p>
            </div>
          </div>
        ) : spinning ? (
          <div className="flex h-[64px] items-center justify-center border border-line/60 bg-surface2/40 px-3">
            <p className="font-display text-[10px] tracking-[0.35em] text-ink-dim">GIRANDO DESTINO...</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
