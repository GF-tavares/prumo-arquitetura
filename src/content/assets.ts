/**
 * MANIFESTO DE ASSETS (DEMO).
 *
 * Todas as fotografias abaixo são imagens de banco (Unsplash e Pexels, licenças
 * que permitem uso gratuito) tratadas por scripts/process-photos.py. Servem
 * apenas como provisórias: os projetos e o escritório são fictícios e as obras
 * retratadas pertencem a outros autores.
 *
 * Para trocar uma imagem, substitua o arquivo em src/assets/photos/ (ou aponte
 * o import para outro) e ajuste o alt e o crédito. O resto do site lê só daqui.
 * Créditos completos em CREDITOS.md.
 */
import type { ImageMetadata } from 'astro';

import heroTunnel from '../assets/photos/hero-tunnel.jpg';
import featureHallTree from '../assets/photos/feature-hall-tree.jpg';
import courtyardTree from '../assets/photos/courtyard-tree.jpg';
import atlanticoRibbonWindow from '../assets/photos/atlantico-ribbon-window.jpg';
import atlanticoSunset from '../assets/photos/atlantico-sunset.jpg';
import brumaForest from '../assets/photos/bruma-forest.jpg';
import brumaHillside from '../assets/photos/bruma-hillside.jpg';
import miranteDusk from '../assets/photos/mirante-dusk.jpg';
import studioHands from '../assets/photos/studio-hands.jpg';
import corridorSlits from '../assets/photos/corridor-slits.jpg';
import lightPatches from '../assets/photos/light-patches.jpg';
import concreteShadow from '../assets/photos/concrete-shadow.jpg';
import stairOakLight from '../assets/photos/stair-oak-light.jpg';
import travertineColumns from '../assets/photos/travertine-columns.jpg';
import oakSlatsDark from '../assets/photos/oak-slats-dark.jpg';

import matTravertine from '../assets/photos/mat-travertine.jpg';
import matConcrete from '../assets/photos/mat-concrete.jpg';
import matOak from '../assets/photos/mat-oak.jpg';
import matSteel from '../assets/photos/mat-steel.jpg';
import matGlass from '../assets/photos/mat-glass.jpg';

import texTravertine from '../assets/textures/travertine.jpg';
import texConcrete from '../assets/textures/concrete.jpg';
import texOak from '../assets/textures/oak.jpg';
import texSteel from '../assets/textures/steel.jpg';
import texGlass from '../assets/textures/glass.jpg';

export interface Photo {
  src: ImageMetadata;
  alt: string;
  /** object-position da imagem (recorte em telas de outra proporção) */
  focus?: string;
  credit: { author: string; source: 'Unsplash' | 'Pexels'; url: string };
}

const px = (id: number, author: string) => ({
  author,
  source: 'Pexels' as const,
  url: `https://www.pexels.com/photo/${id}/`,
});
const us = (id: string, author: string) => ({
  author,
  source: 'Unsplash' as const,
  url: `https://unsplash.com/photos/${id}`,
});

