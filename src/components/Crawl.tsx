"use client";

import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/sfx";

/** Iconic opening crawl. Shown full-screen; call onFinish to dismiss. */
export default function Crawl({ onFinish }: { onFinish: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Música de intro: si el usuario coloca su propio /intro-theme.mp3 en
  // public/, suena ese archivo; si no (o si el autoplay está bloqueado),
  // suena la fanfarria original sintetizada (sfx.fanfare).
  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    try {
      const a = new Audio("/intro-theme.mp3");
      audioRef.current = a;
      a.volume = 0.8;
      a.onerror = () => {
        if (!cancelled) sfx.fanfare();
      };
      const playing = a.play();
      if (playing) {
        playing
          .then(() => {
            if (cancelled) a.pause();
          })
          .catch(() => {
            if (!cancelled) sfx.fanfare();
          });
      }
      // Red de seguridad: si en 1.5 s no empezó el audio, fanfarria.
      fallbackTimer = setTimeout(() => {
        if (!cancelled && a.paused) sfx.fanfare();
      }, 1500);
    } catch {
      sfx.fanfare();
    }
    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const finish = () => {
    if (leaving) return;
    setLeaving(true);
    if (audioRef.current) audioRef.current.pause();
    sfx.gameover();
    setTimeout(onFinish, 650);
  };

  return (
    <div
      className="crawl-stage transition-opacity duration-500"
      style={leaving ? { opacity: 0, pointerEvents: "none" } : undefined}
      onAnimationEnd={(e) => {
        if (e.animationName === "crawl-fade") finish();
      }}
    >
      <div className="crawl-plane">
        <div className="crawl-text px-4 text-center" onAnimationEnd={undefined}>
          <p className="title-sw mb-6 text-3xl sm:text-4xl">Episodio IV</p>
          <p className="title-sw mb-10 text-4xl sm:text-5xl">Bingo Galáctico</p>
          <p className="mb-6 text-lg leading-relaxed text-[#ffd54a] sm:text-xl">
            La galaxia está en juego. El temido IMPERIO DEL ABURRIMIENTO ha
            secuestrado las fiestas de mil millones de mundos...
          </p>
          <p className="mb-6 text-lg leading-relaxed text-[#ffd54a] sm:text-xl">
            Un grupo de rebeldes se reúne en torno a una holomesa secreta. Cada
            uno recibe un CARTÓN DE COMBATE. Una RULETA decidirá el destino de
            cada ronda: Jedis, Siths, Clones, Droides, Planetas... y las
            temidas SILUETAS.
          </p>
          <p className="mb-6 text-lg leading-relaxed text-[#ffd54a] sm:text-xl">
            Solo el primero en responder gana el punto y elige dónde marcar en su cartón. Quien
            complete una línea en su cartón gritará BINGO y liberará la
            diversión de la galaxia...
          </p>
          <p className="text-lg leading-relaxed text-[#ffd54a] sm:text-xl">
            Que la Fuerza —y la suerte— te acompañen.
          </p>
        </div>
      </div>
      <div className="crawl-masking" />
      <button
        onClick={finish}
        className="btn-ghost absolute right-5 top-5 z-10 bg-black/60 px-5 py-2 text-xs"
      >
        Omitir ▸
      </button>
    </div>
  );
}
