import type { Capabilities } from '../core/capabilities';
import { gsap } from '../core/motion';
import { qs, qsa } from '../lib/dom';

/** Página de projeto: capa que se abre, título em máscara, revelações e galeria em cortina. */
export function initProjectPage(caps: Capabilities) {
  const root = qs('[data-proj]');
  if (!root) return;
  const reduced = caps.reducedMotion;
  const lines = qsa('[data-proj-line]', root);
  const fades = qsa('[data-proj-fade]', root);
  const reveals = qsa('[data-reveal]', root);
  const cover = qs('[data-proj-cover]', root);
  const img = qs('[data-proj-img]', root);
  const gals = qsa('[data-gal-img]', root);

  if (reduced) {
    lines.forEach((l) => (l.style.visibility = 'visible'));
    [...fades, ...reveals].forEach((f) => (f.style.opacity = '1'));
    return;
  }

  gsap.set(lines, { yPercent: 112, visibility: 'visible' });
  gsap.set(reveals, { y: 24 });
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  if (cover) tl.fromTo(cover, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' }, 0);
  if (img) tl.fromTo(img, { scale: 1.25 }, { scale: 1.02, duration: 2.6 }, 0);
  tl.to(lines, { yPercent: 0, duration: 1.7, stagger: 0.1 }, 0.7).to(fades, { opacity: 1, duration: 1.2, stagger: 0.12 }, 1.2);

  if (img && cover) {
    gsap.to(img, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: cover, start: 'top top', end: 'bottom top', scrub: true } });
  }

  reveals.forEach((el) => {
    gsap.to(el, { opacity: 1, y: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  gals.forEach((el) => {
    const im = qs('img', el);
    gsap.fromTo(
      el,
      { clipPath: 'inset(0% 100% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 85%', once: true } },
    );
    if (im) {
      gsap.fromTo(im, { scale: 1.16, yPercent: -3 }, { scale: 1.02, yPercent: 3, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    }
  });
}
