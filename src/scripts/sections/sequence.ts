import { buildPlan, type LineKind, type Plan, type PlanLabel, type Pt } from '@/lib/plan';
import type { Capabilities } from '../core/capabilities';
import { gsap, ScrollTrigger } from '../core/motion';
import { qs } from '../lib/dom';
import {
  clamp01,
  damp,
  easeInOutCubic,
  easeInOutQuart,
  easeOutCubic,
  hash01,
  lerp,
  remap01,
  smoothstep,
} from '../lib/math';

/** Linha de corte A: o eixo da transição. É também o prumo que desce do manifesto. */
const CUT_X = -3.25;

/** alpha, atraso (fração do percurso) e duração de cada tipo de linha */
const KIND: Record<LineKind, { a: number; off: number; dur: number }> = {
  plinth: { a: 0.32, off: 0.0, dur: 0.1 },
  wall: { a: 0.95, off: 0.0, dur: 0.11 },
  axis: { a: 0.3, off: 0.03, dur: 0.12 },
  glass: { a: 0.5, off: 0.06, dur: 0.07 },
  door: { a: 0.6, off: 0.08, dur: 0.07 },
  mark: { a: 0.75, off: 0.1, dur: 0.08 },
  furn: { a: 0.4, off: 0.11, dur: 0.09 },
  water: { a: 0.4, off: 0.13, dur: 0.09 },
  dim: { a: 0.62, off: 0.15, dur: 0.09 },
  tree: { a: 0.3, off: 0.17, dur: 0.09 },
  cut: { a: 1, off: 0.1, dur: 0.08 },
};

interface Item {
  pts: Pt[];
  kind: LineKind;
  dash: number;
  len: number;
  start: number;
  dur: number;
}

interface LabelItem {
  el: HTMLElement;
  label: PlanLabel;
  start: number;
}

const BONE: [number, number, number] = [236, 232, 223];
const CUT: [number, number, number] = [227, 68, 29];

/**
 * A sequência técnica da página: um fio vertical (o prumo) ganha cotas, revela a planta da
 * Casa Horizonte, a planta se aproxima da sala e a sala vira a fotografia do projeto.
 * O desenho é feito em canvas 2D com os mesmos dados da abertura; a foto é HTML recortado por clip-path.
 */
