# Créditos e origem dos assets

PRUMO é uma marca fictícia criada para portfólio. As fotografias abaixo são **provisórias** (assets DEMO, facilmente substituíveis, ver `README.md`). Cada arquivo tem a licença do site de origem: [Unsplash License](https://unsplash.com/license) e [Pexels License](https://www.pexels.com/license/), que permitem uso gratuito, inclusive comercial, sem exigir atribuição. Os créditos são cortesia. Nenhuma imagem Unsplash+ (paga) foi usada. Os originais ficam em `assets-src/` (fora do Git); `scripts/process-photos.py` aplica o tratamento de cor (dessaturação leve, sombras frias, luzes quentes, curva em S, vinheta) e grava as versões usadas em `src/assets/photos/`.

| Arquivo | Autor | Origem |
| --- | --- | --- |
| `hero-tunnel` | Anton Porsche | [Pexels 133576](https://www.pexels.com/photo/133576/) |
| `feature-hall-tree` | Ye Sichen | [Unsplash ZXi_RdPSF3A](https://unsplash.com/photos/ZXi_RdPSF3A) |
| `courtyard-tree` | Juan Nino | [Pexels 9556585](https://www.pexels.com/photo/9556585/) |
| `atlantico-ribbon-window` | Wei Feng | [Unsplash FaTv3k_czkA](https://unsplash.com/photos/FaTv3k_czkA) |
| `atlantico-sunset` | Polina Kuzovkova | [Unsplash zLCTdR6W8N4](https://unsplash.com/photos/zLCTdR6W8N4) |
| `bruma-forest` | Juan Verdaguer Aguerrebehere | [Unsplash mcSZ1pNmUNU](https://unsplash.com/photos/mcSZ1pNmUNU) |
| `bruma-hillside` | Khanh Dang | [Pexels 38433891](https://www.pexels.com/photo/38433891/) |
| `mirante-dusk` | Gustavo Galeano Maz | [Pexels 13752348](https://www.pexels.com/photo/13752348/) |
| `studio-hands` | Ron Lach | [Pexels 8086360](https://www.pexels.com/photo/8086360/) |
| `corridor-slits` | Ahmet Kayra | [Pexels 29601015](https://www.pexels.com/photo/29601015/) |
| `light-patches` | Adrien Olichon | [Pexels 18272054](https://www.pexels.com/photo/18272054/) |
| `concrete-shadow` | cottonbro studio | [Pexels 6221387](https://www.pexels.com/photo/6221387/) |
| `stair-oak-light` | Filipp Romanovski | [Pexels 18891789](https://www.pexels.com/photo/18891789/) |
| `travertine-columns` | Paolo Chiabrando | [Unsplash uezooiynnt8](https://unsplash.com/photos/uezooiynnt8) |
| `oak-slats-dark` | Ria | [Unsplash oZzoDW61aoM](https://unsplash.com/photos/oZzoDW61aoM) |
| `mat-travertine` | Khaled Al amad | [Pexels 30205474](https://www.pexels.com/photo/30205474/) |
| `mat-concrete` | Max Vakhtbovych | [Pexels 7031583](https://www.pexels.com/photo/7031583/) |
| `mat-oak` | Anastasiya Badun | [Pexels 18420992](https://www.pexels.com/photo/18420992/) |
| `mat-steel` | Ran Hua | [Pexels 23897485](https://www.pexels.com/photo/23897485/) |
| `mat-glass` | Maria Orlova | [Pexels 4906243](https://www.pexels.com/photo/4906243/) |

## Texturas (CC0)

Fundos do Material Lab derivados de texturas 1K do [ambientCG](https://ambientcg.com) (licença CC0): Travertine009, Concrete034, Wood095, CorrugatedSteel009 e Facade001. São recoloridos e escurecidos por `scripts/process-photos.py`. Os mapas de cor e de normais da Concrete034 também compõem o microrelevo do concreto das paredes da abertura em WebGL (recomprimidos, sem outra alteração); a fôrma de tábua, os furos, as manchas e a cura são procedurais.

## Tipografia

Inter Tight, Instrument Serif e IBM Plex Mono, servidas pelo próprio site via [Fontsource](https://fontsource.org), licença **SIL Open Font License 1.1**.

## Código e bibliotecas

Astro, Three.js, GSAP e Lenis (licença MIT). O grão de filme (`public/img/grain.png`) é gerado por script, sem origem externa. A planta da Casa Horizonte e todo o desenho técnico são originais deste projeto (`src/lib/plan.ts`).

## Marcas e conteúdo

Nome, textos, projetos, números, endereços e pessoas são fictícios. Os contatos usam o domínio reservado `.example`. As obras retratadas nas fotografias pertencem aos seus autores e não são projetos do PRUMO.
