import { Plugin } from 'prosemirror-state';
import { describe, expect, it, vi } from 'vitest';
import { TestRule, TestStrong, TestTitle } from '../../tests/helpers/core';
import { Document, Paragraph, Text } from '../extensions';
import { Editor } from './editor';
import { StiloError } from './errors';
import { defineExtension, type Extension } from './extension';
import { ExtensionManager, sortExtensions } from './extension-manager';

const base = () => [Document(), Text(), Paragraph()];

function markExtension(name: string, priority?: number): Extension {
  return defineExtension({
    name,
    priority,
    marks: () => ({ [name]: { toDOM: () => ['span', 0] } }),
  })();
}

describe('sortExtensions', () => {
  it('flattens one level and sorts by priority, keeping the order for equal priorities', () => {
    const a = markExtension('a');
    const b = markExtension('b', 200);
    const c = markExtension('c');
    const d = markExtension('d', 50);
    expect(sortExtensions([a, [b, c], d]).map((ext) => ext.name)).toEqual(['b', 'a', 'c', 'd']);
  });
});

describe('ExtensionManager', () => {
  it('builds a schema with doc as top node and paragraph as default block', () => {
    const { schema } = new ExtensionManager([TestTitle(), ...base()]);
    expect(schema.topNodeType.name).toBe('doc');
    expect(schema.topNodeType.contentMatch.defaultType?.name).toBe('paragraph');
    expect(Object.keys(schema.nodes)).toEqual(['paragraph', 'title', 'doc', 'text']);
  });

  it('orders marks by MARK_ORDER, then by extension order', () => {
    const extensions = ['zeta', 'code', 'alpha', 'bold', 'link'].map((name) => markExtension(name));
    const { schema } = new ExtensionManager([...base(), ...extensions]);
    expect(Object.keys(schema.marks)).toEqual(['link', 'bold', 'code', 'zeta', 'alpha']);
  });

  it.each([
    ['extension', () => [...base(), TestStrong(), TestStrong()]],
    ['node', () => [...base(), defineExtension({ name: 'x', nodes: () => ({ text: {} }) })()]],
    [
      'mark',
      () => [
        ...base(),
        TestStrong(),
        defineExtension({ name: 'x', marks: () => ({ strong: {} }) })(),
      ],
    ],
  ])('throws on a duplicate %s name', (kind, extensions) => {
    expect(() => new ExtensionManager(extensions())).toThrow(
      new StiloError(`Duplicate ${kind} name "${kind === 'node' ? 'text' : 'strong'}".`),
    );
  });

  it.each(['doc', 'paragraph', 'text'])('throws when the %s node is missing', (name) => {
    const extensions = base().filter((ext) => ext.name !== name);
    expect(() => new ExtensionManager(extensions)).toThrow(
      new StiloError(`The schema requires a "${name}" node.`),
    );
  });

  it('throws on a duplicate command name', () => {
    const command = () => () => true;
    const a = defineExtension({ name: 'a', commands: () => ({ same: command }) as never })();
    const b = defineExtension({ name: 'b', commands: () => ({ same: command }) as never })();
    expect(
      () => new Editor({ element: document.createElement('div'), extensions: [...base(), a, b] }),
    ).toThrow(new StiloError('Duplicate command name "same".'));
  });

  it('passes options, schema and editor to the runtime parts', () => {
    const spy = vi.fn(() => []);
    const WithOptions = defineExtension<{ value: number }>({
      name: 'withOptions',
      defaultOptions: { value: 1 },
      plugins: spy,
    });
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: [...base(), WithOptions({ value: 2 })],
    });
    expect(spy).toHaveBeenCalledWith({ options: { value: 2 }, schema: editor.schema, editor });
  });

  it('returns input rules, keymaps, extension plugins, undoInputRule and baseKeymap in order', () => {
    const plugin = new Plugin({});
    const extensions = [
      ...base(),
      defineExtension({ name: 'k', keymap: () => ({ 'Mod-x': () => true }) })(),
      defineExtension({ name: 'p', plugins: () => [plugin] })(),
      TestRule(),
    ];
    const manager = new ExtensionManager(extensions);
    const plugins = manager.createPlugins({} as Editor);
    expect(plugins).toHaveLength(5);
    expect(plugins[0]?.spec).toHaveProperty('isInputRules', true);
    expect(plugins[1]?.props.handleKeyDown).toBeTypeOf('function');
    expect(plugins[2]).toBe(plugin);
    expect(plugins[3]?.props.handleKeyDown).toBeTypeOf('function');
    expect(plugins[4]?.props.handleKeyDown).toBeTypeOf('function');
  });
});
