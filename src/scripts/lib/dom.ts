/** Pequenos utilitários de DOM (tipados, sem dependências). */

export const qs = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
export const qsa = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

/**
 * Divide o texto de um elemento em letras (spans). O texto original fica no aria-label
 * do elemento (que precisa ter role implícito de título) e as letras são escondidas de leitores de tela.
 */
export function splitLetters(el: HTMLElement, className = 'key__letter'): HTMLElement[] {
  const text = el.textContent ?? '';
  el.textContent = '';
  const out: HTMLElement[] = [];
  for (const ch of text) {
    const s = document.createElement('span');
    s.className = className;
    s.setAttribute('aria-hidden', 'true');
    s.textContent = ch === ' ' ? ' ' : ch;
    el.appendChild(s);
    out.push(s);
  }
  return out;
}

export const onResize = (fn: () => void, delay = 160) => {
  let t: number | undefined;
  window.addEventListener('resize', () => {
    window.clearTimeout(t);
    t = window.setTimeout(fn, delay);
  });
};

export const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
