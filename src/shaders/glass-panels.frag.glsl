uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform float uPaneCount;
uniform float uPaneAngle;
uniform float uPaneWidth;
uniform float uGapWidth;
uniform float uRefraction;
uniform float uWarp;
uniform float uBlurStrength;
uniform float uPaneEdge;
uniform float uSphereRadius;
uniform float uSphereBlur;
uniform float uSphereLayerBlur;
uniform vec3 uBgColor;
uniform vec3 uSphereColor;
uniform float uRainbow;

varying vec2 vUv;

vec3 getScene(vec2 sp, vec2 mouse, float aspect) {
  float soft = uSphereBlur * 0.03 + uSphereLayerBlur * 0.03;
  float d = length(sp - mouse) - uSphereRadius * 0.08;
  float mask = 1.0 - smoothstep(-soft, soft, d);
  vec3 bg = uBgColor + 0.015 * (sp.y);
  return mix(bg, uSphereColor, mask);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  vec2 mouse = (uMouse - 0.5) * vec2(aspect, 1.0);

  float angle = uPaneAngle * 3.14159 / 180.0;
  float cosA = cos(angle);
  float sinA = sin(angle);
  float proj = p.x * cosA + p.y * sinA;

  float paneSpacing = uPaneWidth + uGapWidth;
  float distToCenter = proj - floor(proj / paneSpacing + 0.5) * paneSpacing;
  float halfPane = uPaneWidth * 0.5;
  float onPane = smoothstep(halfPane + uPaneEdge * 0.01, halfPane - uPaneEdge * 0.01, abs(distToCenter));

  // Warp: cubic distortion
  float nd = distToCenter / halfPane;
  float warpCurve = nd + uWarp * nd * nd * nd;
  float refrBase = warpCurve * halfPane * uRefraction * 0.5;

  vec2 refrDir = vec2(cosA, sinA);
  vec2 refracted = p - refrDir * refrBase * onPane;

  // Simple blur — 6 samples
  float br = uBlurStrength * 0.012 * onPane;
  vec3 col = vec3(0.0);
  col += getScene(refracted, mouse, aspect);
  col += getScene(refracted + vec2(br, 0.0), mouse, aspect);
  col += getScene(refracted + vec2(-br, 0.0), mouse, aspect);
  col += getScene(refracted + vec2(0.0, br), mouse, aspect);
  col += getScene(refracted + vec2(0.0, -br), mouse, aspect);
  col += getScene(refracted + vec2(br * 0.7, br * 0.7), mouse, aspect);
  vec3 sceneColor = col / 6.0;

  // Chromatic split when rainbow > 0
  if (uRainbow > 0.01) {
    float ch = uRainbow * 0.2;
    vec2 refR = p - refrDir * refrBase * (1.0 + ch) * onPane;
    vec2 refB = p - refrDir * refrBase * (1.0 - ch) * onPane;
    float rCh = getScene(refR, mouse, aspect).r;
    float bCh = getScene(refB, mouse, aspect).b;
    sceneColor.r = mix(sceneColor.r, rCh, 0.5);
    sceneColor.b = mix(sceneColor.b, bCh, 0.5);

    float iridAngle = proj * 8.0 + distToCenter * 20.0 + uTime * 0.3;
    sceneColor += vec3(
      sin(iridAngle),
      sin(iridAngle + 2.094),
      sin(iridAngle + 4.189)
    ) * uRainbow * 0.02 * onPane;
  }

  // Gap (no effect)
  vec3 gapColor = getScene(p, mouse, aspect);

  // Glass tint + edge highlight
  float edgeDist = abs(distToCenter) - halfPane;
  float edgeHL = exp(-edgeDist * edgeDist / (0.0001 + uPaneEdge * 0.0005)) * 0.1;
  vec3 paneColor = sceneColor + vec3(0.015 + edgeHL);

  vec3 color = mix(gapColor, paneColor, onPane);

  // Edge shadow
  color -= smoothstep(halfPane - 0.003, halfPane + 0.001, abs(distToCenter)) * 0.02 * onPane;

  gl_FragColor = vec4(color, 1.0);
}