export const photos = {
  heroTunnel: {
    src: heroTunnel,
    alt: 'Túnel de concreto aparente com feixes de sol entrando por aberturas inclinadas e desenhando faixas de luz na parede.',
    focus: '34% 50%',
    credit: px(133576, 'Anton Porsche'),
  },
  featureHallTree: {
    src: featureHallTree,
    alt: 'Salão de concreto com uma única árvore visível através da abertura ao fundo.',
    focus: '50% 50%',
    credit: us('ZXi_RdPSF3A', 'Ye Sichen'),
  },
  courtyardTree: {
    src: courtyardTree,
    alt: 'Pátio interno com uma grande árvore emoldurada pela dobra de uma laje branca.',
    focus: '50% 45%',
    credit: px(9556585, 'Juan Nino'),
  },
  atlanticoRibbonWindow: {
    src: atlanticoRibbonWindow,
    alt: 'Sala de concreto aparente com janela em faixa voltada para o oceano e almofadas brancas no banco.',
    focus: '50% 50%',
    credit: us('FaTv3k_czkA', 'Wei Feng'),
  },
  atlanticoSunset: {
    src: atlanticoSunset,
    alt: 'Sala com esquadrias escuras do piso ao teto e vista do mar ao pôr do sol.',
    focus: '50% 50%',
    credit: us('zLCTdR6W8N4', 'Polina Kuzovkova'),
  },
  brumaForest: {
    src: brumaForest,
    alt: 'Casa de madeira e vidro em balanço sobre pedras e samambaias, cercada por árvores.',
    focus: '50% 42%',
    credit: us('mcSZ1pNmUNU', 'Juan Verdaguer Aguerrebehere'),
  },
  brumaHillside: {
    src: brumaHillside,
    alt: 'Casa de madeira e vidro na encosta, com a serra encoberta pela neblina ao fundo.',
    focus: '30% 50%',
    credit: px(38433891, 'Khanh Dang'),
  },
  miranteDusk: {
    src: miranteDusk,
    alt: 'Casa contemporânea de concreto e vidro ao entardecer, com volumes em balanço e a sala iluminada.',
    focus: '50% 50%',
    credit: px(13752348, 'Gustavo Galeano Maz'),
  },
  studioHands: {
    src: studioHands,
    alt: 'Mãos montando a maquete de papel de um ambiente sobre uma mesa de madeira com desenhos e óculos.',
    focus: '55% 50%',
    credit: px(8086360, 'Ron Lach'),
  },
  corridorSlits: {
    src: corridorSlits,
    alt: 'Corredor longo de concreto com frestas verticais de luz e luminárias embutidas.',
    focus: '60% 50%',
    credit: px(29601015, 'Ahmet Kayra'),
  },
  lightPatches: {
    src: lightPatches,
    alt: 'Passagem estreita de concreto com retângulos de sol projetados no piso.',
    focus: '50% 60%',
    credit: px(18272054, 'Adrien Olichon'),
  },
  concreteShadow: {
    src: concreteShadow,
    alt: 'Parede de concreto com furos de fôrma e a sombra de uma figura projetada sobre ela.',
    focus: '50% 40%',
    credit: px(6221387, 'cottonbro studio'),
  },
  stairOakLight: {
    src: stairOakLight,
    alt: 'Escada de madeira clara com faixas de sol sobre os degraus, ao lado de uma parede de concreto.',
    focus: '50% 50%',
    credit: px(18891789, 'Filipp Romanovski'),
  },
  travertineColumns: {
    src: travertineColumns,
    alt: 'Colunas de travertino com sombras profundas marcando o ritmo do pórtico.',
    focus: '40% 50%',
    credit: us('uezooiynnt8', 'Paolo Chiabrando'),
  },
  oakSlatsDark: {
    src: oakSlatsDark,
    alt: 'Ripas horizontais de madeira escura com sombras finas entre cada peça.',
    focus: '50% 50%',
    credit: us('oZzoDW61aoM', 'Ria'),
  },
} as const satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof photos;

/** Material Lab: cada material aplicado em um ambiente (fotografias provisórias). */
export interface MaterialShot extends Photo {
  /** Legenda do ambiente (projeto fictício ao qual a imagem é atribuída na página) */
  place: string;
}

export const materialShots = {
  travertine: {
    src: matTravertine,
    alt: 'corredor revestido de travertino, com nichos e luz embutida no piso.',
    place: 'Corredor da suíte, Casa Pátio',
    focus: '50% 55%',
    credit: px(30205474, 'Khaled Al amad'),
  },
  concrete: {
    src: matConcrete,
    alt: 'parede de concreto aparente com juntas de fôrma, ao lado de uma escada de degraus suspensos.',
    place: 'Escada, Casa Horizonte',
    focus: '38% 50%',
    credit: px(7031583, 'Max Vakhtbovych'),
  },
  oak: {
    src: matOak,
    alt: 'escada e revestimento de carvalho claro sob uma claraboia.',
    place: 'Escada, Apartamento Atlântico',
    focus: '62% 55%',
    credit: px(18420992, 'Anastasiya Badun'),
  },
  steel: {
    src: matSteel,
    alt: 'fachada de aço patinado e vidro em uma casa entre árvores sem folhas.',
    place: 'Fachada, Casa Mirante',
    focus: '28% 50%',
    credit: px(23897485, 'Ran Hua'),
  },
  glass: {
    src: matGlass,
    alt: 'sala de jantar de madeira com paredes de vidro do piso ao forro e vista para o pinheiral.',
    place: 'Sala de jantar, Villa Bruma',
    focus: '50% 50%',
    credit: px(4906243, 'Maria Orlova'),
  },
} as const satisfies Record<string, MaterialShot>;

/** Fundos do Material Lab (tratados de texturas CC0 do ambientCG). */
export const materialBackdrops = {
  travertine: texTravertine,
  concrete: texConcrete,
  oak: texOak,
  steel: texSteel,
  glass: texGlass,
} as const;

/** Créditos das texturas CC0 (ambientCG) usadas nos fundos do Material Lab. */
export const textureCredits = {
  travertine: 'Travertine009',
  concrete: 'Concrete034',
  oak: 'Wood095',
  steel: 'CorrugatedSteel009',
  glass: 'Facade001',
} as const;
