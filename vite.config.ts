import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

/** CSS files of `src/styles/` emitted as is; `style.css` is their concatenation. */
const STYLES = ['content.css', 'ui.css'];

/** Emits the stylesheets of ARCHITECTURE §2 next to the JS bundles. */
function stiloStyles(): Plugin {
  return {
    name: 'stilo-styles',
    apply: 'build',
    generateBundle() {
      const sources = STYLES.map((fileName) => {
        const source = readFileSync(`src/styles/${fileName}`, 'utf8');
        this.emitFile({ type: 'asset', fileName, source });
        return source;
      });
      this.emitFile({ type: 'asset', fileName: 'style.css', source: sources.join('\n') });
    },
  };
}

export default defineConfig({
  server: { open: '/demo/' },
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        ui: 'src/ui/index.ts',
        react: 'src/react/index.ts',
        vue: 'src/vue/index.ts',
      },
      formats: ['es'],
    },
    rolldownOptions: {
      external: [
        /^prosemirror-/,
        'dompurify',
        'lucide',
        /^@floating-ui\//,
        /^react($|\/)/,
        /^vue($|\/)/,
      ],
    },
    copyPublicDir: false,
  },
  plugins: [stiloStyles()],
});
