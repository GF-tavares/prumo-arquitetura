import { Color, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Texture, TextureLoader } from 'three';

/**
 * Concreto aparente das paredes da abertura.
 *
 * Um MeshStandardMaterial com o shader estendido (coordenadas de mundo, triplanar), de modo que as
 * paredes que crescem em altura não esticam a textura. Camadas, da maior para a menor:
 *
 *   1. manchas de escala grande e escorrimentos de chuva que descem do topo
 *   2. fôrma de tábua: painéis de 2,4 x 1,2 m com juntas em sulco, tábuas de 15 cm com veio e
 *      furos de tirante nos cantos de cada painel
 *   3. microrelevo e poros (textura de concreto CC0 + mapa de normais, em duas escalas)
 *   4. sujeira e umidade na base, aresta viva nos cantos que pega a luz rasante
 *   5. cura: o concreto sobe molhado (mais escuro e brilhante) e seca
 *
 * As paredes são caixas alinhadas aos eixos: a normal de mundo é a normal do modelo e as coordenadas
 * de mundo bastam para localizar o painel, a tábua e o furo.
 */

export interface ConcreteOptions {
  /** Prefixo de URL do site (BASE_URL) */
  base: string;
  /** Liga o mapa de normais e a segunda escala de textura (desligado no nível "low") */
  detail: boolean;
  anisotropy: number;
  /** Cor do fundo (o emissive parte dela) */
  bg: Color;
}

export interface Concrete {
  material: MeshStandardMaterial;
  /** 0 = concreto molhado, 1 = seco */
  setCure(v: number): void;
  dispose(): void;
}

const loadTexture = (url: string, srgb: boolean, aniso: number) =>
  new Promise<Texture | null>((resolve) => {
    new TextureLoader().load(
      url,
      (t) => {
        t.wrapS = t.wrapT = RepeatWrapping;
        t.anisotropy = aniso;
        if (srgb) t.colorSpace = SRGBColorSpace;
        resolve(t);
      },
      undefined,
      () => resolve(null),
    );
  });

const COMMON = /* glsl */ `
  uniform sampler2D uColorMap;
  uniform sampler2D uNormalMap;
  uniform float uCure;
  varying vec3 vWPos;
  varying vec3 vWNor;
  varying vec3 vLoc;
  varying vec3 vSc;

  // Resultados calculados no bloco de cor e usados nos blocos de rugosidade e normal
  vec3 cDelta;
  float cRough;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < FBM_OCT; i++) {
      s += a * vnoise(p);
      p = p * 2.03 + 17.1;
      a *= 0.5;
    }
    return s;
  }

  #ifdef CONCRETE_DETAIL
  vec3 tnorm(vec2 uv) {
    return texture2D(uNormalMap, uv).xyz * 2.0 - 1.0;
  }
  // Mapa de normais triplanar (whiteout blend), em espaço de mundo
  vec3 triNormal(vec3 n, vec3 w, vec3 p, float k, float s) {
    vec3 tx = tnorm(p.zy * k);
    vec3 ty = tnorm(p.xz * k);
    vec3 tz = tnorm(p.xy * k);
    tx.xy *= s; ty.xy *= s; tz.xy *= s;
    tx = vec3(tx.xy + n.zy, abs(tx.z) * n.x);
    ty = vec3(ty.xy + n.xz, abs(ty.z) * n.y);
    tz = vec3(tz.xy + n.xy, abs(tz.z) * n.z);
    return normalize(tx.zyx * w.x + ty.xzy * w.y + tz.xyz * w.z);
  }
  #endif
`;

