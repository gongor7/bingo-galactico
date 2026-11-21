"use client";

// Host-authoritative game engine. All state transitions happen here and are
// broadcast to players; host UI renders from the same state it broadcasts.
//
// Marking model (v2): only the round winner marks, and CHOOSES the cell on
// their own cartón. Host validates (right category column, cell free) and
// checks for line completion. Timeout rounds mark nothing.

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { roomChannel, sendHost } from "@/lib/realtime";
import { sfx } from "@/lib/sfx";
import { hyperspace } from "@/components/StarField";
import {
  CATEGORIES,
  REVEAL_BREAK_MS,
  ROUND_MS,
  SPIN_MS,
  type Card,
  type Category,
  type HostEvent,
  type PlayerEvent,
  type PlayerPub,
  type PublicQuestion,
  type RevealWinner,
  type SegmentId,
} from "./types";
import { POOLS, QUESTIONS, imageFor, poolEntry, questionsByCategory } from "./data";
import { canPlaceMark, completedLine, generateCard } from "./cards";
import { nextRotation, pickSegment, SEGMENTS } from "./wheel";
import { matchesAnswer } from "./normalize";

export type HostPhase = "lobby" | "ready" | "spinning" | "asking" | "reveal" | "over";

export interface SpinState {
  segment: SegmentId;
  rotation: number;
}

export interface GameOverState {
  winner: RevealWinner | null;
  reason: "bingo" | "host";
  players: PlayerPub[];
}

interface PendingMark {
  pid: string;
  category: Category;
  roundNo: number;
}

const CHAR_CATEGORIES: Category[] = CATEGORIES.filter((c) => c !== "planetas");

