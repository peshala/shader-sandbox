"use client";

import { useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import { ShaderData } from "@/types/shader";
import { saveShader, deleteShader, duplicateShader, exportShaderCode } from "@/lib/shaderStore";
import { generateFramerComponent } from "@/lib/exportFramer";
import ShaderCanvas2D from "./ShaderCanvas2D";
import ShaderCanvas3D from "./ShaderCanvas3D";
import CanvasRibbons2D from "./CanvasRibbons2D";
import StripeGradient from "./StripeGradient";
import ShaderControls from "./ShaderControls";
import CodePanel from "./CodePanel";

interface Props {
  shader: ShaderData;
  onBack: () => void;
  onNavigate: (id: string) => void;
}

type Tab = "controls" | "fragment" | "vertex";
type Geometry3D = "sphere" | "torus" | "torusKnot" | "box";

const GEOMETRIES: { value: Geometry3D; label: string }[] = [
  { value: "sphere", label: "Sphere" },
  { value: "torus", label: "Torus" },
  { value: "torusKnot", label: "Knot" },
  { value: "box", label: "Box" },
];

export default function ShaderEditor({ shader: initial, onBack, onNavigate }: Props) {
  const [shader, setShader] = useState(initial);
  const [tab, setTab] = useState<Tab>("controls");
  const [controlValues, setControlValues] = useState<Record<string, number | number[]>>(() => {
    const vals: Record<string, number | number[]> = {};
    initial.controls.forEach((c) => {
      vals[c.name] = c.default;
    });
    return vals;
  });
  const [copied, setCopied] = useState<string | false>(false);
  const [saved, setSaved] = useState(false);

  const handleControlChange = useCallback((name: string, value: number | number[]) => {
    setControlValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSave = useCallback(() => {
    const updated = saveShader(shader);
    setShader(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [shader]);

  const handleDuplicate = useCallback(() => {
    const dup = duplicateShader(shader);
    onNavigate(dup.id);
  }, [shader, onNavigate]);

  const handleDelete = useCallback(() => {
    deleteShader(shader.id);
    onBack();
  }, [shader.id, onBack]);

  const handleExportGLSL = useCallback(() => {
    const code = exportShaderCode(shader);
    navigator.clipboard.writeText(code);
    setCopied("glsl");
    setTimeout(() => setCopied(false), 1500);
  }, [shader]);

  const handleExportFramer = useCallback(() => {
    const code = generateFramerComponent(shader, controlValues);
    navigator.clipboard.writeText(code);
    setCopied("framer");
    setTimeout(() => setCopied(false), 1500);
  }, [shader, controlValues]);

  const handleGeometryChange = useCallback((geo: Geometry3D) => {
    setShader((prev) => ({ ...prev, geometry: geo }));
  }, []);

  const customUniforms = useMemo(() => {
    const u: Record<string, { value: unknown }> = {};
    shader.controls.forEach((c) => {
      const val = controlValues[c.name] ?? c.default;
      if (c.type === "float") {
        u[c.name] = { value: val as number };
      } else if (c.type === "color" || c.type === "vec3") {
        const v = val as [number, number, number];
        u[c.name] = { value: new THREE.Vector3(v[0], v[1], v[2]) };
      } else if (c.type === "vec2") {
        const v = val as [number, number];
        u[c.name] = { value: new THREE.Vector2(v[0], v[1]) };
      }
    });
    return u;
  }, [controlValues, shader.controls]);

  return (
    <div className="h-screen w-screen flex flex-col bg-black text-white">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-950 border-b border-gray-800 shrink-0">
        <button
          onClick={onBack}
          className="px-2 py-1 text-xs font-mono rounded bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          &larr; Gallery
        </button>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-white truncate">{shader.name}</span>
          <span className="text-[10px] text-gray-500 truncate">{shader.description}</span>
        </div>

        {shader.mode === "3d" && (
          <div className="flex gap-1 ml-4">
            {GEOMETRIES.map((g) => (
              <button
                key={g.value}
                onClick={() => handleGeometryChange(g.value)}
                className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                  shader.geometry === g.value
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-1 ml-auto">
          <button
            onClick={handleExportGLSL}
            className="px-3 py-1 text-xs font-mono rounded bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            {copied === "glsl" ? "Copied!" : "GLSL"}
          </button>
          <button
            onClick={handleExportFramer}
            className="px-3 py-1 text-xs font-mono rounded bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            {copied === "framer" ? "Copied!" : "Framer"}
          </button>
          <button
            onClick={handleDuplicate}
            className="px-3 py-1 text-xs font-mono rounded bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            Duplicate
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-xs font-mono rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            {saved ? "Saved!" : "Save"}
          </button>
          {!shader.isPreset && (
            <button
              onClick={handleDelete}
              className="px-3 py-1 text-xs font-mono rounded bg-gray-800 text-red-400 hover:text-red-300 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Canvas */}
        <div className="flex-1">
          {shader.mode === "stripeGradient" ? (
            <StripeGradient customUniforms={customUniforms} />
          ) : shader.mode === "canvas2d" ? (
            <CanvasRibbons2D customUniforms={customUniforms} />
          ) : shader.mode === "2d" ? (
            <ShaderCanvas2D
              fragmentShader={shader.fragmentShader}
              vertexShader={shader.vertexShader}
              customUniforms={customUniforms}
            />
          ) : (
            <ShaderCanvas3D
              fragmentShader={shader.fragmentShader}
              vertexShader={shader.vertexShader}
              geometry={shader.geometry}
              customUniforms={customUniforms}
            />
          )}
        </div>

        {/* Right panel */}
        <div className="w-80 flex flex-col border-l border-gray-800 bg-gray-950">
          {/* Tabs */}
          <div className="flex border-b border-gray-800 shrink-0">
            {(["controls", "fragment", "vertex"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 px-3 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
                  tab === t
                    ? "text-white border-b-2 border-blue-500"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto">
            {tab === "controls" && (
              <ShaderControls
                controls={shader.controls}
                values={controlValues}
                onChange={handleControlChange}
              />
            )}
            {tab === "fragment" && (
              <CodePanel code={shader.fragmentShader} label="" />
            )}
            {tab === "vertex" && (
              <CodePanel code={shader.vertexShader} label="" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
