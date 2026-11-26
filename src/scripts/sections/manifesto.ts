import type { Capabilities } from '../core/capabilities';
import { gsap, ScrollTrigger } from '../core/motion';
import { clamp, smoothstep } from '../lib/math';
import { qs, qsa, splitLetters } from '../lib/dom';

/**
 * Manifesto: (1) o texto se acende palavra por palavra conforme a rolagem;
 * (2) o prumo, um fio vertical com cotas, desce pela página levando a cinco palavras,
 * cada uma revelada com um movimento próprio.
 */
export function initManifesto(caps: Capabilities) {
  const root = qs('#manifesto');
  if (!root) return;
  const reduced = caps.reducedMotion;

  // ---------- 1. Palavras que acendem ----------
  // A frase acende sozinha, palavra por palavra, assim que chega na tela (não depende da rolagem).
  const stage = qs('[data-manifesto-stage]', root);
  const text = qs('.manifesto__text', root);
  const words = stage ? qsa('.w', stage) : [];
  if (stage && text && words.length) {
    if (reduced) {
      words.forEach((w) => (w.style.opacity = '1'));
    } else {
      const wave = { p: 0 };
      const n = words.length;
      const paint = () => {
        for (let i = 0; i < n; i++) {
          // cada palavra acende quando a onda de luz passa por ela
          const v = smoothstep(i / n - 0.02, i / n + 0.1, wave.p);
          words[i].style.opacity = String(0.13 + 0.87 * v);
        }
      };
      const light = () => gsap.to(wave, { p: 1.1, duration: 3.4, ease: 'none', onUpdate: paint });
      ScrollTrigger.create({ trigger: text, start: 'top 82%', once: true, onEnter: light });
    }
  }

  // ---------- 2. O prumo ----------
  const keys = qs('[data-keys]', root);
  const line = qs('[data-spine-line]', root);
  const ticks = qs('[data-spine-ticks]', root);
  const bob = qs('[data-spine-bob]', root);
  const marksBox = qs('[data-spine-marks]', root);
  if (keys && line && ticks && bob && marksBox) {
    let keysTop = 0;
    let keysH = 1;
    let marks: { el: HTMLElement; y: number }[] = [];

    const measure = () => {
      keysTop = keys.getBoundingClientRect().top + window.scrollY;
      keysH = keys.offsetHeight;
      marksBox.textContent = '';
      marks = [];
      const step = 360;
      for (let y = 180; y < keysH - 60; y += step) {
        const el = document.createElement('span');
        el.className = 'spine__mark';
        el.style.top = `${y}px`;
        el.textContent = `+${(y / 100).toFixed(2).padStart(5, '0')}`;
        marksBox.appendChild(el);
        marks.push({ el, y });
      }
      paint();
    };

    const paint = () => {
      const vh = window.innerHeight;
      const L = clamp(window.scrollY + vh * 0.64 - keysTop, 0, keysH);
      line.style.transform = `scaleY(${(L / keysH).toFixed(5)})`;
      ticks.style.clipPath = `inset(0 0 ${Math.max(0, keysH - L).toFixed(1)}px 0)`;
      bob.style.transform = `translateY(${L.toFixed(1)}px)`;
      bob.style.opacity = L > 4 ? '1' : '0';
      for (const m of marks) m.el.classList.toggle('is-on', m.y < L - 8);
    };

    ScrollTrigger.create({
      trigger: keys,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: paint,
      onRefresh: measure,
    });
    measure();
    window.addEventListener('resize', measure);
  }

  // ---------- 3. As cinco palavras ----------
  qsa('[data-key]', root).forEach((key) => {
    const fx = key.dataset.fx ?? 'rise';
    const inner = qs('.key__inner', key)!;
    const n = qs('[data-key-n]', key)!;
    const note = qs('[data-key-note]', key)!;
    const tie = qs('[data-key-tie]', key)!;
    const text = qs('[data-key-text]', key)!;
    const fromRight = key.classList.contains('key--l');

    if (reduced) {
      gsap.set([n, note, tie], { opacity: 1, scaleX: 1 });
      return;
    }

    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: 'expo.out' },
    });

    tl.to(tie, { scaleX: 1, opacity: 0.6, duration: 0.9 }, 0).to(n, { opacity: 1, duration: 0.8 }, 0.1).to(note, { opacity: 1, duration: 1 }, 0.55);

    switch (fx) {
      case 'rise':
        gsap.set(text, { yPercent: 112 });
        tl.to(text, { yPercent: 0, duration: 1.5 }, 0.05);
        break;
      case 'wipe': {
        // cortina horizontal que sai do prumo e avança para fora
        const from = fromRight ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)';
        gsap.set(text, { clipPath: from, x: fromRight ? 30 : -30 });
        tl.to(text, { clipPath: 'inset(0 0% 0 0%)', x: 0, duration: 1.4, ease: 'expo.inOut' }, 0.05);
        break;
      }
      case 'glow':
        // a luz acende: sai do desfoque e ganha um halo que depois se aquieta
        gsap.set(text, { opacity: 0, filter: 'blur(18px)', color: '#5a5a58' });
        tl.to(text, { opacity: 1, filter: 'blur(0px)', color: '#ece8df', duration: 1.6, ease: 'power3.out' }, 0.05).fromTo(
          text,
          { textShadow: '0 0 0px rgba(236,232,223,0)' },
          { textShadow: '0 0 60px rgba(236,232,223,0.55)', duration: 0.9, ease: 'power2.out' },
          0.3,
        ).to(text, { textShadow: '0 0 0px rgba(236,232,223,0)', duration: 1.6, ease: 'power2.inOut' }, 1.2);
        break;
      case 'focus': {
        // letras entram em foco em ordem aleatória
        const letters = splitLetters(text);
        gsap.set(letters, { opacity: 0, filter: 'blur(14px)', y: 26 });
        tl.to(letters, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.3, stagger: { each: 0.06, from: 'random' } }, 0.05);
        break;
      }
      case 'track':
        // o espaçamento se fecha: a palavra "assenta" como o tempo
        gsap.set(text, { opacity: 0, letterSpacing: '0.34em' });
        tl.to(text, { opacity: 1, letterSpacing: '-0.055em', duration: 2, ease: 'expo.out' }, 0.05);
        break;
    }

    ScrollTrigger.create({
      trigger: inner,
      start: 'top 72%',
      end: 'bottom 20%',
      onEnter: () => tl.timeScale(1).play(),
      onLeaveBack: () => tl.timeScale(1.6).reverse(),
    });
  });
}
