import { readFileSync } from 'node:fs';
import { svelte } from '@sveltejs/vite-plugin-svelte';
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

/** Files of `src/svelte/` emitted as is: the application compiles the component (ADR 0006). */
const SVELTE_SOURCES = ['stilo-editor.svelte', 'stilo-editor.svelte.d.ts'];

/** Emits the Svelte component and its types next to `svelte/index.js`. */
function stiloSvelteSources(): Plugin {
  return {
    name: 'stilo-svelte-sources',
    apply: 'build',
    generateBundle() {
      for (const name of SVELTE_SOURCES) {
        const source = readFileSync(`src/svelte/${name}`, 'utf8');
        this.emitFile({ type: 'asset', fileName: `svelte/${name}`, source });
      }
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
        'svelte/index': 'src/svelte/index.ts',
        'svelte/action': 'src/svelte/action.ts',
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
        /^svelte($|\/)/,
        /\.svelte$/,
      ],
      // React Server Components: the React wrapper is client code (ADR 0006). Rolldown warns that
      // it may not preserve a directive written in the source.
      output: { banner: (chunk) => (chunk.name === 'react' ? "'use client';" : '') },
    },
    copyPublicDir: false,
  },
  plugins: [stiloStyles(), stiloSvelteSources(), svelte({ configFile: false })],
});
