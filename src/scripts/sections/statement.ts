import type { Capabilities } from '../core/capabilities';
import { gsap } from '../core/motion';
import { qs, qsa } from '../lib/dom';

/**
 * Statement: quatro palavras gigantes que atravessam a tela em direções alternadas e são cortadas
 * pelas bordas. "TRENDS." é só contorno e esmaece com a rolagem: a moda passa, o espaço fica.
 */
export function initStatement(caps: Capabilities) {
  const root = qs('[data-statement]');
  if (!root || caps.reducedMotion) return;
  const words = qsa('[data-st]', root);
  const trend = qs('[data-st-trend]', root);

  const mm = gsap.matchMedia();
  mm.add('(min-width: 0px)', () => {
    words.forEach((w, i) => {
      const dir = Number(w.dataset.dir ?? 1);
      const amp = window.innerWidth * (window.innerWidth < 720 ? 0.32 : 0.16);
      gsap.fromTo(
        w,
        { x: dir * amp * (1 - i * 0.06) },
        {
          x: -dir * amp,
          ease: 'none',
          scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: 0.5 },
        },
      );
    });
    if (trend) {
      gsap.fromTo(
        trend,
        { opacity: 1 },
        { opacity: 0.12, ease: 'none', scrollTrigger: { trigger: root, start: 'center 70%', end: 'bottom 30%', scrub: true } },
      );
    }
  });
}
