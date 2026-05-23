uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
  vec3 normal = normalize(vNormal);

  vec3 lightDir1 = normalize(vec3(
    sin(uTime * 0.5) + uMouse.x * 2.0 - 1.0,
    cos(uTime * 0.3) + uMouse.y * 2.0 - 1.0,
    1.0
  ));
  vec3 lightDir2 = normalize(vec3(-0.5, -0.3, 0.8));

  float diff1 = max(dot(normal, lightDir1), 0.0);
  float diff2 = max(dot(normal, lightDir2), 0.0);

  vec3 viewDir = normalize(-vPosition);
  vec3 halfDir1 = normalize(lightDir1 + viewDir);
  float spec1 = pow(max(dot(normal, halfDir1), 0.0), 64.0);

  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);

  vec3 col1 = vec3(0.2, 0.5, 1.0);
  vec3 col2 = vec3(1.0, 0.3, 0.5);
  vec3 ambient = vec3(0.05, 0.02, 0.1);

  vec3 color = ambient;
  color += col1 * diff1 * 0.8;
  color += col2 * diff2 * 0.4;
  color += vec3(1.0) * spec1 * 0.6;
  color += vec3(0.3, 0.5, 1.0) * fresnel * 0.5;

  gl_FragColor = vec4(color, 1.0);
}
