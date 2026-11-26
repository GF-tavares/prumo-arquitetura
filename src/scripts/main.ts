import { getCapabilities } from './core/capabilities';
import { getLenis, initMotion, ScrollTrigger } from './core/motion';
import { initHero } from './sections/hero';
import { initContact } from './sections/contact';
import { initLab } from './sections/lab';
import { initManifesto } from './sections/manifesto';
import { initMethod } from './sections/method';
import { initProjectPage } from './sections/project-page';
import { initProjects } from './sections/projects';
import { initSequence } from './sections/sequence';
import { initStatement } from './sections/statement';
import { initStudio } from './sections/studio';
import { initAnchors } from './ui/anchors';
import { initCursor } from './ui/cursor';
import { initHud } from './ui/hud';
import { initMenu } from './ui/menu';

declare global {
  interface Window {
    __prumoBooted?: boolean;
  }
}

window.__prumoBooted = true;

const root = document.documentElement;
const params = new URLSearchParams(location.search);

async function boot() {
  const caps = getCapabilities();
  const lenis = initMotion(caps);
  if (import.meta.env.DEV || params.has('debug')) (window as unknown as { __lenis: unknown }).__lenis = lenis;
  const hero = initHero(caps);
  initAnchors();
  initHud();
  initMenu(caps);
  initCursor(caps);
  // Seções, na ordem da página (ScrollTrigger depende da ordem de criação)
  initManifesto(caps);
  initSequence(caps);
  initProjects(caps);
  initLab(caps);
  initMethod(caps);
  initStudio(caps);
  initStatement(caps);
  initContact(caps);
  initProjectPage(caps);
  if (!hero) root.classList.add('header-on'); // páginas internas: sem abertura, o cabeçalho já entra
  document.addEventListener('prumo:hero-enter', () => {
    window.setTimeout(() => root.classList.add('header-on'), 1500);
  });

  const introEl = document.getElementById('intro');
  const willRunIntro = root.classList.contains('intro-on') && !!introEl && caps.webgl;

  const finish = (reason: 'end' | 'skip' | 'error') => {
    try {
      sessionStorage.setItem('prumo:intro', '1');
    } catch {
      /* armazenamento indisponível: tudo bem */
    }
    root.classList.remove('intro-on');
    window.scrollTo(0, 0);
    getLenis()?.start();
    ScrollTrigger.refresh();
    if (reason === 'skip' && introEl) {
      // pulada: o overlay se dissolve enquanto o herói entra
      introEl.style.transition = 'opacity .7s cubic-bezier(.16,1,.3,1)';
      introEl.style.display = 'block';
      requestAnimationFrame(() => (introEl.style.opacity = '0'));
      setTimeout(() => introEl.remove(), 800);
    } else {
      introEl?.remove();
    }
    void hero?.enter({ fromIntro: reason === 'end', fast: reason !== 'end' });
  };

  if (willRunIntro && introEl) {
    getLenis()?.stop();
    const { runIntro } = await import('./intro');
    const freeze = params.has('t') ? Number.parseFloat(params.get('t') ?? '0') : null;
    const debug = params.has('debug') || import.meta.env.DEV;
    const reason = await runIntro({ root: introEl, freezeAt: Number.isFinite(freeze) ? freeze : null, debug });
    if (freeze !== null && Number.isFinite(freeze)) return; // captura de QA: fica no quadro pedido
    finish(reason);
  } else {
    root.classList.remove('intro-on');
    void hero?.enter({ fromIntro: false, fast: true });
  }
}

void boot();
