import { HERO_FOCUS } from '@/config/site';
import { getCapabilities, TIERS } from '../core/capabilities';
import { easeOutCubic, remap01, smoothstep } from '../lib/math';
import { LabelLayer } from './labels';
import { createIntroScene, type IntroScene } from './scene';
import { T } from './timing';

export type IntroEnd = 'end' | 'skip' | 'error';

export interface IntroOptions {
  root: HTMLElement;
  /** Congela a abertura neste instante (depuração e capturas de QA). */
  freezeAt?: number | null;
  debug?: boolean;
}

/**
 * Roda a abertura cinematográfica. Devolve quando ela termina (corte para a home),
 * é pulada ou falha. A cena é desmontada por completo antes de resolver.
 */
export async function runIntro({ root, freezeAt = null, debug = false }: IntroOptions): Promise<IntroEnd> {
  const canvas = root.querySelector<HTMLCanvasElement>('.intro__canvas');
  const labelsRoot = root.querySelector<HTMLElement>('.intro__labels');
  const phrase = root.querySelector<HTMLElement>('.intro__phrase');
  const lineEls = [...root.querySelectorAll<HTMLElement>('.intro__line > span')];
  const block = root.querySelector<HTMLElement>('.intro__block');
  const skip = root.querySelector<HTMLButtonElement>('.intro__skip');
  const bar = root.querySelector<HTMLElement>('.intro__bar');
  const src = root.dataset.heroSrc;
  if (!canvas || !labelsRoot || !phrase || !src) return 'error';

  const caps = getCapabilities();
  let scene: IntroScene;
  try {
    scene = await createIntroScene({
      canvas,
      textureUrl: src,
      focus: HERO_FOCUS,
      tier: TIERS[caps.tier],
      width: root.clientWidth || window.innerWidth,
      height: root.clientHeight || window.innerHeight,
    });
  } catch (err) {
    console.warn('[prumo] abertura em WebGL indisponível', err);
    return 'error';
  }

  const labels = new LabelLayer(labelsRoot, scene.plan, (x, z) => scene.lines.revealTimeNear(x, z));

  // A fonte da frase precisa estar pronta antes do primeiro quadro
  try {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
  } catch {
    /* segue sem esperar */
  }

  let vw = root.clientWidth || window.innerWidth;
  let vh = root.clientHeight || window.innerHeight;

  const draw = (t: number) => {
    scene.render(t);
    labels.update(t, scene.project, vw, vh);

    lineEls.forEach((el, i) => {
      const p = easeOutCubic(remap01(T.phrase[i], T.phrase[i] + 1.15, t));
      el.style.transform = `translate3d(0, ${((1 - p) * 112).toFixed(2)}%, 0)`;
    });
    const out = smoothstep(T.phraseOut[0], T.phraseOut[1], t);
    phrase.style.opacity = (1 - out).toFixed(3);
    phrase.style.transform = `scale(${(1 + out * 0.035).toFixed(4)})`;

    if (block) {
      const o = smoothstep(2.4, 3.3, t) * (1 - smoothstep(T.labelsOut[0], T.labelsOut[1], t));
      block.style.opacity = o.toFixed(3);
    }
    if (bar) bar.style.transform = `scaleX(${Math.min(1, t / T.end).toFixed(4)})`;
    if (skip) skip.classList.toggle('is-visible', t > 1.1 && t < T.end - 0.5);
  };

  let t = freezeAt ?? 0;
  let paused = freezeAt !== null;
  let raf = 0;
  let last = performance.now();
  let settled = false;

  return new Promise<IntroEnd>((resolve) => {
    const onResize = () => {
      vw = root.clientWidth || window.innerWidth;
      vh = root.clientHeight || window.innerHeight;
      scene.resize(vw, vh);
      draw(t);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        finish('skip');
      }
    };

    const finish = (reason: IntroEnd) => {
      if (settled) return;
      settled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      skip?.removeEventListener('click', onSkipClick);
      if (reason === 'end') draw(T.end);
      // desmonta depois de o chamador trocar para a home (o último quadro fica na tela até lá)
      resolve(reason);
      requestAnimationFrame(() => {
        labels.dispose();
        scene.dispose();
      });
    };
    const onSkipClick = () => finish('skip');

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!paused) t += dt;
      draw(t);
      if (!paused && t >= T.end) finish('end');
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    skip?.addEventListener('click', onSkipClick);

    if (debug) {
      (window as unknown as { __intro: unknown }).__intro = {
        seek: (v: number) => {
          t = v;
          paused = true;
          draw(t);
        },
        play: () => {
          paused = false;
          last = performance.now();
        },
        pause: () => (paused = true),
        get t() {
          return t;
        },
        end: T.end,
      };
    }

    last = performance.now();
    raf = requestAnimationFrame(frame);
  });
}
