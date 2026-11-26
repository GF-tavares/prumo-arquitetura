import type { Plan, PlanLabel } from '@/lib/plan';
import { hash01, smoothstep } from '../lib/math';
import { T } from './timing';

interface Item {
  el: HTMLElement;
  label: PlanLabel;
  t0: number;
  jitter: number;
  shown: boolean;
}

/**
 * Rótulos técnicos (cotas, eixos, níveis) como texto HTML preso a pontos do desenho.
 * O texto fica nítido e com tamanho constante enquanto a câmera se afasta.
 */
export class LabelLayer {
  private items: Item[] = [];

  constructor(
    root: HTMLElement,
    plan: Plan,
    revealAt: (x: number, z: number) => number,
  ) {
    for (const label of plan.labels) {
      const el = document.createElement('div');
      el.className = `il il--${label.kind}${label.align === 'left' ? ' il--left' : ''}`;
      el.dataset.id = label.id;
      if (label.sub) {
        el.innerHTML = `<span>${label.text}</span><span class="il__sub">${label.sub}</span>`;
      } else {
        el.textContent = label.text;
      }
      root.appendChild(el);
      // Aparece um instante depois de a linha correspondente ser traçada
      const near = revealAt(label.x, label.z);
      this.items.push({
        el,
        label,
        t0: Math.max(T.labelsIn, near + 0.15),
        jitter: hash01(label.id),
        shown: false,
      });
    }
  }

  update(
    t: number,
    project: (x: number, y: number, z: number) => { x: number; y: number; depth: number } | null,
    vw: number,
    vh: number,
  ) {
    const margin = 60;
    for (const it of this.items) {
      const inn = smoothstep(it.t0, it.t0 + 0.8, t);
      const out = 1 - smoothstep(T.labelsOut[0] + it.jitter * 0.7, T.labelsOut[1] + it.jitter * 0.7, t);
      const a = inn * out;
      if (a <= 0.003) {
        if (it.shown) {
          it.el.style.opacity = '0';
          it.shown = false;
        }
        continue;
      }
      const p = project(it.label.x, 0.3, it.label.z);
      if (!p || p.x < -margin || p.x > vw + margin || p.y < -margin || p.y > vh + margin) {
        if (it.shown) {
          it.el.style.opacity = '0';
          it.shown = false;
        }
        continue;
      }
      it.el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
      it.el.style.opacity = a.toFixed(3);
      it.shown = true;
    }
  }

  dispose() {
    for (const it of this.items) it.el.remove();
    this.items = [];
  }
}
