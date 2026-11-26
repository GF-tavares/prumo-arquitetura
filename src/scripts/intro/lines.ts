import { BufferAttribute, BufferGeometry, Color, LineSegments, ShaderMaterial } from 'three';
import type { LineKind, Plan, Pt } from '@/lib/plan';
import { T } from './timing';

/** Código numérico de cada tipo de linha (lido pelo shader). */
const KIND_CODE: Record<LineKind, number> = {
  wall: 0,
  door: 1,
  glass: 2,
  furn: 3,
  tree: 4,
  water: 5,
  axis: 6,
  dim: 7,
  cut: 8,
  mark: 9,
  plinth: 10,
};

/** Quando (em s, depois de T.drawStart) cada tipo começa a ser desenhado. */
const KIND_BASE: Record<LineKind, number> = {
  plinth: 0.1,
  axis: 0.25,
  wall: 0.7,
  mark: 0.9,
  dim: 1.25,
  glass: 2.0,
  door: 2.2,
  cut: 3.0,
  furn: 3.3,
  water: 3.6,
  tree: 3.8,
};

/** Velocidade da "caneta" (m/s) e espalhamento por distância a partir do canto de origem. */
const PEN_SPEED = 16;
const SPREAD = 0.048;
const ORIGIN: Pt = [-17, -7.5];

const VERT = /* glsl */ `
  attribute float aT;
  attribute float aStart;
  attribute float aDur;
  attribute float aKind;
  attribute float aDist;
  attribute float aDash;
  varying float vT;
  varying float vStart;
  varying float vDur;
  varying float vKind;
  varying float vDist;
  varying float vDash;
  void main() {
    vT = aT;
    vStart = aStart;
    vDur = aDur;
    vKind = aKind;
    vDist = aDist;
    vDash = aDash;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uFade;
  uniform float uWallFade;
  uniform vec3 uBone;
  uniform vec3 uCut;
  varying float vT;
  varying float vStart;
  varying float vDur;
  varying float vKind;
  varying float vDist;
  varying float vDash;

  float kindAlpha(float k) {
    if (k < 0.5) return 0.95;        // wall
    if (k < 1.5) return 0.62;        // door
    if (k < 2.5) return 0.52;        // glass
    if (k < 3.5) return 0.42;        // furn
    if (k < 4.5) return 0.30;        // tree
    if (k < 5.5) return 0.40;        // water
    if (k < 6.5) return 0.36;        // axis
    if (k < 7.5) return 0.64;        // dim
    if (k < 8.5) return 1.0;         // cut
    if (k < 9.5) return 0.78;        // mark
    return 0.34;                     // plinth
  }

  void main() {
    float p = clamp((uTime - vStart) / vDur, 0.0, 1.0);
    if (vT > p) discard;
    if (vDash > 0.0) {
      float m = mod(vDist, vDash * 1.7);
      if (m > vDash) discard;
    }
    float a = kindAlpha(vKind);
    float fade = vKind < 0.5 ? uWallFade : uFade;
    // A ponta da caneta brilha enquanto a linha está sendo traçada
    float d = p - vT;
    float head = (p < 1.0) ? exp(-d * 60.0) : 0.0;
    vec3 col = vKind > 7.5 && vKind < 8.5 ? uCut : uBone;
    col = mix(col, vec3(1.0), head * 0.85);
    a = clamp(a + head * 0.6, 0.0, 1.0) * fade;
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

export interface LineLayer {
  object: LineSegments;
  update(t: number, fade: number, wallFade: number): void;
  /** Momento (s) em que o desenho de um ponto (x, z) termina de ser traçado: usado nos rótulos. */
  revealTimeNear(x: number, z: number): number;
  dispose(): void;
}

export function buildLineLayer(plan: Plan, y: number): LineLayer {
  const pos: number[] = [];
  const aT: number[] = [];
  const aStart: number[] = [];
  const aDur: number[] = [];
  const aKind: number[] = [];
  const aDist: number[] = [];
  const aDash: number[] = [];
  // amostras (x, z, tempo em que a linha passa por ali) para localizar os rótulos no tempo
  const samples: { x: number; z: number; t: number }[] = [];

  for (const line of plan.lines) {
    const pts: Pt[] = line.closed ? [...line.pts, line.pts[0]] : line.pts;
    const segLen: number[] = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      segLen.push(l);
      total += l;
    }
    if (total < 1e-6) continue;
    const dist0 = Math.hypot(pts[0][0] - ORIGIN[0], pts[0][1] - ORIGIN[1]);
    const start = T.drawStart + KIND_BASE[line.kind] + dist0 * SPREAD;
    const dur = Math.min(2.6, Math.max(0.35, total / PEN_SPEED));
    let cum = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i];
      const [x1, z1] = pts[i + 1];
      const s0 = start + (cum / total) * dur;
      const sd = (segLen[i] / total) * dur;
      pos.push(x0, y, z0, x1, y, z1);
      aT.push(0, 1);
      aStart.push(s0, s0);
      aDur.push(sd, sd);
      aKind.push(KIND_CODE[line.kind], KIND_CODE[line.kind]);
      aDist.push(cum, cum + segLen[i]);
      aDash.push(line.dash ?? 0, line.dash ?? 0);
      samples.push({ x: x0, z: z0, t: s0 + sd });
      cum += segLen[i];
    }
    samples.push({ x: pts[pts.length - 1][0], z: pts[pts.length - 1][1], t: start + dur });
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('aT', new BufferAttribute(new Float32Array(aT), 1));
  geo.setAttribute('aStart', new BufferAttribute(new Float32Array(aStart), 1));
  geo.setAttribute('aDur', new BufferAttribute(new Float32Array(aDur), 1));
  geo.setAttribute('aKind', new BufferAttribute(new Float32Array(aKind), 1));
  geo.setAttribute('aDist', new BufferAttribute(new Float32Array(aDist), 1));
  geo.setAttribute('aDash', new BufferAttribute(new Float32Array(aDash), 1));

  const material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uFade: { value: 1 },
      uWallFade: { value: 1 },
      uBone: { value: new Color('#ece8df') },
      uCut: { value: new Color('#e3441d') },
    },
  });

  const object = new LineSegments(geo, material);
  object.frustumCulled = false;
  object.renderOrder = 5;

  return {
    object,
    update(t, fade, wallFade) {
      material.uniforms.uTime.value = t;
      material.uniforms.uFade.value = fade;
      material.uniforms.uWallFade.value = wallFade;
      object.visible = fade > 0.002 || wallFade > 0.002;
    },
    revealTimeNear(x, z) {
      let best = Infinity;
      let bt = T.drawStart + 2;
      for (const s of samples) {
        const d = Math.hypot(s.x - x, s.z - z);
        if (d < best) {
          best = d;
          bt = s.t;
        }
      }
      return bt;
    },
    dispose() {
      geo.dispose();
      material.dispose();
    },
  };
}
