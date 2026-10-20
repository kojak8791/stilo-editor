// Bundle size of typical apps that use Stilo, built from dist/ like a consumer would
// (docs/PERFORMANCE.md). Fails if the minimal app contains packages that only the extensions it
// does not import need: a sign that tree-shaking broke.
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'vite';

const dist = fileURLToPath(new URL('../dist/', import.meta.url)).replaceAll('\\', '/');
const entry = '\0size-entry';

const apps = [
  {
    name: 'Minimal (Document, Text, Paragraph, Bold)',
    code: `import { Bold, Document, Editor, Paragraph, Text } from 'stilo-editor';
new Editor({ element: document.body, extensions: [Document(), Text(), Paragraph(), Bold()] });`,
    absent: ['prosemirror-dropcursor', 'prosemirror-gapcursor', 'prosemirror-schema-list'],
  },
  {
    name: 'Core + defaultExtensions',
    code: `import { Editor, defaultExtensions } from 'stilo-editor';
new Editor({ element: document.body, extensions: [defaultExtensions()] });`,
    absent: [],
  },
  {
    name: 'Core + defaultExtensions + UI',
    code: `import { Editor, defaultExtensions } from 'stilo-editor';
import { createToolbar } from 'stilo-editor/ui';
const editor = new Editor({ element: document.body, extensions: [defaultExtensions()] });
createToolbar(editor, { container: document.body });`,
    absent: [],
  },
  {
    name: 'React: useStiloEditor + defaultExtensions',
    code: `import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { defaultExtensions } from 'stilo-editor';
import { useStiloEditor } from 'stilo-editor/react';
function App() {
  const { ref } = useStiloEditor({ extensions: [defaultExtensions()] });
  return createElement('div', { ref });
}
createRoot(document.body).render(createElement(App));`,
    absent: ['lucide', '@floating-ui/dom'],
  },
  {
    name: 'React: StiloEditor',
    code: `import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { StiloEditor } from 'stilo-editor/react';
createRoot(document.body).render(createElement(StiloEditor));`,
    absent: [],
  },
];

/**
 * Bundles `code` minified, in memory. Returns the JavaScript loaded at startup (the entry and
 * its static imports), the JavaScript loaded on demand (dynamic imports) and the IDs of the
 * modules loaded at startup.
 */
async function bundle(code) {
  const output = await build({
    configFile: false,
    logLevel: 'silent',
    resolve: {
      alias: [
        { find: /^stilo-editor\/ui$/, replacement: `${dist}ui.js` },
        { find: /^stilo-editor\/react$/, replacement: `${dist}react.js` },
        { find: /^stilo-editor$/, replacement: `${dist}index.js` },
      ],
    },
    plugins: [
      {
        name: 'size-entry',
        resolveId: (id) => (id === entry ? id : null),
        load: (id) => (id === entry ? code : null),
      },
    ],
    // React is the application's: the React apps measure what Stilo adds to them.
    build: {
      write: false,
      minify: true,
      rollupOptions: { input: entry, external: [/^react(-dom)?($|\/)/] },
    },
  });
  const chunks = (Array.isArray(output) ? output : [output])
    .flatMap((result) => result.output)
    .filter((file) => file.type === 'chunk');
  const startup = new Set(chunks.filter((chunk) => chunk.isEntry));
  for (const chunk of startup) {
    for (const imported of chunks.filter((c) => chunk.imports.includes(c.fileName))) {
      startup.add(imported);
    }
  }
  const onDemand = chunks.filter((chunk) => !startup.has(chunk));
  const modules = [...startup].flatMap((chunk) =>
    Object.entries(chunk.modules)
      .filter(([, module]) => module.renderedLength > 0)
      .map(([id]) => id.replaceAll('\\', '/')),
  );
  const join = (list) => list.map((chunk) => chunk.code).join('\n');
  return { js: join([...startup]), lazy: join(onDemand), modules };
}

const kB = (bytes) => `${(bytes / 1000).toFixed(1)} kB`.padStart(9);
const sizes = (js) => `${kB(Buffer.byteLength(js))}${kB(gzipSync(js, { level: 9 }).length)}`;

console.log(
  `${'App (loaded at startup)'.padEnd(44)}${'Minified'.padStart(9)}${'Gzip'.padStart(9)}`,
);
for (const app of apps) {
  const { js, lazy, modules } = await bundle(app.code);
  console.log(`${app.name.padEnd(44)}${sizes(js)}`);
  if (lazy) console.log(`${'  + loaded on demand'.padEnd(44)}${sizes(lazy)}`);
  const found = app.absent.filter((name) =>
    modules.some((id) => id.includes(`/node_modules/${name}/`)),
  );
  if (found.length > 0) {
    console.error(`  Not tree-shaken: ${found.join(', ')}`);
    process.exitCode = 1;
  }
}
