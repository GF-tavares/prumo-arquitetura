/**
 * A planta da Casa Horizonte, em metros.
 *
 * É a única fonte do desenho: a abertura em WebGL (paredes que ganham altura) e o
 * desenho em SVG da transição planta → fotografia leem os mesmos dados.
 *
 * Sistema de coordenadas: x cresce para leste, z cresce para o sul. No desenho em
 * planta, o norte fica para cima. O eixo de enfilade (portas alinhadas, percorrido
 * pela câmera na abertura) é z = 0.
 */

export type Pt = [number, number];

export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export type PieceKind = 'ext' | 'int' | 'lintel' | 'sill' | 'glass' | 'mono';

/** Um bloco sólido de parede: retângulo em planta + faixa de altura. */
export interface Piece extends Rect {
  id: string;
  y0: number;
  y1: number;
  kind: PieceKind;
}

export type LineKind =
  | 'wall'
  | 'door'
  | 'glass'
  | 'furn'
  | 'tree'
  | 'water'
  | 'axis'
  | 'dim'
  | 'cut'
  | 'mark'
  | 'plinth';

export interface PlanLine {
  pts: Pt[];
  closed?: boolean;
  kind: LineKind;
  /** Comprimento (m) do traço na linha tracejada; 0 ou ausente = contínua */
  dash?: number;
}

export type LabelKind = 'axis' | 'dim' | 'level' | 'section' | 'angle' | 'note';

export interface PlanLabel {
  id: string;
  text: string;
  sub?: string;
  x: number;
  z: number;
  kind: LabelKind;
  /** Círculo de eixo em volta do texto (raio em m) */
  bubble?: number;
  /** Alinhamento do texto em relação ao ponto */
  align?: 'center' | 'left' | 'right';
}

export interface Plan {
  pieces: Piece[];
  lines: PlanLine[];
  labels: PlanLabel[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Sala de estar: a janela que vira a fotografia na transição */
  living: Rect;
  /** Altura do olho e eixo da câmera de percurso */
  eye: number;
  wallH: number;
}

export interface PlanOptions {
  /** Largura (m) da abertura na parede leste: igual à largura da foto que a preenche */
  eastOpening?: number;
}

const TE = 0.4; // parede externa
const TI = 0.2; // parede interna
export const H_EXT = 3.6;
export const H_INT = 3.2;

// Faces internas e eixos estruturais
export const X_W = -16.8;
export const X_E = 16.8;
export const Z_N = -7.3;
export const Z_S = 7.3;
export const AXES_X = [-17, -12, -6.5, 0.4, 6.4, 10.6, 17] as const;
export const AXES_Z = [-7.5, -1.2, 1.2, 7.5] as const;

interface Opening {
  c: number;
  w: number;
  y0?: number;
  y1: number;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

function splitWall(
  id: string,
  dir: 'x' | 'z',
  fixed: number,
  a: number,
  b: number,
  t: number,
  h: number,
  kind: PieceKind,
  openings: Opening[] = [],
): Piece[] {
  const out: Piece[] = [];
  const rect = (s0: number, s1: number): Rect =>
    dir === 'x'
      ? { x0: s0, x1: s1, z0: fixed - t / 2, z1: fixed + t / 2 }
      : { x0: fixed - t / 2, x1: fixed + t / 2, z0: s0, z1: s1 };
  const ops = [...openings].sort((p, q) => p.c - q.c);
  let cursor = a;
  let n = 0;
  for (const o of ops) {
    const o0 = o.c - o.w / 2;
    const o1 = o.c + o.w / 2;
    if (o0 > cursor + 1e-4) out.push({ id: `${id}.${n++}`, ...rect(cursor, o0), y0: 0, y1: h, kind });
    if ((o.y0 ?? 0) > 1e-4) out.push({ id: `${id}.${n++}`, ...rect(o0, o1), y0: 0, y1: o.y0!, kind: 'sill' });
    if (o.y1 < h - 1e-4) out.push({ id: `${id}.${n++}`, ...rect(o0, o1), y0: o.y1, y1: h, kind: 'lintel' });
    cursor = o1;
  }
  if (b > cursor + 1e-4) out.push({ id: `${id}.${n++}`, ...rect(cursor, b), y0: 0, y1: h, kind });
  return out;
}

const rectPoly = (x0: number, z0: number, x1: number, z1: number): Pt[] => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];

function circlePoly(cx: number, cz: number, r: number, n = 40): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([r3(cx + Math.cos(a) * r), r3(cz + Math.sin(a) * r)]);
  }
  return pts;
}

