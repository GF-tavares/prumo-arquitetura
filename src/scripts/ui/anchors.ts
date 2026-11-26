import { scrollToTarget } from '../core/motion';

/** Links de âncora (#seção) rolam com o Lenis em vez de saltar. */
export function initAnchors() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href*="#"]');
    if (!a || a.hasAttribute('data-menu-link')) return;
    const url = new URL(a.href, location.href);
    if (url.pathname.replace(/\/$/, '') !== location.pathname.replace(/\/$/, '')) return;
    const hash = url.hash;
    if (!hash) return;
    if (hash === '#top') {
      e.preventDefault();
      scrollToTarget(0);
      return;
    }
    const target = document.querySelector<HTMLElement>(hash);
    if (!target) return;
    e.preventDefault();
    scrollToTarget(target);
    history.replaceState(null, '', hash);
  });
}
