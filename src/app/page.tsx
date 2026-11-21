"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Crawl from "@/components/Crawl";
import HoloPanel from "@/components/HoloPanel";
import MuteButton from "@/components/MuteButton";
import { IconJedi, IconPlanet, IconSignal, IconSilueta, IconSpin } from "@/components/Icons";
import { generateRoomCode, normalizeCode, supabase, supabaseConfigured } from "@/lib/supabase";
import { sfx } from "@/lib/sfx";

export default function Landing() {
  const router = useRouter();
  const [crawl, setCrawl] = useState(false);
  const [nick, setNick] = useState("");
  const [code, setCode] = useState("");
  const [invited, setInvited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const configured = supabaseConfigured();

  useEffect(() => {
    if (!localStorage.getItem("sw-crawl-seen")) setCrawl(true);
    // Enlace de invitación (?room=CODE): precarga el código y enfoca el nombre.
    const room = new URLSearchParams(window.location.search).get("room");
    if (room) {
      const c = normalizeCode(room).slice(0, 6);
      if (c.length >= 4) {
        setCode(c);
        setInvited(true);
        setTimeout(() => document.getElementById("nick-input")?.focus(), 400);
      }
    }
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
        if (error.code !== "23505") throw new Error(error.message);
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
      // Si el jugador ya existía en esta sala, reconecta con su mismo nombre y cartón (incluso si ya empezó).
      const { data: existing } = await sb
        .from("players")
        .select("id, nick")
        .eq("room_id", room.id)
        .ilike("nick", cleanNick)
        .maybeSingle();
      if (existing) {
        localStorage.setItem(`sw-player:${c}`, JSON.stringify({ pid: existing.id, nick: existing.nick }));
        router.push(`/play/${c}`);
        return;
      }
      if (room.phase !== "lobby") {
        throw new Error("Esa partida ya empezó. Si ya estabas jugando, escribe tu mismo nombre para volver");
      }
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
    <main className="relative mx-auto flex min-h-screen max-w-4xl flex-col items-center px-4 py-8 sm:py-14">
      {crawl && <Crawl onFinish={endCrawl} />}

      <div className="absolute right-4 top-4 flex gap-2">
        <button onClick={() => setCrawl(true)} className="btn-ghost px-3 py-1.5 text-[10px]">
          Ver intro
        </button>
        <MuteButton />
      </div>

      <header className="mb-12 mt-10 text-center">
        <p className="font-display text-[9px] tracking-[0.55em] text-ink-faint">
          CONSOLA DE MANDO · CANAL CIFRADO
        </p>
        <h1 className="title-sw mt-6 text-5xl leading-none sm:text-7xl">Bingo</h1>
        <h2 className="title-sw text-3xl sm:text-5xl">Galáctico</h2>
        <div className="mx-auto mt-6 h-px w-24 bg-cyan/50" />
        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-ink-dim">
          La ruleta elige la categoría. La imagen aparece en el proyector. El primero en
          acertar suma — y <span className="text-ink">elige dónde marcar en su cartón</span>.
          La primera línea gana la galaxia.
        </p>
      </header>

      {!configured ? (
        <HoloPanel title="Requiere configuración" className="w-full max-w-xl" accent>
          <SetupNotice />
        </HoloPanel>
      ) : (
        <div className="grid w-full gap-4 md:grid-cols-2">
          <HoloPanel title="Crear sala · Host" accent className="flex flex-col">
            <div className="mb-5 flex-1">
              <p className="text-sm leading-relaxed text-ink-dim">
                Diriges la consola: giras la ruleta, vigilas el canal de respuestas y controlas
                la partida. Los demás entran con tu código.
              </p>
              <p className="mt-3 flex items-center gap-2 font-display text-[9px] tracking-[0.3em] text-ink-faint">
                <IconSignal size={13} style={{ color: "#58e6ff" }} />
                NO JUEGAS · OPERAS LA CONSOLA
              </p>
            </div>
            <button
              onClick={createRoom}
              onMouseEnter={() => sfx.hover()}
              disabled={busy}
              className="btn-primary w-full px-6 py-4 text-sm"
            >
              {busy ? "Abriendo canal..." : "Crear sala"}
            </button>
          </HoloPanel>

          <HoloPanel title="Unirse con código" className="flex flex-col">
            <div className="mb-4 flex flex-1 flex-col gap-3.5">
              <div>
                <label className="mb-1.5 block font-display text-[9px] tracking-[0.3em] text-ink-faint">
                  CÓDIGO DE SALA
                </label>
                <input
                  className="input-sw px-3 py-3 text-center font-display text-2xl font-bold tracking-[0.45em]"
                  placeholder="ABC12"
                  value={code}
                  maxLength={6}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                />
              </div>
              <div>
                <label className="mb-1.5 block font-display text-[9px] tracking-[0.3em] text-ink-faint">
                  TU NOMBRE {invited && <span className="text-cyan">· SALA {code} DETECTADA</span>}
                </label>
                <input
                  className="input-sw px-3 py-2.5 font-display text-sm tracking-wider"
                  id="nick-input"
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
              className="btn-primary w-full px-6 py-4 text-sm"
            >
              {busy ? "Entrando..." : "Unirme a la batalla"}
            </button>
          </HoloPanel>
        </div>
      )}

      {err && (
        <p className="anim-pop mt-5 border border-sith/40 bg-sith/10 px-4 py-2 text-sm text-sith">{err}</p>
      )}

      <section className="mt-14 w-full max-w-3xl">
        <h3 className="panel-title mb-4">Protocolo de juego</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: <IconSpin size={20} style={{ color: "#58e6ff" }} />,
              t: "Ruleta",
              d: "Jedis, Siths, Clones, Droides o Planetas. Silueta vale doble; Comodín decide por ti.",
            },
            {
              icon: <IconSilueta size={20} style={{ color: "#58e6ff" }} />,
              t: "Pregunta",
              d: "Foto, silueta o planeta. Todos escriben a la vez; puedes reintentar hasta que alguien acierte.",
            },
            {
              icon: <IconJedi size={20} style={{ color: "#58e6ff" }} />,
              t: "Cartón",
              d: "El ganador coloca su marca donde quiera de esa categoría. Línea completa: ¡BINGO!",
            },
          ].map((s) => (
            <div key={s.t} className="panel p-5">
              {s.icon}
              <h4 className="mt-3 font-display text-xs font-bold tracking-[0.25em] text-ink">{s.t}</h4>
              <p className="mt-2 text-xs leading-relaxed text-ink-dim">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-14 pb-4 text-center text-[10px] leading-relaxed text-ink-faint">
        Proyecto fan para fiestas · Sin afiliación con Lucasfilm/Disney · Imágenes: Wookieepedia ·{" "}
        <button className="underline" onClick={() => setCrawl(true)}>
          repetir intro
        </button>
      </footer>
    </main>
  );
}

function SetupNotice() {
  return (
    <div className="text-sm leading-relaxed text-ink-dim">
      <p className="mb-3">
        Falta conectar <span className="text-ink">Supabase</span>. Pasos:
      </p>
      <ol className="ml-4 list-decimal space-y-2">
        <li>
          Crea un proyecto gratis en{" "}
          <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-cyan underline">
            supabase.com
          </a>
          .
        </li>
        <li>
          En <em>SQL Editor</em> ejecuta <code className="text-gold">supabase/schema.sql</code>.
        </li>
        <li>
          Copia <code className="text-gold">.env.example</code> a <code className="text-gold">.env.local</code> con tu
          URL y anon key.
        </li>
        <li>Reinicia el servidor.</li>
      </ol>
    </div>
  );
}