const COLOR = /* glsl */ `
  #include <color_fragment>
  {
    vec3 nW = normalize(vWNor);
    vec3 tw = pow(abs(nW), vec3(8.0));
    tw /= (tw.x + tw.y + tw.z + 1e-4);
    float side = 1.0 - smoothstep(0.2, 0.7, tw.y);            // 1 nas faces verticais, 0 no topo

    // coordenadas da parede: u ao longo dela, v acima do plinto (0,22 m)
    float u = vWPos.x * tw.z + vWPos.z * tw.x;
    float v = max(vWPos.y - 0.22, 0.0);
    // cada parede tem o seu padrão: a semente vem da posição do plano em que ela está
    float seed = floor((vWPos.x * tw.x + vWPos.z * tw.z) * 2.0) + (tw.x > 0.5 ? 17.0 : 3.0);
    // o detalhe some quando fica menor que um pixel (evita cintilação em distância)
    float fp = length(fwidth(vWPos));
    float aaJ = 1.0 - smoothstep(0.0015, 0.006, fp);   // juntas e tábuas (finas)
    float aa = 1.0 - smoothstep(0.006, 0.03, fp);      // furos, aresta, riscos

    // 3. poros e microrelevo: duas escalas para quebrar a repetição
    float k = 1.0 / 2.6;
    float c1 = texture2D(uColorMap, vWPos.zy * k).r * tw.x + texture2D(uColorMap, vWPos.xz * k).r * tw.y + texture2D(uColorMap, vWPos.xy * k).r * tw.z;
    #ifdef CONCRETE_DETAIL
    float k2 = 1.0 / 0.83;
    float c2 = texture2D(uColorMap, vWPos.zy * k2 + 0.37).r * tw.x + texture2D(uColorMap, vWPos.xz * k2 + 0.37).r * tw.y + texture2D(uColorMap, vWPos.xy * k2 + 0.37).r * tw.z;
    float cN = mix(c1, c2, 0.4);
    #else
    float cN = c1;
    #endif
    float micro = clamp((cN - 0.72) * 2.6, -0.6, 0.6);

    // 1. manchas grandes e escorrimentos que descem do topo
    float dTop = (1.0 - vLoc.y) * vSc.y;
    float blot = fbm(vec2(u, v) * 0.42 + seed * 1.7);
    float streakN = vnoise(vec2(u * 6.5, v * 0.32)) * vnoise(vec2(u * 2.1 + 3.0, v * 0.11));
    float streak = smoothstep(0.32, 0.72, streakN) * (0.35 + 0.65 * exp(-dTop / 1.6)) * side;

    // 2. fôrma: painéis 2,4 x 1,2 m, tábuas de 15 cm, furos de tirante
    float modW = 2.4;
    float modH = 1.2;
    float sr = (fract(v / modH + 0.5) - 0.5) * modH;           // distância (com sinal) à junta horizontal
    float sc = (fract(u / modW + 0.5) - 0.5) * modW;           // ... à junta vertical
    float sg = 0.009;
    float jr = exp(-pow(sr / sg, 2.0)) * aaJ * side;
    float jc = exp(-pow(sc / sg, 2.0)) * aaJ * side;
    vec2 pid = vec2(floor(u / modW), floor(v / modH));
    float panel = hash21(pid + seed) - 0.5;
    float bd = 0.15;
    float bId = floor(v / bd);
    float board = hash21(vec2(bId, pid.x + seed)) - 0.5;
    float seam = exp(-pow((fract(v / bd + 0.5) - 0.5) * bd / 0.0028, 2.0)) * aaJ * side;
    float grain = vnoise(vec2(u * 0.9 + bId * 3.1, v * 60.0)) - 0.5;

    float m0 = mod(u, modW);
    float m1 = mod(v, modH);
    vec2 hp = vec2(m0 - (m0 < 1.2 ? 0.3 : 2.1), m1 - (m1 < 0.6 ? 0.3 : 0.9));
    float hr = 0.022;
    float hd = length(hp);
    float hole = smoothstep(hr, hr * 0.5, hd) * aa * side;
    float rim = exp(-pow((hd - hr * 1.25) / (hr * 0.4), 2.0)) * aa * side;

    // 4. base suja e úmida
    float baseG = (1.0 - smoothstep(0.0, 1.15, v)) * side;
    float baseN = 0.55 + 0.45 * fbm(vec2(u * 2.2, v * 3.0));

    float mod0 = 1.0;
    mod0 *= 0.84 + 0.32 * blot;                               // manchas grandes
    mod0 *= 1.0 + 0.14 * micro;                               // poros
    mod0 *= 1.0 + 0.13 * panel + 0.05 * board + 0.06 * grain * side;
    mod0 *= 1.0 - 0.42 * streak;                              // chuva
    mod0 *= 1.0 - 0.52 * baseG * baseN;                       // sujeira na base
    mod0 *= 1.0 - 0.72 * (jr + jc) - 0.30 * seam;             // sulcos e tábuas
    mod0 *= 1.0 - 0.9 * hole + 0.18 * rim;                    // furos

    // aresta viva: o canto que pega a luz rasante
    float dEdgeSide = mix((0.5 - abs(vLoc.x)) * vSc.x, (0.5 - abs(vLoc.z)) * vSc.z, tw.x);
    float dEdgeTop = min((0.5 - abs(vLoc.x)) * vSc.x, (0.5 - abs(vLoc.z)) * vSc.z);
    float dEdge = mix(dEdgeTop, min(dEdgeSide, dTop), side);
    float arris = exp(-pow(dEdge / 0.014, 2.0)) * aa;
    mod0 *= 1.0 + 0.4 * arris;

    // 5. cura: molhado é mais escuro
    mod0 *= mix(0.78, 1.0, uCure);

    diffuseColor.rgb *= mod0 * vec3(1.0, 0.995, 0.985);

    cRough = mix(0.5, 1.0, uCure) * (0.88 + 0.22 * clamp(cN, 0.0, 1.0)) * (1.0 + 0.25 * (jr + jc));

    // normal: sulcos e furos (perturbação analítica), no plano da parede
    float depthJ = 0.0042;
    float tilt_v = -depthJ * 2.0 * sr / (sg * sg) * exp(-pow(sr / sg, 2.0)) * aaJ * side;
    float tilt_u = -depthJ * 2.0 * sc / (sg * sg) * exp(-pow(sc / sg, 2.0)) * aaJ * side;
    float r2 = 0.03;
    float he = exp(-pow(hd / r2, 2.0));
    vec2 tilt_h = -0.008 * 2.0 / (r2 * r2) * he * hp * aa * side;
    float sb = (fract(v / bd + 0.5) - 0.5) * bd;
    float tilt_b = -0.0007 * 2.0 * sb / (0.0028 * 0.0028) * exp(-pow(sb / 0.0028, 2.0)) * aaJ * side;
    float tu = tilt_u + tilt_h.x;
    float tv = tilt_v + tilt_h.y + tilt_b;
    cDelta = vec3(tu * tw.z, tv * (tw.x + tw.z), tu * tw.x);
  }
`;

