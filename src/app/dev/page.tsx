"use client";

// Dev-only preview of the core visual components with mock data.
// Visit /dev — no Supabase required.

import { useEffect, useState } from "react";
import Carton from "@/components/Carton";
import CodeTiles from "@/components/CodeTiles";
import HoloPanel from "@/components/HoloPanel";
import QuestionPanel from "@/components/QuestionPanel";
import Scoreboard from "@/components/Scoreboard";
import Wheel from "@/components/Wheel";
import { IconSpin } from "@/components/Icons";
import { generateCard } from "@/game/cards";
import { imageFor } from "@/game/data";
import { nextRotation, SEGMENTS } from "@/game/wheel";
import type { PublicQuestion, SegmentId } from "@/game/types";

export default function DevPreview() {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [selectedSeg, setSelectedSeg] = useState<SegmentId | null>(null);
  // Carta generada tras el montaje: Math.random() en el prerender rompería la hidratación.
  const [card, setCard] = useState<ReturnType<typeof generateCard> | null>(null);
  const [marked, setMarked] = useState<Set<number>>(new Set());

  useEffect(() => {
    const c = generateCard();
    setCard(c);
    const cells = c.map((x, i) => (x !== null ? i : -1)).filter((i) => i >= 0);
    setMarked(new Set(cells.slice(0, 4)));
  }, []);

  const qFoto: PublicQuestion = {
    roundNo: 7,
    segment: "jedi",
    category: "jedi",
    markTarget: "jedi",
    mode: "foto",
    prompt: "Pequeño, verde y de 900 años. «Hazlo o no lo hagas, pero no lo intentes».",
    image: imageFor("yoda"),
    points: 1,
    endsAt: Date.now() + 21_000,
  };
  const qSilueta: PublicQuestion = {
    roundNo: 8,
    segment: "silueta",
    category: "sith",
    markTarget: "sith",
    mode: "silueta",
    prompt: "Zabrak de Dathomir con sable de doble hoja que sobrevivió a quedar partido en dos.",
    image: imageFor("maul"),
    points: 2,
    endsAt: Date.now() + 21_000,
  };
  const qComodin: PublicQuestion = {
    roundNo: 9,
    segment: "comodin",
    category: "jedi",
    markTarget: "any",
    mode: "comodin",
    prompt: "¿Cómo se llama la variante de la Forma VII de combate con sable de luz creada y perfeccionada por Mace Windu?",
    image: "",
    points: 3,
    endsAt: Date.now() + 21_000,
  };
  const [mode, setMode] = useState<"foto" | "silueta" | "comodin" | "reveal">("foto");

  const spin = () => {
    const idx = Math.floor(Math.random() * SEGMENTS.length);
    setSelectedSeg(SEGMENTS[idx].id);
    setSpinning(true);
    setRotation(nextRotation(rotation, idx));
    setTimeout(() => setSpinning(false), 4200);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="title-plain mb-1 text-2xl">Vista previa /dev</h1>
      <p className="mb-6 text-xs text-ink-faint">Componentes con datos simulados — sin Supabase.</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <HoloPanel title="Ruleta">
          <Wheel rotation={rotation} spinning={spinning} selectedSegment={selectedSeg} />
          <button
            onClick={spin}
            className="btn-primary mt-5 flex w-full items-center justify-center gap-2 px-6 py-3 text-xs"
          >
            <IconSpin size={14} />
            Girar (aleatorio)
          </button>
        </HoloPanel>

        <div className="flex flex-col gap-4">
          <HoloPanel title="Código + marcador">
            <CodeTiles code="SWR23" />
            <div className="mt-4">
              <Scoreboard
                players={[
                  { id: "1", nick: "Skywalker77", score: 7 },
                  { id: "2", nick: "MandoFan", score: 5 },
                  { id: "3", nick: "Wookiee", score: 5 },
                  { id: "4", nick: "HuttSlime", score: 1 },
                ]}
                highlightId="1"
              />
            </div>
          </HoloPanel>
          {card && <Carton card={card} marks={marked} nick="Skywalker77" />}
        </div>

        <HoloPanel title="Pregunta · modos">
          <div className="mb-3 flex gap-1.5">
            {(["foto", "silueta", "comodin", "reveal"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={m === mode ? "btn-primary px-3 py-1 text-[10px]" : "btn-ghost px-3 py-1 text-[10px]"}
              >
                {m}
              </button>
            ))}
          </div>
          {mode === "reveal" ? (
            <QuestionPanel
              q={qFoto}
              reveal={{ winner: { id: "2", nick: "MandoFan" }, answerDisplay: "Yoda", answerKey: "yoda", points: 1 }}
            />
          ) : (
            <QuestionPanel
              q={mode === "foto" ? qFoto : mode === "silueta" ? qSilueta : qComodin}
              buzzes={["Wookiee", "HuttSlime"]}
            />
          )}
        </HoloPanel>
      </div>
    </main>
  );
}
