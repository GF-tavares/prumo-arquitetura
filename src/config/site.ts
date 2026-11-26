/**
 * Configuração central da marca fictícia PRUMO.
 * Tudo aqui é conteúdo de portfólio: nome, contatos e números são inventados.
 * Os contatos usam o domínio reservado .example.
 */
export const site = {
  name: 'PRUMO',
  legalName: 'Prumo Arquitetura e Interiores',
  tagline: 'Arquitetura e interiores',
  title: 'PRUMO | Arquitetura e interiores, Rio de Janeiro',
  description:
    'Escritório de arquitetura e interiores no Rio de Janeiro. Casas e apartamentos desenhados a partir de uma pergunta: como você quer viver? Projeto conceitual de portfólio.',
  locale: 'pt-BR',
  city: 'Rio de Janeiro',
  country: 'Brasil',
  coords: '22°54′S 43°12′W',
  email: 'studio@prumo.example',
  instagram: { handle: '@prumo.arquitetura', url: 'https://www.instagram.com/' },
  founded: 2011,
  maker: 'Gustavo Tavares',
  demoNotice:
    'Projeto conceitual de portfólio. Marca, textos, números e projetos são fictícios; as fotografias são imagens de banco (Unsplash e Pexels) usadas como provisórias.',
} as const;

/** Ponto focal do herói. Usado igual no <img> (object-position) e na textura do WebGL da abertura. */
export const HERO_FOCUS = { x: 0.34, y: 0.5 } as const;

export const nav = [
  { id: 'studio', index: '01', label: 'Estúdio', href: '#studio', image: 'studioHands' },
  { id: 'projects', index: '02', label: 'Projetos', href: '#projects', image: 'miranteDusk' },
  { id: 'method', index: '03', label: 'Método', href: '#method', image: 'lightPatches' },
  { id: 'contact', index: '04', label: 'Contato', href: '#contact', image: 'corridorSlits' },
] as const;
