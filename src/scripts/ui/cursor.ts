import type { Capabilities } from '../core/capabilities';
import { gsap } from '../core/motion';

/** Cursor discreto: ponto que vira anel e ganha rótulo sobre elementos com data-cursor. */
export function initCursor(caps: Capabilities) {
  if (!caps.finePointer) return;
  const root = document.querySelector<HTMLElement>('[data-cursor-root]');
  const ring = document.querySelector<HTMLElement>('[data-cursor-ring]');
  const dot = document.querySelector<HTMLElement>('[data-cursor-dot]');
  const label = document.querySelector<HTMLElement>('[data-cursor-label]');
  if (!root || !ring || !dot || !label) return;

  const html = document.documentElement;
  const dur = caps.reducedMotion ? 0.01 : 0.55;
  const ringX = gsap.quickTo(ring, 'x', { duration: dur, ease: 'power3' });
  const ringY = gsap.quickTo(ring, 'y', { duration: dur, ease: 'power3' });
  const labX = gsap.quickTo(label, 'x', { duration: dur, ease: 'power3' });
  const labY = gsap.quickTo(label, 'y', { duration: dur, ease: 'power3' });
  gsap.set([ring, dot, label], { x: -100, y: -100 });

  let active = false;
  let hidden = false;
  let pressed = false;
  let state: string | null = null;

  const paint = () => {
    const withLabel = !!state && state !== 'link';
    const grown = !!state;
    gsap.to(ring, {
      scale: grown ? (withLabel ? 1 : 0.62) : 0.3,
      opacity: grown ? 1 : 0,
      duration: 0.5,
      ease: 'expo.out',
      overwrite: 'auto',
    });
    gsap.to(dot, { scale: grown ? 0.35 : pressed ? 0.7 : 1, duration: 0.4, ease: 'expo.out', overwrite: 'auto' });
    gsap.to(label, { opacity: withLabel ? 1 : 0, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
  };

  const move = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    if (!active) {
      active = true;
      html.classList.add('has-cursor');
      gsap.set([ring, label], { x: e.clientX, y: e.clientY });
    }
    if (hidden) {
      hidden = false;
      gsap.to(root, { opacity: 1, duration: 0.3 });
    }
    gsap.set(dot, { x: e.clientX, y: e.clientY });
    ringX(e.clientX);
    ringY(e.clientY);
    labX(e.clientX);
    labY(e.clientY);
  };

  const over = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const target = e.target as Element | null;
    const tagged = target?.closest<HTMLElement>('[data-cursor]');
    let next: string | null = null;
    if (tagged) next = tagged.dataset.cursor ?? 'link';
    else if (target?.closest('a, button, [role="button"], summary, label')) next = 'link';
    if (next !== state) {
      state = next;
      if (state && state !== 'link') label.textContent = state.toUpperCase();
      paint();
    }
  };

  window.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerover', over, { passive: true });
  document.addEventListener('pointerdown', () => {
    pressed = true;
    paint();
  });
  document.addEventListener('pointerup', () => {
    pressed = false;
    paint();
  });
  document.documentElement.addEventListener('mouseleave', () => {
    hidden = true;
    gsap.to(root, { opacity: 0, duration: 0.3 });
  });
}
