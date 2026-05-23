"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useMousePosition } from "@/hooks/useMousePosition";

interface Props {
  fragmentShader: string;
  vertexShader: string;
  geometry?: "sphere" | "torus" | "torusKnot" | "box";
  customUniforms?: Record<string, { value: unknown }>;
}

function createGeometry(type: string): THREE.BufferGeometry {
  switch (type) {
    case "torus":
      return new THREE.TorusGeometry(1, 0.4, 64, 128);
    case "torusKnot":
      return new THREE.TorusKnotGeometry(0.8, 0.25, 128, 32);
    case "box":
      return new THREE.BoxGeometry(1.5, 1.5, 1.5, 32, 32, 32);
    default:
      return new THREE.SphereGeometry(1.2, 64, 64);
  }
}

export default function ShaderCanvas3D({
  fragmentShader,
  vertexShader,
  geometry = "sphere",
  customUniforms,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouse = useMousePosition();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.z = 3.5;

    const uniforms: Record<string, { value: unknown }> = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(container.clientWidth, container.clientHeight) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      ...customUniforms,
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    });

    const geo = createGeometry(geometry);
    const mesh = new THREE.Mesh(geo, material);
    scene.add(mesh);

    const startTime = performance.now();
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTime) * 0.001;
      uniforms.uTime.value = elapsed;
      (uniforms.uMouse.value as THREE.Vector2).set(mouse.current.x, mouse.current.y);
      mesh.rotation.y = elapsed * 0.3;
      mesh.rotation.x = Math.sin(elapsed * 0.2) * 0.2;
      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      (uniforms.uResolution.value as THREE.Vector2).set(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      material.dispose();
      geo.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [fragmentShader, vertexShader, geometry, mouse, customUniforms]);

  return <div ref={containerRef} className="w-full h-full" />;
}
