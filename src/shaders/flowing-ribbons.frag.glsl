uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform float uSpeed;
uniform float uRibbonWidth;
uniform float uCurvature;
uniform float uSoftness;
uniform float uIntensity;
uniform float uDirection;
uniform float uRibbonCount;
uniform float uRandomWidth;
uniform float uRandomCurve;
uniform float uRandomSpeed;
uniform float uRandomDir;

varying vec2 vUv;

float hash(float n) {
  return fract(sin(n) * 43758.5453);
}

float ribbon(vec2 p, float offset, float freq, float amp, float width, float t, float soft) {
  float wave = sin(p.x * freq + t + offset) * amp;
  wave += sin(p.x * freq * 0.6 + t * 1.3 + offset * 2.0) * amp * 0.5;
  wave += sin(p.x * freq * 0.3 + t * 0.7 + offset * 0.5) * amp * 0.3;
  float dist = abs(p.y - wave);
  float edge = width * soft;
  return smoothstep(width + edge, width - edge, dist);
}

vec2 rotate2d(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

vec3 palette(float idx) {
  float i = fract(idx);
  if (i < 0.14) return mix(vec3(0.55, 0.45, 0.95), vec3(0.75, 0.65, 1.0), 0.5);
  if (i < 0.28) return mix(vec3(1.0, 0.55, 0.1), vec3(1.0, 0.75, 0.2), 0.5);
  if (i < 0.42) return mix(vec3(1.0, 0.3, 0.55), vec3(1.0, 0.55, 0.75), 0.5);
  if (i < 0.56) return mix(vec3(1.0, 0.5, 0.6), vec3(1.0, 0.75, 0.8), 0.5);
  if (i < 0.70) return vec3(1.0, 0.82, 0.5);
  if (i < 0.85) return mix(vec3(0.4, 0.6, 1.0), vec3(0.6, 0.8, 1.0), 0.5);
  return mix(vec3(0.95, 0.5, 0.9), vec3(1.0, 0.7, 0.95), 0.5);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  float t = uTime * uSpeed;
  float baseAngle = uDirection * 6.2831;
  int count = int(uRibbonCount);

  vec3 color = vec3(1.0);

  for (int i = 0; i < 16; i++) {
    if (i >= count) break;

    float fi = float(i);
    float seed = fi * 7.31;

    float rWidth = uRibbonWidth;
    if (uRandomWidth > 0.5) rWidth *= (0.5 + hash(seed + 1.0) * 1.0);

    float rCurve = uCurvature;
    if (uRandomCurve > 0.5) rCurve *= (0.4 + hash(seed + 2.0) * 1.2);

    float rSpeed = 1.0;
    if (uRandomSpeed > 0.5) rSpeed = 0.5 + hash(seed + 3.0) * 1.0;

    float rAngle = baseAngle;
    if (uRandomDir > 0.5) rAngle += (hash(seed + 4.0) - 0.5) * 0.6;
    rAngle += (hash(seed + 5.0) - 0.5) * 0.15;

    float yOffset = (hash(seed + 6.0) - 0.5) * 0.6;
    float phaseOffset = hash(seed + 7.0) * 12.566;
    float freq = 2.5 + hash(seed + 8.0) * 2.5;
    float sway = sin(t * 0.1 * rSpeed + hash(seed + 9.0) * 6.28) * 0.03;

    vec2 rp = rotate2d(p, rAngle + sway);
    rp.y += yOffset;

    float r = ribbon(rp, phaseOffset, freq, rCurve, rWidth, t * rSpeed, uSoftness);

    vec3 col = palette(hash(seed + 10.0));
    vec3 colGrad = mix(col * 1.1, col * 0.85, smoothstep(-0.3, 0.3, rp.y));

    float opacity = uIntensity * (0.55 + hash(seed + 11.0) * 0.35);
    color = mix(color, colGrad, r * opacity);
  }

  gl_FragColor = vec4(color, 1.0);
}
