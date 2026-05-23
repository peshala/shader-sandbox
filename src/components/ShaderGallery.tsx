"use client";

import { useEffect, useState } from "react";
import { ShaderData } from "@/types/shader";
import { getAllShaders } from "@/lib/shaderStore";
import ShaderPreviewCard from "./ShaderPreviewCard";

interface Props {
  onSelect: (shader: ShaderData) => void;
}

export default function ShaderGallery({ onSelect }: Props) {
  const [shaders, setShaders] = useState<ShaderData[]>([]);
  const [filter, setFilter] = useState<"all" | "2d" | "3d">("all");

  useEffect(() => {
    setShaders(getAllShaders());
  }, []);

  const filtered = filter === "all"
    ? shaders
    : shaders.filter((s) =>
        filter === "2d" ? s.mode === "2d" || s.mode === "canvas2d" || s.mode === "stripeGradient" : s.mode === filter
      );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Shader Sandbox</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {shaders.length} shader{shaders.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-1">
            {(["all", "2d", "3d"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <p className="text-lg">No shaders yet</p>
            <p className="text-sm mt-1">Describe a shader to Claude to create one</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((shader) => (
              <ShaderPreviewCard
                key={shader.id}
                shader={shader}
                onClick={() => onSelect(shader)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
