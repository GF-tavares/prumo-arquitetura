/**
 * Leitura do aparelho e das preferências da pessoa. Decide o quanto de WebGL e de
 * movimento faz sentido: a experiência degrada, nunca quebra.
 */

export interface Capabilities {
  reducedMotion: boolean;
  saveData: boolean;
  webgl: boolean;
  /** ponteiro fino (mouse): habilita cursor personalizado e hover fotográfico */
  finePointer: boolean;
  hover: boolean;
  lowEnd: boolean;
  /** tela estreita (celular): layout e efeitos próprios */
  narrow: boolean;
  tier: 'high' | 'mid' | 'low';
}

interface NavigatorExtras {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    if (!gl) return false;
    const lose = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context');
    lose?.loseContext();
    return true;
  } catch {
    return false;
  }
}

let cached: Capabilities | null = null;

export function getCapabilities(): Capabilities {
  if (cached) return cached;
  const nav = navigator as Navigator & NavigatorExtras;
  const mq = (q: string) => window.matchMedia(q).matches;
  const reducedMotion = mq('(prefers-reduced-motion: reduce)');
  const saveData = nav.connection?.saveData === true;
  const finePointer = mq('(pointer: fine)');
  const hover = mq('(hover: hover)');
  const memory = nav.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const lowEnd = memory <= 2 || cores <= 2;
  const narrow = window.innerWidth < 820;
  const webgl = hasWebGL();

  let tier: Capabilities['tier'] = 'high';
  if (lowEnd || saveData) tier = 'low';
  else if (narrow || !finePointer) tier = 'mid';

  // ?tier=low|mid|high força o nível de qualidade (testes e depuração)
  const forced = new URLSearchParams(location.search).get('tier');
  if (forced === 'low' || forced === 'mid' || forced === 'high') tier = forced;

  cached = { reducedMotion, saveData, webgl, finePointer, hover, lowEnd, narrow, tier };
  return cached;
}

/** Parâmetros de qualidade do WebGL por nível. */
export const TIERS = {
  high: { shadows: true, shadowMapSize: 2048, maxDpr: 2, antialias: true },
  mid: { shadows: true, shadowMapSize: 1024, maxDpr: 1.5, antialias: true },
  low: { shadows: false, shadowMapSize: 512, maxDpr: 1, antialias: false },
} as const;
