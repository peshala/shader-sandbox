export interface ShaderControl {
  name: string;
  label: string;
  type: "float" | "vec2" | "vec3" | "color" | "bool";
  min?: number;
  max?: number;
  step?: number;
  default: number | [number, number] | [number, number, number];
}

export interface ShaderData {
  id: string;
  name: string;
  description: string;
  mode: "2d" | "3d" | "canvas2d" | "stripeGradient";
  geometry?: "sphere" | "torus" | "torusKnot" | "box";
  fragmentShader: string;
  vertexShader: string;
  controls: ShaderControl[];
  createdAt: number;
  updatedAt: number;
  isPreset?: boolean;
}
