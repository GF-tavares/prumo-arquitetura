import type { Capabilities } from '../core/capabilities';
import { getLenis, gsap, scrollToTarget } from '../core/motion';

/**
 * Menu em painel: ao abrir, a página recua levemente em perspectiva e um painel cobre a tela.
 * Cada item troca a imagem de fundo com uma cortina.
 */
export function initMenu(caps: Capabilities) {
  const html = document.documentElement;
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const label = document.querySelector<HTMLElement>('[data-menu-label]');
  const shell = document.getElementById('shell');
  if (!menu || !toggle || !shell) return { close: () => {} };

  const links = [...menu.querySelectorAll<HTMLAnchorElement>('[data-menu-link]')];
  const bgs = [...menu.querySelectorAll<HTMLElement>('[data-menu-bg]')];
  const labels = [...menu.querySelectorAll<HTMLElement>('.menu__label')];
  const idx = [...menu.querySelectorAll<HTMLElement>('.menu__idx')];
  const foot = menu.querySelector<HTMLElement>('.menu__foot');
  const short = caps.reducedMotion;

  let open = false;
  let busy = false;
  let current = -1;
  let z = 1;
  let tl: gsap.core.Timeline | null = null;

  const showBg = (i: number) => {
    if (i === current || !bgs[i]) return;
    const prev = bgs[current];
    current = i;
    const next = bgs[i];
    const img = next.querySelector('img');
    z += 1;
    gsap.set(next, { zIndex: z });
    gsap.fromTo(
      next,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: short ? 0.01 : 1, ease: 'expo.out', overwrite: true },
    );
    if (img) gsap.fromTo(img, { scale: 1.14 }, { scale: 1, duration: short ? 0.01 : 1.8, ease: 'expo.out', overwrite: true });
    if (prev) {
      gsap.to(prev, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1 }); // mantém sob a nova até a cortina terminar
      gsap.delayedCall(short ? 0 : 1, () => {
        if (prev !== bgs[current]) gsap.set(prev, { clipPath: 'inset(0% 0% 100% 0%)' });
      });
    }
  };

  links.forEach((a, i) => {
    a.addEventListener('pointerenter', () => showBg(i));
    a.addEventListener('focus', () => showBg(i));
  });

  const setOrigin = () => {
    // origem da perspectiva no centro do que está visível agora (a página é um documento longo)
    shell.style.transformOrigin = `50% ${window.scrollY + window.innerHeight / 2}px`;
  };

  const openMenu = () => {
    if (open || busy) return;
    busy = true;
    open = true;
    tl?.kill();
    setOrigin();
    html.classList.add('menu-open');
    getLenis()?.stop();
    menu.classList.add('is-open');
    menu.removeAttribute('inert');
    menu.setAttribute('aria-hidden', 'false');
    shell.setAttribute('inert', '');
    toggle.setAttribute('aria-expanded', 'true');
    if (label) label.textContent = 'Fechar';

    gsap.set(labels, { yPercent: 112 });
    gsap.set(idx, { opacity: 0, y: 12 });
    if (foot) gsap.set(foot, { opacity: 0, y: 14 });

    const d = short ? 0.01 : 1;
    tl = gsap.timeline({ onComplete: () => (busy = false) });
    tl.to(
      shell,
      {
        transform: 'perspective(1400px) translate3d(0,-2vh,-160px) rotateX(3deg) scale(0.94)',
        opacity: 0.35,
        duration: 1.1 * d,
        ease: 'expo.inOut',
      },
      0,
    )
      .fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1 * d, ease: 'expo.inOut' }, 0.05 * d)
      .call(() => showBg(0), undefined, 0.5 * d)
      .to(labels, { yPercent: 0, duration: 1.3 * d, ease: 'expo.out', stagger: 0.07 * d }, 0.55 * d)
      .to(idx, { opacity: 1, y: 0, duration: 0.9 * d, ease: 'expo.out', stagger: 0.07 * d }, 0.7 * d);
    if (foot) tl.to(foot, { opacity: 1, y: 0, duration: 0.9 * d, ease: 'expo.out' }, 0.95 * d);
    setTimeout(() => links[0]?.focus({ preventScroll: true }), 700);
  };

  const closeMenu = (after?: () => void) => {
    if (!open || busy) return;
    busy = true;
    open = false;
    tl?.kill();
    toggle.setAttribute('aria-expanded', 'false');
    if (label) label.textContent = 'Menu';
    const d = short ? 0.01 : 1;
    tl = gsap.timeline({
      onComplete: () => {
        busy = false;
        menu.classList.remove('is-open');
        menu.setAttribute('inert', '');
        menu.setAttribute('aria-hidden', 'true');
        shell.removeAttribute('inert');
        html.classList.remove('menu-open');
        gsap.set(shell, { clearProps: 'transform,opacity,transformOrigin' });
        gsap.set(bgs, { clipPath: 'inset(0% 0% 100% 0%)' });
        current = -1;
        getLenis()?.start();
        toggle.focus({ preventScroll: true });
        after?.();
      },
    });
    tl.to(menu, { clipPath: 'inset(100% 0% 0% 0%)', duration: 0.95 * d, ease: 'expo.inOut' }, 0).to(
      shell,
      { transform: 'perspective(1400px) translate3d(0,0,0) rotateX(0deg) scale(1)', opacity: 1, duration: 1 * d, ease: 'expo.inOut' },
      0.05 * d,
    );
  };

  toggle.addEventListener('click', () => (open ? closeMenu() : openMenu()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) closeMenu();
  });

  // Ir a uma seção: fecha o painel e rola até ela
  links.forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href') ?? '';
      const hash = href.includes('#') ? `#${href.split('#')[1]}` : '';
      if (!hash || !document.querySelector(hash)) return; // link para outra página segue normal
      e.preventDefault();
      closeMenu(() => scrollToTarget(hash));
    });
  });

  return { close: closeMenu };
}
