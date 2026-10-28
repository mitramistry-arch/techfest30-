import * as THREE from 'three';

/** Radial glow sprite used for every emissive point in the scene. */
export function makeGlowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.22, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.10)');
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Small soft dot for the starfield. */
export function makeStarTexture() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

/**
 * Infinite-feeling floor grid. Custom shader so the lines can fade with
 * distance and drift with time — a GridHelper can't do either.
 */
export function makeGridFloor(size = 260, divisions = 64) {
  const geo = new THREE.PlaneGeometry(size, size, 1, 1);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x00f0ff) },
      uAccent: { value: new THREE.Color(0xff2d95) },
      uDivisions: { value: divisions },
      uSize: { value: size },
      uScroll: { value: 0 }
    },
    vertexShader: /* glsl */ `
      varying vec2 vPos;
      void main() {
        vPos = position.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vPos;
      uniform float uTime;
      uniform float uDivisions;
      uniform float uSize;
      uniform float uScroll;
      uniform vec3 uColor;
      uniform vec3 uAccent;

      float gridLine(vec2 coord, float divs) {
        vec2 g = coord / divs;
        vec2 w = fwidth(g) * 1.0;
        vec2 f = abs(fract(g - 0.5) - 0.5) / max(w, vec2(0.0001));
        return 1.0 - min(min(f.x, f.y), 1.0);
      }

      void main() {
        vec2 coord = vPos + vec2(0.0, uScroll);
        float d = length(vPos) / (uSize * 0.5);

        float fine  = gridLine(coord, 4.0);
        float major = gridLine(coord, 20.0);

        // slow travelling wave so the floor never feels static
        float wave = 0.5 + 0.5 * sin(length(vPos) * 0.06 - uTime * 1.4);
        float majorPulse = 0.55 + 0.45 * wave;

        float fade = smoothstep(1.05, 0.12, d);
        float near = smoothstep(0.9, 0.0, abs(d - 0.35));

        vec3 col = uColor * fine * 0.22;
        col += mix(uColor, uAccent, wave) * major * majorPulse * 0.42;
        col += uAccent * near * 0.03;

        float alpha = clamp((fine * 0.16 + major * 0.42) * fade, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
      }
    `
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -3.2;
  mesh.renderOrder = -1;
  return mesh;
}

/** A soft additive halo billboard — used behind the core and the prize. */
export function makeHalo(color, size = 6, opacity = 0.55) {
  const mat = new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}
