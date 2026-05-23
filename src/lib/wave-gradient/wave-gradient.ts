import { vert, frag } from "./shaders";

function parseRGB(hex: string): number[] | null {
  const result =
    hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i) ||
    hex.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i);
  return result
    ? result.slice(1, 4).map((c) => parseInt(c.length < 2 ? c + c : c, 16) / 255)
    : null;
}

interface PlaneGeometry {
  positions: ArrayBuffer;
  indices: ArrayBuffer;
  count: number;
}

interface AttributeInfo {
  buffer: WebGLBuffer;
  location: number;
}

type UniformSetter = (value: number | number[]) => void;

interface ClipSpaceUniform {
  type?: "1f" | "2f" | "3f" | "1i";
  value: number | number[] | ClipSpaceStructMember[];
}

interface ClipSpaceStructMember {
  [key: string]: { type: "1f" | "2f" | "3f" | "1i"; value: number | number[] };
}

interface ClipSpaceConfig {
  gl: WebGL2RenderingContext;
  shaders: [string, string];
  attributes: Record<string, ArrayBuffer>;
  elements: ArrayBuffer;
  uniforms: Record<string, ClipSpaceUniform>;
}

class ClipSpace {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private _attributes: Record<string, AttributeInfo> = {};
  private _elementBuffer!: WebGLBuffer;
  private _uniforms: Record<string, UniformSetter> = {};

  static createPlaneGeometry(widthSegments: number, depthSegments: number): PlaneGeometry {
    const gridX = Math.ceil(widthSegments);
    const gridZ = Math.ceil(depthSegments);
    const vertexCount = 3 * (gridX + 1) * (gridZ + 1);
    const indexCount = 3 * 2 * gridX * gridZ;
    const positions = new ArrayBuffer(4 * vertexCount);
    const indices = new ArrayBuffer(4 * indexCount);

    for (let z = gridZ, i = 0, view = new DataView(positions); z >= 0; z--) {
      const v = z / gridZ;
      const clipY = v * 2 - 1;
      for (let x = gridX; x >= 0; x--, i += 3) {
        const clipX = (x / gridX) * 2 - 1;
        view.setFloat32((i + 0) * 4, clipX, true);
        view.setFloat32((i + 1) * 4, clipY, true);
        view.setFloat32((i + 2) * 4, v, true);
      }
    }

    const verticesAcross = gridX + 1;
    for (let z = 0, i = 0, view = new DataView(indices); z < gridZ; z++) {
      for (let x = 0; x < gridX; x++, i += 6) {
        view.setUint32((i + 0) * 4, (z + 0) * verticesAcross + x, true);
        view.setUint32((i + 1) * 4, (z + 0) * verticesAcross + x + 1, true);
        view.setUint32((i + 2) * 4, (z + 1) * verticesAcross + x, true);
        view.setUint32((i + 3) * 4, (z + 0) * verticesAcross + x + 1, true);
        view.setUint32((i + 4) * 4, (z + 1) * verticesAcross + x + 1, true);
        view.setUint32((i + 5) * 4, (z + 1) * verticesAcross + x, true);
      }
    }

    return { positions, indices, count: indexCount };
  }

  static prefixName(name: string, prefix: string): string {
    return `${prefix}${name[0].toUpperCase()}${name.slice(1)}`;
  }

  constructor(config: ClipSpaceConfig) {
    this.gl = config.gl;
    this.program = this.createProgram(config.shaders);
    this.setupAttributes(config.attributes);
    this.setElements(config.elements);
    this.setupUniforms(config.uniforms);
  }

  private compileShader(type: number, source: string): WebGLShader {
    const { gl } = this;
    const shader = gl.createShader(type);
    if (!shader) throw new Error("can't create shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${info}`);
    }
    return shader;
  }

