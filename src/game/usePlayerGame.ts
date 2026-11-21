"use client";

// Player-side realtime state: mirrors host events, manages cartón marks,
// line detection and the bingo claim.

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { roomChannel, sendPlayer } from "@/lib/realtime";
import { sfx } from "@/lib/sfx";
import { hyperspace } from "@/components/StarField";
import type { Card, HostEvent, PlayerPub, PublicQuestion } from "./types";
import { completedLine, hasKey } from "./cards";
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
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [justMarkedKey, setJustMarkedKey] = useState<string | null>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [reveal, setReveal] = useState<RevealState | null>(null);
  const [buzzes, setBuzzes] = useState<string[]>([]);
  const [scores, setScores] = useState<PlayerPub[]>([]);
  const [spin, setSpin] = useState<{ rotation: number; segment: string } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [gameOver, setGameOver] = useState<{
    winner: { id: string; nick: string } | null;
    reason: "bingo" | "host";
    players: PlayerPub[];
  } | null>(null);
  const [connection, setConnection] = useState<"connecting" | "online" | "offline">("connecting");

  const phaseRef = useRef<PlayerPhase>("lobby");
  const cardRef = useRef<Card | null>(null);
  const markedRef = useRef<Set<string>>(new Set());
  const claimedRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const nickRef = useRef<string | null>(nick);
  const pidRef = useRef<string | null>(pid);

  const goPhase = (p: PlayerPhase) => {
    phaseRef.current = p;
    setPhase(p);
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
          marks: string[] | null;
          rooms: { code: string; phase: string }[] | null;
        };
        const room = row.rooms?.[0] ?? null;
        nickRef.current = row.nick;
        if (row.card) {
          cardRef.current = row.card;
          markedRef.current = new Set(row.marks ?? []);
          setCard(row.card);
          setMarked(new Set(row.marks ?? []));
          if (room && room.phase !== "lobby") goPhase("ready");
        }
        if (room?.phase === "lobby") goPhase("lobby");
      });
  }, [code, pid]);

  useEffect(() => {
    if (!code || !pid) return;
    const sb = supabase();
    const channel = roomChannel(sb, code, pid);

    const markAndCheck = (key: string) => {
      const c = cardRef.current;
      if (!c || !hasKey(c, key) || markedRef.current.has(key)) return;
      markedRef.current.add(key);
      setMarked(new Set(markedRef.current));
      setJustMarkedKey(key);
      sfx.mark();
      setTimeout(() => setJustMarkedKey((k) => (k === key ? null : k)), 900);
      const line = completedLine(c, markedRef.current);
      if (line && !claimedRef.current) {
        claimedRef.current = true;
        setWinLine(line);
        sfx.bingo();
        if (channelRef.current && pidRef.current && nickRef.current) {
          sendPlayer(channelRef.current, { t: "bingo", pid: pidRef.current, nick: nickRef.current });
        }
      }
    };

    channel
      .on("broadcast", { event: "msg" }, ({ payload }: { payload: unknown }) => {
        const ev = payload as HostEvent;
        switch (ev.t) {
          case "start": {
            const me = ev.players.find((p) => p.id === pidRef.current);
            if (!me) break;
            cardRef.current = me.card;
            markedRef.current = new Set();
            claimedRef.current = false;
            setCard(me.card);
            setMarked(new Set());
            setWinLine(null);
            setGameOver(null);
            setQuestion(null);
            setReveal(null);
            setScores(ev.players.map((p) => ({ id: p.id, nick: p.nick, score: 0 })));
            goPhase("ready");
            sfx.start();
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
            }, SPIN_MS + 150);
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
            markAndCheck(ev.answerKey);
            if (ev.winner?.id !== pidRef.current) sfx.reveal();
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

  return {
    phase,
    card,
    marked,
    justMarkedKey,
    winLine,
    question,
    reveal,
    buzzes,
    scores,
    spin,
    spinning,
    shakeKey,
    gameOver,
    connection,
    sendAnswer,
  };
}
