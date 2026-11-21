"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Crawl from "@/components/Crawl";
import HoloPanel from "@/components/HoloPanel";
import MuteButton from "@/components/MuteButton";
import { generateRoomCode, normalizeCode, supabase, supabaseConfigured } from "@/lib/supabase";
import { sfx } from "@/lib/sfx";

export default function Landing() {
  const router = useRouter();
  const [crawl, setCrawl] = useState(false);
  const [nick, setNick] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const configured = supabaseConfigured();

  useEffect(() => {
    if (!localStorage.getItem("sw-crawl-seen")) setCrawl(true);
  }, []);

  const endCrawl = () => {
    localStorage.setItem("sw-crawl-seen", "1");
    setCrawl(false);
    sfx.start();
  };

  async function createRoom() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const sb = supabase();
      for (let i = 0; i < 5; i++) {
        const roomCode = generateRoomCode();
        const hostToken = crypto.randomUUID();
        const { error } = await sb.from("rooms").insert({ code: roomCode, host_token: hostToken });
        if (!error) {
          localStorage.setItem(`sw-host:${roomCode}`, JSON.stringify({ hostToken }));
          router.push(`/host/${roomCode}`);
          return;
        }
        if (error.code !== "23505") throw new Error(error.message); // 23505 = código duplicado, reintenta
      }
      throw new Error("No se pudo generar un código único, intenta de nuevo");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error creando la sala");
      setBusy(false);
    }
  }

  async function joinRoom() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const c = normalizeCode(code);
      const cleanNick = nick.trim();
      if (c.length < 4 || c.length > 6) throw new Error("El código tiene 4-6 caracteres");
      if (cleanNick.length < 2) throw new Error("Elige un nombre de al menos 2 letras");
      const sb = supabase();
      const { data: room } = await sb.from("rooms").select("id, phase").eq("code", c).maybeSingle();
      if (!room) throw new Error("No existe ninguna sala con ese código");
      if (room.phase !== "lobby") throw new Error("Esa partida ya empezó. Pide al host una sala nueva");
      const { data: player, error } = await sb
        .from("players")
        .insert({ room_id: room.id, nick: cleanNick })
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("Ese nombre ya está en uso en esta sala");
        throw new Error(error.message);
      }
      localStorage.setItem(`sw-player:${c}`, JSON.stringify({ pid: player.id, nick: player.nick }));
      router.push(`/play/${c}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error uniéndose a la sala");
      setBusy(false);
    }
  }

  return (
    <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center px-4 py-8 sm:py-12">
      {crawl && <Crawl onFinish={endCrawl} />}

      <div className="absolute right-4 top-4 flex gap-2">
        <button onClick={() => setCrawl(true)} className="btn-ghost bg-black/50 px-3 py-1.5 text-[10px]">
          Ver intro
        </button>
        <MuteButton />
      </div>

      <header className="mb-10 mt-8 text-center">
        <p className="font-display text-[10px] tracking-[0.6em] text-holo/70">HOLOMESA REBELDE · CANAL SEGURO</p>
        <h1
          className="title-sw mt-4 text-5xl leading-none sm:text-7xl"
          style={{ transform: "scaleY(1.15)", transformOrigin: "center" }}
        >
          Bingo
        </h1>
        <h2 className="title-sw text-3xl sm:text-5xl" style={{ transform: "scaleY(1.1)" }}>
          Galáctico
        </h2>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-dim sm:text-base">
          La ruleta decide la categoría. La foto aparece en el proyector. El primero
          en acertar se lleva el punto — y <span className="text-starlight">todo el que tenga la casilla la marca</span>.
          Completa una línea y libera la galaxia.
        </p>
      </header>

      {!configured ? (
        <HoloPanel title="Requiere configuración" className="w-full max-w-xl">
          <SetupNotice />
        </HoloPanel>
      ) : (
        <div className="grid w-full gap-5 md:grid-cols-2">
          <HoloPanel title="Crear sala (Host)" className="flex flex-col">
            <div className="mb-4 flex-1 text-sm leading-relaxed text-dim">
              <p>
                Serás <span className="text-starlight">Comandante de la holomesa</span>: giras la ruleta,
                vigilas respuestas y controlas la partida. Los demás se unen con tu código.
              </p>
              <p className="mt-2 font-display text-[10px] tracking-[0.3em] text-holo/70">
                ▸ NO NECESITAS NOMBRE · NO JUEGAS, DIRIGES
              </p>
            </div>
            <button
              onClick={createRoom}
              onMouseEnter={() => sfx.hover()}
              disabled={busy}
              className="btn-sw bg-swyellow px-6 py-4 text-sm text-black"
            >
              {busy ? "Abriendo canal..." : "⚡ Crear sala"}
            </button>
          </HoloPanel>

          <HoloPanel title="Unirse con código" className="flex flex-col">
            <div className="mb-4 flex flex-1 flex-col gap-3">
              <div>
                <label className="mb-1 block font-display text-[10px] tracking-[0.3em] text-dim">CÓDIGO DE SALA</label>
                <input
                  className="input-sw px-3 py-3 text-center font-display text-2xl tracking-[0.5em] uppercase"
                  placeholder="ABC12"
                  value={code}
                  maxLength={6}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                />
              </div>
              <div>
                <label className="mb-1 block font-display text-[10px] tracking-[0.3em] text-dim">TU NOMBRE</label>
                <input
                  className="input-sw px-3 py-2.5 font-display text-sm tracking-widest"
                  placeholder="Ej: Skywalker77"
                  value={nick}
                  maxLength={16}
                  onChange={(e) => setNick(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                />
              </div>
            </div>
            <button
              onClick={joinRoom}
              onMouseEnter={() => sfx.hover()}
              disabled={busy}
              className="btn-sw bg-jedi px-6 py-4 text-sm text-black"
            >
              {busy ? "Entrando..." : "🚀 Unirme a la batalla"}
            </button>
          </HoloPanel>
        </div>
      )}

      {err && (
        <p className="anim-pop mt-4 border border-sith/50 bg-sith/10 px-4 py-2 text-sm text-sith">⚠ {err}</p>
      )}

      <section className="mt-12 w-full max-w-3xl">
        <h3 className="holo-title mb-4">Protocolo de juego</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { n: "01", t: "Ruleta", d: "El host gira. Cae en Jedis, Siths, Clones, Droides, Planetas, Silueta ×2 o Comodín." },
            { n: "02", t: "Pregunta", d: "Foto, silueta o planeta. Todos escriben a la vez; reintento permitido hasta que alguien acierte." },
            { n: "03", t: "Cartón", d: "Quien tenga la respuesta la marca. Línea completa = ¡BINGO! y victoria." },
          ].map((s) => (
            <div key={s.n} className="holo-panel holo-corners p-4">
              <span className="title-sw text-xl">{s.n}</span>
              <h4 className="mt-1 font-display text-xs tracking-[0.25em] text-starlight">{s.t}</h4>
              <p className="mt-2 text-xs leading-relaxed text-dim">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-12 pb-4 text-center text-[10px] leading-relaxed text-dim/60">
        Proyecto fan hecho para fiestas · Sin afiliación con Lucasfilm/Disney ·
        Imágenes: Wookieepedia (Fandom) · <button className="underline" onClick={() => setCrawl(true)}>repetir intro</button>
      </footer>
    </main>
  );
}

function SetupNotice() {
  return (
    <div className="text-sm leading-relaxed text-dim">
      <p className="mb-3">
        Falta conectar <span className="text-starlight">Supabase</span>. Pasos:
      </p>
      <ol className="ml-4 list-decimal space-y-2">
        <li>
          Crea un proyecto gratis en{" "}
          <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-holo underline">
            supabase.com
          </a>
          .
        </li>
        <li>
          En <em>SQL Editor</em> ejecuta el contenido de <code className="text-swyellow">supabase/schema.sql</code>.
        </li>
        <li>
          Copia <code className="text-swyellow">.env.example</code> a <code className="text-swyellow">.env.local</code>{" "}
          con tu URL y anon key (Project Settings → API).
        </li>
        <li>Reinicia el servidor.</li>
      </ol>
    </div>
  );
}
