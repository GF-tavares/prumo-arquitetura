/**
 * Roteiro da abertura, em segundos. Toda a abertura é uma função pura do tempo t:
 * a cena, os rótulos e as frases leem estes números. Para mudar o ritmo, mude aqui.
 *
 *   IDEIA   0 a 8,6 s   linhas finas desenham a planta; a câmera se afasta;
 *                       a frase surge em três tempos
 *   MATÉRIA 8,6 a 13 s  as linhas ganham altura, o sol nasce, a câmera desce
 *   ESPAÇO  13 a 17 s   a câmera atravessa as portas alinhadas e chega à fotografia
 */
export const T = {
  /** primeiros rótulos técnicos */
  labelsIn: 0.5,
  /** janela de desenho das linhas (cada linha tem um atraso próprio dentro dela) */
  drawStart: 0.7,
  /** afastamento da câmera: do detalhe ao desenho inteiro */
  pull: [0.7, 6.6] as const,
  /** início de cada frase (cada uma leva ~1,1 s para entrar) */
  phrase: [2.7, 4.5, 6.3] as const,
  phraseHold: 8.4,
  phraseOut: [8.4, 9.2] as const,
  /** rótulos saem antes das paredes crescerem */
  labelsOut: [8.2, 9.4] as const,
  /** as linhas ganham altura */
  rise: [8.8, 12.2] as const,
  /** o sol nasce */
  sun: [8.6, 12.0] as const,
  /** câmera: do plano superior ao aéreo, e descida até a porta */
  aerial: [8.8, 13.6] as const,
  /** travessia pelo eixo */
  fly: [14.0, 18.4] as const,
  /** o corte para a home acontece aqui */
  end: 18.4,
} as const;

/** Campo de visão vertical (graus), constante: a distância de "preenchimento" da foto depende dele. */
export const FOV = 34;
