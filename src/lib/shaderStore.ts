import { ShaderData } from "@/types/shader";
import { PRESET_SHADERS } from "@/shaders/presets";

const STORAGE_KEY = "shader-sandbox-library";

function readStorage(): ShaderData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStorage(shaders: ShaderData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shaders));
}

export function getAllShaders(): ShaderData[] {
  const saved = readStorage();
  const savedIds = new Set(saved.map((s) => s.id));
  const presets = PRESET_SHADERS.filter((p) => !savedIds.has(p.id));
  return [...presets, ...saved].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getShader(id: string): ShaderData | undefined {
  const saved = readStorage().find((s) => s.id === id);
  if (saved) return saved;
  return PRESET_SHADERS.find((p) => p.id === id);
}

export function saveShader(shader: ShaderData): ShaderData {
  const shaders = readStorage();
  const idx = shaders.findIndex((s) => s.id === shader.id);
  const updated = { ...shader, updatedAt: Date.now(), isPreset: false };
  if (idx >= 0) {
    shaders[idx] = updated;
  } else {
    shaders.push(updated);
  }
  writeStorage(shaders);
  return updated;
}

export function deleteShader(id: string) {
  const shaders = readStorage().filter((s) => s.id !== id);
  writeStorage(shaders);
}

export function duplicateShader(shader: ShaderData): ShaderData {
  const newShader: ShaderData = {
    ...shader,
    id: crypto.randomUUID(),
    name: `${shader.name} (copy)`,
    isPreset: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const shaders = readStorage();
  shaders.push(newShader);
  writeStorage(shaders);
  return newShader;
}

export function exportShaderCode(shader: ShaderData): string {
  const sections = [
    `// ${shader.name}`,
    `// ${shader.description}`,
    `// Mode: ${shader.mode}${shader.geometry ? ` | Geometry: ${shader.geometry}` : ""}`,
    "",
    "// === Vertex Shader ===",
    shader.vertexShader,
    "",
    "// === Fragment Shader ===",
    shader.fragmentShader,
  ];
  return sections.join("\n");
}
