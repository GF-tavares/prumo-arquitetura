import type { Capabilities } from '../core/capabilities';
import { gsap } from '../core/motion';
import { clamp, damp, lerp } from '../lib/math';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EnterOptions {
  /** vindo da abertura (a foto continua o movimento de câmera) ou entrada direta */
  fromIntro: boolean;
  /** abertura pulada: entrada mais curta */
  fast?: boolean;
}

export interface HeroApi {
  enter(opts: EnterOptions): Promise<void>;
}

/**
 * Herói: fotografia em tela cheia com uma janela iluminada. O restante da foto fica em
 * sombra; a janela desliza de leve conforme o mouse (ou respira sozinha no toque).
 */
export function initHero(caps: Capabilities): HeroApi | null {
  const root = document.querySelector<HTMLElement>('.hero');
  if (!root) return null;
  const media = root.querySelector<HTMLElement>('[data-hero-media]')!;
  const img = root.querySelector<HTMLElement>('.hero__img')!;
  const dim = root.querySelector<SVGPathElement>('[data-hero-dim]')!;
  const frame = root.querySelector<HTMLElement>('[data-hero-frame]')!;
  const lines = [...root.querySelectorAll<HTMLElement>('[data-hero-line]')];
  const fades = [...root.querySelectorAll<HTMLElement>('[data-hero-fade]')];

  // As linhas do título sobem de dentro de uma máscara; o deslocamento inicial é do GSAP (não do CSS)
  gsap.set(lines, { yPercent: 112, y: 0, visibility: 'visible' });

  const readRest = (): Rect => {
    const cs = getComputedStyle(root);
    const n = (name: string) => parseFloat(cs.getPropertyValue(name)) || 0;
    return { x: n('--ax'), y: n('--ay'), w: n('--aw'), h: n('--ah') };
  };
  let rest = readRest();
  const full: Rect = { x: 0, y: 0, w: 100, h: 100 };

  // open: 1 = tudo iluminado (igual ao último quadro da abertura); 0 = janela em repouso
  const state = { open: 1, frameOn: 0, foot: 0 };
  const pointer = { tx: 0, ty: 0, x: 0, y: 0 };
  let active = false;
  let entered = false;

  const render = () => {
    const amp = 5.5; // % da tela
    const ox = pointer.x * amp * (1 - state.open);
    const oy = pointer.y * amp * 0.6 * (1 - state.open);
    const x = clamp(lerp(rest.x + ox, full.x, state.open), 0, 100);
    const y = clamp(lerp(rest.y + oy, full.y, state.open), 0, 100);
    const w = lerp(rest.w, full.w, state.open);
    const h = lerp(rest.h, full.h, state.open);
    dim.setAttribute('d', `M0 0H100V100H0ZM${x.toFixed(3)} ${y.toFixed(3)}H${(x + w).toFixed(3)}V${(y + h).toFixed(3)}H${x.toFixed(3)}Z`);
    frame.style.left = `${x}%`;
    frame.style.top = `${y}%`;
    frame.style.width = `${w}%`;
    frame.style.height = `${h}%`;
    frame.style.opacity = String(state.frameOn);
    root.style.setProperty('--foot', state.foot.toFixed(3));
  };
  render();

  const onMove = (e: PointerEvent) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  if (caps.finePointer) window.addEventListener('pointermove', onMove, { passive: true });

  const tick = (_t: number, dtMs: number) => {
    if (!active) return;
    const dt = Math.min(0.05, dtMs / 1000);
    if (!caps.finePointer && !caps.reducedMotion) {
      // toque: a janela respira sozinha
      const s = performance.now() / 1000;
      pointer.tx = Math.sin(s * 0.35) * 0.8;
      pointer.ty = Math.cos(s * 0.27) * 0.5;
    }
    if (caps.reducedMotion) {
      pointer.tx = 0;
      pointer.ty = 0;
    }
    pointer.x = damp(pointer.x, pointer.tx, 2.4, dt);
    pointer.y = damp(pointer.y, pointer.ty, 2.4, dt);
    render();
  };
  gsap.ticker.add(tick);

  window.addEventListener('resize', () => {
    rest = readRest();
    render();
  });

  // Ao rolar, a foto desce mais devagar (parallaxe) e escurece até virar o fundo do manifesto
  if (!caps.reducedMotion) {
    gsap.to(media, {
      yPercent: 14,
      ease: 'none',
      scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true },
    });
    gsap.to(root.querySelector('.hero__content'), {
      yPercent: -10,
      opacity: 0,
      ease: 'none',
      scrollTrigger: { trigger: root, start: '18% top', end: '85% top', scrub: true },
    });
  }

  if (new URLSearchParams(location.search).has('debug')) {
    (window as unknown as { __hero: unknown }).__hero = {
      /** Congela o herói no estado do corte (tudo iluminado, sem texto) para comparar com a abertura. */
      freezeAtCut() {
        gsap.killTweensOf([img, state, ...lines, ...fades]);
        gsap.set(img, { scale: 1 });
        state.open = 1;
        state.frameOn = 0;
        state.foot = 0;
        render();
        gsap.set(lines, { yPercent: 112 });
        gsap.set(fades, { opacity: 0 });
      },
    };
  }

  return {
    enter({ fast = false }) {
      if (entered) return Promise.resolve();
      entered = true;
      return new Promise<void>((resolve) => {
        const k = fast ? 0.55 : 1;
        const tl = gsap.timeline({ onComplete: resolve });
        active = true;
        // O último quadro da abertura está em escala 1: o corte é idêntico. Depois a foto respira
        // muito devagar, como uma câmera parada que ainda tem vida.
        gsap.set(img, { scale: 1 });
        tl.to(img, { scale: 1.035, duration: 14 * k, ease: 'sine.out' }, 0.2);
        tl.to(state, { open: 0, duration: 2.1 * k, ease: 'expo.inOut', onUpdate: render }, 0.45 * k);
        tl.to(state, { frameOn: 1, duration: 1.2 * k, ease: 'power2.out', onUpdate: render }, 1.2 * k);
        tl.to(state, { foot: 1, duration: 2.4 * k, ease: 'power2.inOut', onUpdate: render }, 0.6 * k);
        tl.fromTo(lines, { yPercent: 112 }, { yPercent: 0, duration: 1.7 * k, ease: 'expo.out', stagger: 0.11 * k }, 0.9 * k);
        tl.fromTo(fades, { opacity: 0 }, { opacity: 1, duration: 1.3 * k, ease: 'power2.out', stagger: 0.12 * k }, 1.5 * k);
        document.dispatchEvent(new CustomEvent('prumo:hero-enter'));
      });
    },
  };
}
