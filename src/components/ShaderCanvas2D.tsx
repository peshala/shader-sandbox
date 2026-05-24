"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useMousePosition } from "@/hooks/useMousePosition";

interface Props {
  fragmentShader: string;
  vertexShader: string;
  customUniforms?: Record<string, { value: unknown }>;
}

export default function ShaderCanvas2D({ fragmentShader, vertexShader, customUniforms }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouse = useMousePosition();
  const uniformsRef = useRef<Record<string, { value: unknown }>>({});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms: Record<string, { value: unknown }> = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(container.clientWidth, container.clientHeight) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      ...customUniforms,
    };
    uniformsRef.current = uniforms;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    });

    const plane = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(plane, material));

    const startTime = performance.now();
    let frameId = 0;
    const smoothMouse = { x: 0.5, y: 0.5 };
    let lastTime = performance.now();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) * 0.001, 0.05);
      lastTime = now;

      // Smooth lerp toward actual mouse — ~8fps-independent smoothing
      const lerp = 1.0 - Math.pow(0.001, dt);
      smoothMouse.x += (mouse.current.x - smoothMouse.x) * lerp;
      smoothMouse.y += (mouse.current.y - smoothMouse.y) * lerp;

      uniforms.uTime.value = (now - startTime) * 0.001;
      (uniforms.uMouse.value as THREE.Vector2).set(smoothMouse.x, smoothMouse.y);
      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      (uniforms.uResolution.value as THREE.Vector2).set(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      material.dispose();
      plane.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [fragmentShader, vertexShader, mouse, customUniforms]);

  return <div ref={containerRef} className="w-full h-full" />;
}
