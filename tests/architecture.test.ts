import { readdir, readFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { describe, expect, it } from 'vitest';

/** A file area with its allowed packages and allowed relative targets. */
interface Area {
  prefix: string;
  packages: Set<string>;
  relativePrefixes: string[];
}

const areas: Area[] = [
  {
    prefix: 'index.ts',
    packages: new Set(),
    relativePrefixes: ['core/', 'extensions/'],
  },
  {
    prefix: 'core/',
    packages: new Set([
      'dompurify',
      'prosemirror-model',
      'prosemirror-state',
      'prosemirror-view',
      'prosemirror-transform',
      'prosemirror-commands',
      'prosemirror-keymap',
      'prosemirror-history',
      'prosemirror-inputrules',
      'prosemirror-schema-list',
      'prosemirror-tables',
      'prosemirror-dropcursor',
      'prosemirror-gapcursor',
    ]),
    relativePrefixes: ['core/'],
  },
  {
    prefix: 'extensions/',
    packages: new Set([
      'prosemirror-model',
      'prosemirror-state',
      'prosemirror-view',
      'prosemirror-transform',
      'prosemirror-commands',
      'prosemirror-keymap',
      'prosemirror-history',
      'prosemirror-inputrules',
      'prosemirror-schema-list',
      'prosemirror-tables',
      'prosemirror-dropcursor',
      'prosemirror-gapcursor',
    ]),
    relativePrefixes: ['core/', 'extensions/'],
  },
  {
    prefix: 'ui/',
    packages: new Set(['lucide', '@floating-ui/dom']),
    relativePrefixes: ['ui/', 'index'],
  },
];

/** Check a single specifier against the rules for a given file area. */
function checkSpecifier(fileArea: Area, specifier: string, fileDir: string): string | undefined {
  // Package import
  if (!specifier.startsWith('.')) {
    if (!fileArea.packages.has(specifier)) {
      return specifier;
    }
    return undefined;
  }

  // Relative import: resolve from file directory and check against allowed prefixes
  const resolved = posix.resolve(`/base/${fileDir}`, specifier).replace(/^\/base\//, '');
  const stripped = resolved.startsWith('./') ? resolved.slice(2) : resolved;
  for (const prefix of fileArea.relativePrefixes) {
    const prefixWithoutSlash = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
    if (stripped === prefixWithoutSlash || stripped === prefix || stripped.startsWith(prefix)) {
      return undefined;
    }
  }
  return resolved;
}

/** Check a file against the import rules. Returns violations. */
function checkFile(relativePath: string, content: string): string[] {
  const area = areas.find((a) => {
    if (a.prefix === 'index.ts') return relativePath === 'index.ts';
    return relativePath.startsWith(a.prefix);
  });
  if (!area) return [];

  const fileDir = relativePath.startsWith('index.ts')
    ? ''
    : relativePath.slice(0, relativePath.lastIndexOf('/'));
  const violations: string[] = [];

  // Match import/export specifiers: import '…', import from '…', export from '…'
  const importRegex = /(?:import|export)\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while (true) {
    match = importRegex.exec(content);
    if (match === null) break;
    const specifier = match[1]!;
    const violation = checkSpecifier(area, specifier, fileDir);
    if (violation) {
      violations.push(`${relativePath.replace(/\\/g, '/')}: '${specifier}'`);
    }
  }

  // Also match bare import: import '…'
  const bareImportRegex = /import\s+['"]([^'"]+)['"]/g;
  while (true) {
    match = bareImportRegex.exec(content);
    if (match === null) break;
    const specifier = match[1]!;
    // Skip if already matched by the from pattern
    if (specifier.startsWith('.')) {
      const violation = checkSpecifier(area, specifier, fileDir);
      if (violation) {
        violations.push(`${relativePath.replace(/\\/g, '/')}: '${specifier}'`);
      }
    } else if (!area.packages.has(specifier)) {
      violations.push(`${relativePath.replace(/\\/g, '/')}: '${specifier}'`);
    }
  }

  // Dynamic import: import('…')
  const dynamicImportRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  while (true) {
    match = dynamicImportRegex.exec(content);
    if (match === null) break;
    const specifier = match[1]!;
    const violation = checkSpecifier(area, specifier, fileDir);
    if (violation) {
      violations.push(`${relativePath.replace(/\\/g, '/')}: '${specifier}'`);
    }
  }

  return violations;
}

/** Walk a directory recursively, returning relative paths with forward slashes. */
async function walk(dir: string, base: string): Promise<string[]> {
  const entries = await readdir(join(base, dir), { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      results.push(...(await walk(full, base)));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      results.push(full);
    }
  }
  return results;
}

describe('architecture import rules', () => {
  const cases: ReadonlyArray<[file: string, source: string, violations: string[]]> = [
    ['core/editor.ts', "import { EditorView } from 'prosemirror-view';", []],
    ['core/html/sanitize.ts', "import DOMPurify from 'dompurify';", []],
    [
      'core/editor.ts',
      "import { x } from '../ui/toolbar/toolbar';",
      ["core/editor.ts: '../ui/toolbar/toolbar'"],
    ],
    ['core/editor.ts', "import { Bold } from 'lucide';", ["core/editor.ts: 'lucide'"]],
    [
      'core/editor.ts',
      "import { Bold } from '../extensions/bold';",
      ["core/editor.ts: '../extensions/bold'"],
    ],
    ['extensions/bold/index.ts', "import { defineExtension } from '../../core/extension';", []],
    ['extensions/bold/index.ts', "import { Italic } from '../italic';", []],
    [
      'extensions/bold/index.ts',
      "import DOMPurify from 'dompurify';",
      ["extensions/bold/index.ts: 'dompurify'"],
    ],
    [
      'extensions/bold/index.ts',
      "import { computePosition } from '@floating-ui/dom';",
      ["extensions/bold/index.ts: '@floating-ui/dom'"],
    ],
    ['ui/toolbar/toolbar.ts', "import type { Editor } from '../../index';", []],
    ['ui/toolbar/toolbar.ts', "import { createIcon } from '../components/icon';", []],
    ['ui/toolbar/toolbar.ts', "import { Bold } from 'lucide';", []],
    ['ui/components/popover.ts', "import { computePosition } from '@floating-ui/dom';", []],
    [
      'ui/toolbar/toolbar.ts',
      "import { Editor } from '../../core/editor';",
      ["ui/toolbar/toolbar.ts: '../../core/editor'"],
    ],
    [
      'ui/toolbar/toolbar.ts',
      "import { Bold } from '../../extensions/bold';",
      ["ui/toolbar/toolbar.ts: '../../extensions/bold'"],
    ],
    [
      'ui/toolbar/toolbar.ts',
      "import type { EditorState } from 'prosemirror-state';",
      ["ui/toolbar/toolbar.ts: 'prosemirror-state'"],
    ],
    ['ui/toolbar/toolbar.ts', "export { en } from '../i18n/en';", []],
    [
      'ui/toolbar/toolbar.ts',
      "export * from '../../core/types';",
      ["ui/toolbar/toolbar.ts: '../../core/types'"],
    ],
    [
      'ui/toolbar/toolbar.ts',
      "import '../../core/editor';",
      ["ui/toolbar/toolbar.ts: '../../core/editor'"],
    ],
    [
      'ui/toolbar/toolbar.ts',
      "const m = await import('../../core/editor');",
      ["ui/toolbar/toolbar.ts: '../../core/editor'"],
    ],
    ['index.ts', "export { Editor } from './core/editor';", []],
    ['index.ts', "export * from './extensions';", []],
    ['index.ts', "export { createToolbar } from './ui';", ["index.ts: './ui'"]],
    [
      'core/a.ts',
      "import { a } from './b';\nimport { c } from '../ui/c';\nimport 'lucide';",
      ["core/a.ts: '../ui/c'", "core/a.ts: 'lucide'"],
    ],
  ];

  it.each(cases)('checker: %s with %j → %j', (file, source, violations) => {
    const result = checkFile(file, source);
    expect(result).toEqual(violations);
  });

  it('real scan finds files in core, extensions, and ui', async () => {
    const srcDir = join(__dirname, '..', 'src');
    const files = await walk('', srcDir);

    const foundCore = files.some((f) => f.startsWith('core/'));
    const foundExtensions = files.some((f) => f.startsWith('extensions/'));
    const foundUi = files.some((f) => f.startsWith('ui/'));

    expect(foundCore).toBe(true);
    expect(foundExtensions).toBe(true);
    expect(foundUi).toBe(true);

    // Run the checker on all files and expect no violations
    const allViolations: string[] = [];
    for (const file of files) {
      const content = await readFile(join(srcDir, file), 'utf-8');
      const violations = checkFile(file, content);
      allViolations.push(...violations);
    }

    expect(allViolations).toEqual([]);
  });
});