/** Arco de a0 a a1 (graus; 0 = leste, 90 = sul). */
function arcPts(cx: number, cz: number, r: number, a0: number, a1: number, n = 20): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([r3(cx + Math.cos(a) * r), r3(cz + Math.sin(a) * r)]);
  }
  return pts;
}

/** União dos retângulos (só o contorno externo): elimina bordas coincidentes entre blocos vizinhos. */
export function outlineOf(rects: Rect[]): [Pt, Pt][] {
  const key = (v: number) => Math.round(v * 1000);
  const hMap = new Map<number, [number, number][]>();
  const vMap = new Map<number, [number, number][]>();
  const push = (m: Map<number, [number, number][]>, k: number, iv: [number, number]) => {
    const arr = m.get(k);
    if (arr) arr.push(iv);
    else m.set(k, [iv]);
  };
  for (const r of rects) {
    push(hMap, key(r.z0), [r.x0, r.x1]);
    push(hMap, key(r.z1), [r.x0, r.x1]);
    push(vMap, key(r.x0), [r.z0, r.z1]);
    push(vMap, key(r.x1), [r.z0, r.z1]);
  }
  const segs: [Pt, Pt][] = [];
  const xor = (m: Map<number, [number, number][]>, horizontal: boolean) => {
    for (const [k, ivs] of m) {
      const c = k / 1000;
      const cuts = [...new Set(ivs.flatMap(([a, b]) => [key(a), key(b)]))].sort((p, q) => p - q);
      let start: number | null = null;
      for (let i = 0; i < cuts.length - 1; i++) {
        const lo = cuts[i] / 1000;
        const hi = cuts[i + 1] / 1000;
        const mid = (lo + hi) / 2;
        const cover = ivs.reduce((n, [a, b]) => n + (mid > a && mid < b ? 1 : 0), 0);
        const odd = cover % 2 === 1;
        if (odd && start === null) start = lo;
        if (!odd && start !== null) {
          segs.push(horizontal ? [[start, c], [lo, c]] : [[c, start], [c, lo]]);
          start = null;
        }
        if (odd && i === cuts.length - 2 && start !== null) {
          segs.push(horizontal ? [[start, c], [hi, c]] : [[c, start], [c, hi]]);
        }
      }
    }
  };
  xor(hMap, true);
  xor(vMap, false);
  return segs;
}

