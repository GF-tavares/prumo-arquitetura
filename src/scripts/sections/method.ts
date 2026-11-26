import type { Capabilities } from '../core/capabilities';
import { gsap, ScrollTrigger } from '../core/motion';
import { clamp01, easeInOutCubic } from '../lib/math';
import { qs, qsa } from '../lib/dom';

/** Duração total do percurso do marcador, em segundos. */
const RUN_SECONDS = 12;

/**
 * Método: uma prancha de arquitetura. Ao chegar na tela, um marcador atravessa sozinho e devagar
 * as cinco etapas (não depende da rolagem) e cada figura se desenha quando a etapa fica ativa.
 * No celular, cada etapa acende quando cruza o meio da tela.
 */
export function initMethod(caps: Capabilities) {
  const root = qs('[data-method]');
  if (!root) return;
  const steps = qsa('[data-step]', root);
  const figs = steps.map((s) => qsa<SVGPathElement>('.fig', s));
  const fill = qs('[data-method-fill]', root);
  const bob = qs('[data-method-bob]', root);
  const track = qs('[data-method-track]', root);
  const lines = qsa('[data-method-line]', root);

  // título
  if (caps.reducedMotion) {
    lines.forEach((l) => (l.style.visibility = 'visible'));
    figs.flat().forEach((p) => (p.style.strokeDashoffset = '0'));
    steps.forEach((s) => s.classList.add('is-on'));
    return;
  }
  gsap.set(lines, { yPercent: 112, visibility: 'visible' });
  gsap.to(lines, {
    yPercent: 0,
    duration: 1.6,
    ease: 'expo.out',
    stagger: 0.12,
    scrollTrigger: { trigger: root, start: 'top 70%', once: true },
  });

  let lastActive = -1;
  const update = (p: number) => {
    const n = steps.length;
    const active = Math.min(n - 1, Math.floor(p * n));
    steps.forEach((s, i) => {
      s.classList.toggle('is-on', i === active);
      s.classList.toggle('is-past', i < active);
    });
    lastActive = active;
    // cada figura se desenha durante o seu quinto do percurso
    figs.forEach((paths, i) => {
      const local = clamp01(p * n - i);
      const k = easeInOutCubic(clamp01(local * 2));
      paths.forEach((path, j) => {
        const stagger = j * 0.06;
        const kk = clamp01((k - stagger) / (1 - Math.min(0.5, paths.length * 0.06)));
        path.style.strokeDashoffset = String(1 - kk);
      });
    });
    if (fill) fill.style.transform = `scaleX(${p.toFixed(4)})`;
    if (bob && track) bob.style.transform = `translateX(${(p * track.clientWidth).toFixed(1)}px) rotate(45deg)`;
  };
  void lastActive;

  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const run = { p: 0 };
    let tween: gsap.core.Tween | null = null;
    update(0);
    const st = ScrollTrigger.create({
      trigger: root,
      start: 'top 55%',
      once: true,
      onEnter: () => {
        tween = gsap.to(run, { p: 1, duration: RUN_SECONDS, delay: 0.9, ease: 'none', onUpdate: () => update(run.p) });
      },
    });
    return () => {
      st.kill();
      tween?.kill();
    };
  });
  mm.add('(max-width: 899px)', () => {
    const list = qs('[data-steps]', root)!;
    // no celular cada etapa acende quando cruza o meio da tela
    const sts = steps.map((s, i) =>
      ScrollTrigger.create({
        trigger: s,
        start: 'top 62%',
        end: 'bottom 38%',
        onToggle: (self) => {
          steps.forEach((el, k) => {
            if (self.isActive) {
              el.classList.toggle('is-on', k === i);
              el.classList.toggle('is-past', k < i);
            }
          });
          if (self.isActive) {
            figs[i].forEach((path, j) => gsap.to(path, { strokeDashoffset: 0, duration: 1.4, delay: j * 0.06, ease: 'power2.inOut' }));
          }
        },
      }),
    );
    void list;
    return () => sts.forEach((t) => t.kill());
  });
}
