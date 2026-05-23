uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform float uWaveScale;
uniform float uSpeed;
uniform float uDistortion;
uniform float uReflection;
uniform vec3 uMetalColor;
uniform vec3 uMetalColor2;
uniform float uGradientMix;
uniform float uGradientAngle;
uniform float uRainbow;

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

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y);

  float t = uTime * uSpeed;

  float n1 = snoise(p * uWaveScale + vec2(t * 0.4, t * 0.3));
  float n2 = snoise(p * uWaveScale * 1.5 + vec2(-t * 0.3, t * 0.5) + 5.0);
  float n3 = snoise(p * uWaveScale * 0.7 + vec2(t * 0.2, -t * 0.4) + 10.0);

  vec2 distorted = p + vec2(n1, n2) * uDistortion * 0.15;
  float wave = snoise(distorted * uWaveScale * 2.0 + t * 0.5);
  float detail = snoise(distorted * uWaveScale * 5.0 - t * 0.3) * 0.3;
  float surface = wave + detail + n3 * 0.4;

  float dx = snoise(distorted * uWaveScale * 2.0 + vec2(0.01, 0.0) + t * 0.5) - wave;
  float dy = snoise(distorted * uWaveScale * 2.0 + vec2(0.0, 0.01) + t * 0.5) - wave;
  vec3 normal = normalize(vec3(-dx * 8.0, -dy * 8.0, 1.0));

  vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
  float diffuse = max(dot(normal, lightDir), 0.0);

  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), 80.0);

  vec3 lightDir2 = normalize(vec3(-0.6, -0.3, 0.8));
  float diffuse2 = max(dot(normal, lightDir2), 0.0);
  float spec2 = pow(max(dot(normal, normalize(lightDir2 + viewDir)), 0.0), 60.0);

  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);

  float envAngle = atan(normal.y, normal.x);
  float envGrad = normal.y * 0.5 + 0.5;
  vec3 envColor = mix(
    vec3(0.15, 0.15, 0.2),
    vec3(0.6, 0.65, 0.75),
    envGrad
  );

  float angle = uGradientAngle * 6.2831;
  vec2 gradDir = vec2(cos(angle), sin(angle));
  float gradT = dot(uv - 0.5, gradDir) + 0.5;
  gradT = clamp(gradT, 0.0, 1.0);
  vec3 metalBase = mix(uMetalColor, uMetalColor2, gradT * uGradientMix);

  vec3 darkMetal = metalBase * 0.15;
  vec3 midMetal = metalBase * 0.5;
  vec3 brightMetal = mix(metalBase, vec3(1.0), 0.3);

  float surfaceVal = surface * 0.5 + 0.5;
  vec3 baseColor = mix(darkMetal, midMetal, smoothstep(0.2, 0.5, surfaceVal));
  baseColor = mix(baseColor, brightMetal, smoothstep(0.5, 0.8, surfaceVal));

  vec3 color = baseColor * (0.3 + diffuse * 0.5 + diffuse2 * 0.2);
  vec3 specTint = mix(vec3(1.0), brightMetal, 0.3);
  color += specTint * spec * uReflection;
  color += specTint * 0.7 * spec2 * uReflection * 0.5;
  color += envColor * fresnel * uReflection * 0.6;
  color += brightMetal * fresnel * 0.2;

  if (uRainbow > 0.5) {
    float iriAngle = dot(normal.xy, vec2(cos(uTime * 0.2), sin(uTime * 0.2)));
    float iri = fresnel * 0.8 + iriAngle * 0.4 + surface * 0.3;
    vec3 rainbow;
    rainbow.r = sin(iri * 6.2831 * 2.0 + 0.0) * 0.5 + 0.5;
    rainbow.g = sin(iri * 6.2831 * 2.0 + 2.094) * 0.5 + 0.5;
    rainbow.b = sin(iri * 6.2831 * 2.0 + 4.189) * 0.5 + 0.5;
    float iriStrength = fresnel * 0.7 + spec * 0.3;
    color += rainbow * iriStrength * 0.6;
  }

  color = pow(color, vec3(0.9));

  gl_FragColor = vec4(color, 1.0);
}