const NORMAL = /* glsl */ `
  #include <normal_fragment_maps>
  {
    vec3 nW0 = normalize(vWNor);
    vec3 tw0 = pow(abs(nW0), vec3(8.0));
    tw0 /= (tw0.x + tw0.y + tw0.z + 1e-4);
    #ifdef CONCRETE_DETAIL
    vec3 nMap = triNormal(nW0, tw0, vWPos, 1.0 / 2.6, 0.5);
    vec3 nFine = triNormal(nW0, tw0, vWPos, 1.0 / 0.83, 0.2);
    nW0 = normalize(nMap + (nFine - nW0));
    #endif
    vec3 nWorld = normalize(nW0 + cDelta);
    normal = normalize((viewMatrix * vec4(nWorld, 0.0)).xyz);
  }
`;

export async function createConcrete(opts: ConcreteOptions): Promise<Concrete> {
  const base = opts.base.replace(/\/$/, '');
  const [color, normal] = await Promise.all([
    loadTexture(`${base}/tex/concrete/color.jpg`, false, opts.anisotropy),
    opts.detail ? loadTexture(`${base}/tex/concrete/normal.jpg`, false, opts.anisotropy) : Promise.resolve(null),
  ]);
  const detail = opts.detail && !!normal;

  const material = new MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0,
    emissive: opts.bg.clone(),
  });
  // menos oitavas de ruído fora do nível alto (aparelhos mais fracos)
  material.defines = { FBM_OCT: opts.anisotropy >= 8 ? 4 : 3, ...(detail ? { CONCRETE_DETAIL: '' } : {}) };

  const uniforms = {
    uColorMap: { value: color ?? new Texture() },
    uNormalMap: { value: normal ?? new Texture() },
    uCure: { value: 0 },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vWPos;
         varying vec3 vWNor;
         varying vec3 vLoc;
         varying vec3 vSc;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
         vWPos = wp.xyz;
         vWNor = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
         vLoc = position;
         vSc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${COMMON}`)
      .replace('#include <color_fragment>', COLOR)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n roughnessFactor = clamp(roughnessFactor * cRough, 0.05, 1.0);`)
      .replace('#include <normal_fragment_maps>', NORMAL);
  };

  return {
    material,
    setCure(v) {
      uniforms.uCure.value = v;
    },
    dispose() {
      color?.dispose();
      normal?.dispose();
      material.dispose();
    },
  };
}
