// Synthesized Star Wars-flavored SFX via WebAudio. No audio assets, no copyright.
// Everything is lazy: the AudioContext starts on first user interaction.

let ctx: AudioContext | null = null;
let muted = false;

if (typeof window !== "undefined") {
  muted = localStorage.getItem("sw-mute") === "1";
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface ToneOpts {
  freq: number;
  dur?: number;
  type?: OscillatorType;
  vol?: number;
  when?: number;
  slideTo?: number;
}

function tone({ freq, dur = 0.15, type = "sine", vol = 0.12, when = 0, slideTo }: ToneOpts): void {
  const c = ac();
  if (!c || muted) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur = 0.4, from = 400, to = 2000, vol = 0.08, when = 0): void {
  const c = ac();
  if (!c || muted) return;
  const t0 = c.currentTime + when;
  const len = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  hover: () => tone({ freq: 1400, dur: 0.04, type: "sine", vol: 0.02 }),
  tick: () => tone({ freq: 950, dur: 0.03, type: "square", vol: 0.035 }),
  spin: () => {
    noiseBurst(0.9, 200, 2400, 0.06);
    tone({ freq: 90, dur: 0.8, type: "sawtooth", vol: 0.05, slideTo: 220 });
  },
  send: () => {
    tone({ freq: 620, dur: 0.07, type: "triangle", vol: 0.1 });
    tone({ freq: 930, dur: 0.09, type: "triangle", vol: 0.1, when: 0.07 });
  },
  wrong: () => {
    tone({ freq: 165, dur: 0.18, type: "sawtooth", vol: 0.09 });
    tone({ freq: 110, dur: 0.22, type: "sawtooth", vol: 0.09, when: 0.1 });
  },
  correct: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.12, type: "triangle", vol: 0.12, when: i * 0.085 }));
  },
  mark: () => {
    tone({ freq: 900, dur: 0.06, type: "square", vol: 0.07 });
    tone({ freq: 1350, dur: 0.08, type: "square", vol: 0.07, when: 0.06 });
  },
  reveal: () => {
    tone({ freq: 440, dur: 0.35, type: "sine", vol: 0.1, slideTo: 880 });
    noiseBurst(0.3, 1200, 3500, 0.04, 0.05);
  },
  join: () => {
    tone({ freq: 700, dur: 0.08, type: "sine", vol: 0.08 });
    tone({ freq: 1050, dur: 0.1, type: "sine", vol: 0.08, when: 0.09 });
  },
  start: () => {
    tone({ freq: 70, dur: 1.1, type: "sawtooth", vol: 0.07, slideTo: 180 });
    [262, 330, 392, 523].forEach((f, i) => tone({ freq: f, dur: 0.16, type: "triangle", vol: 0.1, when: 0.35 + i * 0.11 }));
  },
  bingo: () => {
    [392, 523, 659, 784, 659, 784, 1046].forEach((f, i) =>
      tone({ freq: f, dur: 0.16, type: "square", vol: 0.09, when: i * 0.12 }),
    );
    tone({ freq: 1046, dur: 0.7, type: "triangle", vol: 0.1, when: 0.84 });
    noiseBurst(0.6, 2000, 6000, 0.05, 0.84);
  },
  gameover: () => {
    [220, 262, 330, 220].forEach((f, i) => tone({ freq: f, dur: 0.3, type: "triangle", vol: 0.11, when: i * 0.28 }));
  },
  /**
   * Fanfarria épica ORIGINAL (~12 s) para la intro: acordes de bronces con
   * timbal. Composición propia — no es el tema de Star Wars (con copyright).
   */
  fanfare: () => {
    const brass = (freqs: number[], when: number, dur: number, vol = 0.05) => {
      freqs.forEach((f) => {
        tone({ freq: f, dur, type: "sawtooth", vol, when, slideTo: f * 1.004 });
        tone({ freq: f * 1.005, dur, type: "sawtooth", vol: vol * 0.7, when });
      });
    };
    const timp = (when: number) => {
      tone({ freq: 75, dur: 0.5, type: "sine", vol: 0.16, when, slideTo: 48 });
      noiseBurst(0.22, 120, 60, 0.1, when);
    };
    // Intro: tres golpes de timbal
    timp(0);
    timp(1.4);
    timp(2.8);
    // Progresión épica original: Bb — F — Gm — Eb — Bb — F — Bb
    brass([116.5, 146.8, 174.6], 3.6, 1.5); // Bb2 D3 F3
    brass([87.3, 116.5, 174.6], 5.2, 1.5); // F2 Bb2 F3
    brass([98, 116.5, 155.6], 6.8, 1.5); // G2 Bb2 Eb3
    brass([77.8, 116.5, 155.6], 8.4, 1.5); // Eb2 Bb2 Eb3
    brass([116.5, 146.8, 174.6], 10, 1.4); // Bb
    brass([87.3, 116.5, 174.6], 11.5, 1.3); // F
    brass([116.5, 146.8, 174.6, 233.1], 12.9, 2.6, 0.06); // Bb final largo
    timp(13);
    // Remate agudo original (sin copiar melodías existentes)
    [466.2, 587.3, 698.5, 932.3].forEach((f, i) =>
      tone({ freq: f, dur: 0.34, type: "triangle", vol: 0.07, when: 13.4 + i * 0.22 }),
    );
  },
};

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  if (typeof window !== "undefined") localStorage.setItem("sw-mute", muted ? "1" : "0");
  return muted;
}