  private debugProgram(program: WebGLProgram): void {
    const { gl } = this;
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error(`Program link error: ${info}`);
    }
  }

  private createProgram(shaders: [string, string]): WebGLProgram {
    const { gl } = this;
    const vs = this.compileShader(gl.VERTEX_SHADER, shaders[0]);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, shaders[1]);
    const program = gl.createProgram();
    if (!program) throw new Error("can't create WebGL program");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    try {
      gl.linkProgram(program);
      this.debugProgram(program);
    } catch (linkError) {
      gl.deleteProgram(program);
      throw linkError;
    } finally {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    }
    gl.useProgram(program);
    return program;
  }

  private createBuffer(): WebGLBuffer {
    const buffer = this.gl.createBuffer();
    if (!buffer) throw new Error("can't create buffer");
    return buffer;
  }

  private setupAttributes(attributes: Record<string, ArrayBuffer>): void {
    const { gl, program } = this;
    for (const [name, dataBuffer] of Object.entries(attributes)) {
      const prefixedName = ClipSpace.prefixName(name, "a_");
      const buffer = this.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, dataBuffer, gl.STATIC_DRAW);
      const location = gl.getAttribLocation(program, prefixedName);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
      this._attributes[name] = { buffer, location };
    }
  }

  setAttribute(_attributeName: string, dataBuffer: ArrayBuffer): void {
    this.gl.bufferData(this.gl.ARRAY_BUFFER, dataBuffer, this.gl.STATIC_DRAW);
  }

  setElements(elements: ArrayBuffer): void {
    const { gl } = this;
    if (!this._elementBuffer) {
      const buffer = this.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
      this._elementBuffer = buffer;
    }
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elements, gl.STATIC_DRAW);
  }

  private createUniformSetter(name: string, type: string, initialValue?: number | number[]): UniformSetter {
    const { gl, program } = this;
    const uniformX = `uniform${type}` as keyof WebGL2RenderingContext;
    const location = gl.getUniformLocation(program, name);
    const setter: UniformSetter = (value) => {
      if (Array.isArray(value)) {
        (gl[uniformX] as Function).call(gl, location, ...value);
      } else {
        (gl[uniformX] as Function).call(gl, location, value);
      }
    };
    if (initialValue !== undefined) setter(initialValue);
    return setter;
  }

  setupUniforms(uniforms: Record<string, ClipSpaceUniform>): void {
    for (const [name, uniform] of Object.entries(uniforms)) {
      const prefixedName = ClipSpace.prefixName(name, "u_");
      if (uniform.type === undefined && Array.isArray(uniform.value)) {
        (uniform.value as ClipSpaceStructMember[]).forEach((member, i) => {
          for (const [memberName, memberUniform] of Object.entries(member)) {
            const key = `${name}[${i}].${memberName}`;
            const prefixedKey = `${prefixedName}[${i}].${memberName}`;
            this._uniforms[key] = this.createUniformSetter(
              prefixedKey,
              memberUniform.type,
              memberUniform.value
            );
          }
        });
      } else {
        this._uniforms[name] = this.createUniformSetter(
          prefixedName,
          uniform.type!,
          uniform.value as number | number[]
        );
      }
    }
  }

  setUniform(uniformName: string, newValue: number | number[]): void {
    this._uniforms[uniformName]?.(newValue);
  }

  delete(): void {
    const { gl } = this;
    gl.deleteProgram(this.program);
    for (const attribute of Object.values(this._attributes)) {
      gl.deleteBuffer(attribute.buffer);
    }
  }
}

export interface WaveGradientOptions {
  amplitude?: number;
  colors?: string[];
  density?: [number, number];
  fps?: number;
  seed?: number;
  speed?: number;
  time?: number;
  wireframe?: boolean;
}

export class WaveGradient {
  private gl: WebGL2RenderingContext;
  private clipSpace: ClipSpace;
  private density: [number, number];
  private speed: number;
  private frameInterval: number;
  private lastFrameTime: number = 0;
  private shouldRender: boolean = true;
  private drawMode: number;
  private drawCount: number;
  time: number;

