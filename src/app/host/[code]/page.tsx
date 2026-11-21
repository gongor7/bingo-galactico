"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import CodeTiles from "@/components/CodeTiles";
import HoloPanel from "@/components/HoloPanel";
import MuteButton from "@/components/MuteButton";
import QuestionPanel from "@/components/QuestionPanel";
import Scoreboard from "@/components/Scoreboard";
import Wheel from "@/components/Wheel";
import { SEGMENTS } from "@/game/wheel";
import { useHostGame } from "@/game/useHostGame";
import { normalizeCode, supabase, supabaseConfigured } from "@/lib/supabase";
import { sfx } from "@/lib/sfx";

export default function HostPage() {
  const params = useParams<{ code: string }>();
  const code = normalizeCode(String(params.code ?? ""));
  const [roomId, setRoomId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "no-room" | "no-auth" | "no-env">("loading");
  const game = useHostGame(code, roomId);

  useEffect(() => {
    if (!code) return;
    if (!supabaseConfigured()) {
      setStatus("no-env");
      return;
    }
    const token = localStorage.getItem(`sw-host:${code}`);
    if (!token) {
      setStatus("no-auth");
      return;
    }
    void supabase()
      .from("rooms")
      .select("id")
      .eq("code", code)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRoomId(data.id);
          setStatus("ok");
        } else {
          setStatus("no-room");
        }
      });
  }, [code]);

  if (status === "loading") return <Center>Abriendo consola...</Center>;
  if (status === "no-env")
    return (
      <Center>
        Faltan las variables de Supabase (mira <code className="text-gold">.env.example</code>).
      </Center>
    );
  if (status === "no-room") return <Center>Esta sala no existe (o expiró).</Center>;
  if (status === "no-auth")
    return (
      <Center>
        Este navegador no es el host de la sala {code}.{" "}
        <Link href="/" className="text-cyan underline">
          Volver al hangar
        </Link>
      </Center>
    );

  const spinState = game.spin;
  const segmentLabel = spinState ? SEGMENTS.find((s) => s.id === spinState.segment)?.label : null;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-3 py-4 sm:px-5">
      {/* HUD superior */}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="title-sw text-base sm:text-lg" onMouseEnter={() => sfx.hover()}>
            BINGO GALÁCTICO
          </Link>
          <span className="font-display text-[9px] tracking-[0.35em] text-ink-faint">HOST · {code}</span>
        </div>
        <div className="flex items-center gap-3">
          {game.phase !== "lobby" && game.phase !== "over" && (
            <span className="font-display text-[9px] tracking-[0.3em] text-ink-dim">
              RONDA {String(game.roundNo).padStart(2, "0")}
            </span>
          )}
          <span
            className={`h-1.5 w-1.5 rounded-full ${game.presenceCount > 1 ? "bg-cyan" : "bg-[#d9b44a]"}`}
            title={`${game.presenceCount} conectados`}
          />
          <MuteButton />
          {game.phase !== "lobby" && game.phase !== "over" && (
            <button
              onClick={() => {
                if (confirm("¿Terminar la partida? Gana quien tenga más puntos.")) game.end();
              }}
              onMouseEnter={() => sfx.hover()}
              className="btn-ghost px-3 py-1.5 text-[10px]"
            >
              Terminar
            </button>
          )}
        </div>
      </header>

      {/* ── LOBBY ─────────────────────────────────────────────────────── */}
      {game.phase === "lobby" && (
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-5">
          <HoloPanel title="Código de la sala" className="w-full" accent>
            <CodeTiles code={code} size="lg" />
            <p className="mt-5 text-center text-sm text-ink-dim">
              Los jugadores entran en la página principal y escriben este código.
            </p>
            <p className="mt-2 text-center font-display text-[9px] tracking-[0.3em] text-ink-faint">
              {game.players.length} REGISTRADO{game.players.length === 1 ? "" : "S"} ·{" "}
              {Math.max(0, game.presenceCount - 1)} CONECTADO
              {Math.max(0, game.presenceCount - 1) === 1 ? "" : "S"}
            </p>
          </HoloPanel>

          <HoloPanel title="Escuadrón" className="w-full">
            {game.players.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-faint">Esperando rebeldes...</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {game.players.map((p) => (
                  <span key={p.id} className="chip anim-pop">
                    {p.nick}
                  </span>
                ))}
              </div>
            )}
          </HoloPanel>

          <button
            onClick={game.start}
            onMouseEnter={() => sfx.hover()}
            disabled={game.players.length === 0}
            className={`btn-primary w-full max-w-md px-8 py-4 text-sm ${game.players.length >= 2 ? "anim-pulse" : ""}`}
          >
            {game.players.length === 0
              ? "Esperando jugadores..."
              : game.players.length === 1
                ? "Iniciar (solo 1 jugador)"
                : "Iniciar batalla"}
          </button>
        </div>
      )}

      {/* ── JUEGO ─────────────────────────────────────────────────────── */}
      {game.phase !== "lobby" && game.phase !== "over" && (
        <div className="grid gap-4 lg:grid-cols-[400px,minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <HoloPanel title="Ruleta de destinos">
              <Wheel rotation={game.spin?.rotation ?? 0} spinning={game.phase === "spinning"} />
              <button
                onClick={game.spinNow}
                onMouseEnter={() => sfx.hover()}
                disabled={!game.canSpin}
                className="btn-primary mt-5 w-full px-6 py-3.5 text-xs"
              >
                {game.phase === "spinning"
                  ? `${segmentLabel ?? "Girando"}...`
                  : game.phase === "ready"
                    ? "Girar ruleta"
                    : game.phase === "asking"
                      ? "Ronda en curso"
                      : "Resultados"}
              </button>
            </HoloPanel>
            <HoloPanel title="Marcador">
              <Scoreboard players={game.players} highlightId={game.reveal?.winner?.id ?? null} />
            </HoloPanel>
          </div>

          <div className="flex flex-col gap-4">
            {game.phase === "spinning" && !game.question ? (
              <HoloPanel className="flex min-h-[300px] flex-col items-center justify-center">
                <p className="anim-float font-display text-xs tracking-[0.4em] text-ink-dim">
                  CALCULANDO TRAYECTORIA
                </p>
              </HoloPanel>
            ) : (
              <QuestionPanel q={game.question} reveal={game.reveal} buzzes={game.buzzes} big />
            )}

            {game.reveal && (
              <p className="anim-rise text-center font-display text-[9px] tracking-[0.3em] text-ink-faint">
                LA RULETA SE LIBERA PARA LA SIGUIENTE RONDA
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── FIN ───────────────────────────────────────────────────────── */}
      {game.phase === "over" && game.gameOver && (
        <div className="mx-auto max-w-2xl">
          <HoloPanel title="Transmisión final" accent className="text-center">
            {game.gameOver.reason === "bingo" ? (
              <>
                <p className="anim-banner title-sw text-4xl sm:text-5xl">¡BINGO!</p>
                <p className="mt-3 font-display text-sm tracking-[0.2em] text-ink">
                  {game.gameOver.winner?.nick} completó una línea
                </p>
              </>
            ) : (
              <>
                <p className="anim-banner title-plain text-2xl sm:text-3xl">Partida terminada</p>
                {game.gameOver.winner && (
                  <p className="mt-3 font-display text-sm tracking-[0.2em] text-ink">
                    Mayor puntuación: {game.gameOver.winner.nick}
                  </p>
                )}
              </>
            )}
            <div className="mt-6 text-left">
              <Scoreboard players={game.gameOver.players} />
            </div>
            <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row">
              <button
                onClick={game.newGame}
                onMouseEnter={() => sfx.hover()}
                className="btn-primary px-6 py-3 text-xs"
              >
                Nueva partida · mismos jugadores
              </button>
              <button onClick={game.backToLobby} onMouseEnter={() => sfx.hover()} className="btn-ghost px-6 py-3 text-xs">
                Volver al lobby
              </button>
              <Link href="/" className="btn-ghost px-6 py-3 text-center text-xs leading-6">
                Salir
              </Link>
            </div>
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
