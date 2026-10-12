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
    name: 'Core + StarterKit',
    code: `import { Editor, StarterKit } from 'stilo-editor';
new Editor({ element: document.body, extensions: [StarterKit()] });`,
    absent: [],
  },
  {
    name: 'Core + StarterKit + UI',
    code: `import { Editor, StarterKit } from 'stilo-editor';
import { createToolbar } from 'stilo-editor/ui';
const editor = new Editor({ element: document.body, extensions: [StarterKit()] });
createToolbar(editor, { container: document.body });`,
    absent: [],
  },
];

/** Bundles `code` minified, in memory: the JavaScript and the IDs of the modules it contains. */
async function bundle(code) {
  const output = await build({
    configFile: false,
    logLevel: 'silent',
    resolve: {
      alias: [
        { find: /^stilo-editor\/ui$/, replacement: `${dist}ui.js` },
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
    build: { write: false, minify: true, rollupOptions: { input: entry } },
  });
  const chunks = (Array.isArray(output) ? output : [output])
    .flatMap((result) => result.output)
    .filter((file) => file.type === 'chunk');
  const modules = chunks.flatMap((chunk) =>
    Object.entries(chunk.modules)
      .filter(([, module]) => module.renderedLength > 0)
      .map(([id]) => id.replaceAll('\\', '/')),
  );
  return { js: chunks.map((chunk) => chunk.code).join('\n'), modules };
}

const kB = (bytes) => `${(bytes / 1000).toFixed(1)} kB`.padStart(9);

console.log(`${'App'.padEnd(44)}${'Minified'.padStart(9)}${'Gzip'.padStart(9)}`);
for (const app of apps) {
  const { js, modules } = await bundle(app.code);
  const sizes = `${kB(Buffer.byteLength(js))}${kB(gzipSync(js, { level: 9 }).length)}`;
  console.log(`${app.name.padEnd(44)}${sizes}`);
  const found = app.absent.filter((name) =>
    modules.some((id) => id.includes(`/node_modules/${name}/`)),
  );
  if (found.length > 0) {
    console.error(`  Not tree-shaken: ${found.join(', ')}`);
    process.exitCode = 1;
  }
}
