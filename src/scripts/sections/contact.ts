import type { Capabilities } from '../core/capabilities';
import { gsap } from '../core/motion';
import { qs, qsa } from '../lib/dom';

/** Contato: título em máscaras, o prumo desce até o convite e o CTA tem atração magnética leve. */
export function initContact(caps: Capabilities) {
  const root = qs('[data-contact]');
  if (!root) return;
  const reduced = caps.reducedMotion;
  const lines = qsa('[data-contact-line]', root);
  const fades = qsa('[data-contact-fade]', root);
  const plumbLine = qs('[data-contact-plumb] i', root);
  const plumbBob = qs('[data-contact-plumb] b', root);

  if (reduced) {
    lines.forEach((l) => (l.style.visibility = 'visible'));
    fades.forEach((f) => (f.style.opacity = '1'));
  } else {
    gsap.set(lines, { yPercent: 112, visibility: 'visible' });
    gsap.set(fades, { y: 18 });
    if (plumbLine && plumbBob) {
      gsap.set(plumbLine, { scaleY: 0 });
      gsap.set(plumbBob, { opacity: 0, y: -30 });
      gsap
        .timeline({ scrollTrigger: { trigger: root, start: 'top 85%', once: true } })
        .to(plumbLine, { scaleY: 1, duration: 1.8, ease: 'expo.inOut' }, 0)
        .to(plumbBob, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' }, 1.1);
    }
    gsap.to(lines, {
      yPercent: 0,
      duration: 1.7,
      ease: 'expo.out',
      stagger: 0.13,
      scrollTrigger: { trigger: root, start: 'top 60%', once: true },
    });
    gsap.to(fades, {
      opacity: 1,
      y: 0,
      duration: 1.3,
      ease: 'expo.out',
      stagger: 0.16,
      scrollTrigger: { trigger: qs('.contact__cta', root)!, start: 'top 92%', once: true },
    });
  }

  // ---------- Magnético (muito leve) ----------
  if (caps.finePointer && !reduced) {
    qsa('[data-magnetic]').forEach((el) => {
      const inner = el;
      const xTo = gsap.quickTo(inner, 'x', { duration: 0.7, ease: 'power3' });
      const yTo = gsap.quickTo(inner, 'y', { duration: 0.7, ease: 'power3' });
      window.addEventListener(
        'pointermove',
        (e) => {
          const r = inner.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = e.clientX - cx;
          const dy = e.clientY - cy;
          const dist = Math.hypot(dx, dy);
          const reach = Math.max(r.width, 260) * 0.75;
          if (dist < reach) {
            const k = (1 - dist / reach) * 0.16;
            xTo(dx * k);
            yTo(dy * k);
          } else {
            xTo(0);
            yTo(0);
          }
        },
        { passive: true },
      );
    });
  }
}
