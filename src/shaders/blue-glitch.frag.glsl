uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform float uPixelCount;
uniform float uDensity;
uniform float uSpeed;
uniform float uFalloff;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(269.5, 183.3))) * 28716.1973);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;

  float gridY = uPixelCount;
  float gridX = floor(gridY * aspect);
  vec2 grid = vec2(gridX, gridY);

  vec2 cell = floor(uv * grid);
  vec2 cellUv = fract(uv * grid);

  float centerDist = abs(uv.y - 0.5) * 2.0;
  float densityMask = pow(1.0 - centerDist, uFalloff);

  float threshold = 1.0 - (uDensity * densityMask);

  float cellRate = 0.3 + hash(cell * 41.7) * 1.4;
  float cellOffset = hash(cell * 73.1) * 100.0;
  float localTime = uTime * uSpeed * cellRate + cellOffset;

  float slot = floor(localTime);
  float r = hash(cell + slot * 0.137);
  float nextR = hash(cell + (slot + 1.0) * 0.137);

  float t = fract(localTime);
  float fadeOut = smoothstep(0.7, 1.0, t);
  float fadeIn = smoothstep(0.0, 0.3, t);

  float curOn = step(threshold, r);
  float nextOn = step(threshold, nextR);
  float on = mix(curOn * (1.0 - fadeOut), nextOn, fadeOut) * fadeIn;
  on = clamp(on, 0.0, 1.0);

  float r2 = hash2(cell + slot * 0.137);

  float gap = 0.08;
  float inSquare = step(gap, cellUv.x) * step(cellUv.x, 1.0 - gap) *
                   step(gap, cellUv.y) * step(cellUv.y, 1.0 - gap);

  vec3 col1 = vec3(0.27, 0.27, 0.80);
  vec3 col2 = vec3(0.40, 0.40, 0.78);
  vec3 col3 = vec3(0.55, 0.55, 0.80);
  vec3 col4 = vec3(0.73, 0.75, 0.90);
  vec3 col5 = vec3(0.83, 0.85, 0.93);
  vec3 col6 = vec3(0.92, 0.93, 0.97);

  vec3 pixelColor = col1;
  if (r2 > 0.15) pixelColor = col2;
  if (r2 > 0.30) pixelColor = col3;
  if (r2 > 0.50) pixelColor = col4;
  if (r2 > 0.70) pixelColor = col5;
  if (r2 > 0.85) pixelColor = col6;

  vec3 bg = vec3(1.0);
  float alpha = on * inSquare;
  vec3 color = mix(bg, pixelColor, alpha);

  gl_FragColor = vec4(color, 1.0);
}
