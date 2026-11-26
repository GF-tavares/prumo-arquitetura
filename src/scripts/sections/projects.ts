import type { Capabilities } from '../core/capabilities';
import { gsap } from '../core/motion';
import { qs, qsa } from '../lib/dom';

/**
 * Projetos: um índice tipográfico. No desktop, a linha sob o mouse se expande e mostra uma imagem
 * do projeto (o clique na linha leva à página do projeto). No toque, cada obra já vem com a foto.
 */
export function initProjects(caps: Capabilities) {
  const root = qs('#projects');
  if (!root) return;
  const rows = qsa('[data-prow]', root);
  const head = qsa('[data-proj-title]', root);
  const list = qs('[data-plist]', root);
  const stacked = window.matchMedia('(max-width: 899px), (hover: none)').matches;

  // ---------- Entrada por rolagem ----------
  if (!caps.reducedMotion) {
    gsap.set(head, { opacity: 1 });
    const titleSpan = qs('.projects__title .line-mask > span', root);
    if (titleSpan) {
      gsap.fromTo(
        titleSpan,
        { yPercent: 112 },
        { yPercent: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: root, start: 'top 72%', once: true } },
      );
    }
    gsap.fromTo(
      qsa('.projects__count, .projects__label', root),
      { opacity: 0 },
      { opacity: 1, duration: 1.2, scrollTrigger: { trigger: root, start: 'top 72%', once: true } },
    );
    rows.forEach((row) => {
      const rule = qs('.prow__rule', row)!;
      const name = qs('[data-prow-name]', row)!;
      // no desktop a foto só aparece ao expandir; no toque ela já faz parte da linha
      const rest = qsa(stacked ? '.prow__n, .prow__meta, .prow__place, .prow__reveal' : '.prow__n, .prow__meta, .prow__place', row);
      gsap.set(rule, { scaleX: 0 });
      gsap.set(name, { yPercent: 112 });
      gsap.set(rest, { opacity: 0, y: 14 });
      const tl = gsap.timeline({
        scrollTrigger: { trigger: row, start: 'top 88%', once: true },
        defaults: { ease: 'expo.out' },
      });
      tl.to(rule, { scaleX: 1, duration: 1.6 }, 0)
        .to(name, { yPercent: 0, duration: 1.4 }, 0.12)
        .to(rest, { opacity: 1, y: 0, duration: 1.1, stagger: 0.07 }, 0.3);
    });
    const endRule = qs('.prow__rule--end', root);
    if (endRule) {
      gsap.fromTo(
        endRule,
        { scaleX: 0 },
        { scaleX: 1, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: endRule, start: 'top 95%', once: true } },
      );
    }
  }

  // ---------- Expandir a linha ao passar o mouse ----------
  if (!list || stacked) return;
  let openIndex = -1;
  let pending = 0;

  const apply = (index: number) => {
    if (index === openIndex) return;
    openIndex = index;
    rows.forEach((row, i) => row.classList.toggle('is-open', i === index));
    list.classList.toggle('has-open', index >= 0);
  };
  // uma pequena espera evita que a linha "pisque" enquanto a lista se reorganiza sob o cursor
  const request = (index: number, delay: number) => {
    window.clearTimeout(pending);
    pending = window.setTimeout(() => apply(index), delay);
  };

  rows.forEach((row, i) => {
    row.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') request(i, openIndex === -1 ? 0 : 70);
    });
    row.addEventListener('focusin', () => request(i, 0));
  });
  list.addEventListener('pointerleave', () => request(-1, 120));
  list.addEventListener('focusout', (e) => {
    if (!list.contains(e.relatedTarget as Node | null)) request(-1, 0);
  });
}
