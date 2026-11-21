"use client";

import { useEffect, useRef } from "react";
import { SEGMENTS, SEGMENT_ANGLE } from "@/game/wheel";
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
const R = 186;
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
 * Ruleta de la consola. Etiquetas giroscópicas: cada grupo contra-rota
 * (-(rotación + ángulo del segmento)) con la MISMA curva de transición que
 * el rotor, de modo que quedan horizontales para el espectador durante
 * todo el giro y en reposo.
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

  return (
    <div className={`relative mx-auto aspect-square w-full max-w-[420px] ${className}`}>
      {/* Soporte maquinado + aguja-sable (único rojo del sistema) */}
      <div className="absolute left-1/2 top-[-16px] z-10 flex -translate-x-1/2 flex-col items-center" aria-hidden>
        <div
          className="flex h-3.5 w-12 items-center justify-between border px-1.5"
          style={{ borderTopWidth: 0, borderColor: "rgba(168,196,224,.4)", background: "#10141b" }}
        >
          <span className="h-1 w-1 rounded-full" style={{ background: "#9aa8bb" }} />
          <span className="h-1 w-1 rounded-full" style={{ background: "#9aa8bb" }} />
        </div>
        <div className="flex flex-col items-center pt-0.5">
          <div className="h-6 w-3.5 bg-gradient-to-b from-[#8b95a5] via-[#333a47] to-[#10141b]" />
          <div
            className="w-[5px] rounded-full transition-all"
            style={{
              height: spinning ? 78 : 54,
              background: "linear-gradient(90deg,#fff6f6,#ff4b3e 45%,#8f1010)",
              boxShadow: spinning ? "0 0 18px 4px rgba(255,70,60,.65)" : "0 0 10px 2px rgba(255,70,60,.4)",
            }}
          />
        </div>
      </div>

      <svg viewBox="0 0 400 400" className="h-full w-full" role="img" aria-label="Ruleta de categorías">
        {/* anillo exterior calibrado */}
        <circle cx={CX} cy={CY} r={R + 10} fill="none" stroke="rgba(168,196,224,.18)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R + 4} fill="#080b0f" stroke="rgba(168,196,224,.3)" strokeWidth="1" />
        {SEGMENTS.map((_, i) => {
          const [tx, ty] = polar(i * SEGMENT_ANGLE, R + 7);
          return <circle key={i} cx={tx} cy={ty} r="1.4" fill="rgba(168,196,224,.55)" />;
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
            return (
              <g key={s.id}>
                <path d={segmentPath(i)} fill={s.color} fillOpacity={0.22} stroke="rgba(168,196,224,.28)" strokeWidth="1" />
                <g transform={`rotate(${c} ${CX} ${CY})`}>
                  {/* etiqueta giroscópica: siempre horizontal */}
                  <g transform={`translate(${CX} ${CY - 112})`}>
                    <g style={gyroStyle(c)}>
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="15"
                        fontWeight="700"
                        fill="#e9eff6"
                        style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}
                      >
                        {s.label}
                      </text>
                    </g>
                  </g>
                  {/* icono giroscópico en color de facción */}
                  <g transform={`translate(${CX - 12} ${CY - 58})`}>
                    <g style={gyroStyle(c)} color={s.color}>
                      <Icon size={24} />
                    </g>
                  </g>
                </g>
              </g>
            );
          })}
        </g>

        {/* hub maquinado: anillos + ticks + punto */}
        <circle cx={CX} cy={CY} r="42" fill="#070a0e" stroke="rgba(168,196,224,.34)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r="33" fill="none" stroke="rgba(88,230,255,.45)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r="25" fill="none" stroke="rgba(168,196,224,.2)" strokeWidth="1" />
        {Array.from({ length: 6 }, (_, k) => {
          const [x1, y1] = polar((k * 360) / 6, 24);
          const [x2, y2] = polar((k * 360) / 6, 31);
          return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(88,230,255,.8)" strokeWidth="1.6" />;
        })}
        <circle cx={CX} cy={CY} r="3" fill="#58e6ff" />
      </svg>
    </div>
  );
}
