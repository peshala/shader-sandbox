uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform float uLineCount;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uSpread;
uniform float uLineWidth;
uniform float uGlowIntensity;
uniform float uCurvature;
uniform float uTwist;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float t = uTime * uSpeed;
  int lineCount = int(uLineCount);
  float lineCountF = float(lineCount);

  vec3 color = vec3(0.035, 0.055, 0.1);

  float totalLine = 0.0;
  vec3 totalLineColor = vec3(0.0);
  float totalGlow = 0.0;
  vec3 totalGlowColor = vec3(0.0);

  for (int i = 0; i < 60; i++) {
    if (i >= lineCount) break;
    float fi = float(i);
    float ni = fi / max(lineCountF - 1.0, 1.0);

    float x = uv.x;

    // Base S-curve path — pivots from center so curvature rotates around midpoint
    float rise = pow(x, 0.75) * 0.52;
    float midRise = pow(0.5, 0.75) * 0.52;
    float baseY = 0.12 + midRise + (rise - midRise) * uCurvature;

    // --- Twist ---
    // Each line has an angular position around the bundle's cross-section.
    // As x progresses, this angle rotates — creating a twist.
    // Think of it like a rope: each strand spirals around the center.
    float angle = ni * 3.14159;
    float twistAngle = angle + x * uTwist * 6.2832 + t * 0.3;

    // The twist displaces lines vertically (we see the bundle from the side,
    // so only the Y component of the rotation is visible)
    float twistOffset = sin(twistAngle) * uSpread * 0.5;

    // Spread envelope: tighter at edges, wider in middle
    float env = sin(x * 3.14159);
    env = pow(max(env, 0.0), 0.5) * 0.8 + 0.2;

    float lineOffset = twistOffset * env;

    // Subtle secondary wave for organic feel (much smaller than twist)
    float wave = sin(x * 5.0 + t * 0.15 + fi * 0.6) * uAmplitude * 0.3;

    float lineY = baseY + lineOffset + wave;
    float dist = abs(uv.y - lineY);

    // Sharp line stroke
    float hw = uLineWidth * 0.0007;
    float line = smoothstep(hw, hw * 0.05, dist);

    // Glow per line — two layers
    float gr1 = 0.002 + 0.002 * uGlowIntensity;
    float gr2 = 0.006 + 0.008 * uGlowIntensity;
    float glow = exp(-dist * dist / (gr1 * gr1)) * 0.7
               + exp(-dist * dist / (gr2 * gr2)) * 0.3;

    // Color gradient along x — 4 stops
    vec3 lc;
    if (x < 0.22) {
      lc = mix(uColor1, uColor2, smoothstep(0.0, 0.22, x));
    } else if (x < 0.45) {
      lc = mix(uColor2, uColor3, smoothstep(0.22, 0.45, x));
    } else {
      lc = mix(uColor3, uColor4, smoothstep(0.45, 0.85, x));
    }

    // Fade at edges
    float fade = smoothstep(0.0, 0.08, x) * smoothstep(1.0, 0.85, x);

    // Per-line brightness variation
    float bright = 0.55 + 0.45 * (0.5 + 0.5 * sin(fi * 2.71 + 0.8));

    float a = fade * bright;

    totalLine += line * a;
    totalLineColor += lc * line * a;
    totalGlow += glow * a;
    totalGlowColor += lc * glow * a;
  }

  // Draw lines
  if (totalLine > 0.001) {
    vec3 avg = totalLineColor / totalLine;
    color = mix(color, avg * 1.5, min(totalLine, 1.0));
  }

  // Line glow
  color += totalGlowColor / lineCountF * 1.8;

  // Broad ambient glow centered on the bundle path
  float cRise = pow(uv.x, 0.75) * 0.52;
  float cMid = pow(0.5, 0.75) * 0.52;
  float centerY = 0.12 + cMid + (cRise - cMid) * uCurvature;
  float bd = abs(uv.y - centerY);
  float spreadR = uSpread * 0.5 + 0.03;
  float amb1 = exp(-bd * bd / (spreadR * spreadR * 0.2)) * uGlowIntensity * 0.15;
  float amb2 = exp(-bd * bd / (0.03 + spreadR * spreadR)) * uGlowIntensity * 0.1;
  vec3 ambCol = mix(uColor1 * 0.8, uColor3 * 0.7, smoothstep(0.05, 0.6, uv.x));
  float ambFade = smoothstep(0.0, 0.12, uv.x) * smoothstep(1.0, 0.7, uv.x);
  color += ambCol * (amb1 + amb2) * ambFade;

  // Bottom edge
  float bot = smoothstep(0.005, 0.002, uv.y) * 0.08;
  color += vec3(0.2, 0.12, 0.4) * bot;

  color = color / (1.0 + color * 0.2);

  gl_FragColor = vec4(color, 1.0);
}
