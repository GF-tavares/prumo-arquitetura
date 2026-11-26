import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// SITE_URL e BASE_PATH mudam quando o projeto for publicado dentro de outro
// domínio (ex.: SITE_URL=https://exemplo.com.br BASE_PATH=/projetos/prumo).
const site = process.env.SITE_URL ?? 'https://prumo.example';
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  server: { host: '127.0.0.1', port: 4350 },
  integrations: [sitemap()],
  image: {
    // As fotos tratadas em src/assets/ viram AVIF/WebP em várias larguras no build.
    responsiveStyles: false,
  },
  vite: {
    // O Three.js (~536 KB, 131 KB gz) é um chunk à parte, carregado só quando a abertura ou o Material Lab rodam.
    build: { target: 'es2022', chunkSizeWarningLimit: 700 },
  },
});
