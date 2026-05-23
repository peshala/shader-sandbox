"use client";

import { useEffect, useRef } from "react";

interface RibbonDef {
  hue1: number;
  hue2: number;
  sat: number;
  light: number;
  amp1: number;
  amp2: number;
  freq1: number;
  freq2: number;
  speed1: number;
  speed2: number;
  phase: number;
  yOffset: number;
  width: number;
}

const RIBBONS: RibbonDef[] = [
  { hue1: 220, hue2: 230, sat: 90, light: 55, amp1: 0.04, amp2: 0.025, freq1: 1.8, freq2: 0.9, speed1: 1.0, speed2: 0.7, phase: 0.0, yOffset: -0.14, width: 18 },
  { hue1: 270, hue2: 280, sat: 85, light: 52, amp1: 0.045, amp2: 0.02, freq1: 1.6, freq2: 1.1, speed1: 0.9, speed2: 0.8, phase: 2.5, yOffset: -0.07, width: 16 },
  { hue1: 300, hue2: 310, sat: 80, light: 50, amp1: 0.035, amp2: 0.025, freq1: 2.0, freq2: 0.8, speed1: 1.1, speed2: 0.6, phase: 5.0, yOffset: 0.0, width: 20 },
  { hue1: 350, hue2: 5, sat: 85, light: 55, amp1: 0.04, amp2: 0.02, freq1: 1.7, freq2: 1.0, speed1: 0.85, speed2: 0.75, phase: 7.5, yOffset: 0.07, width: 15 },
  { hue1: 25, hue2: 35, sat: 90, light: 55, amp1: 0.038, amp2: 0.028, freq1: 1.9, freq2: 0.85, speed1: 0.95, speed2: 0.65, phase: 10.0, yOffset: 0.14, width: 17 },
];

function ribbonY(x: number, ribbon: RibbonDef, t: number, h: number, mousePush: number): number {
  const nx = x / h;
  const baseY = h * 0.5 + ribbon.yOffset * h;
  const wave1 = Math.sin(nx * ribbon.freq1 * Math.PI + t * ribbon.speed1 + ribbon.phase) * h * ribbon.amp1;
  const wave2 = Math.sin(nx * ribbon.freq2 * Math.PI + t * ribbon.speed2 + ribbon.phase * 1.3) * h * ribbon.amp2;
  return baseY + wave1 + wave2 + mousePush;
}

interface Props {
  customUniforms?: Record<string, { value: unknown }>;
}

export default function CanvasRibbons2D({ customUniforms }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = (e.clientY - rect.top) / rect.height;
    };
    canvas.addEventListener("mousemove", onMouseMove);

    const startTime = performance.now();
    let frameId = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
    };
    resize();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = (performance.now() - startTime) * 0.001 * 0.2;
      const dpr = Math.min(window.devicePixelRatio, 2);
      const w = container.clientWidth;
      const h = container.clientHeight;

      const mouseY = (mouseRef.current.y - 0.5) * h * 0.08;
      const mouseXNorm = mouseRef.current.x;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "multiply";

      for (let i = 0; i < RIBBONS.length; i++) {
        const ribbon = RIBBONS[i];
        const push = mouseY * (0.5 + i * 0.15) * Math.max(0, 1 - Math.abs(mouseXNorm - 0.5) * 2);

        // Draw glow pass
        ctx.beginPath();
        const steps = 60;
        const startX = -60;
        const endX = w + 60;
        for (let s = 0; s <= steps; s++) {
          const x = startX + (endX - startX) * (s / steps);
          const y = ribbonY(x, ribbon, t, h, push);
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${ribbon.hue1}, ${ribbon.sat}%, ${ribbon.light + 20}%, 0.04)`;
        ctx.lineWidth = ribbon.width * 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        // Draw main ribbon with gradient along length
        ctx.beginPath();
        for (let s = 0; s <= steps; s++) {
          const x = startX + (endX - startX) * (s / steps);
          const y = ribbonY(x, ribbon, t, h, push);
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        const gradient = ctx.createLinearGradient(0, 0, w, 0);
        gradient.addColorStop(0, `hsla(${ribbon.hue1}, ${ribbon.sat}%, ${ribbon.light}%, 0.1)`);
        gradient.addColorStop(0.15, `hsla(${ribbon.hue1}, ${ribbon.sat}%, ${ribbon.light}%, 0.7)`);
        gradient.addColorStop(0.5, `hsla(${(ribbon.hue1 + ribbon.hue2) * 0.5}, ${ribbon.sat + 5}%, ${ribbon.light + 5}%, 0.85)`);
        gradient.addColorStop(0.85, `hsla(${ribbon.hue2}, ${ribbon.sat}%, ${ribbon.light}%, 0.7)`);
        gradient.addColorStop(1, `hsla(${ribbon.hue2}, ${ribbon.sat}%, ${ribbon.light}%, 0.1)`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = ribbon.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";
    };

    animate();

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      canvas.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
    };
  }, [customUniforms]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ filter: "blur(2px)" }}
      />
    </div>
  );
}
