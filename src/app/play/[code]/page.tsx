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
import { IconSignal, IconTrophy } from "@/components/Icons";
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
      // Si el jugador ya existía en esta sala (salió o recargó), reconecta con su mismo nombre y cartón.
      const { data: existing } = await sb
        .from("players")
        .select("id, nick")
        .eq("room_id", room.id)
        .ilike("nick", cleanNick)
        .maybeSingle();
      if (existing) {
        localStorage.setItem(`sw-player:${code}`, JSON.stringify({ pid: existing.id, nick: existing.nick }));
        setSession({ pid: existing.id, nick: existing.nick });
        sfx.join();
        return;
      }
      if (room.phase !== "lobby") {
        throw new Error("La partida ya empezó. Si ya estabas jugando, escribe tu mismo nombre para volver");
      }
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
      <Center>
        Requiere configurar Supabase (<code className="text-gold">.env.example</code>).
      </Center>
    );
  if (roomPhase === "missing") return <Center>Esta sala no existe.</Center>;
  if (!sessionLoaded) return <Center>Sincronizando...</Center>;

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <HoloPanel title={`Unirse a la sala ${code}`} accent className="anim-pop">
          <label className="mb-1.5 block font-display text-[9px] tracking-[0.3em] text-ink-faint">TU NOMBRE</label>
          <input
            className="input-sw mb-4 px-3 py-2.5 font-display text-sm tracking-wider"
            placeholder="Ej: Mandaloriano"
            value={joinNick}
            maxLength={16}
            onChange={(e) => setJoinNick(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && joinInline()}
          />
          <button
            onClick={joinInline}
            disabled={joining}
            className="btn-primary w-full px-6 py-3.5 text-sm"
          >
            {joining ? "Entrando..." : "Entrar"}
          </button>
          {joinErr && <p className="anim-pop mt-3 text-sm text-sith">{joinErr}</p>}
          <Link href="/" className="mt-4 block text-center text-xs text-ink-faint underline">
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
      <header className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="title-sw text-base sm:text-lg" onMouseEnter={() => sfx.hover()}>
            BINGO GALÁCTICO
          </Link>
          <span className="font-display text-[9px] tracking-[0.35em] text-ink-faint">
            {session.nick} · {code}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-1.5 font-display text-[9px] tracking-[0.25em] ${
              game.connection === "online" ? "text-cyan" : game.connection === "connecting" ? "text-[#d9b44a]" : "text-sith"
            }`}
          >
            <IconSignal size={12} />
            {game.connection === "online" ? "EN LÍNEA" : game.connection === "connecting" ? "CONECTANDO" : "RECONECTANDO"}
          </span>
          <MuteButton />
        </div>
      </header>

      {/* ── LOBBY ─────────────────────────────────────────────────────── */}
      {game.phase === "lobby" && (
        <div className="mx-auto max-w-lg">
          <HoloPanel title="En la sala de espera" className="text-center" accent>
            <p className="anim-float flex justify-center text-ink-faint">
              <IconSignal size={34} />
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ink-dim">
              Listo, <span className="text-ink">{session.nick}</span>. Esperando a que el
              comandante inicie la batalla. Tu <span className="text-cyan">cartón de combate</span> se
              materializará al empezar.
            </p>
            <div className="mt-6 flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1 w-1 animate-pulse rounded-full bg-cyan"
                  style={{ animationDelay: `${i * 250}ms` }}
                />
              ))}
            </div>
          </HoloPanel>
        </div>
      )}

      {/* ── SPIN OVERLAY ──────────────────────────────────────────────── */}
      {game.phase === "spinning" && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-void/90 px-4">
          <p className="mb-4 font-display text-[10px] tracking-[0.45em] text-ink-dim">
            {game.spinning ? "GIRANDO DESTINO" : "DESTINO SELECCIONADO"}
          </p>
          <div className="w-full max-w-[340px]">
            <Wheel
              rotation={game.spin?.rotation ?? 0}
              spinning={game.spinning}
              selectedSegment={game.spin?.segment ?? null}
            />
          </div>
        </div>
      )}

      {/* ── JUEGO ─────────────────────────────────────────────────────── */}
      {(game.phase === "ready" || game.phase === "asking" || game.phase === "reveal") && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),400px]">
          <div className="order-2 flex flex-col gap-4 lg:order-1">
            {/* Turnos de ruleta */}
            {game.phase === "ready" && (
              <div className="panel flex flex-col items-center gap-3 p-5 sm:flex-row sm:justify-between sm:text-left">
                {game.myTurn ? (
                  <>
                    <div>
                      <p className="font-display text-[10px] font-bold tracking-[0.3em]" style={{ color: "#58e6ff" }}>
                        TU TURNO, {session.nick.toUpperCase()}
                      </p>
                      <p className="mt-1 text-xs text-ink-dim">
                        {game.pendingPid
                          ? "Esperando a que el ganador coloque su marca en el cartón..."
                          : "Gira la ruleta y decide el destino de la ronda."}
                      </p>
                    </div>
                    <button
                      onClick={game.requestSpin}
                      onMouseEnter={() => sfx.hover()}
                      disabled={Boolean(game.pendingPid)}
                      className={`btn-primary px-6 py-3 text-xs ${game.pendingPid ? "" : "anim-pulse"}`}
                    >
                      {game.pendingPid ? "Esperando marca..." : "Girar ruleta"}
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="font-display text-[10px] tracking-[0.3em] text-ink-dim">TURNO DE LA RULETA</p>
                      <p className="mt-1 text-xs text-ink-dim">
                        <span className="text-ink">{game.turnNick || "..."}</span> gira esta vez. ¡Prepárate para responder!
                      </p>
                    </div>
                    <span className="anim-float text-ink-faint">
                      <IconSignal size={22} />
                    </span>
                  </>
                )}
              </div>
            )}
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
                marks={game.marks}
                justMarkedCell={game.justMarkedCell}
                pendingCategory={game.pendingMark}
                markable={game.markableCells()}
                onMark={game.placeMark}
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

      {/* ── MARCA OBLIGATORIA (ganador) ───────────────────────────────── */}
      {game.pendingMark && game.phase !== "over" && (
        <div className="fixed inset-0 z-[45] flex items-center justify-center overflow-y-auto bg-void/90 px-4 py-6">
          <div className="w-full max-w-md">
            <HoloPanel
              title={game.pendingMark === "any" ? "Comodín ganado" : "Marca obligatoria"}
              accent
              className="text-center"
            >
              <p className="anim-banner title-sw text-2xl">
                {game.pendingMark === "any" ? "¡Comodín! Elige libremente" : "¡Tu punto, tu marca!"}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-dim">
                {game.pendingMark === "any"
                  ? "Superaste el desafío extremo. Toca CUALQUIER casilla vacía de tu cartón para llenarla."
                  : "Toca una casilla de tu cartón. El juego no sigue hasta que coloques tu marca."}
              </p>
            </HoloPanel>
            <div className="mt-4">
              {game.card && (
                <Carton
                  card={game.card}
                  marks={game.marks}
                  justMarkedCell={game.justMarkedCell}
                  pendingCategory={game.pendingMark}
                  markable={game.markableCells()}
                  onMark={game.placeMark}
                  nick={session.nick}
                  winLine={game.winLine}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BINGO FLASH local ─────────────────────────────────────────── */}
      {game.winLine && game.phase !== "over" && (
        <div className="pointer-events-none fixed inset-x-0 top-1/3 z-50 flex justify-center">
          <p className="anim-banner title-sw text-6xl sm:text-7xl" style={{ textShadow: "0 0 40px rgba(255,232,31,.5)" }}>
            ¡BINGO!
          </p>
        </div>
      )}

      {/* ── GAME OVER ─────────────────────────────────────────────────── */}
      {game.phase === "over" && game.gameOver && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-void/95 px-4">
          <HoloPanel title="Fin de la transmisión" className="w-full max-w-lg text-center" accent>
            {game.gameOver.reason === "bingo" ? (
              iWon ? (
                <>
                  <p className="anim-banner title-sw text-5xl">¡BINGO!</p>
                  <p className="mt-3 flex items-center justify-center gap-2 font-display text-sm tracking-[0.2em] text-ink">
                    <IconTrophy size={18} style={{ color: "#ffe81f" }} />
                    Has liberado la galaxia, {session.nick}
                  </p>
                </>
              ) : (
                <>
                  <p className="anim-banner title-plain text-3xl">Bingo detectado</p>
                  <p className="mt-3 font-display text-sm tracking-[0.2em] text-ink">
                    {game.gameOver.winner?.nick} completó la línea
                  </p>
                </>
              )
            ) : (
              <>
                <p className="anim-banner title-plain text-2xl">Partida terminada</p>
                {game.gameOver.winner && (
                  <p className="mt-3 font-display text-sm tracking-[0.2em] text-ink">
                    Mejor puntuación: {game.gameOver.winner.nick}
                  </p>
                )}
              </>
            )}
            <div className="mt-6 text-left">
              <Scoreboard players={game.gameOver.players} />
            </div>
            <p className="mt-6 font-display text-[9px] tracking-[0.3em] text-ink-faint">
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
      <div className="panel max-w-md p-8 font-display text-xs tracking-[0.2em] text-ink-dim">{children}</div>
    </main>
  );
}
