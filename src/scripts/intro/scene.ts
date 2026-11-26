import {
  NeutralToneMapping,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Quaternion,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from 'three';
import { buildPlan, type Piece, type Plan } from '@/lib/plan';
import {
  clamp01,
  easeInOutCubic,
  easeInOutQuart,
  easeInOutSine,
  hash01,
  lerp,
  remap01,
  smoothstep,
  trapezoid,
} from '../lib/math';
import { createConcrete } from './concrete';
import { buildLineLayer, type LineLayer } from './lines';
import { FOV, T } from './timing';

export interface Tier {
  shadows: boolean;
  shadowMapSize: number;
  maxDpr: number;
  antialias: boolean;
}

export interface SceneInit {
  canvas: HTMLCanvasElement;
  textureUrl: string;
  focus: { x: number; y: number };
  tier: Tier;
  width: number;
  height: number;
}

const PLINTH_H = 0.22;
const PHOTO_X = 17.15; // face externa da parede leste
const PHOTO_H = 3.2;
const LINE_Y = PLINTH_H + 0.013;
const EYE = 1.55;
const PLANE_CY = PLINTH_H + PHOTO_H / 2; // centro da foto: a câmera termina na altura dele

const BG = '#0a0a0a';
const BG_LINEAR = new Color(BG);

export interface IntroScene {
  plan: Plan;
  lines: LineLayer;
  camera: PerspectiveCamera;
  resize(width: number, height: number): void;
  /** Renderiza o quadro do instante t. */
  render(t: number): void;
  /** Posição do ponto (x, y, z) em pixels de tela, ou null se estiver atrás da câmera. */
  project(x: number, y: number, z: number): { x: number; y: number; depth: number } | null;
  dispose(): void;
}

export async function createIntroScene(init: SceneInit): Promise<IntroScene> {
  const { canvas, tier } = init;
  let width = init.width;
  let height = init.height;

  const renderer = new WebGLRenderer({
    canvas,
    antialias: tier.antialias,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier.maxDpr));
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = tier.shadows;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.setClearColor(new Color(BG));

  const scene = new Scene();
  scene.background = new Color(BG);
  scene.fog = new Fog(BG, 60, 260);

  const camera = new PerspectiveCamera(FOV, width / height, 0.1, 900);

  // ---------- Planta (a abertura leste depende da proporção da tela) ----------
  const eastOpeningFor = (aspect: number) => Math.max(1.3, PHOTO_H * aspect);
  let plan = buildPlan({ eastOpening: eastOpeningFor(width / height) });
  const lines = buildLineLayer(plan, LINE_Y);
  scene.add(lines.object);

  // ---------- Luzes ----------
  const hemi = new HemisphereLight(0xc9ced6, 0x2a2a2c, 0);
  scene.add(hemi);
  const sun = new DirectionalLight(0xfffaf3, 0);
  sun.castShadow = tier.shadows;
  sun.shadow.mapSize.set(tier.shadowMapSize, tier.shadowMapSize);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 180;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = 3;
  scene.add(sun);
  scene.add(sun.target);
  // Luz que acompanha a câmera pelo interior (o sol não entra em todas as salas)
  const follow = new PointLight(0xffeedd, 0, 18, 1.35);
  scene.add(follow);

  // ---------- Chão, plinto e água ----------
  const ground = new Mesh(
    new PlaneGeometry(700, 700),
    new MeshStandardMaterial({ color: 0x2b2b2c, roughness: 1, metalness: 0, emissive: new Color(BG) }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const plinthGeo = new BoxGeometry(38, 1, 18.8);
  plinthGeo.translate(0, 0.5, 0);
  const plinth = new Mesh(
    plinthGeo,
    new MeshStandardMaterial({ color: 0x3f3f3f, roughness: 0.95, metalness: 0, emissive: new Color(BG) }),
  );
  plinth.castShadow = tier.shadows;
  plinth.receiveShadow = true;
  plinth.scale.y = 0.0001;
  scene.add(plinth);

  const water = new Mesh(
    new PlaneGeometry(16, 2.8),
    new MeshStandardMaterial({ color: 0x0a1216, roughness: 0.12, metalness: 0.7, emissive: new Color(0x081218) }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.03, 11.5);
  water.receiveShadow = true;
  scene.add(water);

  // ---------- Paredes (instanciadas) ----------
  const solids = plan.pieces.filter((p) => p.kind !== 'glass');
  const glass = plan.pieces.filter((p) => p.kind === 'glass');

  const boxGeo = new BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  // Concreto aparente (fôrma de tábua, poros, manchas, cura): ver concrete.ts
  const concrete = await createConcrete({
    base: import.meta.env.BASE_URL,
    detail: tier.shadows,
    anisotropy: tier.maxDpr >= 2 ? 8 : 4,
    bg: BG_LINEAR,
  });
  const wallMat = concrete.material;
  const walls = new InstancedMesh(boxGeo, wallMat, solids.length);
  walls.castShadow = tier.shadows;
  walls.receiveShadow = true;
  walls.frustumCulled = false;
  scene.add(walls);

  const glassMat = new MeshBasicMaterial({
    color: 0xa9c4d6,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const glassMesh = new InstancedMesh(boxGeo, glassMat, Math.max(1, glass.length));
  glassMesh.frustumCulled = false;
  glassMesh.count = glass.length;
  scene.add(glassMesh);

  // Arestas dos volumes: dão o traço de "maquete" e mantêm a linguagem da planta
  const edgeGeo = new BufferGeometry();
  const edgePos = new Float32Array(solids.length * 24 * 3);
  edgeGeo.setAttribute('position', new BufferAttribute(edgePos, 3));
  const edgeMat = new LineBasicMaterial({ color: 0xece8df, transparent: true, opacity: 0, depthWrite: false });
  const edges = new LineSegments(edgeGeo, edgeMat);
  edges.frustumCulled = false;
  edges.renderOrder = 4;
  scene.add(edges);

  const stone = new Color(0xc9cac8);
  const stoneDark = new Color(0x83837f);
  const poche = new Color(0x1c1c1b);

  interface PieceState {
    piece: Piece;
    t0: number;
    dur: number;
    flatAt: number;
    color: Color;
  }

  const stateFor = (p: Piece): PieceState => {
    const cx = (p.x0 + p.x1) / 2;
    const cz = (p.z0 + p.z1) / 2;
    const xn = (cx + 20) / 40;
    const isLintel = p.kind === 'lintel';
    const base = T.rise[0] + xn * 1.9 + hash01(p.id) * 0.3;
    return {
      piece: p,
      t0: base + (isLintel ? 0.75 : 0),
      dur: isLintel ? 0.95 : 1.5 + hash01(p.id + 'd') * 0.3,
      flatAt: lines.revealTimeNear(cx, cz) + 0.1,
      color: p.kind === 'mono' ? stoneDark : stone,
    };
  };
  let states = solids.map(stateFor);

  const tmpM = new Matrix4();
  const tmpQ = new Quaternion();
  const tmpP = new Vector3();
  const tmpS = new Vector3();
  const tmpC = new Color();

  const EDGE_PAD = 0.012;
  const writeEdges = (i: number, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
    x0 -= EDGE_PAD;
    x1 += EDGE_PAD;
    z0 -= EDGE_PAD;
    z1 += EDGE_PAD;
    y1 += EDGE_PAD;
    const c = [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y0, z1],
      [x0, y0, z1],
      [x0, y1, z0],
      [x1, y1, z0],
      [x1, y1, z1],
      [x0, y1, z1],
    ];
    const e = [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7];
    let o = i * 72;
    for (let k = 0; k < e.length; k++) {
      const v = c[e[k]];
      edgePos[o++] = v[0];
      edgePos[o++] = v[1];
      edgePos[o++] = v[2];
    }
  };

  // Vidros: matriz fixa
  const writeGlass = () => {
    glass.forEach((p, i) => {
      tmpP.set((p.x0 + p.x1) / 2, PLINTH_H + p.y0, (p.z0 + p.z1) / 2);
      tmpS.set(p.x1 - p.x0, p.y1 - p.y0, p.z1 - p.z0);
      tmpM.compose(tmpP, tmpQ.identity(), tmpS);
      glassMesh.setMatrixAt(i, tmpM);
    });
    glassMesh.instanceMatrix.needsUpdate = true;
  };
  writeGlass();

  // ---------- Plano da fotografia (a parede que vira a home) ----------
  const photoTex: Texture = await new Promise((resolve, reject) => {
    new TextureLoader().load(init.textureUrl, resolve, undefined, reject);
  });
  photoTex.colorSpace = SRGBColorSpace;
  photoTex.anisotropy = 4;
  const imgAspect = (photoTex.image as { width: number; height: number }).width / (photoTex.image as { width: number; height: number }).height;

  const photoMat = new ShaderMaterial({
    uniforms: {
      uMap: { value: photoTex },
      uScale: { value: [1, 1] },
      uOffset: { value: [0, 0] },
      uBright: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec2 uScale;
      uniform vec2 uOffset;
      uniform float uBright;
      varying vec2 vUv;
      void main() {
        vec3 c = texture2D(uMap, uOffset + vUv * uScale).rgb * uBright;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }
    `,
    fog: false,
  });
  photoMat.toneMapped = false;
  const photo = new Mesh(new PlaneGeometry(1, 1), photoMat);
  photo.rotation.y = -Math.PI / 2;
  photo.position.set(PHOTO_X, PLANE_CY, 0);
  scene.add(photo);

  const layoutPhoto = () => {
    const aspect = width / height;
    photo.scale.set(PHOTO_H * aspect, PHOTO_H, 1);
    // object-fit: cover com object-position (focus)
    const pa = aspect;
    let sx = 1;
    let sy = 1;
    if (pa > imgAspect) sy = imgAspect / pa;
    else sx = pa / imgAspect;
    photoMat.uniforms.uScale.value = [sx, sy];
    photoMat.uniforms.uOffset.value = [(1 - sx) * init.focus.x, (1 - sy) * (1 - init.focus.y)];
  };

  // ---------- Câmera ----------
  const tanHalf = Math.tan((FOV * Math.PI) / 360);
  const distFill = () => PHOTO_H / (2 * tanHalf);

  const topFit = () => {
    const aspect = width / height;
    const W = 47;
    const H = 35;
    if (aspect >= 1) {
      return Math.max((W * 1.04) / (2 * tanHalf * aspect), (H * 1.06) / (2 * tanHalf));
    }
    return Math.max((H * 1.06) / (2 * tanHalf * aspect), (W * 1.04) / (2 * tanHalf));
  };

  const upTop = new Vector3();
  const upWorld = new Vector3(0, 1, 0);
  const camPos = new Vector3();
  const camTgt = new Vector3();
  const camUp = new Vector3();

  const buildCurves = () => {
    const fillX = PHOTO_X - distFill();
    const yFit = topFit();
    const portrait = width / height < 1;
    // Rota aérea: do plano superior, cruza o aéreo em 3/4 e desce até o eixo de entrada
    const pts = portrait
      ? [
          new Vector3(-1, yFit, 1.5),
          new Vector3(-16, yFit * 0.62, 34),
          new Vector3(-36, 30, 40),
          new Vector3(-40, 8, 14),
          new Vector3(-24, EYE, 0),
        ]
      : [
          new Vector3(-1, yFit, 1.5),
          new Vector3(-14, yFit * 0.6, 26),
          new Vector3(-30, 24, 32),
          new Vector3(-36, 7, 12),
          new Vector3(-24, EYE, 0),
        ];
    const tgts = [
      new Vector3(-1, 0, 1.5),
      new Vector3(-3, 0.5, 1),
      new Vector3(-2, 1.5, 0),
      new Vector3(-12, EYE + 0.3, 0),
      new Vector3(-6, EYE, 0),
    ];
    return {
      fillX,
      yFit,
      pos: new CatmullRomCurve3(pts, false, 'centripetal', 0.5),
      tgt: new CatmullRomCurve3(tgts, false, 'centripetal', 0.5),
    };
  };
  let curves = buildCurves();

  const poseAt = (t: number) => {
    const portrait = width / height < 1;
    upTop.set(portrait ? 1 : 0, 0, portrait ? 0 : -1);

    const closeP = new Vector3(-15.7, 3.6, -6.45);
    const closeT = new Vector3(-15.7, 0, -6.45);
    const fitP = new Vector3(-1, curves.yFit, 1.5);
    const fitT = new Vector3(-1, 0, 1.5);

    if (t < T.aerial[0]) {
      // Afastamento: do detalhe à planta inteira. A altura cresce em escala geométrica.
      const k = easeInOutCubic(remap01(T.pull[0], T.pull[1], t));
      const y = closeP.y * Math.pow(curves.yFit / closeP.y, k);
      camPos.set(lerp(closeP.x, fitP.x, k), y, lerp(closeP.z, fitP.z, k));
      camTgt.set(lerp(closeT.x, fitT.x, k), 0, lerp(closeT.z, fitT.z, k));
      camUp.copy(upTop);
      return;
    }
    if (t < T.fly[0]) {
      const u = easeInOutQuart(remap01(T.aerial[0], T.fly[0], t));
      curves.pos.getPoint(u, camPos);
      curves.tgt.getPoint(u, camTgt);
      // O "cima" da imagem gira do norte (planta) para a vertical do mundo
      camUp.copy(upTop).lerp(upWorld, smoothstep(0.0, 0.3, u)).normalize();
      return;
    }
    // Travessia: do limiar da porta até a distância em que a foto preenche a tela.
    const startX = -24;
    const s = remap01(T.fly[0], T.fly[1], t);
    // acelera no limiar da porta, cruza em velocidade constante e freia longamente até a foto
    const e = trapezoid(s, 0.16, 0.42);
    const x = lerp(startX, curves.fillX, e);
    const y = lerp(EYE, PLANE_CY, smoothstep(0.3, 1.0, s));
    camPos.set(x, y, 0);
    camTgt.set(x + 8, y, 0);
    camUp.copy(upWorld);
  };

  // ---------- Desenho de um quadro ----------
  const sunPos = new Vector3();
  const fogColor = new Color(BG);

  const render = (t: number) => {
    const rise = remap01(T.rise[0], T.rise[1] + 1.2, t);

    // linhas
    const fadeOther = 1 - smoothstep(T.rise[0] - 0.4, T.rise[0] + 1.4, t);
    const fadeWall = 1 - smoothstep(T.rise[0] + 0.4, T.rise[0] + 2.8, t);
    lines.update(t, fadeOther, fadeWall);

    // plinto sobe antes das paredes
    const plinthK = easeInOutCubic(remap01(T.rise[0] - 0.5, T.rise[0] + 0.9, t));
    plinth.scale.y = Math.max(0.0001, PLINTH_H * plinthK);

    // luz: o sol nasce
    const sunK = easeInOutSine(remap01(T.sun[0], T.sun[1], t));
    const flyK = remap01(T.fly[0] - 0.6, T.fly[0] + 0.8, t);
    const sweep = easeInOutSine(remap01(T.sun[0], T.fly[0], t));
    const land = easeInOutSine(remap01(T.fly[0], T.fly[1], t));
    // o sol nasce a oeste (ilumina a fachada por onde a câmera desce) e só gira para leste na travessia
    const az = (lerp(-74, -38, sweep) + lerp(0, 96, land)) * (Math.PI / 180);
    const el = (lerp(14, 26, sweep) + lerp(0, -6, land)) * (Math.PI / 180);
    sunPos.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(90);
    sun.position.copy(sunPos);
    sun.target.position.set(0, 0, 0);
    sun.intensity = 3.1 * sunK;
    hemi.intensity = 0.62 * sunK;
    // Antes do sol, chão e plinto têm a cor exata do fundo; o poché das paredes é um cinza bem baixo
    wallMat.emissive.copy(BG_LINEAR).multiplyScalar(lerp(1.5, 0.15, sunK));
    (plinth.material as MeshStandardMaterial).emissive.copy(BG_LINEAR).multiplyScalar(1 - sunK);
    (ground.material as MeshStandardMaterial).emissive.copy(BG_LINEAR).multiplyScalar(1 - sunK);

    // cura: o concreto sobe molhado (escuro e brilhante) e seca durante a descida da câmera
    concrete.setCure(smoothstep(T.rise[0] + 0.6, T.fly[0] + 0.4, t));

    // câmera
    poseAt(t);
    camera.position.copy(camPos);
    camera.up.copy(camUp);
    camera.lookAt(camTgt);
    camera.near = Math.min(6, Math.max(0.08, camPos.y * 0.1));
    camera.far = 900;
    camera.updateProjectionMatrix();

    // luz que acompanha a câmera pelo interior
    follow.position.set(camPos.x + 1.4, EYE + 0.55, 0);
    follow.intensity = 7 * smoothstep(T.fly[0] - 0.4, T.fly[0] + 1.6, t);

    // névoa: densa no interior, aberta no aéreo
    const fogNear = lerp(80, 7, flyK);
    const fogFar = lerp(300, 46, flyK);
    (scene.fog as Fog).near = fogNear;
    (scene.fog as Fog).far = fogFar;
    (scene.fog as Fog).color.copy(fogColor);

    // paredes
    walls.count = solids.length;
    for (let i = 0; i < states.length; i++) {
      const st = states[i];
      const p = st.piece;
      const k = easeInOutCubic(clamp01((t - st.t0) / st.dur));
      const flat = 0.014 * smoothstep(st.flatAt, st.flatAt + 0.5, t);
      const full = p.y1 - p.y0;
      const h = p.kind === 'lintel' ? full * k : flat + (full - flat) * k;
      const baseY = PLINTH_H * plinthK + p.y0;
      tmpP.set((p.x0 + p.x1) / 2, Math.max(PLINTH_H * plinthK, baseY), (p.z0 + p.z1) / 2);
      tmpS.set(p.x1 - p.x0, Math.max(h, 0.0001), p.z1 - p.z0);
      tmpM.compose(tmpP, tmpQ.identity(), tmpS);
      walls.setMatrixAt(i, tmpM);
      tmpC.copy(poche).lerp(st.color, Math.pow(k, 0.55));
      walls.setColorAt(i, tmpC);
      writeEdges(i, p.x0, p.x1, tmpP.y, tmpP.y + h, p.z0, p.z1);
    }
    walls.instanceMatrix.needsUpdate = true;
    if (walls.instanceColor) walls.instanceColor.needsUpdate = true;
    edgeGeo.attributes.position.needsUpdate = true;
    edgeMat.opacity = rise > 0 ? lerp(0.0, 0.5, smoothstep(0.02, 0.4, rise)) * lerp(1, 0.22, smoothstep(0.7, 1.0, rise) + smoothstep(T.fly[0] - 0.5, T.fly[0] + 1.5, t)) : 0;

    glassMat.opacity = 0;
    (water.material as MeshStandardMaterial).emissiveIntensity = smoothstep(T.sun[0], T.sun[1], t);

    // fotografia: surge como uma fonte de luz no fim do eixo
    const fly = remap01(T.fly[0], T.fly[1], t);
    photoMat.uniforms.uBright.value = lerp(0.35, 1, smoothstep(0.0, 0.85, fly));
    photo.visible = t > T.fly[0] - 2.5;
    water.visible = t > T.rise[0];

    renderer.render(scene, camera);
  };

  const project = (x: number, y: number, z: number) => {
    const v = new Vector3(x, y, z).project(camera);
    if (v.z < -1 || v.z > 1) return null;
    return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height, depth: v.z };
  };

  const resize = (w: number, h: number) => {
    width = w;
    height = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier.maxDpr));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // a abertura da parede leste acompanha a proporção da foto
    plan = buildPlan({ eastOpening: eastOpeningFor(w / h) });
    const newSolids = plan.pieces.filter((p) => p.kind !== 'glass');
    for (let i = 0; i < newSolids.length && i < solids.length; i++) solids[i] = newSolids[i];
    states = solids.map(stateFor);
    curves = buildCurves();
    layoutPhoto();
  };

  layoutPhoto();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  return {
    plan,
    lines,
    camera,
    resize,
    render,
    project,
    dispose() {
      lines.dispose();
      boxGeo.dispose();
      plinthGeo.dispose();
      edgeGeo.dispose();
      photoTex.dispose();
      photoMat.dispose();
      concrete.dispose();
      glassMat.dispose();
      edgeMat.dispose();
      ground.geometry.dispose();
      (ground.material as MeshStandardMaterial).dispose();
      (plinth.material as MeshStandardMaterial).dispose();
      water.geometry.dispose();
      (water.material as MeshStandardMaterial).dispose();
      photo.geometry.dispose();
      walls.dispose();
      glassMesh.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
