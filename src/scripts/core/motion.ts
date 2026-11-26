import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import type { Capabilities } from './capabilities';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

let instance: Lenis | null = null;

/** A instância do Lenis, se a rolagem suave estiver ativa. */
export const getLenis = () => instance;

/**
 * GSAP + Lenis sincronizados: o Lenis avança no ticker do GSAP e atualiza o ScrollTrigger.
 * Com prefers-reduced-motion não há rolagem suave.
 */
export function initMotion(caps: Capabilities) {
  gsap.defaults({ ease: 'expo.out', duration: 1 });
  ScrollTrigger.config({ ignoreMobileResize: true });

  if (!caps.reducedMotion) {
    instance = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.92,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: false,
      anchors: false,
    });
    instance.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => instance?.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  return instance;
}

/** Rola até um elemento ou posição, com ou sem animação conforme a preferência de movimento. */
export function scrollToTarget(target: string | HTMLElement | number, offset = 0) {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (el === null) return;
  if (instance) {
    instance.scrollTo(el, { offset, duration: 1.8, easing: (t: number) => 1 - Math.pow(1 - t, 4) });
    return;
  }
  const top = typeof el === 'number' ? el : el.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: top + offset });
}
