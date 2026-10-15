import { readFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const PAGES = ['index', 'performance', 'paste', 'headless'];

/**
 * Replaces `<!-- site:name -->` with `site/partials/name.html` (head, header, footer) and marks
 * the page's own link in the navigation as the current one.
 */
function sitePartials(): Plugin {
  return {
    name: 'site-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html, { filename }) {
        const page = basename(filename, '.html');
        const href = page === 'index' ? './' : `./${page}.html`;
        return html
          .replace(/<!-- site:(\w+) -->\n?/g, (_, name: string) =>
            readFileSync(resolve('site/partials', `${name}.html`), 'utf8'),
          )
          .replace(`<a href="${href}">`, `<a href="${href}" aria-current="page">`);
      },
    },
    handleHotUpdate({ file, server }) {
      if (file.includes('/site/partials/')) server.ws.send({ type: 'full-reload' });
    },
  };
}

/**
 * Serves the repository's `assets/` SVGs (logo, favicon) in dev: the pages reference them as
 * `../assets/`, outside the site root. The build resolves those paths by itself.
 */
function repositoryAssets(): Plugin {
  const dir = resolve('assets');
  return {
    name: 'site-repository-assets',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/assets', (req, res, next) => {
        const file = join(dir, decodeURIComponent((req.url ?? '').split('?')[0]!));
        if (!file.startsWith(dir + sep) || !file.endsWith('.svg')) return next();
        try {
          const svg = readFileSync(file);
          res.setHeader('Content-Type', 'image/svg+xml');
          res.end(svg);
        } catch {
          next();
        }
      });
    },
  };
}

/**
 * The public site (GitHub Pages): `npm run site` serves it, `npm run build:site` builds it into
 * `dist-site/`. Relative base, so the pages work under any path.
 */
export default defineConfig({
  root: 'site',
  base: './',
  build: {
    outDir: '../dist-site',
    emptyOutDir: true,
    rolldownOptions: {
      input: Object.fromEntries(PAGES.map((page) => [page, resolve('site', `${page}.html`)])),
    },
  },
  plugins: [sitePartials(), repositoryAssets()],
});
