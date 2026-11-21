"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AnswerInput from "@/components/AnswerInput";
import Carton from "@/components/Carton";
import HoloPanel from "@/components/HoloPanel";
import MuteButton from "@/components/MuteButton";
import QuestionPanel from "@/components/QuestionPanel";
import Scoreboard from "@/components/Scoreboard";
import Wheel from "@/components/Wheel";
import { SEGMENTS } from "@/game/wheel";
import { usePlayerGame } from "@/game/usePlayerGame";
import { normalizeCode, supabase, supabaseConfigured } from "@/lib/supabase";
import { sfx } from "@/lib/sfx";

interface Session {
  pid: string;
  nick: string;
}

export default function PlayPage() {
  const params = useParams<{ code: string }>();
  const code = normalizeCode(String(params.code ?? ""));
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [roomPhase, setRoomPhase] = useState<string | null>(null);
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [joinNick, setJoinNick] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(`sw-player:${code}`);
    if (raw) {
      try {
        setSession(JSON.parse(raw) as Session);
      } catch {
        localStorage.removeItem(`sw-player:${code}`);
      }
    }
    setSessionLoaded(true);
  }, [code]);

  // Validate session player still belongs to this room; read room phase.
  useEffect(() => {
    if (!code || !sessionLoaded) return;
    if (!supabaseConfigured()) return;
    const sb = supabase();
    void sb
      .from("rooms")
      .select("id, phase")
      .eq("code", code)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setRoomPhase("missing");
          return;
        }
        setRoomPhase(data.phase);
        if (!session) return;
        void sb
          .from("players")
          .select("id")
          .eq("id", session.pid)
          .eq("room_id", data.id)
          .maybeSingle()
          .then(({ data: p }) => {
            if (!p) {
              localStorage.removeItem(`sw-player:${code}`);
              setSession(null);
            }
          });
      });
  }, [code, session, sessionLoaded]);

  const game = usePlayerGame(code, session?.pid ?? null, session?.nick ?? null);

  async function joinInline() {
    if (joining) return;
    setJoining(true);
    setJoinErr(null);
    try {
      const cleanNick = joinNick.trim();
      if (cleanNick.length < 2) throw new Error("Nombre de al menos 2 letras");
      const sb = supabase();
      const { data: room } = await sb.from("rooms").select("id, phase").eq("code", code).maybeSingle();
      if (!room) throw new Error("Sala no encontrada");
      if (room.phase !== "lobby") throw new Error("La partida ya empezó");
      const { data: player, error } = await sb
        .from("players")
        .insert({ room_id: room.id, nick: cleanNick })
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("Ese nombre ya está en uso");
        throw new Error(error.message);
      }
      localStorage.setItem(`sw-player:${code}`, JSON.stringify({ pid: player.id, nick: player.nick }));
      setSession({ pid: player.id, nick: player.nick });
      sfx.join();
    } catch (e) {
      setJoinErr(e instanceof Error ? e.message : "Error al unirte");
    } finally {
      setJoining(false);
    }
  }

  if (!supabaseConfigured())
    return (
      <Center>Requiere configurar Supabase (<code className="text-swyellow">.env.example</code>).</Center>
    );
  if (roomPhase === "missing") return <Center>Esta sala no existe.</Center>;

  if (!sessionLoaded) return <Center>Sincronizando...</Center>;

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <HoloPanel title={`Unirse a la sala ${code}`} className="anim-pop">
          <label className="mb-1 block font-display text-[10px] tracking-[0.3em] text-dim">TU NOMBRE</label>
          <input
            className="input-sw mb-4 px-3 py-2.5 font-display text-sm tracking-widest"
            placeholder="Ej: Mandaloriano"
            value={joinNick}
            maxLength={16}
            onChange={(e) => setJoinNick(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && joinInline()}
          />
          <button onClick={joinInline} disabled={joining} className="btn-sw w-full bg-jedi px-6 py-3.5 text-sm text-black">
            {joining ? "Entrando..." : "🚀 Entrar"}
          </button>
          {joinErr && <p className="anim-pop mt-3 text-sm text-sith">⚠ {joinErr}</p>}
          <Link href="/" className="mt-4 block text-center text-xs text-dim underline">
            volver al hangar
          </Link>
        </HoloPanel>
      </main>
    );
  }

  const iWon = game.gameOver?.winner?.id === session.pid;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-3 py-4 sm:px-5">
      {/* HUD */}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link href="/" className="title-sw text-lg sm:text-xl" onMouseEnter={() => sfx.hover()}>
            BINGO GALÁCTICO
          </Link>
          <span className="font-display text-[10px] tracking-[0.35em] text-holo/70">
            {session.nick} · SALA {code}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`font-display text-[9px] tracking-[0.25em] ${
              game.connection === "online" ? "text-emerald-400" : game.connection === "connecting" ? "text-amber-400" : "text-sith"
            }`}
          >
            ● {game.connection === "online" ? "CANAL ACTIVO" : game.connection === "connecting" ? "CONECTANDO..." : "RECONECTANDO..."}
          </span>
          <MuteButton />
        </div>
      </header>

      {/* ── LOBBY ─────────────────────────────────────────────────────── */}
      {game.phase === "lobby" && (
        <div className="mx-auto max-w-lg">
          <HoloPanel title="En la sala de espera" className="text-center">
            <p className="anim-float text-5xl">🛰️</p>
            <p className="mt-4 text-sm leading-relaxed text-dim">
              Listo, <span className="text-starlight">{session.nick}</span>. Esperando a que el
              Comandante inicie la batalla. Tu <span className="text-swyellow">cartón de combate</span> se
              materializará al empezar.
            </p>
            <div className="mt-5 flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-holo" style={{ animationDelay: `${i * 250}ms` }} />
              ))}
            </div>
          </HoloPanel>
        </div>
      )}

      {/* ── SPIN OVERLAY ──────────────────────────────────────────────── */}
      {game.phase === "spinning" && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-void/85 px-4 backdrop-blur-sm">
          <p className="mb-4 font-display text-xs tracking-[0.4em] text-holo">RONDA {game.question?.roundNo ?? ""} · GIRANDO DESTINO</p>
          <div className="w-full max-w-[340px]">
            <Wheel rotation={game.spin?.rotation ?? 0} spinning={game.spinning} />
          </div>
        </div>
      )}

      {/* ── JUEGO ─────────────────────────────────────────────────────── */}
      {(game.phase === "ready" || game.phase === "asking" || game.phase === "reveal") && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),400px]">
          <div className="order-2 flex flex-col gap-4 lg:order-1">
            <QuestionPanel q={game.question} reveal={game.reveal} buzzes={game.buzzes} />
            <AnswerInput
              enabled={game.phase === "asking" && !game.reveal}
              onSend={game.sendAnswer}
              shakeKey={game.shakeKey}
            />
          </div>
          <div className="order-1 flex flex-col gap-4 lg:order-2">
            {game.card && (
              <Carton
                card={game.card}
                marked={game.marked}
                justMarkedKey={game.justMarkedKey}
                nick={session.nick}
                winLine={game.winLine}
              />
            )}
            {game.scores.length > 0 && (
              <HoloPanel title="Marcador">
                <Scoreboard players={game.scores} highlightId={game.reveal?.winner?.id ?? null} />
              </HoloPanel>
            )}
          </div>
        </div>
      )}

      {/* ── BINGO FLASH local ─────────────────────────────────────────── */}
      {game.winLine && game.phase !== "over" && (
        <div className="pointer-events-none fixed inset-x-0 top-1/3 z-50 flex justify-center">
          <p className="anim-banner title-sw text-6xl sm:text-7xl" style={{ textShadow: "0 0 40px rgba(255,232,31,.8)" }}>
            ¡BINGO!
          </p>
        </div>
      )}

      {/* ── GAME OVER ─────────────────────────────────────────────────── */}
      {game.phase === "over" && game.gameOver && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-void/90 px-4 backdrop-blur">
          <HoloPanel title="Fin de la transmisión" className="w-full max-w-lg text-center">
            {game.gameOver.reason === "bingo" ? (
              iWon ? (
                <>
                  <p className="anim-banner title-sw text-5xl">¡BINGO!</p>
                  <p className="mt-3 font-display text-lg tracking-[0.2em] text-starlight">
                    Has liberado la galaxia, {session.nick}
                  </p>
                </>
              ) : (
                <>
                  <p className="anim-banner title-sw text-4xl">BINGO ENEMIGO</p>
                  <p className="mt-3 font-display text-lg tracking-[0.2em] text-starlight">
                    {game.gameOver.winner?.nick} completó la línea
                  </p>
                </>
              )
            ) : (
              <>
                <p className="anim-banner title-sw text-3xl">PARTIDA TERMINADA</p>
                {game.gameOver.winner && (
                  <p className="mt-3 font-display text-lg tracking-[0.2em] text-starlight">
                    Mejor puntuación: {game.gameOver.winner.nick}
                  </p>
                )}
              </>
            )}
            <div className="mt-6 text-left">
              <Scoreboard players={game.gameOver.players} />
            </div>
            <p className="mt-6 font-display text-[10px] tracking-[0.3em] text-dim">
              EL HOST PUEDE LANZAR UNA NUEVA PARTIDA — MANTENTE CONECTADO
            </p>
          </HoloPanel>
        </div>
      )}
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <div className="holo-panel holo-corners max-w-md p-8 font-display text-sm tracking-[0.2em] text-dim">{children}</div>
    </main>
  );
}
