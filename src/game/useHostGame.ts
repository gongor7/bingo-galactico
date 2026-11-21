"use client";

// Host-authoritative game engine. All state transitions happen here and are
// broadcast to players; host UI renders from the same state it broadcasts.
//
// v3 rules:
// - Turns: players spin the wheel in rotation order (host can override).
// - Spin gate: nobody spins while the previous winner hasn't placed their mark.
// - Marks: only the round winner places, choosing a cell of the won category
//   (anywhere free if that category is exhausted). Host validates + checks bingo.
// - Timeout rounds (no winner) mark nothing.

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
  SPIN_HOLD_MS,
  SPIN_MS,
  type Card,
  type Category,
  type HostEvent,
  type MarkTarget,
  type PlayerEvent,
  type PlayerPub,
  type PublicQuestion,
  type RevealWinner,
  type SegmentId,
} from "./types";
import { COMODIN_QUESTIONS, POOLS, QUESTIONS, imageFor, poolEntry, questionsByCategory } from "./data";
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
  target: MarkTarget;
  roundNo: number;
}

interface ActiveAnswer {
  key: string;
  display: string;
  aliases: string[];
}

const CHAR_CATEGORIES: Category[] = CATEGORIES.filter((c) => c !== "planetas");

export function useHostGame(code: string, roomId: string | null) {
  const [phase, setPhase] = useState<HostPhase>("lobby");
  const [players, setPlayers] = useState<PlayerPub[]>([]);
  const [presenceCount, setPresenceCount] = useState(0);
  const [roundNo, setRoundNo] = useState(0);
  const [spin, setSpin] = useState<SpinState | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [reveal, setReveal] = useState<{ winner: RevealWinner | null; answerDisplay: string; answerKey: string; points: number } | null>(null);
  const [buzzes, setBuzzes] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState<GameOverState | null>(null);
  const [turnPid, setTurnPid] = useState<string | null>(null);
  const [turnNick, setTurnNick] = useState<string>("");
  const [pendingPid, setPendingPid] = useState<string | null>(null);

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
  const turnOrderRef = useRef<string[]>([]);
  const turnIdxRef = useRef(0);
  const usedRef = useRef<Set<string>>(new Set());
  const roundRef = useRef(0);
  const rotationRef = useRef(0);
  const currentQRef = useRef<PublicQuestion | null>(null);
  const currentAnswerRef = useRef<ActiveAnswer | null>(null);
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

  const advanceTurn = () => {
    const order = turnOrderRef.current;
    if (order.length === 0) return;
    turnIdxRef.current = (turnIdxRef.current + 1) % order.length;
    const pid = order[turnIdxRef.current];
    setTurnPid(pid);
    setTurnNick(nicksRef.current.get(pid) ?? "?");
    emit({ t: "turn", pid, nick: nicksRef.current.get(pid) ?? "?" });
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
        if (p.card) {
          cardsRef.current.set(p.id, p.card);
          marksRef.current.set(p.id, new Set(p.marks ?? []));
          scoresRef.current.set(p.id, p.score);
        }
      }
      if (phaseRef.current === "lobby" || playersRef.current.length === 0) {
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
      await sb.from("players").upsert(rows, { onConflict: "id" });
    };

    const startGame = async () => {
      if (phaseRef.current === "lobby") await fetchPlayers();
      const rows = playersRef.current;
      if (rows.length === 0) return;
      cardsRef.current = new Map();
      marksRef.current = new Map();
      scoresRef.current = new Map();
      pendingMarkRef.current = null;
      setPendingPid(null);
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
      // Turn rotation follows the join order.
      turnOrderRef.current = rows.map((p) => p.id);
      turnIdxRef.current = 0;
      const firstPid = turnOrderRef.current[0];
      setTurnPid(firstPid);
      setTurnNick(nicksRef.current.get(firstPid) ?? "?");
      emit({ t: "turn", pid: firstPid, nick: nicksRef.current.get(firstPid) ?? "?" });
      goPhase("ready");
      sfx.start();
      void sb.from("rooms").update({ phase: "playing" }).eq("id", roomId);
      await sb.from("players").upsert(
        withCards.map((p) => ({ id: p.id, score: 0, marks: [], card: p.card })),
        { onConflict: "id" },
      );
    };

    const askQuestion = (segment: SegmentId, round: number) => {
      const unused = <T extends { id: string }>(list: T[]) => list.filter((q) => !usedRef.current.has(q.id));

      let pub: PublicQuestion;
      let answer: ActiveAnswer;

      if (segment === "comodin") {
        const comodinPool = unused(COMODIN_QUESTIONS);
        if (comodinPool.length > 0) {
          const cq = comodinPool[Math.floor(Math.random() * comodinPool.length)];
          usedRef.current.add(cq.id);
          pub = {
            roundNo: round,
            segment: "comodin",
            category: "jedi",
            markTarget: "any",
            mode: "comodin",
            prompt: cq.prompt,
            image: "",
            points: 3,
            endsAt: Date.now() + ROUND_MS,
          };
          answer = { key: cq.key, display: cq.answerDisplay, aliases: cq.aliases };
        } else {
          const fallbackPool = unused(QUESTIONS);
          if (fallbackPool.length === 0) {
            endGame();
            return;
          }
          const q = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
          usedRef.current.add(q.id);
          const entry = poolEntry(q.key)!;
          pub = {
            roundNo: round,
            segment: "comodin",
            category: q.category,
            markTarget: "any",
            mode: "comodin",
            prompt: q.prompt,
            image: "",
            points: 3,
            endsAt: Date.now() + ROUND_MS,
          };
          answer = { key: q.key, display: entry.display, aliases: entry.aliases };
        }
      } else {
        let pool =
          segment === "silueta"
            ? unused(QUESTIONS.filter((q) => CHAR_CATEGORIES.includes(q.category)))
            : unused(questionsByCategory(segment));
        if (pool.length === 0) pool = unused(QUESTIONS);
        if (pool.length === 0) {
          endGame();
          return;
        }
        const q = pool[Math.floor(Math.random() * pool.length)];
        usedRef.current.add(q.id);
        const entry = poolEntry(q.key)!;
        pub = {
          roundNo: round,
          segment,
          category: q.category,
          markTarget: q.category,
          mode: segment === "silueta" ? "silueta" : "foto",
          prompt: q.prompt,
          image: imageFor(q.key),
          points: segment === "silueta" ? 2 : 1,
          endsAt: Date.now() + ROUND_MS,
        };
        answer = { key: q.key, display: entry.display, aliases: entry.aliases };
      }

      currentQRef.current = pub;
      currentAnswerRef.current = answer;
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
      // Mark gate: the previous winner must place their mark first.
      if (pendingMarkRef.current) return;
      const catsLeft = CATEGORIES.filter((c) => questionsByCategory(c).some((q) => !usedRef.current.has(q.id)));
      const charsLeft = CHAR_CATEGORIES.some((c) => questionsByCategory(c).some((q) => !usedRef.current.has(q.id)));
      const comodinesLeft = COMODIN_QUESTIONS.some((q) => !usedRef.current.has(q.id));
      const anyLeft = QUESTIONS.some((q) => !usedRef.current.has(q.id)) || comodinesLeft;
      if (!anyLeft) {
        endGame();
        return;
      }
      const segment = pickSegment(catsLeft, charsLeft, comodinesLeft);
      const index = SEGMENTS.findIndex((s) => s.id === segment);
      rotationRef.current = nextRotation(rotationRef.current, index);
      roundRef.current += 1;
      const round = roundRef.current;
      setRoundNo(round);
      setSpin({ segment, rotation: rotationRef.current });
      setSpinning(true);
      setQuestion(null);
      goPhase("spinning");
      emit({ t: "spin", roundNo: round, segment, rotation: rotationRef.current, durMs: SPIN_MS });
      sfx.spin();
      hyperspace(true);
      setTimeout(() => {
        hyperspace(false);
        setSpinning(false);
      }, SPIN_MS);
      setTimeout(() => {
        if (phaseRef.current === "spinning") askQuestion(segment, round);
      }, SPIN_MS + SPIN_HOLD_MS);
    };

    const doReveal = (winner: RevealWinner | null) => {
      const pub = currentQRef.current;
      const ans = currentAnswerRef.current;
      if (!pub || !ans) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (winner) {
        scoresRef.current.set(winner.id, (scoresRef.current.get(winner.id) ?? 0) + pub.points);
        pendingMarkRef.current = { pid: winner.id, target: pub.markTarget, roundNo: pub.roundNo };
        setPendingPid(winner.id);
      }
      // Timeout round: nobody marks anything.
      const pubs = playersPub();
      playersRef.current = pubs;
      setPlayers(pubs);
      setReveal({ winner, answerDisplay: ans.display, answerKey: ans.key, points: pub.points });
      goPhase("reveal");
      emit({
        t: "reveal",
        roundNo: roundRef.current,
        answerKey: ans.key,
        answerDisplay: ans.display,
        winner,
        points: pub.points,
        prompt: pub.prompt,
        image: pub.image,
        mode: pub.mode,
        category: pub.category,
        markTarget: pub.markTarget,
      });
      emit({ t: "scores", players: pubs });
      if (winner) sfx.correct();
      else sfx.reveal();
      hyperspace(true);
      setTimeout(() => hyperspace(false), 900);
      void persist();
      // Next player's turn (the mark gate pauses spinning until it's placed).
      advanceTurn();
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

    const applyMark = (pid: string, cell: number): boolean => {
      const pending = pendingMarkRef.current;
      const card = cardsRef.current.get(pid);
      const marks = marksRef.current.get(pid);
      if (!pending || !card || !marks) return false;
      if (pending.pid !== pid) return false;
      if (!canPlaceMark(card, marks, pending.target, cell)) return false;
      marks.add(cell);
      pendingMarkRef.current = null;
      setPendingPid(null);
      if (completedLine(card, marks)) {
        const pubs = playersPub();
        const state: GameOverState = {
          winner: { id: pid, nick: nicksRef.current.get(pid) ?? "?" },
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
      return true;
    };

    const onAnswer = (ev: Extract<PlayerEvent, { t: "answer" }>) => {
      if (phaseRef.current !== "asking" || ev.roundNo !== roundRef.current) return;
      const ans = currentAnswerRef.current;
      if (!ans) return;
      if (matchesAnswer(ev.text, ans.display, ans.aliases)) {
        doReveal({ id: ev.pid, nick: ev.nick });
      } else {
        emit({ t: "wrong", nick: ev.nick });
        setBuzzes((b) => [...b.slice(-3), ev.nick]);
      }
    };

    const onSpinRequest = (ev: Extract<PlayerEvent, { t: "spin-request" }>) => {
      if (phaseRef.current !== "ready") return;
      if (pendingMarkRef.current) return;
      if (ev.pid !== turnOrderRef.current[turnIdxRef.current]) return; // not their turn
      doSpin();
    };

    const onBingo = (ev: Extract<PlayerEvent, { t: "bingo" }>) => {
      const card = cardsRef.current.get(ev.pid);
      const marks = marksRef.current.get(ev.pid);
      if (!card || !marks) return;
      if (!completedLine(card, marks)) return;
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
        else if (ev.t === "spin-request") onSpinRequest(ev);
        else if (ev.t === "mark") applyMark(ev.pid, ev.cell);
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
        () => void fetchPlayers(),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track({ role: "host", nick: "⌘ HOST" });
      });
    channelRef.current = channel;

    actionsRef.current = {
      startGame,
      doSpin,
      endGame,
      resetLobby,
      spinForced: () => doSpin(), // host override: spins regardless of whose turn
      markRandomFor: (pid: string) => {
        const pending = pendingMarkRef.current;
        const card = cardsRef.current.get(pid);
        const marks = marksRef.current.get(pid);
        if (!pending || !card || !marks || pending.pid !== pid) return;
        const candidates: number[] = [];
        for (let i = 0; i < card.length; i++) if (canPlaceMark(card, marks, pending.target, i)) candidates.push(i);
        if (candidates.length === 0) return;
        const cell = candidates[Math.floor(Math.random() * candidates.length)];
        applyMark(pid, cell);
      },
    };

    async function resetLobby() {
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingMarkRef.current = null;
      setPendingPid(null);
      setTurnPid(null);
      setTurnNick("");
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

  const actionsRef = useRef<{
    startGame: () => Promise<void>;
    doSpin: () => void;
    endGame: () => void;
    resetLobby: () => Promise<void>;
    spinForced: () => void;
    markRandomFor: (pid: string) => void;
  }>({
    startGame: async () => {},
    doSpin: () => {},
    endGame: () => {},
    resetLobby: async () => {},
    spinForced: () => {},
    markRandomFor: () => {},
  });

  return {
    phase,
    players,
    presenceCount,
    roundNo,
    spin,
    spinning,
    question,
    reveal,
    buzzes,
    gameOver,
    turnPid,
    turnNick,
    pendingPid,
    canSpin: phase === "ready" && !pendingPid,
    start: () => void actionsRef.current.startGame(),
    spinNow: () => actionsRef.current.doSpin(),
    spinForced: () => actionsRef.current.spinForced(),
    markRandomFor: (pid: string) => actionsRef.current.markRandomFor(pid),
    end: () => actionsRef.current.endGame(),
    newGame: () => void actionsRef.current.startGame(),
    backToLobby: () => void actionsRef.current.resetLobby(),
    poolDebug: POOLS,
  };
}
