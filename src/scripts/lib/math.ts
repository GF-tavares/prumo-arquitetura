/** Utilidades numéricas e curvas de easing (puras, sem DOM). */

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const clamp01 = (v: number) => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => (b === a ? 0 : (v - a) / (b - a));
export const remap01 = (a: number, b: number, v: number) => clamp01(invLerp(a, b, v));
export const smoothstep = (a: number, b: number, v: number) => {
  const t = remap01(a, b, v);
  return t * t * (3 - 2 * t);
};

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeInOutQuart = (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInCubic = (t: number) => t * t * t;
export const easeInQuad = (t: number) => t * t;

/**
 * Perfil de velocidade trapezoidal: acelera durante a fração `a`, mantém, freia durante `d`.
 * Devolve a posição normalizada (0 a 1) no instante s. Passeio de câmera natural, sem "chicote".
 */
export function trapezoid(s: number, a: number, d: number): number {
  const t = clamp01(s);
  const area = 1 - a / 2 - d / 2;
  if (t < a) return (t * t) / (2 * a) / area;
  if (t < 1 - d) return (a / 2 + (t - a)) / area;
  const r = 1 - t;
  return 1 - (r * r) / (2 * d * area);
}

/** Hash estável 0..1 a partir de uma string (para variações determinísticas). */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** Aproxima o valor de `target` com suavização independente do frame rate. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));
