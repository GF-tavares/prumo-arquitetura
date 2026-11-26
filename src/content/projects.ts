import type { PhotoKey } from './assets';

export interface Project {
  slug: string;
  /** Número exibido no índice (01, 02...) */
  n: string;
  name: string;
  /** Cidade */
  city: string;
  year: number;
  category: 'Residencial' | 'Interiores';
  /** Área construída em m² */
  area: number;
  /** Uma frase de conceito (pt-BR, sem travessão) */
  concept: string;
  /** Texto mais longo para a página do projeto */
  story: string[];
  cover: PhotoKey;
  /** Imagens extras da página do projeto */
  gallery: PhotoKey[];
  /** Ficha técnica curta da página do projeto */
  facts: { label: string; value: string }[];
}

/** Projetos fictícios. Área e datas inventadas. */
export const projects: Project[] = [
  {
    slug: 'casa-horizonte',
    n: '01',
    name: 'Casa Horizonte',
    city: 'Rio de Janeiro',
    year: 2026,
    category: 'Residencial',
    area: 580,
    concept: 'Um plano longo entre a serra e o mar, aberto nas duas pontas. A casa não sobe: ela se estende.',
    story: [
      'O terreno estreito e comprido pedia uma casa que fosse um eixo. Do portão ao fundo do jardim, uma única linha atravessa cinco ambientes, cada um separado do próximo por uma porta alinhada com a anterior.',
      'Quem entra enxerga a casa inteira e, ao fundo, uma árvore. O concreto aparente esfria o interior; a luz da tarde entra pelas pontas e desenha o dia nas paredes.',
    ],
    cover: 'featureHallTree',
    gallery: ['corridorSlits', 'concreteShadow'],
    facts: [
      { label: 'Programa', value: 'Residência unifamiliar, 4 suítes' },
      { label: 'Estrutura', value: 'Concreto aparente moldado em tábua' },
      { label: 'Materiais', value: 'Concreto, carvalho, vidro extra claro' },
      { label: 'Status', value: 'Concluída em 2026' },
    ],
  },
  {
    slug: 'casa-patio',
    n: '02',
    name: 'Casa Pátio',
    city: 'São Paulo',
    year: 2025,
    category: 'Residencial',
    area: 420,
    concept: 'Todos os ambientes se voltam para um vazio central. No meio, uma árvore que a casa aprendeu a acompanhar.',
    story: [
      'Em um lote cercado por muros altos, a resposta foi virar a casa para dentro. Sala, cozinha e quartos abrem para um pátio de pedra com uma única árvore, plantada antes de qualquer parede.',
      'A cobertura é uma laje dobrada que deixa o céu entrar exatamente sobre a copa. O vazio é o cômodo mais importante e o único que ninguém precisou mobiliar.',
    ],
    cover: 'courtyardTree',
    gallery: ['travertineColumns', 'lightPatches'],
    facts: [
      { label: 'Programa', value: 'Residência unifamiliar, 3 suítes' },
      { label: 'Estrutura', value: 'Laje dobrada em concreto protendido' },
      { label: 'Materiais', value: 'Travertino, madeira escura, concreto' },
      { label: 'Status', value: 'Concluída em 2025' },
    ],
  },
  {
    slug: 'apartamento-atlantico',
    n: '03',
    name: 'Apartamento Atlântico',
    city: 'Rio de Janeiro',
    year: 2026,
    category: 'Interiores',
    area: 260,
    concept: 'Concreto aparente, uma janela em faixa e o oceano como a única parede colorida.',
    story: [
      'Um apartamento de frente para o mar em que quase tudo foi retirado. As divisórias saíram, o concreto original ficou à vista e a paleta terminou em três tons: cinza, madeira e o azul que entra pela janela.',
      'A vista não compete com nada. O mobiliário é baixo, a iluminação é indireta e o banco corrido sob a janela vira o lugar onde a casa inteira se reúne ao fim do dia.',
    ],
    cover: 'atlanticoRibbonWindow',
    gallery: ['atlanticoSunset', 'oakSlatsDark'],
    facts: [
      { label: 'Programa', value: 'Apartamento, 2 suítes e biblioteca' },
      { label: 'Intervenção', value: 'Retrofit com estrutura aparente' },
      { label: 'Materiais', value: 'Concreto, carvalho, aço patinado' },
      { label: 'Status', value: 'Concluído em 2026' },
    ],
  },
  {
    slug: 'villa-bruma',
    n: '04',
    name: 'Villa Bruma',
    city: 'Petrópolis',
    year: 2025,
    category: 'Residencial',
    area: 690,
    concept: 'Uma casa que aparece e some com a neblina da serra. Materiais escuros, luz filtrada.',
    story: [
      'Na serra, metade do ano a paisagem desaparece. Em vez de disputar com a neblina, a Villa Bruma usa materiais que absorvem a luz e volumes que se confundem com a mata.',
      'As varandas são fundas, as esquadrias são pretas e o interior é aquecido por madeira. Nos dias limpos a casa se abre; nos dias fechados ela se recolhe, e as duas versões funcionam.',
    ],
    cover: 'brumaHillside',
    gallery: ['brumaForest'],
    facts: [
      { label: 'Programa', value: 'Residência de campo, 5 suítes' },
      { label: 'Estrutura', value: 'Concreto e madeira laminada' },
      { label: 'Materiais', value: 'Madeira queimada, pedra, aço' },
      { label: 'Status', value: 'Concluída em 2025' },
    ],
  },
  {
    slug: 'casa-mirante',
    n: '05',
    name: 'Casa Mirante',
    city: 'Búzios',
    year: 2024,
    category: 'Residencial',
    area: 640,
    concept: 'Dois volumes em balanço sobre um jardim inclinado. À noite, a casa vira uma lanterna.',
    story: [
      'A casa é dois blocos de concreto que avançam sobre o declive. O de baixo abriga a vida social, o de cima os quartos, e o vazio entre eles é uma varanda contínua voltada para a baía.',
      'À noite as fachadas de vidro se acendem e o concreto some no escuro. Do jardim, a casa parece flutuar; de dentro, o horizonte é a única parede que importa.',
    ],
    cover: 'miranteDusk',
    gallery: ['stairOakLight'],
    facts: [
      { label: 'Programa', value: 'Casa de veraneio, 6 suítes' },
      { label: 'Estrutura', value: 'Balanços em concreto armado' },
      { label: 'Materiais', value: 'Concreto, vidro, madeira clara' },
      { label: 'Status', value: 'Concluída em 2024' },
    ],
  },
];

export const findProject = (slug: string) => projects.find((p) => p.slug === slug);
