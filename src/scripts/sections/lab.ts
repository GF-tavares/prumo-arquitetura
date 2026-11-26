import type { Capabilities } from '../core/capabilities';
import { gsap, ScrollTrigger } from '../core/motion';
import { qs, qsa } from '../lib/dom';

/**
 * Material Lab: cada tira ativa (1) a textura do material, que domina o fundo a partir do ponto do
 * cursor, e (2) uma fotografia estática do material aplicado em um ambiente, que troca por cortina.
 */
export function initLab(caps: Capabilities) {
  const root = qs('[data-lab]');
  if (!root) return;
  const items = qsa<HTMLButtonElement>('[data-mat]', root);
  const bgs = new Map(qsa('[data-lab-bg]', root).map((el) => [el.dataset.labBg as string, el]));
  const shots = new Map(qsa('[data-shot]', root).map((el) => [el.dataset.shot as string, el]));
  const list = qs('[data-lab-list]', root)!;
  const capFig = qs('[data-lab-fig]', root);
  const capName = qs('[data-lab-name]', root);
  const capPlace = qs('[data-lab-place]', root);
  const reduced = caps.reducedMotion;
  const hoverMode = caps.finePointer && caps.hover;

  // ---------- Entrada por rolagem ----------
  const lines = qsa('[data-lab-line]', root);
  if (reduced) {
    lines.forEach((l) => (l.style.visibility = 'visible'));
  } else {
    gsap.set(lines, { yPercent: 112, visibility: 'visible' });
    gsap.to(lines, {
      yPercent: 0,
      duration: 1.6,
      ease: 'expo.out',
      stagger: 0.12,
      scrollTrigger: { trigger: root, start: 'top 68%', once: true },
    });
    const rows = qsa('[data-lab-row]', root);
    gsap.fromTo(
      rows,
      { opacity: 0, y: 26 },
      { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: list, start: 'top 82%', once: true } },
    );
    const stage = qs('[data-lab-stage]', root);
    if (stage) {
      gsap.fromTo(
        stage,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: stage, start: 'top 88%', once: true } },
      );
    }
  }

  // ---------- Fundo que "domina" ----------
  let active = 0;
  let bgOn: string | null = null;
  let z = 1;
  const origin = { x: 0, y: 0 };

  const radius = () => Math.hypot(root.clientWidth, root.clientHeight);

  const showBg = (id: string) => {
    if (bgOn === id) return;
    const next = bgs.get(id);
    const prev = bgOn ? bgs.get(bgOn) : null;
    bgOn = id;
    if (!next) return;
    z += 1;
    gsap.set(next, { zIndex: z });
    gsap.fromTo(
      next,
      { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` },
      { clipPath: `circle(${radius()}px at ${origin.x}px ${origin.y}px)`, duration: reduced ? 0.01 : 1.5, ease: 'expo.out', overwrite: true },
    );
    const im = qs('img', next);
    if (im) gsap.fromTo(im, { scale: 1.12 }, { scale: 1.02, duration: reduced ? 0.01 : 2.4, ease: 'expo.out', overwrite: true });
    if (prev) {
      gsap.delayedCall(reduced ? 0 : 1.5, () => {
        if (bgs.get(bgOn ?? '') !== prev) gsap.set(prev, { clipPath: `circle(0px at 50% 50%)` });
      });
    }
  };
  const hideBg = () => {
    if (!bgOn) return;
    const cur = bgs.get(bgOn);
    bgOn = null;
    if (cur) gsap.to(cur, { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)`, duration: 1, ease: 'expo.inOut', overwrite: true });
  };

  // ---------- Foto do material aplicado ----------
  let shotOn = 'travertine';
  let shotZ = 1;
  const showShot = (id: string, index: number) => {
    if (id === shotOn) return;
    const prevIndex = items.findIndex((b) => b.dataset.mat === shotOn);
    const dir = index > prevIndex ? 1 : -1; // desce: a nova sobe de baixo; sobe: entra por cima
    const prev = shots.get(shotOn);
    const next = shots.get(id);
    shotOn = id;
    if (!next) return;
    shotZ += 1;
    gsap.set(next, { zIndex: shotZ });
    gsap.fromTo(
      next,
      { clipPath: dir > 0 ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: reduced ? 0.01 : 1.1, ease: 'expo.inOut', overwrite: true },
    );
    const im = qs('img', next);
    if (im) gsap.fromTo(im, { scale: 1.18 }, { scale: 1.04, duration: reduced ? 0.01 : 1.8, ease: 'expo.out', overwrite: true });
    if (prev) {
      const im0 = qs('img', prev);
      if (im0) gsap.to(im0, { scale: 1.1, duration: reduced ? 0.01 : 1.1, ease: 'expo.inOut' });
      gsap.delayedCall(reduced ? 0 : 1.12, () => {
        if (shots.get(shotOn) !== prev) gsap.set(prev, { clipPath: 'inset(100% 0% 0% 0%)' });
      });
    }
    // legenda: troca com um pequeno deslize
    const btn = items[index];
    const place = btn?.dataset.place ?? '';
    const name = btn?.querySelector('.lab__name')?.textContent ?? '';
    const swap = () => {
      if (capFig) capFig.textContent = `Fig. 06.${index + 1}`;
      if (capName) capName.textContent = name;
      if (capPlace) capPlace.textContent = place;
    };
    const cap = [capFig, capName, capPlace].filter(Boolean) as HTMLElement[];
    if (reduced || !cap.length) swap();
    else {
      gsap.to(cap, {
        opacity: 0,
        y: -6,
        duration: 0.22,
        ease: 'power2.in',
        onComplete: () => {
          swap();
          gsap.fromTo(cap, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.05 });
        },
      });
    }
  };

  const activate = (i: number, e?: PointerEvent) => {
    const btn = items[i];
    if (!btn) return;
    active = i;
    items.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    const box = root.getBoundingClientRect();
    if (e) {
      origin.x = e.clientX - box.left;
      origin.y = e.clientY - box.top;
    } else {
      const r = btn.getBoundingClientRect();
      origin.x = r.left - box.left + r.width * 0.25;
      origin.y = r.top - box.top + r.height / 2;
    }
    showBg(btn.dataset.mat!);
    showShot(btn.dataset.mat!, i);
  };

  items.forEach((btn, i) => {
    btn.addEventListener('pointerenter', (e) => {
      if (hoverMode && e.pointerType === 'mouse') activate(i, e);
    });
    btn.addEventListener('focus', () => activate(i));
    btn.addEventListener('click', () => activate(i));
  });
  if (hoverMode) list.addEventListener('pointerleave', hideBg);

  // Sem mouse (toque): o material ativo permanece no fundo quando a seção aparece
  if (!hoverMode) {
    ScrollTrigger.create({
      trigger: root,
      start: 'top 60%',
      once: true,
      onEnter: () => activate(0),
    });
  }
  void active;
}
