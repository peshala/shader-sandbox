"use client";

import { useState, useCallback } from "react";
import { ShaderData } from "@/types/shader";
import { getShader } from "@/lib/shaderStore";
import ShaderGallery from "./ShaderGallery";
import ShaderEditor from "./ShaderEditor";

export default function ShaderSandbox() {
  const [activeShader, setActiveShader] = useState<ShaderData | null>(null);

  const handleSelect = useCallback((shader: ShaderData) => {
    setActiveShader(shader);
  }, []);

  const handleBack = useCallback(() => {
    setActiveShader(null);
  }, []);

  const handleNavigate = useCallback((id: string) => {
    const shader = getShader(id);
    if (shader) setActiveShader(shader);
  }, []);

  if (activeShader) {
    return (
      <ShaderEditor
        key={activeShader.id}
        shader={activeShader}
        onBack={handleBack}
        onNavigate={handleNavigate}
      />
    );
  }

  return <ShaderGallery onSelect={handleSelect} />;
}
