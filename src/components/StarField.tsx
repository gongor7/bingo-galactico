"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  z: number; // depth 0..1
  phase: number;
}

const HYPER_EVENT = "sw-hyperspace";

/**
 * Parallax starfield on a canvas. Listens for `sw-hyperspace` window events
 * ({ on: boolean }) to stretch stars into warp streaks (wheel spin / reveal).
 */
export default function StarField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let speed = 0.05;
    let targetSpeed = 0.05;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.floor((w * h) / 6500);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random(),
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const onHyper = (e: Event) => {
      const detail = (e as CustomEvent<{ on: boolean }>).detail;
      targetSpeed = detail?.on ? 46 : 0.05;
    };

    let t = 0;
    const frame = () => {
      t += 0.016;
      speed += (targetSpeed - speed) * 0.04;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const twinkle = 0.55 + 0.45 * Math.sin(t * 1.7 + s.phase);
        const size = 0.5 + s.z * 1.6;
        const alpha = (0.25 + s.z * 0.75) * twinkle;
        // drift slowly; in hyperspace, stars streak outward from center
        const dx = w / 2 - s.x;
        const dy = h / 2 - s.y;
        const norm = Math.hypot(dx, dy) || 1;
        const v = speed * (0.25 + s.z);
        s.x -= (dx / norm) * v;
        s.y -= (dy / norm) * v;
        if (s.x < -5) s.x = w + 5;
        if (s.x > w + 5) s.x = -5;
        if (s.y < -5) s.y = h + 5;
        if (s.y > h + 5) s.y = -5;

        if (speed > 1.5) {
          const trail = 2 + s.z * 10;
          ctx.strokeStyle = `rgba(${180 + s.z * 60}, ${200 + s.z * 40}, 255, ${alpha})`;
          ctx.lineWidth = size;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x + (dx / norm) * trail, s.y + (dy / norm) * trail);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(${200 + s.z * 55}, ${215 + s.z * 40}, 255, ${alpha})`;
          ctx.fillRect(s.x, s.y, size, size);
        }
      }
      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener(HYPER_EVENT, onHyper);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener(HYPER_EVENT, onHyper);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 -z-10" aria-hidden />;
}

export function hyperspace(on: boolean): void {
  window.dispatchEvent(new CustomEvent(HYPER_EVENT, { detail: { on } }));
}