  constructor(canvas: HTMLCanvasElement, options?: WaveGradientOptions) {
    const gl = canvas.getContext("webgl2", {
      antialias: true,
      depth: false,
      powerPreference: "low-power",
    });
    if (!gl) throw new Error("WebGL2 not supported");

    const {
      amplitude = 320,
      colors = ["#ef008f", "#6ec3f4", "#7038ff", "#ffba27"],
      density = [0.06, 0.16],
      fps = 24,
      seed = 0,
      speed = 1.25,
      time = 0,
      wireframe = false,
    } = options ?? {};

    const { clientWidth, clientHeight } = canvas;
    canvas.width = clientWidth;
    canvas.height = clientHeight;
    gl.viewport(0, 0, clientWidth, clientHeight);
    gl.enable(gl.CULL_FACE);
    gl.disable(gl.DITHER);
    gl.disable(gl.DEPTH_TEST);

    const geometry = ClipSpace.createPlaneGeometry(
      clientWidth * density[0],
      clientHeight * density[1]
    );

    const clipSpace = new ClipSpace({
      gl,
      shaders: [vert, frag],
      attributes: { position: geometry.positions },
      elements: geometry.indices,
      uniforms: {
        amplitude: { value: amplitude, type: "1f" },
        baseColor: { value: parseRGB(colors[0])!, type: "3f" },
        realtime: { value: time, type: "1f" },
        resolution: { value: [clientWidth, clientHeight], type: "2f" },
        seed: { value: seed, type: "1f" },
        shadowPower: { value: 6, type: "1f" },
        layerCount: { value: colors.length - 1, type: "1i" },
        waveLayers: {
          value: colors.slice(1).map((color, i, array) => {
            const r = (i + 1) / array.length + 1;
            return {
              noiseCeil: { value: 0.63 + 0.07 * (i + 1), type: "1f" as const },
              noiseFloor: { value: 0.1, type: "1f" as const },
              noiseFlow: { value: 6.5 + 0.3 * (i + 1), type: "1f" as const },
              noiseSeed: { value: seed + 10 * (i + 1), type: "1f" as const },
              noiseSpeed: { value: 11 + 0.3 * (i + 1), type: "1f" as const },
              noiseFreq: { value: [2 + r, 3 + r], type: "2f" as const },
              color: { value: parseRGB(color)!, type: "3f" as const },
            };
          }),
        },
      },
    });

    this.gl = gl;
    this.clipSpace = clipSpace;
    this.density = density;
    this.speed = speed;
    this.frameInterval = 1000 / fps;
    this.drawMode = wireframe ? gl.LINES : gl.TRIANGLES;
    this.drawCount = geometry.count;
    this.time = time;

    requestAnimationFrame((now) => this.render(now));
  }

  private resize(): void {
    const { gl, clipSpace } = this;
    const canvas = gl.canvas as HTMLCanvasElement;
    const { width, clientWidth, height, clientHeight } = canvas;
    if (width !== clientWidth || height !== clientHeight) {
      canvas.width = clientWidth;
      canvas.height = clientHeight;
      gl.viewport(0, 0, clientWidth, clientHeight);
      clipSpace.setUniform("resolution", [clientWidth, clientHeight]);
      const geometry = ClipSpace.createPlaneGeometry(
        clientWidth * this.density[0],
        clientHeight * this.density[1]
      );
      clipSpace.setAttribute("position", geometry.positions);
      clipSpace.setElements(geometry.indices);
      this.drawCount = geometry.count;
    }
  }

  private render(now: number): void {
    if (!this.shouldRender) return;
    requestAnimationFrame((t) => this.render(t));

    const delta = now - this.lastFrameTime;
    if (delta < this.frameInterval) {
      if (Math.random() > 0.75) this.resize();
      return;
    }

    this.lastFrameTime = now - (delta % this.frameInterval);
    this.time += Math.min(delta, this.frameInterval) * this.speed;
    this.clipSpace.setUniform("realtime", this.time);
    this.gl.drawElements(this.drawMode, this.drawCount, this.gl.UNSIGNED_INT, 0);
  }

  destroy(): void {
    this.clipSpace.delete();
    this.shouldRender = false;
  }
}