export function useHostGame(code: string, roomId: string | null) {
  const [phase, setPhase] = useState<HostPhase>("lobby");
  const [players, setPlayers] = useState<PlayerPub[]>([]);
  const [presenceCount, setPresenceCount] = useState(0);
  const [roundNo, setRoundNo] = useState(0);
  const [spin, setSpin] = useState<SpinState | null>(null);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [reveal, setReveal] = useState<{ winner: RevealWinner | null; answerDisplay: string; answerKey: string; points: number } | null>(null);
  const [buzzes, setBuzzes] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState<GameOverState | null>(null);

  // Engine refs (broadcast handlers must read fresh values).
  const channelRef = useRef<RealtimeChannel | null>(null);
  const phaseRef = useRef<HostPhase>("lobby");
  const roomIdRef = useRef<string | null>(null);
  const playersRef = useRef<PlayerPub[]>([]);
  const nicksRef = useRef<Map<string, string>>(new Map());
  const cardsRef = useRef<Map<string, Card>>(new Map());
  const marksRef = useRef<Map<string, Set<number>>>(new Map());
  const scoresRef = useRef<Map<string, number>>(new Map());
  const pendingMarkRef = useRef<PendingMark | null>(null);
  const usedRef = useRef<Set<string>>(new Set());
  const roundRef = useRef(0);
  const rotationRef = useRef(0);
  const currentQRef = useRef<PublicQuestion | null>(null);
  const currentKeyRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goPhase = (p: HostPhase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const playersPub = (): PlayerPub[] =>
    [...scoresRef.current.entries()].map(([id, score]) => ({
      id,
      nick: nicksRef.current.get(id) ?? "?",
      score,
    }));

  const emit = (ev: HostEvent) => {
    if (channelRef.current) sendHost(channelRef.current, ev);
  };

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !code) return;
    const sb = supabase();

    const fetchPlayers = async () => {
      const { data } = await sb
        .from("players")
        .select("id, nick, score, card, marks")
        .eq("room_id", roomId)
        .order("joined_at");
      if (!data) return;
      const pubs: PlayerPub[] = data.map((p: { id: string; nick: string; score: number }) => ({
        id: p.id,
        nick: p.nick,
        score: p.score,
      }));
      for (const p of data as Array<{ id: string; nick: string; score: number; card: Card | null; marks: number[] | null }>) {
        nicksRef.current.set(p.id, p.nick);
        // Recover state after a host refresh mid-game.
        if (p.card) {
          cardsRef.current.set(p.id, p.card);
          marksRef.current.set(p.id, new Set(p.marks ?? []));
          scoresRef.current.set(p.id, p.score);
        }
      }
      if (playersRef.current.length === 0) {
        playersRef.current = pubs;
        setPlayers(pubs);
      }
    };
    void fetchPlayers();

    const persist = async () => {
      const rows = [...scoresRef.current.entries()].map(([id, score]) => ({
        id,
        score,
        marks: [...(marksRef.current.get(id) ?? [])],
      }));
      if (rows.length === 0) return;
      // best-effort persistence for refresh recovery; failures are non-fatal
      await sb.from("players").upsert(rows, { onConflict: "id" });
    };

    const startGame = async () => {
      const rows = playersRef.current;
      if (rows.length === 0) return;
      cardsRef.current = new Map();
      marksRef.current = new Map();
      scoresRef.current = new Map();
      pendingMarkRef.current = null;
      usedRef.current = new Set();
      roundRef.current = 0;
      rotationRef.current = 0;
      setRoundNo(0);
      setQuestion(null);
      setReveal(null);
      setBuzzes([]);
      setGameOver(null);
      const withCards = rows.map((p) => ({ id: p.id, nick: p.nick, card: generateCard() }));
      for (const p of withCards) {
        cardsRef.current.set(p.id, p.card);
        marksRef.current.set(p.id, new Set());
        scoresRef.current.set(p.id, 0);
        nicksRef.current.set(p.id, p.nick);
      }
      playersRef.current = rows.map((p) => ({ ...p, score: 0 }));
      setPlayers(playersRef.current);
      emit({ t: "start", players: withCards });
      goPhase("ready");
      sfx.start();
      void sb.from("rooms").update({ phase: "playing" }).eq("id", roomId);
      await sb.from("players").upsert(
        withCards.map((p) => ({ id: p.id, score: 0, marks: [], card: p.card })),
        { onConflict: "id" },
      );
    };

    const askQuestion = (segment: SegmentId, round: number) => {
      const unused = (list: typeof QUESTIONS) => list.filter((q) => !usedRef.current.has(q.id));
      let pool =
        segment === "silueta"
          ? unused(QUESTIONS.filter((q) => CHAR_CATEGORIES.includes(q.category)))
          : segment === "comodin"
            ? unused(QUESTIONS)
            : unused(questionsByCategory(segment));
      if (pool.length === 0) pool = unused(QUESTIONS);
      if (pool.length === 0) {
        endGame();
        return;
      }
      const q = pool[Math.floor(Math.random() * pool.length)];
      usedRef.current.add(q.id);
      const pub: PublicQuestion = {
        roundNo: round,
        segment,
        category: q.category,
        mode: segment === "silueta" ? "silueta" : "foto",
        prompt: q.prompt,
        image: imageFor(q.key),
        points: segment === "silueta" ? 2 : 1,
        endsAt: Date.now() + ROUND_MS,
      };
      currentQRef.current = pub;
      currentKeyRef.current = q.key;
      setQuestion(pub);
      setReveal(null);
      setBuzzes([]);
      goPhase("asking");
      emit({ t: "question", q: pub });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => doReveal(null), ROUND_MS + 350);
    };

    const doSpin = () => {
      if (phaseRef.current !== "ready") return;
      const catsLeft = CATEGORIES.filter((c) => questionsByCategory(c).some((q) => !usedRef.current.has(q.id)));
      const charsLeft = CHAR_CATEGORIES.some((c) => questionsByCategory(c).some((q) => !usedRef.current.has(q.id)));
      const anyLeft = QUESTIONS.some((q) => !usedRef.current.has(q.id));
      if (!anyLeft) {
        endGame();
        return;
      }
      const segment = pickSegment(catsLeft, charsLeft, anyLeft);
      const index = SEGMENTS.findIndex((s) => s.id === segment);
      rotationRef.current = nextRotation(rotationRef.current, index);
      roundRef.current += 1;
      const round = roundRef.current;
      setRoundNo(round);
      setSpin({ segment, rotation: rotationRef.current });
      setQuestion(null);
      goPhase("spinning");
      emit({ t: "spin", roundNo: round, segment, rotation: rotationRef.current, durMs: SPIN_MS });
      sfx.spin();
      hyperspace(true);
      setTimeout(() => {
        hyperspace(false);
        if (phaseRef.current === "spinning") askQuestion(segment, round);
      }, SPIN_MS + 150);
    };

    const doReveal = (winner: RevealWinner | null) => {
      const pub = currentQRef.current;
      const key = currentKeyRef.current;
      if (!pub || !key) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      const entry = poolEntry(key)!;
      if (winner) {
        scoresRef.current.set(winner.id, (scoresRef.current.get(winner.id) ?? 0) + pub.points);
        // Winner earns the right to place a mark in this category's column.
        pendingMarkRef.current = { pid: winner.id, category: pub.category, roundNo: pub.roundNo };
      }
      // No winner (timeout) => nobody marks anything.
      const pubs = playersPub();
      playersRef.current = pubs;
      setPlayers(pubs);
      setReveal({ winner, answerDisplay: entry.display, answerKey: key, points: pub.points });
      goPhase("reveal");
      emit({
        t: "reveal",
        roundNo: roundRef.current,
        answerKey: key,
        answerDisplay: entry.display,
        winner,
        points: pub.points,
        prompt: pub.prompt,
        image: pub.image,
        mode: pub.mode,
        category: pub.category,
      });
      emit({ t: "scores", players: pubs });
      if (winner) sfx.correct();
      else sfx.reveal();
      hyperspace(true);
      setTimeout(() => hyperspace(false), 900);
      void persist();
      setTimeout(() => {
        if (phaseRef.current === "reveal") goPhase("ready");
      }, REVEAL_BREAK_MS);
    };

    const endGame = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const sorted = [...playersPub()].sort((a, b) => b.score - a.score);
      const state: GameOverState = {
        winner: sorted[0] && sorted[0].score > 0 ? { id: sorted[0].id, nick: sorted[0].nick } : null,
        reason: "host",
        players: sorted,
      };
      setGameOver(state);
      goPhase("over");
      emit({ t: "gameover", ...state });
      sfx.gameover();
      void supabase().from("rooms").update({ phase: "finished" }).eq("id", roomIdRef.current ?? "");
    };

    const onAnswer = (ev: Extract<PlayerEvent, { t: "answer" }>) => {
      if (phaseRef.current !== "asking" || ev.roundNo !== roundRef.current) return;
      const key = currentKeyRef.current;
      if (!key) return;
      const entry = poolEntry(key)!;
      if (matchesAnswer(ev.text, entry.display, entry.aliases)) {
        doReveal({ id: ev.pid, nick: ev.nick });
      } else {
        emit({ t: "wrong", nick: ev.nick });
        setBuzzes((b) => [...b.slice(-3), ev.nick]);
      }
    };

    const onMark = (ev: Extract<PlayerEvent, { t: "mark" }>) => {
      const pending = pendingMarkRef.current;
      const card = cardsRef.current.get(ev.pid);
      const marks = marksRef.current.get(ev.pid);
      if (!pending || !card || !marks) return;
      if (pending.pid !== ev.pid) return;
      if (!canPlaceMark(card, marks, pending.category, ev.cell)) return;
      marks.add(ev.cell);
      if (pendingMarkRef.current?.pid === ev.pid) pendingMarkRef.current = null;
      if (completedLine(card, marks)) {
        // Valid bingo claimed through a legal mark: end the game.
        const pubs = playersPub();
        const state: GameOverState = {
          winner: { id: ev.pid, nick: nicksRef.current.get(ev.pid) ?? "?" },
          reason: "bingo",
          players: [...pubs].sort((a, b) => b.score - a.score),
        };
        setGameOver(state);
        goPhase("over");
        emit({ t: "gameover", ...state });
        sfx.bingo();
        void sb.from("rooms").update({ phase: "finished" }).eq("id", roomIdRef.current ?? "");
      }
      void persist();
    };

    const onBingo = (ev: Extract<PlayerEvent, { t: "bingo" }>) => {
      const card = cardsRef.current.get(ev.pid);
      const marks = marksRef.current.get(ev.pid);
      if (!card || !marks) return;
      if (!completedLine(card, marks)) return; // claim not valid, ignored
      const pubs = playersPub();
      const state: GameOverState = {
        winner: { id: ev.pid, nick: ev.nick },
        reason: "bingo",
        players: [...pubs].sort((a, b) => b.score - a.score),
      };
      setGameOver(state);
      goPhase("over");
      emit({ t: "gameover", ...state });
      sfx.bingo();
      void supabase().from("rooms").update({ phase: "finished" }).eq("id", roomId);
    };

    const channel = roomChannel(sb, code, "host");
    channel
      .on("broadcast", { event: "msg" }, ({ payload }: { payload: unknown }) => {
        const ev = payload as PlayerEvent;
        if (ev.t === "answer") onAnswer(ev);
        else if (ev.t === "mark") onMark(ev);
        else if (ev.t === "bingo") onBingo(ev);
      })
      .on("presence", { event: "join" }, () => {
        sfx.join();
        void fetchPlayers();
      })
      .on("presence", { event: "leave" }, () => void fetchPlayers())
      .on("presence", { event: "sync" }, () => {
        setPresenceCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track({ role: "host", nick: "⌘ HOST" });
      });
    channelRef.current = channel;

    actionsRef.current = { startGame, doSpin, endGame, resetLobby };

    async function resetLobby() {
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingMarkRef.current = null;
      setGameOver(null);
      setQuestion(null);
      setReveal(null);
      setSpin(null);
      setRoundNo(0);
      roundRef.current = 0;
      usedRef.current = new Set();
      goPhase("lobby");
      await sb.from("rooms").update({ phase: "lobby" }).eq("id", roomId);
      await fetchPlayers();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void sb.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, roomId]);

  const actionsRef = useRef<{ startGame: () => Promise<void>; doSpin: () => void; endGame: () => void; resetLobby: () => Promise<void> }>({
    startGame: async () => {},
    doSpin: () => {},
    endGame: () => {},
    resetLobby: async () => {},
  });

  return {
    phase,
    players,
    presenceCount,
    roundNo,
    spin,
    question,
    reveal,
    buzzes,
    gameOver,
    canSpin: phase === "ready",
    start: () => void actionsRef.current.startGame(),
    spinNow: () => actionsRef.current.doSpin(),
    end: () => actionsRef.current.endGame(),
    newGame: () => void actionsRef.current.startGame(),
    backToLobby: () => void actionsRef.current.resetLobby(),
    poolDebug: POOLS, // expuesto para depuración/desarrollo
  };
}