export function initSequence(caps: Capabilities) {
  const root = qs('[data-seq]');
  if (!root) return;
  if (caps.reducedMotion) {
    root.classList.add('seq--static');
    return;
  }

  const stage = qs('[data-seq-stage]', root)!;
  const canvas = qs<HTMLCanvasElement>('[data-seq-canvas]', root)!;
  const photo = qs('[data-seq-photo]', root)!;
  const img = qs('[data-seq-img]', root)!;
  const labelsRoot = qs('[data-seq-labels]', root)!;
  const phaseA = qs('[data-seq-phase-a]', root)!;
  const phaseB = qs('[data-seq-phase-b]', root)!;
  const kicker = qs('[data-seq-kicker]', root)!;
  const titleLine = qs('[data-seq-line]', root)!;
  const fades = [...root.querySelectorAll<HTMLElement>('[data-seq-line-fade]')];
  const cta = qs('[data-seq-cta]', root);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    root.classList.add('seq--static');
    return;
  }

  const plan: Plan = buildPlan({ eastOpening: 6 });
  const room = plan.living;

  // ---------- Itens de desenho ----------
  const items: Item[] = [];
  for (const line of plan.lines) {
    if (line.kind === 'cut' && line.dash) continue; // o corte é o fio central, desenhado à parte
    const pts: Pt[] = line.closed ? [...line.pts, line.pts[0]] : line.pts;
    let len = 0;
    for (let i = 0; i < pts.length - 1; i++) len += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (len < 1e-6) continue;
    const dist = Math.min(...pts.map(([x]) => Math.abs(x - CUT_X)));
    const k = KIND[line.kind];
    items.push({
      pts,
      kind: line.kind,
      dash: line.dash ?? 0,
      len,
      start: 0.1 + k.off + Math.min(1, dist / 24) * 0.3 + hash01(String(pts[0])) * 0.015,
      dur: k.dur,
    });
  }
  const solids = plan.pieces.filter((p) => p.y0 === 0 && p.kind !== 'glass' && p.kind !== 'lintel');

  // ---------- Rótulos (HTML, tamanho constante) ----------
  const labelItems: LabelItem[] = plan.labels.map((label) => {
    const el = document.createElement('div');
    const align = label.kind === 'dim' ? 'up' : label.align === 'left' ? 'left' : 'center';
    el.className = `sl sl--${align}${label.kind === 'section' ? ' sl--cut' : ''}`;
    el.textContent = label.text + (label.sub ? ` ${label.sub}` : '');
    labelsRoot.appendChild(el);
    const dist = Math.abs(label.x - CUT_X);
    return { el, label, start: 0.2 + Math.min(1, dist / 24) * 0.3 + (label.kind === 'dim' ? 0.1 : 0.05) };
  });
  // marcas de cota ao longo do fio central (a cada 5 m)
  const rulerLabels: { el: HTMLElement; z: number }[] = [];
  for (let z = -10; z <= 10; z += 5) {
    if (z === 0) continue;
    const el = document.createElement('div');
    el.className = 'sl sl--left';
    el.textContent = `${z > 0 ? '+' : '-'}${Math.abs(z).toFixed(2).padStart(5, '0')}`;
    labelsRoot.appendChild(el);
    rulerLabels.push({ el, z });
  }

  // ---------- Geometria da tela ----------
  let vw = 0;
  let vh = 0;
  let dpr = 1;
  let s0 = 20;
  let s1 = 100;
  const measure = () => {
    vw = stage.clientWidth;
    vh = stage.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    const portrait = vw / vh < 0.9;
    s0 = portrait ? (vw * 0.96) / 40 : Math.min((vw * 0.74) / 38, (vh * 0.8) / 32);
    s1 = Math.max(vh / 7.2, 64);
  };
  measure();

  const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

  const strokePartial = (pts: Pt[], len: number, upto: number) => {
    let left = len * upto;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < pts.length - 1 && left > 0; i++) {
      const [x0, z0] = pts[i];
      const [x1, z1] = pts[i + 1];
      const l = Math.hypot(x1 - x0, z1 - z0);
      if (l <= left) {
        ctx.lineTo(x1, z1);
        left -= l;
      } else {
        const t = left / l;
        ctx.lineTo(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t);
        left = 0;
      }
    }
    ctx.stroke();
  };

  // ---------- Quadro ----------
  const state = { target: 0, cur: 0, active: false };
  let lastPhase = '';
  let infoOn = false;

  const draw = (p: number) => {
    const zoomK = easeInOutCubic(remap01(0.5, 0.82, p));
    const s = s0 * Math.pow(s1 / s0, zoomK);
    const cx = vw / 2;
    const cy = vh / 2;
    const px = (x: number) => cx + (x - CUT_X) * s;
    const py = (z: number) => cy + z * s;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fade = 1 - smoothstep(0.7, 0.86, p);

    // -- fio central: o prumo que chega do manifesto; vira a linha de corte
    const cutK = smoothstep(0.1, 0.2, p);
    const col: [number, number, number] = [
      lerp(BONE[0], CUT[0], cutK),
      lerp(BONE[1], CUT[1], cutK),
      lerp(BONE[2], CUT[2], cutK),
    ];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(col, lerp(0.85, 0.95, cutK) * lerp(1, fade, smoothstep(0.7, 0.84, p)));
    ctx.beginPath();
    ctx.moveTo(cx + 0.5, 0);
    ctx.lineTo(cx + 0.5, vh);
    ctx.stroke();

    // -- cotas ao longo do fio (crescem para fora a partir do centro)
    const ext = lerp(0, 60, easeOutCubic(remap01(0.02, 0.2, p)));
    ctx.strokeStyle = rgba(BONE, 0.5 * fade);
    ctx.beginPath();
    const mFrom = Math.floor((-cy / s) - 1);
    const mTo = Math.ceil(cy / s + 1);
    const stepM = s < 14 ? 5 : s < 40 ? 1 : 0.5;
    for (let z = Math.ceil(mFrom / stepM) * stepM; z <= mTo; z += stepM) {
      if (Math.abs(z) > ext) continue;
      const major = Math.abs(z % 5) < 1e-6;
      const y = Math.round(py(z)) + 0.5;
      const w = major ? 11 : 5;
      ctx.moveTo(cx - w, y);
      ctx.lineTo(cx, y);
    }
    ctx.stroke();

    // -- a planta
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (cx - CUT_X * s), dpr * cy);
    const lw = (dpr >= 2 ? 0.8 : 1) / s;

    const fillA = smoothstep(0.3, 0.5, p) * 0.075 * fade;
    if (fillA > 0.002) {
      ctx.fillStyle = rgba(BONE, fillA);
      for (const b of solids) ctx.fillRect(b.x0, b.z0, b.x1 - b.x0, b.z1 - b.z0);
    }

    for (const it of items) {
      const t = clamp01((p - it.start) / it.dur);
      if (t <= 0) continue;
      const k = KIND[it.kind];
      const isCut = it.kind === 'cut';
      ctx.lineWidth = lw * (it.kind === 'wall' ? 1.15 : 1);
      ctx.strokeStyle = rgba(isCut ? CUT : BONE, k.a * fade);
      ctx.setLineDash(it.dash ? [it.dash, it.dash * 0.7] : []);
      strokePartial(it.pts, it.len, easeOutCubic(t));
    }
    ctx.setLineDash([]);

    // retângulo da janela fotográfica (calculado cedo para esconder rótulos que caem dentro dela)
    const wrx0 = px(room.x0);
    const wrx1 = px(room.x1);
    const wry0 = py(room.z0);
    const wry1 = py(room.z1);
    const wUnroll = easeInOutCubic(remap01(0.42, 0.56, p));
    const wMid = (wry0 + wry1) / 2;
    const wHalf = ((wry1 - wry0) / 2) * wUnroll;
    const wWk = easeInOutQuart(remap01(0.6, 0.85, p));
    const winTop = lerp(wMid - wHalf, 0, wWk);
    const winBottom = lerp(wMid + wHalf, vh, wWk);
    const winLeft = lerp(wrx0, 0, wWk);
    const winRight = lerp(wrx1, vw, wWk);
    const inWindow = (x: number, y: number) => p >= 0.42 && x > winLeft - 4 && x < winRight + 4 && y > winTop - 4 && y < winBottom + 4;

    // -- rótulos
    for (const l of labelItems) {
      const a = smoothstep(l.start, l.start + 0.06, p) * fade;
      if (a < 0.01) {
        if (l.el.style.opacity !== '0') l.el.style.opacity = '0';
        continue;
      }
      const x = px(l.label.x);
      const y = py(l.label.z);
      if (x < -60 || x > vw + 60 || y < -30 || y > vh + 30 || inWindow(x, y)) {
        l.el.style.opacity = '0';
        continue;
      }
      l.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      l.el.style.opacity = a.toFixed(2);
    }
    for (const r of rulerLabels) {
      const y = py(r.z);
      const a = smoothstep(0.06, 0.16, p) * fade * (Math.abs(r.z) < ext ? 1 : 0);
      if (a < 0.01 || y < 30 || y > vh - 30 || inWindow(cx + 16, y)) {
        r.el.style.opacity = '0';
        continue;
      }
      r.el.style.transform = `translate3d(${(cx + 16).toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      r.el.style.opacity = (a * 0.7).toFixed(2);
    }

    // -- a sala vira fotografia: a janela nasce no cômodo e cresce até cobrir a tela
    const top = winTop;
    const bottom = winBottom;
    const left = winLeft;
    const right = winRight;
    if (p < 0.42) {
      photo.style.visibility = 'hidden';
    } else {
      photo.style.visibility = 'visible';
      photo.style.clipPath = `inset(${Math.max(0, top).toFixed(1)}px ${Math.max(0, vw - right).toFixed(1)}px ${Math.max(0, vh - bottom).toFixed(1)}px ${Math.max(0, left).toFixed(1)}px)`;
    }
    // a foto começa levemente ampliada, assenta na tela cheia e depois "entra" no ambiente
    const settle = lerp(1.22, 1, easeOutCubic(remap01(0.5, 0.85, p)));
    const enter = lerp(1, 1.24, easeInOutCubic(remap01(0.84, 0.985, p)));
    (img as HTMLElement).style.transform = `scale(${(settle * enter).toFixed(4)})`;

    // -- legendas de fase e capítulo
    phaseA.style.opacity = String(1 - smoothstep(0.56, 0.62, p));
    phaseB.style.opacity = String(smoothstep(0.72, 0.8, p));
    const phase = p < 0.66 ? 'Planta' : 'Fotografia';
    if (phase !== lastPhase) {
      root.dataset.chapter = phase;
      lastPhase = phase;
    }

    // -- informações finais do projeto
    const ease = (a: number, b: number) => easeOutCubic(remap01(a, b, p));
    const tk = ease(0.9, 0.975);
    gsap.set(titleLine, { opacity: tk > 0.001 ? 1 : 0, yPercent: (1 - tk) * 140 });
    gsap.set(kicker, { opacity: ease(0.88, 0.94) });
    fades.forEach((el, i) => gsap.set(el, { opacity: ease(0.93 + i * 0.01, 0.985 + i * 0.005), y: (1 - ease(0.93 + i * 0.01, 0.985 + i * 0.005)) * 14 }));
    const on = p > 0.94;
    if (on !== infoOn) {
      infoOn = on;
      if (cta) cta.toggleAttribute('inert', !on);
    }
  };

  // ---------- Rolagem ----------
  ScrollTrigger.create({
    trigger: root,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      state.target = self.progress;
    },
    onToggle: (self) => {
      state.active = self.isActive;
      if (self.isActive) return;
      // fora da tela, congela no estado do lado por onde saiu
      state.cur = state.target;
      draw(state.cur);
    },
  });

  gsap.ticker.add((_t, dtMs) => {
    if (!state.active) return;
    const dt = Math.min(0.05, dtMs / 1000);
    state.cur = damp(state.cur, state.target, 9, dt);
    if (Math.abs(state.cur - state.target) < 0.00005) state.cur = state.target;
    draw(state.cur);
  });

  window.addEventListener('resize', () => {
    measure();
    draw(state.cur);
  });

  cta?.setAttribute('inert', '');
  draw(0);
  ScrollTrigger.addEventListener('refresh', () => {
    measure();
    draw(state.cur);
  });
}
