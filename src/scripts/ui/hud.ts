import { getLenis } from '../core/motion';

/**
 * Orientação: relógio do escritório, tema do cabeçalho conforme a seção sob ele,
 * "cota de nível" que muda com a rolagem e linha de progresso.
 */
export function initHud() {
  const header = document.querySelector<HTMLElement>('[data-header-root]');
  const elev = document.querySelector<HTMLElement>('[data-hud-elev]');
  const chapter = document.querySelector<HTMLElement>('[data-hud-chapter]');
  const bar = document.querySelector<HTMLElement>('[data-progress]');
  const clock = document.querySelector<HTMLElement>('[data-clock]');

  // relógio (horário de Brasília), atualizado a cada 20 s
  if (clock) {
    const fmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    const tick = () => (clock.textContent = fmt.format(new Date()));
    tick();
    setInterval(tick, 20000);
  }

  const sections = [...document.querySelectorAll<HTMLElement>('[data-header]')];
  const chapters = [...document.querySelectorAll<HTMLElement>('[data-chapter]')];
  const TOTAL_ELEVATION = 48.25; // metros de "altura" percorridos até o fim da página (só na cota)

  let lastTheme = '';
  let lastChapter = '';
  let lastElev = '';

  const update = () => {
    const y = window.scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const p = Math.min(1, Math.max(0, y / max));

    if (bar) bar.style.transform = `scaleY(${p.toFixed(4)})`;
    if (elev) {
      const v = `+${(p * TOTAL_ELEVATION).toFixed(3).padStart(6, '0')}`;
      if (v !== lastElev) {
        elev.textContent = v;
        lastElev = v;
      }
    }

    // tema do cabeçalho: seção que cruza a linha a 44px do topo
    if (header) {
      let theme = 'dark';
      for (const s of sections) {
        const r = s.getBoundingClientRect();
        if (r.top <= 44 && r.bottom > 44) theme = s.dataset.header ?? 'dark';
      }
      if (theme !== lastTheme) {
        header.dataset.theme = theme;
        lastTheme = theme;
      }
    }

    // capítulo: seção que cruza o centro da tela
    if (chapter) {
      const mid = window.innerHeight * 0.5;
      let name = lastChapter || 'Início';
      for (const s of chapters) {
        const r = s.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) name = s.dataset.chapter ?? name;
      }
      if (name !== lastChapter) {
        chapter.textContent = name;
        lastChapter = name;
      }
    }
  };

  const lenis = getLenis();
  if (lenis) lenis.on('scroll', update);
  else window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
  return { update };
}
