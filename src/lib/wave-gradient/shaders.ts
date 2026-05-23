export const vert = `#version 300 es

vec3 blendNormal(vec3 base, vec3 blend, float opacity) {
  return blend * opacity + base * (1.0 - opacity);
}

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
    i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
    i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

uniform mediump vec2 u_Resolution;
uniform float u_Amplitude;
uniform float u_Realtime;
uniform float u_Seed;

const int i_MAX_COLOR_LAYERS = 9;
uniform vec3 u_BaseColor;
uniform int u_LayerCount;
uniform struct WaveLayers {
  float noiseCeil;
  float noiseFloor;
  float noiseFlow;
  float noiseSeed;
  float noiseSpeed;
  vec2 noiseFreq;
  vec3 color;
} u_WaveLayers[i_MAX_COLOR_LAYERS];

in vec3 a_Position;
out vec3 v_Color;

void main() {
  float time = u_Realtime * 5e-6;

  vec2 frequency = vec2(14e-5, 29e-5);
  vec2 noiseCoord = (u_Resolution * a_Position.xy) * frequency;
  float amplitude = u_Amplitude * (2.0 / u_Resolution.y);

  float noise = snoise(vec3(
    noiseCoord.x * 3.0 + time * 3.0,
    noiseCoord.y * 4.0,
    time * 10.0 + u_Seed));

  noise *= 1.0 - pow(abs(a_Position.y), 2.0);
  noise = max(0.0, noise);

  gl_Position = vec4(
    a_Position.x,
    a_Position.y + (noise * amplitude),
    a_Position.z,
    1.0);

  v_Color = u_BaseColor;

  for (int i = 0; i < u_LayerCount; i++) {
    WaveLayers layer = u_WaveLayers[i];
    float noise = snoise(vec3(
      noiseCoord.x * layer.noiseFreq.x + time * layer.noiseFlow,
      noiseCoord.y * layer.noiseFreq.y,
      time * layer.noiseSpeed + layer.noiseSeed));
    noise = noise / 2.0 + 0.5;
    noise = smoothstep(layer.noiseFloor, layer.noiseCeil, noise);
    v_Color = blendNormal(v_Color, layer.color, pow(noise, 4.0));
  }
}
`;

export const frag = `#version 300 es
precision mediump float;

uniform vec2 u_Resolution;
uniform float u_ShadowPower;

in vec3 v_Color;
out vec4 color;

void main() {
  vec2 st = gl_FragCoord.xy / u_Resolution.xy;
  color = vec4(v_Color, 1.0);
  color.g -= pow(st.y + sin(-12.0) * st.x, u_ShadowPower) * 0.4;
}
`;
