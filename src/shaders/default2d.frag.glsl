uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

varying vec2 vUv;

// Simplex-style noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439
  );
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * snoise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 p = uv * aspect;

  vec2 mouse = uMouse * aspect;
  float dist = length(p - mouse);

  float t = uTime * 0.3;
  float n1 = fbm(p * 3.0 + t);
  float n2 = fbm(p * 3.0 - t * 0.7 + vec2(5.2, 1.3));
  float n3 = fbm(p * 3.0 + vec2(n1, n2));

  float mouseInfluence = smoothstep(0.5, 0.0, dist) * 0.5;
  n3 += mouseInfluence;

  vec3 col1 = vec3(0.05, 0.02, 0.15);
  vec3 col2 = vec3(0.1, 0.4, 0.8);
  vec3 col3 = vec3(0.9, 0.3, 0.5);
  vec3 col4 = vec3(1.0, 0.85, 0.4);

  vec3 color = mix(col1, col2, smoothstep(-0.5, 0.2, n3));
  color = mix(color, col3, smoothstep(0.2, 0.6, n3));
  color = mix(color, col4, smoothstep(0.6, 1.0, n3));

  color += vec3(0.3, 0.5, 0.8) * mouseInfluence;

  gl_FragColor = vec4(color, 1.0);
}
