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

  if (status === "loading") return <Center>Abriendo holomesa...</Center>;
  if (status === "no-env")
    return (
      <Center>
        Faltan las variables de Supabase (mira <code className="text-swyellow">.env.example</code>).
      </Center>
    );
  if (status === "no-room") return <Center>Esta sala no existe (o expiró).</Center>;
  if (status === "no-auth")
    return (
      <Center>
        Este navegador no es el host de la sala {code}.{" "}
        <Link href="/" className="text-holo underline">
          Volver al hangar
        </Link>
      </Center>
    );

  const spinState = game.spin;
  const segmentLabel = spinState ? SEGMENTS.find((s) => s.id === spinState.segment)?.label : null;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-3 py-4 sm:px-5">
      {/* HUD superior */}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link href="/" className="title-sw text-lg sm:text-xl" onMouseEnter={() => sfx.hover()}>
            BINGO GALÁCTICO
          </Link>
          <span className="font-display text-[10px] tracking-[0.35em] text-holo/70">MODO HOST · {code}</span>
        </div>
        <div className="flex items-center gap-2">
          {game.phase !== "lobby" && game.phase !== "over" && (
            <span className="font-display text-[10px] tracking-[0.3em] text-dim">RONDA {game.roundNo}</span>
          )}
          <span
            className={`h-2 w-2 rounded-full ${game.presenceCount > 1 ? "bg-emerald-400" : "bg-amber-400"} anim-glow`}
            title={`${game.presenceCount} conectados`}
          />
          <MuteButton />
          {game.phase !== "lobby" && game.phase !== "over" && (
            <button
              onClick={() => {
                if (confirm("¿Terminar la partida? Gana quien tenga más puntos.")) game.end();
              }}
              onMouseEnter={() => sfx.hover()}
              className="btn-ghost bg-black/50 px-3 py-1.5 text-[10px]"
            >
              Terminar
            </button>
          )}
        </div>
      </header>

      {/* ── LOBBY ─────────────────────────────────────────────────────── */}
      {game.phase === "lobby" && (
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
          <HoloPanel title="Código de la sala" className="w-full">
            <CodeTiles code={code} size="lg" />
            <p className="mt-4 text-center text-sm text-dim">
              Los jugadores entran en la página principal y escriben este código.
            </p>
            <p className="mt-1 text-center font-display text-[10px] tracking-[0.3em] text-holo/70">
              {game.players.length} JUGADOR{game.players.length === 1 ? "" : "S"} REGISTRADO
              {game.players.length === 1 ? "" : "S"} · {game.presenceCount > 0 ? game.presenceCount - 1 : 0} CONECTADO
              {game.presenceCount - 1 === 1 ? "" : "S"} AHORA
            </p>
          </HoloPanel>

          <HoloPanel title="Escuadrón" className="w-full">
            {game.players.length === 0 ? (
              <p className="py-6 text-center text-sm text-dim">Esperando rebeldes... 📡</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {game.players.map((p, i) => (
                  <span
                    key={p.id}
                    className="anim-pop border border-holo/40 bg-black/40 px-3 py-1.5 font-display text-xs tracking-wider text-starlight"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    ▸ {p.nick}
                  </span>
                ))}
              </div>
            )}
          </HoloPanel>

          <button
            onClick={game.start}
            onMouseEnter={() => sfx.hover()}
            disabled={game.players.length === 0}
            className={`btn-sw w-full max-w-md bg-swyellow px-8 py-5 text-base text-black ${game.players.length >= 2 ? "anim-glow" : ""}`}
          >
            {game.players.length === 0
              ? "Esperando jugadores..."
              : game.players.length === 1
                ? "Iniciar (solo 1 jugador — invita a más!)"
                : "⚡ Iniciar batalla"}
          </button>
        </div>
      )}

      {/* ── JUEGO ─────────────────────────────────────────────────────── */}
      {game.phase !== "lobby" && game.phase !== "over" && (
        <div className="grid gap-4 lg:grid-cols-[420px,minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <HoloPanel title="Ruleta de destinos">
              <Wheel rotation={game.spin?.rotation ?? 0} spinning={game.phase === "spinning"} />
              <button
                onClick={game.spinNow}
                onMouseEnter={() => sfx.hover()}
                disabled={!game.canSpin}
                className="btn-sw mt-4 w-full bg-swyellow px-6 py-4 text-sm text-black"
              >
                {game.phase === "spinning"
                  ? `⚡ ${segmentLabel ?? "GIRANDO"}...`
                  : game.phase === "ready"
                    ? "🎯 Girar ruleta"
                    : game.phase === "asking"
                      ? "● RONDA EN CURSO"
                      : "RESULTADOS..."}
              </button>
            </HoloPanel>
            <HoloPanel title="Marcador galáctico">
              <Scoreboard players={game.players} highlightId={game.reveal?.winner?.id ?? null} />
            </HoloPanel>
          </div>

          <div className="flex flex-col gap-4">
            {game.phase === "spinning" && !game.question ? (
              <HoloPanel title="Proyector" className="flex min-h-[300px] flex-col items-center justify-center">
                <p className="anim-float font-display text-sm tracking-[0.35em] text-holo">
                  CALCULANDO TRAYECTORIA...
                </p>
              </HoloPanel>
            ) : (
              <QuestionPanel q={game.question} reveal={game.reveal} buzzes={game.buzzes} big />
            )}

            {game.reveal && (
              <p className="anim-rise text-center font-display text-[11px] tracking-[0.3em] text-dim">
                LA RULETA SE LIBERA EN UNOS SEGUNDOS PARA LA SIGUIENTE RONDA
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── FIN ───────────────────────────────────────────────────────── */}
      {game.phase === "over" && game.gameOver && (
        <div className="mx-auto max-w-2xl">
          <HoloPanel title="Transmisión final" className="text-center">
            {game.gameOver.reason === "bingo" ? (
              <>
                <p className="anim-banner title-sw text-4xl sm:text-5xl">¡BINGO!</p>
                <p className="mt-3 font-display text-lg tracking-[0.2em] text-starlight">
                  {game.gameOver.winner?.nick} completó una línea
                </p>
              </>
            ) : (
              <>
                <p className="anim-banner title-sw text-3xl sm:text-4xl">PARTIDA TERMINADA</p>
                {game.gameOver.winner && (
                  <p className="mt-3 font-display text-lg tracking-[0.2em] text-starlight">
                    Mayor puntuación: {game.gameOver.winner.nick}
                  </p>
                )}
              </>
            )}
            <div className="mt-6 text-left">
              <Scoreboard players={game.gameOver.players} />
            </div>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button onClick={game.newGame} onMouseEnter={() => sfx.hover()} className="btn-sw bg-swyellow px-6 py-3 text-xs text-black">
                ⟳ Nueva partida (mismos jugadores)
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
      <div className="holo-panel holo-corners max-w-md p-8 font-display text-sm tracking-[0.2em] text-dim">
        {children}
      </div>
    </main>
  );
}
