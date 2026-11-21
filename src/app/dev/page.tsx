"use client";

// Dev-only preview of the core visual components with mock data.
// Visit /dev — no Supabase required. Excluded from nothing, but harmless.

import { useEffect, useState } from "react";
import Carton from "@/components/Carton";
import CodeTiles from "@/components/CodeTiles";
import HoloPanel from "@/components/HoloPanel";
import QuestionPanel from "@/components/QuestionPanel";
import Scoreboard from "@/components/Scoreboard";
import Wheel from "@/components/Wheel";
import { generateCard } from "@/game/cards";
import { imageFor } from "@/game/data";
import { nextRotation } from "@/game/wheel";
import type { PublicQuestion } from "@/game/types";

export default function DevPreview() {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  // Carta generada tras el montaje: Math.random() en el prerender rompería la hidratación.
  const [card, setCard] = useState<ReturnType<typeof generateCard> | null>(null);
  const [marked, setMarked] = useState<Set<string>>(new Set());

  useEffect(() => {
    const c = generateCard();
    setCard(c);
    const keys = c.filter((x) => x !== null).map((x) => x!.key);
    setMarked(new Set(keys.slice(0, 4)));
  }, []);

  const qFoto: PublicQuestion = {
    roundNo: 7,
    segment: "jedi",
    category: "jedi",
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
    mode: "silueta",
    prompt: "Zabrak de Dathomir con sable de doble hoja que sobrevivió a quedar partido en dos.",
    image: imageFor("maul"),
    points: 2,
    endsAt: Date.now() + 21_000,
  };
  const [mode, setMode] = useState<"foto" | "silueta" | "reveal">("foto");

  const spin = () => {
    setSpinning(true);
    setRotation(nextRotation(rotation, Math.floor(Math.random() * 7)));
    setTimeout(() => setSpinning(false), 4300);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="title-sw mb-1 text-3xl">Vista previa /dev</h1>
      <p className="mb-6 text-xs text-dim">Componentes con datos simulados — sin Supabase.</p>

      <div className="grid gap-5 lg:grid-cols-2">
        <HoloPanel title="Ruleta">
          <Wheel rotation={rotation} spinning={spinning} />
          <button onClick={spin} className="btn-sw mt-4 w-full bg-swyellow px-6 py-3 text-xs text-black">
            🎯 Girar (aleatorio)
          </button>
        </HoloPanel>

        <div className="flex flex-col gap-5">
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
          {card && <Carton card={card} marked={marked} nick="Skywalker77" />}
        </div>

        <HoloPanel title="Pregunta — modos">
          <div className="mb-3 flex gap-2">
            {(["foto", "silueta", "reveal"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className="btn-ghost px-3 py-1 text-[10px]">
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
            <QuestionPanel q={mode === "foto" ? qFoto : qSilueta} buzzes={["Wookiee", "HuttSlime"]} />
          )}
        </HoloPanel>
      </div>
    </main>
  );
}
