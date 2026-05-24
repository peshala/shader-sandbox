import { ShaderData } from "@/types/shader";

export function generateFramerComponent(
  shader: ShaderData,
  controlValues: Record<string, number | number[]>
): string {
  const uniformDecls = shader.controls
    .map((c) => {
      if (c.type === "float") {
        return `      gl.uniform1f(gl.getUniformLocation(program, "${c.name}"), props.${c.name});`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");

  const propDefaults = shader.controls
    .map((c) => {
      const val = controlValues[c.name] ?? c.default;
      if (c.type === "float") {
        return `    ${c.name}: ${(val as number).toFixed(4)},`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");

  const propertyControls = shader.controls
    .map((c) => {
      if (c.type === "float") {
        return `  ${c.name}: {
    type: ControlType.Number,
    title: "${c.label}",
    min: ${c.min ?? 0},
    max: ${c.max ?? 1},
    step: ${c.step ?? 0.01},
    defaultValue: ${((controlValues[c.name] as number) ?? (c.default as number)).toFixed(4)},
  },`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");

  const propTypes = shader.controls
    .map((c) => {
      if (c.type === "float") return `  ${c.name}: number;`;
      return "";
    })
    .filter(Boolean)
    .join("\n");

  return `import { useEffect, useRef } from "react"
import { addPropertyControls, ControlType } from "framer"

// ${shader.name}
// ${shader.description}

const VERTEX_SHADER = \`
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
\`;

const FRAGMENT_SHADER = \`
precision mediump float;
${shader.fragmentShader}
\`;

interface Props {
  width: number;
  height: number;
${propTypes}
}

export default function ${shader.name.replace(/[^a-zA-Z0-9]/g, "")}(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    }

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const startTime = performance.now();

    const animate = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * window.devicePixelRatio;
      canvas.height = h * window.devicePixelRatio;
      gl.viewport(0, 0, canvas.width, canvas.height);

      gl.uniform1f(gl.getUniformLocation(program, "uTime"), (performance.now() - startTime) * 0.001);
      gl.uniform2f(gl.getUniformLocation(program, "uResolution"), w, h);
      gl.uniform2f(gl.getUniformLocation(program, "uMouse"), 0.5, 0.5);
${uniformDecls}

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameRef.current);
  }, [${shader.controls.map((c) => `props.${c.name}`).join(", ")}]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

${shader.name.replace(/[^a-zA-Z0-9]/g, "")}.defaultProps = {
${propDefaults}
};

addPropertyControls(${shader.name.replace(/[^a-zA-Z0-9]/g, "")}, {
${propertyControls}
});
`;
}
