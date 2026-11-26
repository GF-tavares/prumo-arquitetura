import type { Capabilities } from '../core/capabilities';
import { gsap } from '../core/motion';
import { qs, qsa } from '../lib/dom';

/**
 * Studio: título em máscaras, foto com parallaxe, números que contam e uma faixa de fragmentos
 * que se arrasta com o mouse (rolagem nativa, com inércia, e navegável por teclado).
 */
export function initStudio(caps: Capabilities) {
  const root = qs('[data-studio]');
  if (!root) return;
  const reduced = caps.reducedMotion;
  const lines = qsa('[data-studio-line]', root);
  const fades = qsa('[data-studio-fade]', root);
  const counts = qsa('[data-count]', root);
  const img = qs('[data-studio-img]', root);
  const frame = qs('[data-studio-frame]', root);

  if (reduced) {
    lines.forEach((l) => (l.style.visibility = 'visible'));
    fades.forEach((f) => (f.style.opacity = '1'));
    if (img) img.style.transform = 'none';
  } else {
    gsap.set(lines, { yPercent: 112, visibility: 'visible' });
    gsap.to(lines, {
      yPercent: 0,
      duration: 1.6,
      ease: 'expo.out',
      stagger: 0.11,
      scrollTrigger: { trigger: qs('.studio__body', root)!, start: 'top 72%', once: true },
    });
    gsap.to(fades, {
      opacity: 1,
      y: 0,
      duration: 1.3,
      ease: 'expo.out',
      stagger: 0.16,
      scrollTrigger: { trigger: qs('.studio__copy', root)!, start: 'top 88%', once: true },
    });
    gsap.set(fades, { y: 18 });

    if (img && frame) {
      gsap.fromTo(
        img,
        { yPercent: -8, scale: 1.18 },
        { yPercent: 8, scale: 1.18, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true } },
      );
      // a foto se revela como uma cortina vertical
      gsap.fromTo(
        frame,
        { clipPath: 'inset(0% 0% 100% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: frame, start: 'top 80%', once: true } },
      );
    }

    // números que mudam
    counts.forEach((el) => {
      const target = Number(el.dataset.count);
      const plain = el.hasAttribute('data-plain');
      const from = plain ? target - 40 : 0;
      const o = { v: from };
      el.textContent = String(from);
      gsap.to(o, {
        v: target,
        duration: plain ? 1.6 : 2,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: () => (el.textContent = String(Math.round(o.v))),
      });
    });
  }

  // ---------- Faixa de fragmentos ----------
  const track = qs('[data-frag]', root);
  if (track) {
    if (!reduced) {
      qsa('[data-frag-img]', track).forEach((el) => {
        gsap.fromTo(
          el,
          { clipPath: 'inset(0% 100% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: { trigger: track, start: 'top 90%', once: true } },
        );
      });
    }
    if (caps.finePointer) {
      let down = false;
      let startX = 0;
      let startLeft = 0;
      let vx = 0;
      let lastX = 0;
      let moved = 0;
      let raf = 0;

      const inertia = () => {
        if (Math.abs(vx) < 0.15) return;
        track.scrollLeft -= vx;
        vx *= 0.94;
        raf = requestAnimationFrame(inertia);
      };

      track.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        down = true;
        moved = 0;
        startX = e.clientX;
        lastX = e.clientX;
        startLeft = track.scrollLeft;
        vx = 0;
        cancelAnimationFrame(raf);
        track.classList.add('is-dragging');
      });
      window.addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = e.clientX - startX;
        moved = Math.max(moved, Math.abs(dx));
        track.scrollLeft = startLeft - dx;
        vx = e.clientX - lastX;
        lastX = e.clientX;
      });
      const up = () => {
        if (!down) return;
        down = false;
        track.classList.remove('is-dragging');
        if (!reduced) raf = requestAnimationFrame(inertia);
      };
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      track.addEventListener('click', (e) => moved > 6 && e.preventDefault(), true);
    }
    // a roda vertical do mouse continua rolando a página, a horizontal rola a faixa (comportamento nativo)
  }
}