export function buildPlan(opts: PlanOptions = {}): Plan {
  const east = opts.eastOpening ?? 6.0;
  const pieces: Piece[] = [];
  const lines: PlanLine[] = [];
  const labels: PlanLabel[] = [];

  // ---------- Paredes externas ----------
  pieces.push(
    ...splitWall('W', 'z', -17, -7.7, 7.7, TE, H_EXT, 'ext', [{ c: 0, w: 1.4, y1: 2.5 }]),
    ...splitWall('E', 'z', 17, -7.7, 7.7, TE, H_EXT, 'ext', [{ c: 0, w: east, y1: 3.2 }]),
    ...splitWall('N', 'x', -7.5, X_W, X_E, TE, H_EXT, 'ext', [{ c: -3.5, w: 4.0, y0: 1.0, y1: 2.4 }]),
    ...splitWall('S', 'x', 7.5, X_W, X_E, TE, H_EXT, 'ext', [{ c: 0, w: 12.0, y0: 0, y1: 3.1 }]),
  );

  // ---------- Paredes internas (todas com uma porta no eixo z = 0) ----------
  pieces.push(
    ...splitWall('T1', 'z', -12, Z_N, Z_S, TI, H_INT, 'int', [{ c: 0, w: 1.0, y1: 2.4 }]),
    ...splitWall('T2', 'z', -6.5, Z_N, Z_S, TI, H_INT, 'int', [{ c: 0, w: 2.0, y1: 2.7 }]),
    ...splitWall('T3', 'z', 10.6, Z_N, Z_S, TI, H_INT, 'int', [{ c: 0, w: 3.0, y1: 2.9 }]),
    ...splitWall('GN', 'x', -1.2, -11.9, -6.6, TI, H_INT, 'int', [{ c: -10.4, w: 1.0, y1: 2.4 }]),
    ...splitWall('GS', 'x', 1.2, -11.9, -6.6, TI, H_INT, 'int', [{ c: -8.2, w: 1.0, y1: 2.4 }]),
  );

  // Vidros do pátio (com um vão aberto no eixo)
  pieces.push(
    ...splitWall('P1', 'z', 0.4, Z_N, Z_S, 0.05, 3.1, 'glass', [{ c: 0, w: 2.2, y1: 3.1 }]),
    ...splitWall('P2', 'z', 6.4, Z_N, Z_S, 0.05, 3.1, 'glass', [{ c: 0, w: 2.2, y1: 3.1 }]),
  );

  // Volumes livres: lareira em bloco e um painel esbelto na sala; banco no salão leste
  pieces.push(
    { id: 'hearth', x0: -4.9, x1: -2.1, z0: -3.7, z1: -2.7, y0: 0, y1: 1.15, kind: 'mono' },
    { id: 'screen', x0: -3.25, x1: -3.05, z0: 2.6, z1: 5.8, y0: 0, y1: 2.6, kind: 'mono' },
    { id: 'bench', x0: 12.8, x1: 16.4, z0: -6.95, z1: -6.45, y0: 0, y1: 0.45, kind: 'mono' },
  );

  // ---------- Desenho: contorno dos blocos (união) ----------
  const solid = pieces.filter((p) => p.y0 === 0 && p.kind !== 'glass');
  for (const [a, b] of outlineOf(solid)) lines.push({ pts: [a, b], kind: 'wall' });

  // Plinto (linha de nível do embasamento)
  lines.push({ pts: rectPoly(-19, -9.4, 19, 9.4), closed: true, kind: 'plinth' });

  // ---------- Vidros e janelas (símbolo: linhas finas no miolo da parede) ----------
  const glazing = (x0: number, z0: number, x1: number, z1: number) => {
    const horiz = z0 === z1;
    const o = 0.1;
    if (horiz) {
      lines.push({ pts: [[x0, z0 - o], [x1, z1 - o]], kind: 'glass' }, { pts: [[x0, z0], [x1, z1]], kind: 'glass' }, { pts: [[x0, z0 + o], [x1, z1 + o]], kind: 'glass' });
    } else {
      lines.push({ pts: [[x0 - o, z0], [x1 - o, z1]], kind: 'glass' }, { pts: [[x0, z0], [x1, z1]], kind: 'glass' }, { pts: [[x0 + o, z0], [x1 + o, z1]], kind: 'glass' });
    }
  };
  glazing(-6, 7.5, 6, 7.5); // fachada sul
  glazing(-5.5, -7.5, -1.5, -7.5); // janela em faixa da sala (norte)
  lines.push({ pts: [[0.4, Z_N], [0.4, -1.1]], kind: 'glass' }, { pts: [[0.4, 1.1], [0.4, Z_S]], kind: 'glass' });
  lines.push({ pts: [[6.4, Z_N], [6.4, -1.1]], kind: 'glass' }, { pts: [[6.4, 1.1], [6.4, Z_S]], kind: 'glass' });
  glazing(17, -east / 2, 17, east / 2); // janela-foto na parede leste

  // ---------- Portas: folha + arco de giro ----------
  const door = (hx: number, hz: number, r: number, a0: number, a1: number) => {
    const arc = arcPts(hx, hz, r, a0, a1);
    lines.push({ pts: arc, kind: 'door' });
    lines.push({ pts: [[hx, hz], arc[0]], kind: 'door' });
  };
  door(-12, -0.5, 1.0, 90, 180); // T1 abre para o hall de entrada
  door(-16.8, 0.7, 1.4, 270, 360); // porta de entrada, abre para dentro
  door(-10.9, -1.2, 1.0, 0, 90); // quarto norte
  door(-8.7, 1.2, 1.0, 180, 270); // quarto sul

  // ---------- Mobiliário e paisagem (só em planta) ----------
  // Camas nos quartos
  lines.push({ pts: rectPoly(-11.2, -6.6, -9.0, -4.6), closed: true, kind: 'furn' });
  lines.push({ pts: [[-11.2, -6.0], [-9.0, -6.0]], kind: 'furn' });
  lines.push({ pts: rectPoly(-9.0, 4.6, -6.9, 6.6), closed: true, kind: 'furn' });
  lines.push({ pts: [[-9.0, 6.0], [-6.9, 6.0]], kind: 'furn' });
  // Sofá em L e mesa de centro
  lines.push({ pts: [[-5.7, 3.0], [-5.7, 6.6], [-3.6, 6.6], [-3.6, 5.7], [-4.8, 5.7], [-4.8, 3.0]], closed: true, kind: 'furn' });
  lines.push({ pts: circlePoly(-2.1, 4.6, 0.55, 20), closed: true, kind: 'furn' });
  lines.push({ pts: rectPoly(-5.9, 2.7, -1.2, 6.9), closed: true, kind: 'furn', dash: 0.3 }); // tapete
  // Mesa de jantar com cadeiras
  lines.push({ pts: rectPoly(7.3, -4.1, 9.7, -3.0), closed: true, kind: 'furn' });
  for (const x of [7.6, 8.5, 9.4]) {
    lines.push({ pts: rectPoly(x - 0.2, -4.6, x + 0.2, -4.2), closed: true, kind: 'furn' });
    lines.push({ pts: rectPoly(x - 0.2, -2.9, x + 0.2, -2.5), closed: true, kind: 'furn' });
  }
  // Pátio: árvore, canteiro e pedras de passo no eixo
  lines.push({ pts: circlePoly(3.4, -3.4, 2.0, 48), closed: true, kind: 'tree' });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    lines.push({ pts: [[r3(3.4 + Math.cos(a) * 0.35), r3(-3.4 + Math.sin(a) * 0.35)], [r3(3.4 + Math.cos(a) * 2.0), r3(-3.4 + Math.sin(a) * 2.0)]], kind: 'tree' });
  }
  lines.push({ pts: rectPoly(1.0, 3.3, 5.8, 6.7), closed: true, kind: 'furn' });
  for (let i = 0; i < 4; i++) lines.push({ pts: rectPoly(1.0 + i * 1.3, -0.35, 1.9 + i * 1.3, 0.35), closed: true, kind: 'furn' });
  // Salão leste: tapete e coluna de luz
  lines.push({ pts: rectPoly(12.2, -3.2, 16.0, 3.2), closed: true, kind: 'furn', dash: 0.3 });
  // Piscina e deck
  lines.push({ pts: rectPoly(-8, 10.1, 8, 12.9), closed: true, kind: 'water' });
  lines.push({ pts: rectPoly(-9.4, 9.8, 9.4, 14.2), closed: true, kind: 'furn', dash: 0.35 });
  for (let i = 1; i < 6; i++) lines.push({ pts: [[-8 + i * (16 / 6), 10.1], [-8 + i * (16 / 6), 12.9]], kind: 'water' });
  // Árvores do entorno
  for (const [x, z, r] of [
    [-22.4, 3.4, 2.0],
    [-24.2, -3.6, 1.6],
    [22.8, 2.6, 2.2],
    [24.6, -4.4, 1.7],
    [-14.6, 13.4, 2.0],
    [14.0, 13.2, 1.8],
    [19.2, 12.0, 1.4],
  ] as const) {
    lines.push({ pts: circlePoly(x, z, r, 32), closed: true, kind: 'tree' });
    lines.push({ pts: [[x - r * 0.35, z], [x + r * 0.35, z]], kind: 'tree' }, { pts: [[x, z - r * 0.35], [x, z + r * 0.35]], kind: 'tree' });
  }

  // ---------- Eixos estruturais (traço e ponto) com bolhas ----------
  const bubbleR = 0.62;
  AXES_X.forEach((x, i) => {
    lines.push({ pts: [[x, -10.9 + bubbleR], [x, 9.6]], kind: 'axis', dash: 0.9 });
    lines.push({ pts: circlePoly(x, -10.9, bubbleR, 24), closed: true, kind: 'mark' });
    labels.push({ id: `ax-${i + 1}`, text: String(i + 1), x, z: -10.9, kind: 'axis', bubble: bubbleR });
  });
  AXES_Z.forEach((z, i) => {
    lines.push({ pts: [[-20.4 + bubbleR, z], [19, z]], kind: 'axis', dash: 0.9 });
    lines.push({ pts: circlePoly(-20.4, z, bubbleR, 24), closed: true, kind: 'mark' });
    labels.push({ id: `az-${'ABCD'[i]}`, text: 'ABCD'[i], x: -20.4, z, kind: 'axis', bubble: bubbleR });
  });

  // ---------- Cotas (linhas de cota com traços a 45°) ----------
  const dimH = (x0: number, x1: number, z: number, ext0: number, ext1: number, text: string, id: string) => {
    lines.push({ pts: [[x0, z], [x1, z]], kind: 'dim' });
    for (const x of [x0, x1]) lines.push({ pts: [[x - 0.28, z + 0.28], [x + 0.28, z - 0.28]], kind: 'dim' });
    lines.push({ pts: [[x0, ext0], [x0, z - 0.4]], kind: 'dim' }, { pts: [[x1, ext1], [x1, z - 0.4]], kind: 'dim' });
    labels.push({ id, text, x: (x0 + x1) / 2, z: z - 0.5, kind: 'dim' });
  };
  // Cadeia de cotas ao norte
  const chain: [number, number][] = [
    [-17, -12],
    [-12, -6.5],
    [-6.5, 0.4],
    [0.4, 6.4],
    [6.4, 10.6],
    [10.6, 17],
  ];
  chain.forEach(([a, b], i) => dimH(a, b, -9.1, -7.7, -7.7, (b - a).toFixed(2), `dc-${i}`));
  // Cota parcial: 12,4 m entre o hall de entrada e o pátio
  dimH(-12, 0.4, -12.8, -11.6, -11.6, '12.4 m', 'dim-124');
  // Cota geral ao sul da piscina
  dimH(-17, 17, 15.3, 7.7, 7.7, '34.00', 'dim-total');

  // ---------- Corte A (linha de corte vermelha) ----------
  lines.push({ pts: [[-3.25, -13.6], [-3.25, 15.6]], kind: 'cut', dash: 0.7 });
  for (const z of [-13.6, 15.6]) {
    lines.push({ pts: circlePoly(-3.25, z, 0.62, 24), closed: true, kind: 'cut' });
  }
  // Setas de direção do corte (apontam para leste)
  lines.push({ pts: [[-3.25, -13.6], [-1.6, -13.6]], kind: 'cut' }, { pts: [[-2.0, -13.95], [-1.6, -13.6], [-2.0, -13.25]], kind: 'cut' });
  lines.push({ pts: [[-3.25, 15.6], [-1.6, 15.6]], kind: 'cut' }, { pts: [[-2.0, 15.25], [-1.6, 15.6], [-2.0, 15.95]], kind: 'cut' });
  labels.push({ id: 'cut-a-top', text: 'A', x: -3.25, z: -13.6, kind: 'axis', bubble: 0.62 });
  labels.push({ id: 'cut-a-bot', text: 'A', x: -3.25, z: 15.6, kind: 'axis', bubble: 0.62 });
  labels.push({ id: 'cut-note', text: 'A / 04', sub: 'CORTE', x: -1.2, z: -14.6, kind: 'section', align: 'left' });

  // ---------- Marcas de nível ----------
  const levelMark = (id: string, x: number, z: number, text: string) => {
    lines.push({ pts: [[x - 0.35, z], [x + 0.35, z], [x, z + 0.55]], closed: true, kind: 'mark' });
    lines.push({ pts: [[x + 0.35, z], [x + 1.6, z]], kind: 'mark' });
    labels.push({ id, text, x: x + 1.75, z, kind: 'level', align: 'left' });
  };
  levelMark('lv-3250', -15.5, -6.2, '+3.250');
  levelMark('lv-1800', 8.2, 6.6, '+1.800');

  // ---------- Ângulo de 90° no canto de entrada ----------
  lines.push({ pts: arcPts(-16.8, -7.3, 1.15, 0, 90, 16), kind: 'mark' });
  labels.push({ id: 'angle', text: '90°', x: -15.35, z: -5.85, kind: 'angle', align: 'left' });

  // ---------- Norte e escala ----------
  lines.push({ pts: circlePoly(-20.6, 12.4, 1.2, 32), closed: true, kind: 'mark' });
  lines.push({ pts: [[-20.6, 13.6], [-20.6, 11.0]], kind: 'mark' }, { pts: [[-21.0, 11.7], [-20.6, 11.0], [-20.2, 11.7]], kind: 'mark' });
  labels.push({ id: 'north', text: 'N', x: -20.6, z: 10.4, kind: 'note' });
  // Barra de escala 0 · 1 · 2 · 5 m
  const sx = 13;
  const sz = 17.4;
  lines.push({ pts: [[sx, sz], [sx + 5, sz]], kind: 'mark' });
  for (const d of [0, 1, 2, 5]) lines.push({ pts: [[sx + d, sz - 0.28], [sx + d, sz + 0.28]], kind: 'mark' });
  for (let i = 0; i < 2; i++) lines.push({ pts: rectPoly(sx + i, sz - 0.12, sx + i + 1, sz + 0.12), closed: true, kind: 'mark' });

  // Sala de estar: o recorte que vira fotografia
  const living: Rect = { x0: -6.4, x1: 0.3, z0: Z_N, z1: Z_S };

  return {
    pieces,
    lines,
    labels,
    bounds: { minX: -26, maxX: 26, minZ: -15.5, maxZ: 18.2 },
    living,
    eye: 1.55,
    wallH: H_EXT,
  };
}
