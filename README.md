# PRUMO · site conceitual de arquitetura

**Demo ao vivo:** https://gustavotavaresai.com.br/projetos/prumo/

Site de um escritório de arquitetura e interiores **fictício** do Rio de
Janeiro, feito como peça de portfólio. A ideia central: "Antes de existir,
todo espaço é uma intenção." O site percorre IDEIA, DESENHO, MATÉRIA e ESPAÇO.

## Destaques técnicos

- **Abertura em WebGL com Three.js** (`src/scripts/intro/`): linhas desenham a
  planta de uma casa, as paredes sobem com concreto aparente procedural
  (fôrma de tábua, juntas, poros com mapa de normais, manchas de chuva), o
  sol nasce e a câmera atravessa os ambientes até parar exatamente sobre a
  foto de abertura do site. A animação é uma função pura do tempo, `render(t)`.
- **Níveis de qualidade automáticos** do WebGL conforme o aparelho, com
  versão estática para quem prefere menos movimento
- **Astro + TypeScript**, site estático com páginas de projeto geradas a
  partir de dados (`src/content/projects.ts`)
- **GSAP + Lenis** para as animações e a rolagem do restante do site
- Tratamento de fotos automatizado em **Python** (`scripts/process-photos.py`)
- SEO técnico: sitemap, `robots.txt`, Open Graph e página 404

## Rodar localmente

Requer Node.js 22.12 ou superior.

```bash
npm install
npm run dev      # http://127.0.0.1:4350
npm run build    # astro check + build de produção
```

Parâmetros úteis na URL: `?intro=0` pula a abertura, `?tier=low|mid|high`
força o nível de qualidade do WebGL.

## Estrutura

```text
src/
  scripts/intro/        abertura em WebGL (cena, concreto, linhas, tempo)
  components/sections/  seções da home
  content/projects.ts   dados dos projetos (geram as páginas /projetos/*)
  config/site.ts        configuração central da marca
scripts/process-photos.py  tratamento de cor das fotos
```

## Créditos

Marca, textos, números e obras são fictícios. As fotografias são do
Unsplash e do Pexels (licenças de uso livre). Detalhes em
[CREDITOS.md](CREDITOS.md).

---

Feito por **Gustavo Tavares** · [LinkedIn](https://www.linkedin.com/in/gustavotavaresai/) · [gustavotavaresai.com.br](https://gustavotavaresai.com.br)
