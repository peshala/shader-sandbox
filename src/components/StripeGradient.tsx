"use client";

import { useEffect, useRef, useState } from "react";
import { WaveGradient } from "@/lib/wave-gradient/wave-gradient";

interface Props {
  customUniforms?: Record<string, { value: unknown }>;
}

function rgbToHex(rgb: [number, number, number]): string {
  return (
    "#" +
    rgb
      .map((v) =>
        Math.round(v * 255)
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

export default function StripeGradient({ customUniforms }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gradientRef = useRef<WaveGradient | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amplitude = (customUniforms?.uAmplitude?.value as number) ?? 320;
  const speed = (customUniforms?.uSpeed?.value as number) ?? 1.25;
  const seed = (customUniforms?.uSeed?.value as number) ?? 0;
  const fps = (customUniforms?.uFps?.value as number) ?? 24;

  const colorCount = Math.round(
    (customUniforms?.uColorCount?.value as number) ?? 4
  );
  const colorDefaults = ["#ef008f", "#6ec3f4", "#7038ff", "#ffba27", "#00c4ff", "#ff6b6b"];
  const colors: string[] = [];
  for (let i = 0; i < colorCount; i++) {
    const key = `uColor${i + 1}`;
    const val = customUniforms?.[key]?.value as any;
    if (val && typeof val === "object" && "x" in val) {
      colors.push(rgbToHex([val.x, val.y, val.z]));
    } else if (val && Array.isArray(val)) {
      colors.push(rgbToHex(val as [number, number, number]));
    } else {
      colors.push(colorDefaults[i] || "#ffffff");
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    canvas.style.width = "100%";
    canvas.style.height = "100%";

    if (gradientRef.current) {
      gradientRef.current.destroy();
      gradientRef.current = null;
    }

    try {
      const gradient = new WaveGradient(canvas, {
        amplitude,
        colors,
        seed,
        speed,
        fps: Math.round(fps),
      });
      gradientRef.current = gradient;
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to initialize gradient");
    }

    return () => {
      if (gradientRef.current) {
        gradientRef.current.destroy();
        gradientRef.current = null;
      }
    };
  }, [amplitude, speed, seed, fps, colors.join(",")]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center p-6">
          <p className="text-red-400 text-sm font-mono mb-2">WebGL2 Error</p>
          <p className="text-gray-400 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
