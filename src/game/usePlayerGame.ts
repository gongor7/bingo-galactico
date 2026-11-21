"use client";

// Player-side realtime state: mirrors host events, manages cartón marks,
// line detection and the bingo claim.
//
// Marking model (v2): only the winner marks, choosing a free cell in the
// category column of the won question (any empty cell if that column is full).

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { roomChannel, sendPlayer } from "@/lib/realtime";
import { sfx } from "@/lib/sfx";
import { hyperspace } from "@/components/StarField";
import type { Card, HostEvent, MarkTarget, PlayerPub, PublicQuestion, SegmentId } from "./types";
import { canPlaceMark, completedLine } from "./cards";
import { SPIN_MS } from "./types";

export type PlayerPhase = "lobby" | "ready" | "spinning" | "asking" | "reveal" | "over";

export interface RevealState {
  winner: { id: string; nick: string } | null;
  answerDisplay: string;
  answerKey: string;
  points: number;
}

export function usePlayerGame(code: string, pid: string | null, nick: string | null) {
  const [phase, setPhase] = useState<PlayerPhase>("lobby");
  const [card, setCard] = useState<Card | null>(null);
  const [marks, setMarks] = useState<Set<number>>(new Set());
  const [justMarkedCell, setJustMarkedCell] = useState<number | null>(null);
  const [pendingMark, setPendingMark] = useState<MarkTarget | null>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [reveal, setReveal] = useState<RevealState | null>(null);
  const [buzzes, setBuzzes] = useState<string[]>([]);
  const [scores, setScores] = useState<PlayerPub[]>([]);
  const [spin, setSpin] = useState<{ rotation: number; segment: SegmentId } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [gameOver, setGameOver] = useState<{
    winner: { id: string; nick: string } | null;
    reason: "bingo" | "host";
    players: PlayerPub[];
  } | null>(null);
  const [turnPid, setTurnPid] = useState<string | null>(null);
  const [turnNick, setTurnNick] = useState<string>("");
  const [connection, setConnection] = useState<"connecting" | "online" | "offline">("connecting");

  const phaseRef = useRef<PlayerPhase>("lobby");
  const cardRef = useRef<Card | null>(null);
  const marksRef = useRef<Set<number>>(new Set());
  const pendingMarkRef = useRef<MarkTarget | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const nickRef = useRef<string | null>(nick);
  const pidRef = useRef<string | null>(pid);

  const goPhase = (p: PlayerPhase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const winLineAnnounced = useRef(false);

  /** Applies a legal mark locally (shared by the click path). */
  const placeMarkLocal = (cell: number): boolean => {
    const c = cardRef.current;
    const cat = pendingMarkRef.current;
    if (!c || !cat) return false;
    if (!canPlaceMark(c, marksRef.current, cat, cell)) return false;
    marksRef.current.add(cell);
    setMarks(new Set(marksRef.current));
    pendingMarkRef.current = null;
    setPendingMark(null);
    setJustMarkedCell(cell);
    sfx.mark();
    setTimeout(() => setJustMarkedCell((k) => (k === cell ? null : k)), 900);
    const line = completedLine(c, marksRef.current);
    if (line && !winLineAnnounced.current) {
      winLineAnnounced.current = true;
      setWinLine(line);
      sfx.bingo();
      if (channelRef.current && pidRef.current && nickRef.current) {
        sendPlayer(channelRef.current, { t: "bingo", pid: pidRef.current, nick: nickRef.current });
      }
    }
    return true;
  };

  useEffect(() => {
    nickRef.current = nick;
    pidRef.current = pid;
  }, [nick, pid]);

  // Recover room state (lobby vs in-game) on load/refresh.
  useEffect(() => {
    if (!code || !pid) return;
    void supabase()
      .from("players")
      .select("id, nick, score, card, marks, rooms(code, phase)")
      .eq("id", pid)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const row = data as {
          id: string;
          nick: string;
          score: number;
          card: Card | null;
          marks: number[] | null;
          rooms: { code: string; phase: string }[] | null;
        };
        const room = row.rooms?.[0] ?? null;
        nickRef.current = row.nick;
        if (row.card) {
          cardRef.current = row.card;
          marksRef.current = new Set(row.marks ?? []);
          setCard(row.card);
          setMarks(new Set(row.marks ?? []));
          if (room && room.phase !== "lobby") goPhase("ready");
        }
        if (room?.phase === "lobby") goPhase("lobby");
      });
  }, [code, pid]);

  useEffect(() => {
    if (!code || !pid) return;
    const sb = supabase();
    const channel = roomChannel(sb, code, pid);

    channel
      .on("broadcast", { event: "msg" }, ({ payload }: { payload: unknown }) => {
        const ev = payload as HostEvent;
        switch (ev.t) {
          case "start": {
            const me = ev.players.find((p) => p.id === pidRef.current);
            if (!me) break;
            cardRef.current = me.card;
            marksRef.current = new Set();
            pendingMarkRef.current = null;
            winLineAnnounced.current = false;
            setCard(me.card);
            setMarks(new Set());
            setPendingMark(null);
            setWinLine(null);
            setGameOver(null);
            setQuestion(null);
            setReveal(null);
            setTurnPid(null);
            setTurnNick("");
            setScores(ev.players.map((p) => ({ id: p.id, nick: p.nick, score: 0 })));
            goPhase("ready");
            sfx.start();
            break;
          }
          case "turn": {
            setTurnPid(ev.pid);
            setTurnNick(ev.nick);
            break;
          }
          case "spin": {
            setSpin({ rotation: ev.rotation, segment: ev.segment });
            setSpinning(true);
            setQuestion(null);
            setReveal(null);
            goPhase("spinning");
            sfx.spin();
            hyperspace(true);
            setTimeout(() => {
              hyperspace(false);
              setSpinning(false);
            }, SPIN_MS);
            break;
          }
          case "question": {
            setQuestion(ev.q);
            setBuzzes([]);
            goPhase("asking");
            break;
          }
          case "wrong": {
            setBuzzes((b) => [...b.slice(-3), ev.nick]);
            if (ev.nick === nickRef.current) setShakeKey((k) => k + 1);
            break;
          }
          case "reveal": {
            setReveal({
              winner: ev.winner,
              answerDisplay: ev.answerDisplay,
              answerKey: ev.answerKey,
              points: ev.points,
            });
            setQuestion((q) => (q ? { ...q, endsAt: Date.now() } : q));
            goPhase("reveal");
            // Only the winner earns a mark, and they choose where to place it.
            if (ev.winner && ev.winner.id === pidRef.current) {
              const target: MarkTarget = ev.markTarget ?? ev.category;
              pendingMarkRef.current = target;
              setPendingMark(target);
              sfx.correct();
            } else {
              if (ev.winner) sfx.reveal();
            }
            break;
          }
          case "scores": {
            setScores(ev.players);
            break;
          }
          case "gameover": {
            setGameOver({ winner: ev.winner, reason: ev.reason, players: ev.players });
            goPhase("over");
            if (ev.winner?.id !== pidRef.current) sfx.gameover();
            break;
          }
        }
      })
      .on("presence", { event: "sync" }, () => {
        /* lobby roster uses DB + host broadcasts; presence kept for liveness */
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnection("online");
          void channel.track({ pid: pidRef.current, nick: nickRef.current });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnection("offline");
        }
      });
    channelRef.current = channel;

    return () => {
      void sb.removeChannel(channel);
      channelRef.current = null;
    };
  }, [code, pid]);

  const sendAnswer = (text: string) => {
    if (!channelRef.current || !pidRef.current) return;
    if (phaseRef.current !== "asking" || !question) return;
    sendPlayer(channelRef.current, {
      t: "answer",
      pid: pidRef.current,
      nick: nickRef.current ?? "?",
      roundNo: question.roundNo,
      text,
      ts: Date.now(),
    });
  };

  /** Winner clicks a cell to place their earned mark. */
  const placeMark = (cell: number) => {
    if (!pidRef.current || !pendingMarkRef.current) return;
    if (!placeMarkLocal(cell)) return;
    if (channelRef.current) {
      sendPlayer(channelRef.current, { t: "mark", pid: pidRef.current, cell });
    }
  };

  /** Cells the player is allowed to click right now (placement affordance). */
  const markableCells = (): Set<number> => {
    const c = cardRef.current;
    const target = pendingMarkRef.current;
    const out = new Set<number>();
    if (!c || !target) return out;
    if (target === "any") {
      for (let i = 0; i < c.length; i++) {
        if (c[i] !== null && !marksRef.current.has(i)) out.add(i);
      }
      return out;
    }
    const matches: number[] = [];
    const others: number[] = [];
    for (let i = 0; i < c.length; i++) {
      if (c[i] === null || marksRef.current.has(i)) continue;
      if (c[i] === target) matches.push(i);
      else others.push(i);
    }
    if (matches.length > 0) matches.forEach((i) => out.add(i));
    else others.forEach((i) => out.add(i)); // category exhausted: anywhere free
    return out;
  };

  const myTurn = Boolean(turnPid && pid && turnPid === pid);

  /** Asks the host to spin the wheel — only valid on the player's turn. */
  const requestSpin = () => {
    if (!channelRef.current || !pidRef.current || !myTurn) return;
    if (phaseRef.current !== "ready") return;
    sfx.hover();
    sendPlayer(channelRef.current, { t: "spin-request", pid: pidRef.current });
  };

  return {
    phase,
    card,
    marks,
    justMarkedCell,
    pendingMark,
    markableCells,
    winLine,
    question,
    reveal,
    buzzes,
    scores,
    spin,
    spinning,
    shakeKey,
    gameOver,
    turnPid,
    turnNick,
    myTurn,
    connection,
    sendAnswer,
    placeMark,
    requestSpin,
  };
}
