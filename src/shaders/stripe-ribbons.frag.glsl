uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform float uSpeed;
uniform float uRibbonWidth;
uniform float uGlow;
uniform float uMouseInfluence;

varying vec2 vUv;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
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

float ribbon(vec2 p, float baseY, float t, float phase, float noiseAmt) {
  float wave = sin(p.x * 1.8 + t + phase) * 0.06;
  wave += sin(p.x * 0.9 + t * 0.7 + phase * 1.3) * 0.04;
  wave += snoise(vec2(p.x * 0.5 + t * 0.15, phase)) * noiseAmt;
  float centerY = baseY + wave;
  float dist = abs(p.y - centerY);
  float edge = uRibbonWidth * 0.04;
  return smoothstep(uRibbonWidth + edge, uRibbonWidth - edge * 0.5, dist);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  float t = uTime * uSpeed;

  // Mouse pushes ribbons vertically
  float mouseY = (uMouse.y - 0.5);
  float mouseX = (uMouse.x - 0.5) * aspect;
  float mousePush = mouseY * uMouseInfluence * 0.08 * smoothstep(0.6, 0.0, abs(p.x - mouseX));

  // Lengthwise fade — brighter in center, fade at horizontal edges
  float lengthFade = smoothstep(0.0, 0.25, uv.x) * smoothstep(1.0, 0.75, uv.x);
  lengthFade = 0.3 + lengthFade * 0.7;

  vec3 color = vec3(1.0);

  // 5 ribbons — top to bottom: electric blue, violet, purple, coral pink, warm orange
  float baseYs[5];
  baseYs[0] = 0.14;
  baseYs[1] = 0.07;
  baseYs[2] = 0.0;
  baseYs[3] = -0.07;
  baseYs[4] = -0.14;

  float phases[5];
  phases[0] = 0.0;
  phases[1] = 2.5;
  phases[2] = 5.0;
  phases[3] = 7.5;
  phases[4] = 10.0;

  // Vivid saturated Stripe palette
  vec3 colors[5];
  colors[0] = vec3(0.15, 0.45, 1.0);   // electric blue
  colors[1] = vec3(0.50, 0.25, 0.95);  // violet
  colors[2] = vec3(0.75, 0.20, 0.70);  // purple-pink
  colors[3] = vec3(1.0, 0.35, 0.45);   // coral pink
  colors[4] = vec3(1.0, 0.55, 0.15);   // warm orange

  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float noiseAmt = 0.02 + fi * 0.005;

    float yPos = baseYs[i] + mousePush * (0.6 + fi * 0.15);
    float r = ribbon(p, yPos, t, phases[i], noiseAmt);

    // Subtle hue shift along length
    float hueShift = uv.x * 0.08;
    vec3 ribbonCol = colors[i];
    ribbonCol = mix(ribbonCol, ribbonCol.gbr * vec3(1.1, 0.9, 1.0), hueShift);

    // Apply length fade — brighter in center
    float alpha = r * lengthFade * 0.85;

    float glowWide = smoothstep(uRibbonWidth * 1.8, uRibbonWidth * 0.8, abs(p.y - yPos -
      sin(p.x * 1.8 + t + phases[i]) * 0.06 -
      sin(p.x * 0.9 + t * 0.7 + phases[i] * 1.3) * 0.04));
    color += ribbonCol * glowWide * uGlow * 0.015 * lengthFade;

    // Main ribbon layer
    color = mix(color, ribbonCol, alpha);
  }

  color = clamp(color, 0.0, 1.0);
  gl_FragColor = vec4(color, 1.0);
}
