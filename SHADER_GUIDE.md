# Shader Sandbox — Guide for Claude Sessions

## Project Overview

This is a Next.js shader sandbox for creating, previewing, and exporting WebGL fragment shaders. Shaders are written in GLSL, rendered with three.js, and managed through a gallery/editor UI.

**Location:** `/Users/user/Documents/projects /shaders test/shader-sandbox/`

## Project Structure

```
src/
  shaders/
    fullscreen.vert.glsl    # Shared 2D vertex shader (don't modify)
    default3d.vert.glsl     # Shared 3D vertex shader
    *.frag.glsl             # Fragment shaders (one per shader)
    presets.ts              # Registry of all shaders — add new entries here
  components/
    ShaderSandbox.tsx       # Root component (gallery ↔ editor routing)
    ShaderGallery.tsx       # Gallery grid with live preview cards
    ShaderEditor.tsx        # Full editor: canvas + controls + code tabs
    ShaderCanvas2D.tsx      # 2D fullscreen quad renderer
    ShaderCanvas3D.tsx      # 3D object renderer
    ShaderControls.tsx      # Dynamic sliders/color pickers from control definitions
    ShaderPreviewCard.tsx   # Gallery card with small live canvas
    CodePanel.tsx           # Code viewer panel
  types/
    shader.ts               # ShaderData and ShaderControl types
  lib/
    shaderStore.ts          # localStorage CRUD + preset merging
  hooks/
    useMousePosition.ts     # Mouse tracking hook
```

## How to Add a New Shader

### Step 1: Create the .glsl file

Create `src/shaders/my-shader.frag.glsl`. Every 2D fragment shader gets these uniforms for free:

```glsl
uniform float uTime;        // elapsed seconds
uniform vec2 uResolution;   // canvas size in pixels
uniform vec2 uMouse;        // normalized mouse position (0-1, bottom-left origin)
```

Plus any custom uniforms you define for controls.

The vertex shader passes `varying vec2 vUv` (0-1 UV coordinates). Use `vUv` as your base coordinate.

### Step 2: Register in presets.ts

```ts
import myShaderFrag from "@/shaders/my-shader.frag.glsl";

// Add to PRESET_SHADERS array:
{
  id: "preset-my-shader",
  name: "My Shader",
  description: "Short description of the visual effect",
  mode: "2d",
  fragmentShader: myShaderFrag,
  vertexShader: fullscreenVert,  // always use this for 2D
  controls: [
    { name: "uMyParam", label: "My Param", type: "float", min: 0, max: 1, step: 0.01, default: 0.5 },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isPreset: true,
}
```

### Step 3: Hot reload

The dev server picks up both changes immediately. The shader appears in the gallery.

## Control Types

```ts
interface ShaderControl {
  name: string;      // must match the uniform name in the GLSL
  label: string;     // display label in the UI
  type: "float" | "vec2" | "vec3" | "color";
  min?: number;      // for float sliders
  max?: number;
  step?: number;
  default: number | [number, number] | [number, number, number];
}
```

- `float` → slider
- `color` → color picker (values are 0-1 RGB)
- `vec2` / `vec3` → multiple sliders (not yet fully implemented in UI)

## GLSL Patterns and Tips

### 2D Shader Template

```glsl
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 p = uv * aspect; // aspect-corrected coordinates

  vec3 color = vec3(0.0);
  // ... your effect here ...

  gl_FragColor = vec4(color, 1.0);
}
```

### Common Techniques

- **Hash/random:** `fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453)`
- **Grid cells:** `vec2 cell = floor(uv * gridSize); vec2 cellUv = fract(uv * gridSize);`
- **Smooth noise:** use simplex/perlin noise functions (see default2d.frag.glsl for FBM example)
- **Density falloff:** `pow(1.0 - abs(uv.y - 0.5) * 2.0, falloff)`
- **Per-cell random timing:** give each cell its own time offset via `hash(cell) * largeNumber`
- **Smooth transitions:** `smoothstep()` for fading, avoid hard `step()` unless intentional

### Performance Considerations

- Avoid deep loops (keep iteration counts under 10 where possible)
- `sin/cos` are cheap, `pow` is moderate, `texture` lookups are expensive
- For grid effects, compute per-cell not per-pixel where possible
- Gallery preview cards render at ~20fps with pixelRatio 1 to save GPU

## How the User Describes Shaders

The user describes shaders conversationally. Key information to extract:

1. **Vibe/reference** — visual analogy, mood, or reference image
2. **Colors** — specific hex/names or a feel ("warm", "monochrome")
3. **Motion** — speed, style (flowing, jittery, pulsing, static)
4. **Mouse interaction** — what the mouse does (or "none")
5. **Controls** — what should be tweakable via sliders
6. **Density/distribution** — where effects concentrate (center, edges, uniform)

If the user provides a reference image, analyze the colors, patterns, and density distribution from it.

## Exporting for Other Platforms

### For any three.js project
Export button copies vertex + fragment shader. Use with `THREE.ShaderMaterial` and set the uniforms.

### For Framer (Code Component)
Generate a self-contained React component that:
- Creates a `<canvas>` element
- Sets up WebGL context manually (no three.js dependency)
- Compiles and links the shaders
- Runs the animation loop
- Exposes uniforms as Framer `addPropertyControls` props
- Cleans up on unmount

Key Framer constraints:
- No npm dependencies allowed in Code Components — must use raw WebGL
- Component must be fully self-contained in one file
- Use `addPropertyControls` from "framer" for UI controls
- Canvas should fill the frame: `width: "100%", height: "100%"`

### For plain HTML/CSS backgrounds
Wrap in a minimal WebGL setup with a fullscreen quad. The fragment shader works as-is.

## Iteration Workflow

When iterating on a shader with the user:
1. Write/update the `.frag.glsl` file
2. The dev server hot-reloads — changes appear immediately in the editor
3. No need to touch presets.ts unless adding new controls
4. Take screenshots via the preview tool to show the user the result
5. Adjust based on feedback — the user will describe what to change visually
