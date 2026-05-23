"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ShaderData } from "@/types/shader";
import { WaveGradient } from "@/lib/wave-gradient/wave-gradient";

interface Props {
  shader: ShaderData;
  onClick: () => void;
}

function createGeometry3D(type?: string): THREE.BufferGeometry {
  switch (type) {
    case "torus": return new THREE.TorusGeometry(1, 0.4, 32, 64);
    case "torusKnot": return new THREE.TorusKnotGeometry(0.8, 0.25, 64, 16);
    case "box": return new THREE.BoxGeometry(1.5, 1.5, 1.5, 16, 16, 16);
    default: return new THREE.SphereGeometry(1.2, 32, 32);
  }
}

export default function ShaderPreviewCard({ shader, onClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    if (shader.mode === "canvas2d") {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        const hues = [220, 270, 300, 350, 25];
        const yOffsets = [-0.14, -0.07, 0.0, 0.07, 0.14];
        const phases = [0, 2.5, 5.0, 7.5, 10.0];
        const startTime = performance.now();
        let frameId = 0;
        let lastFrame = 0;
        const drawRibbons = (time: number) => {
          frameId = requestAnimationFrame(drawRibbons);
          if (time - lastFrame < 80) return;
          lastFrame = time;
          const t = (performance.now() - startTime) * 0.001 * 0.2;
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.globalCompositeOperation = "multiply";
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            const steps = 30;
            for (let s = 0; s <= steps; s++) {
              const x = -10 + (width + 20) * (s / steps);
              const nx = x / height;
              const baseY = height * 0.5 + yOffsets[i] * height;
              const y = baseY + Math.sin(nx * 1.8 * Math.PI + t + phases[i]) * height * 0.04
                + Math.sin(nx * 0.9 * Math.PI + t * 0.7 + phases[i] * 1.3) * height * 0.025;
              if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            const grad = ctx.createLinearGradient(0, 0, width, 0);
            grad.addColorStop(0, `hsla(${hues[i]}, 85%, 55%, 0.1)`);
            grad.addColorStop(0.25, `hsla(${hues[i]}, 90%, 55%, 0.6)`);
            grad.addColorStop(0.5, `hsla(${hues[i] + 5}, 90%, 58%, 0.7)`);
            grad.addColorStop(0.75, `hsla(${hues[i] + 10}, 85%, 55%, 0.6)`);
            grad.addColorStop(1, `hsla(${hues[i] + 10}, 85%, 55%, 0.1)`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 5;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.stroke();
          }
          ctx.globalCompositeOperation = "source-over";
        };
        frameId = requestAnimationFrame(drawRibbons);
        return () => cancelAnimationFrame(frameId);
      }
      return;
    }

    if (shader.mode === "stripeGradient") {
      try {
        const gradient = new WaveGradient(canvas, {
          colors: ["#ef008f", "#6ec3f4", "#7038ff", "#ffba27"],
          fps: 12,
          speed: 1.25,
          amplitude: 320,
        });
        return () => gradient.destroy();
      } catch {
        return;
      }
    }

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: shader.mode === "3d" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);

    const scene = new THREE.Scene();
    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(width, height) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      uniforms,
    });

    let camera: THREE.Camera;
    if (shader.mode === "2d") {
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    } else {
      const perspCam = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
      perspCam.position.z = 3.5;
      camera = perspCam;
      scene.add(new THREE.Mesh(createGeometry3D(shader.geometry), material));
    }

    const startTime = performance.now();
    let frameId = 0;
    let lastFrame = 0;

    const animate = (time: number) => {
      frameId = requestAnimationFrame(animate);
      if (time - lastFrame < 50) return;
      lastFrame = time;
      uniforms.uTime.value = (performance.now() - startTime) * 0.001;
      if (shader.mode === "3d") {
        const mesh = scene.children[0] as THREE.Mesh;
        mesh.rotation.y = uniforms.uTime.value * 0.3;
      }
      renderer.render(scene, camera);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      material.dispose();
    };
  }, [shader]);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative rounded-xl overflow-hidden border border-gray-800 hover:border-blue-500/50 transition-all duration-200 text-left bg-gray-950 w-full"
    >
      <div className="w-full aspect-[16/10] relative">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>
      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity ${hovered ? "opacity-100" : "opacity-70"}`} />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="text-sm font-semibold text-white truncate">{shader.name}</h3>
        <p className="text-xs text-gray-400 truncate mt-0.5">{shader.description}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
            shader.mode === "3d" ? "bg-purple-900/50 text-purple-300"
            : shader.mode === "canvas2d" ? "bg-green-900/50 text-green-300"
            : shader.mode === "stripeGradient" ? "bg-pink-900/50 text-pink-300"
            : "bg-blue-900/50 text-blue-300"
          }`}>
            {shader.mode === "canvas2d" ? "CANVAS" : shader.mode === "stripeGradient" ? "WEBGL2" : shader.mode.toUpperCase()}
          </span>
          {shader.isPreset && (
            <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-gray-800 text-gray-400">
              PRESET
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
