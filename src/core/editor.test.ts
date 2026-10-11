import type { Command } from 'prosemirror-state';
import { describe, expect, it, vi } from 'vitest';
import { createCoreEditor, select, selectNode } from '../../tests/helpers/core';
import type { Editor } from './editor';
import { defineExtension } from './extension';
import type { CommandRunners } from './types';

type Runners = Record<string, (...args: unknown[]) => boolean>;

/** `commands`/`can()` without module augmentation of `Commands`. */
function runners(commands: CommandRunners): Runners {
  return commands as unknown as Runners;
}

const insertText: (text: string) => Command = (text) => (state, dispatch) => {
  if (text === '') return false;
  dispatch?.(state.tr.insertText(text));
  return true;
};

const TestCommands = defineExtension({
  name: 'testCommands',
  commands: () => ({ insertText }) as never,
});

describe('Editor: creation', () => {
  it('mounts the editable element inside the container with its attributes', () => {
    const element = document.createElement('div');
    const editor = createCoreEditor();
    element.append(editor.view.dom);
    const dom = editor.view.dom;
    expect(dom.className).toContain('stilo-content');
    expect(dom.getAttribute('role')).toBe('textbox');
    expect(dom.getAttribute('aria-multiline')).toBe('true');
    expect(dom.getAttribute('contenteditable')).toBe('true');
    expect(dom.hasAttribute('aria-label')).toBe(false);
  });

  it('appends its DOM to options.element and sets aria-label', async () => {
    const { Editor } = await import('./editor');
    const { Document, Paragraph, Text } = await import('../extensions');
    const element = document.createElement('div');
    const editor = new Editor({
      element,
      extensions: [Document(), Text(), Paragraph()],
      ariaLabel: 'Content',
      editable: false,
    });
    expect(element.firstChild).toBe(editor.view.dom);
    expect(editor.view.dom.getAttribute('aria-label')).toBe('Content');
    expect(editor.isEditable).toBe(false);
  });

  it('supports several independent editors', () => {
    const a = createCoreEditor('<p>a</p>');
    const b = createCoreEditor('<p>b</p>');
    a.setHTML('<p>changed</p>');
    expect(a.getHTML()).toBe('<p>changed</p>');
    expect(b.getHTML()).toBe('<p>b</p>');
  });
});

describe('Editor: compactParagraphs', () => {
  const loose = '<ul><li><p>a</p></li><li><p>b</p><p>c</p></li></ul>';

  it('writes single-paragraph list items without <p> by default', async () => {
    const editor = createCoreEditor(loose);
    expect(editor.getHTML()).toBe('<ul><li>a</li><li><p>b</p><p>c</p></li></ul>');
    editor.setHTML(editor.getHTML());
    expect(editor.getHTML()).toBe('<ul><li>a</li><li><p>b</p><p>c</p></li></ul>');
  });

  it('keeps every <p> with compactParagraphs: false', async () => {
    const { Editor } = await import('./editor');
    const { Document, Paragraph, Text } = await import('../extensions');
    const { TestList } = await import('../../tests/helpers/core');
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: [Document(), Text(), Paragraph(), TestList()],
      content: '<ul><li>a</li></ul>',
      compactParagraphs: false,
    });
    expect(editor.getHTML()).toBe('<ul><li><p>a</p></li></ul>');
    editor.setHTML(loose);
    expect(editor.getHTML()).toBe(loose);
  });
});

describe('Editor: content', () => {
  it.each([
    ['', '<p></p>'],
    ['<p>a <strong>b</strong></p>', '<p>a <strong>b</strong></p>'],
    ['plain text', '<p>plain text</p>'],
    ['<div>a</div><div>b</div>', '<p>a</p><p>b</p>'],
    ['<div><p>a</p><p>b</p></div>', '<p>a</p><p>b</p>'],
    ['<div>a<p>b</p>c</div>', '<p>a</p><p>b</p><p>c</p>'],
    ['<h2>t</h2><hr>', '<h2>t</h2><hr>'],
    ['<p onclick="x()">a<script>alert(1)</script></p>', '<p>a</p>'],
  ])('parses %j and serializes %j', (html, expected) => {
    const editor = createCoreEditor(html);
    expect(editor.getHTML()).toBe(expected);
    editor.setHTML(editor.getHTML());
    expect(editor.getHTML()).toBe(expected);
  });

  it('reports isEmpty only for a single empty paragraph', () => {
    expect(createCoreEditor().isEmpty).toBe(true);
    expect(createCoreEditor('<p>a</p>').isEmpty).toBe(false);
    expect(createCoreEditor('<p></p><p></p>').isEmpty).toBe(false);
    expect(createCoreEditor('<h1></h1>').isEmpty).toBe(false);
  });

  it('separates blocks with a blank line in getText', () => {
    expect(createCoreEditor('<p>a</p><h1>b</h1><p>c</p>').getText()).toBe('a\n\nb\n\nc');
  });

  it('round-trips JSON', () => {
    const editor = createCoreEditor('<p>a <strong>b</strong></p>');
    const json = editor.getJSON();
    expect(json.type).toBe('doc');
    const other = createCoreEditor();
    other.setJSON(json);
    expect(other.getHTML()).toBe('<p>a <strong>b</strong></p>');
  });
});

describe('Editor: setHTML', () => {
  it('replaces the content in one transaction, puts the selection at start and emits update', () => {
    const editor = createCoreEditor('<p>old</p>');
    select(editor, 3);
    const transaction = vi.fn();
    const update = vi.fn();
    editor.on('transaction', transaction);
    editor.on('update', update);
    editor.setHTML('<p>new</p><p>text</p>');
    expect(editor.getHTML()).toBe('<p>new</p><p>text</p>');
    expect(editor.state.selection.from).toBe(1);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0].transaction).toBe(transaction.mock.calls[0]?.[0].transaction);
  });

  it('does not emit update with emitUpdate: false', () => {
    const editor = createCoreEditor('<p>old</p>');
    const update = vi.fn();
    editor.on('update', update);
    editor.setHTML('<p>new</p>', { emitUpdate: false });
    editor.setHTML('<p>newer</p>', { emitUpdate: false, resetHistory: true });
    expect(editor.getHTML()).toBe('<p>newer</p>');
    expect(update).not.toHaveBeenCalled();
  });

  it('creates a fresh state with the same plugins with resetHistory: true', () => {
    const editor = createCoreEditor('<p>old</p>');
    const previous = editor.state;
    const update = vi.fn();
    editor.on('update', update);
    editor.setHTML('<p>new</p>', { resetHistory: true });
    expect(editor.state).not.toBe(previous);
    expect(editor.state.plugins).toEqual(previous.plugins);
    expect(editor.getHTML()).toBe('<p>new</p>');
    expect(update).toHaveBeenCalledWith({ editor, transaction: null });
  });
});

describe('Editor: commands', () => {
  it('runs a command and returns its result', () => {
    const editor = createCoreEditor('<p>a</p>', [TestCommands()]);
    select(editor, 2);
    expect(runners(editor.commands).insertText?.('b')).toBe(true);
    expect(editor.getHTML()).toBe('<p>ab</p>');
    expect(runners(editor.commands).insertText?.('')).toBe(false);
  });

  it('dry-runs a command with can() without dispatching', () => {
    const editor = createCoreEditor('<p>a</p>', [TestCommands()]);
    const transaction = vi.fn();
    editor.on('transaction', transaction);
    expect(runners(editor.can()).insertText?.('b')).toBe(true);
    expect(runners(editor.can()).insertText?.('')).toBe(false);
    expect(editor.getHTML()).toBe('<p>a</p>');
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe('Editor: isActive', () => {
  it('checks marks, nodes with attributes, and unknown names', () => {
    const editor = createCoreEditor('<h2>t</h2><p><strong>a</strong>b</p>');
    select(editor, 2);
    expect(editor.isActive('title')).toBe(true);
    expect(editor.isActive('title', { level: 2 })).toBe(true);
    expect(editor.isActive('title', { level: 1 })).toBe(false);
    expect(editor.isActive('strong')).toBe(false);
    select(editor, 5);
    expect(editor.isActive('strong')).toBe(true);
    expect(editor.isActive('paragraph')).toBe(true);
    expect(editor.isActive('unknown')).toBe(false);
  });
});

describe('Editor: editable, focus and events', () => {
  it('switches read-only mode', () => {
    const editor = createCoreEditor('<p>a</p>');
    editor.setEditable(false);
    expect(editor.isEditable).toBe(false);
    expect(editor.view.dom.getAttribute('contenteditable')).toBe('false');
    editor.setEditable(true);
    expect(editor.isEditable).toBe(true);
  });

  it('moves the cursor with focus(position)', () => {
    const editor = createCoreEditor('<p>ab</p><p>cd</p>');
    editor.focus('end');
    expect(editor.state.selection.from).toBe(7);
    editor.focus('start');
    expect(editor.state.selection.from).toBe(1);
  });

  it.each([
    [true, 1],
    ['start', 1],
    ['end', 7],
  ] as const)('applies autofocus %j', async (autofocus, expected) => {
    const { Editor } = await import('./editor');
    const { Document, Paragraph, Text } = await import('../extensions');
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: [Document(), Text(), Paragraph()],
      content: '<p>ab</p><p>cd</p>',
      autofocus,
    });
    expect(editor.state.selection.from).toBe(expected);
  });

  it('emits update for document changes and selectionUpdate for selection-only changes', () => {
    const editor = createCoreEditor('<p>ab</p>');
    const update = vi.fn();
    const selectionUpdate = vi.fn();
    editor.on('update', update);
    editor.on('selectionUpdate', selectionUpdate);
    select(editor, 2);
    expect(selectionUpdate).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
    editor.view.dispatch(editor.state.tr.insertText('x'));
    expect(update).toHaveBeenCalledTimes(1);
    expect(selectionUpdate).toHaveBeenCalledTimes(1);
  });

  it('emits no event for a transaction that changes nothing but metadata', () => {
    const editor = createCoreEditor('<p>ab</p>');
    const update = vi.fn();
    const selectionUpdate = vi.fn();
    const transaction = vi.fn();
    editor.on('update', update);
    editor.on('selectionUpdate', selectionUpdate);
    editor.on('transaction', transaction);
    editor.view.dispatch(editor.state.tr.setMeta('x', 1));
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
    expect(selectionUpdate).not.toHaveBeenCalled();
  });

  it('emits focus and blur with the DOM event', () => {
    const editor = createCoreEditor();
    const focus = vi.fn();
    const blur = vi.fn();
    editor.on('focus', focus);
    editor.on('blur', blur);
    const focusEvent = new FocusEvent('focus');
    editor.view.dom.dispatchEvent(focusEvent);
    editor.view.dom.dispatchEvent(new FocusEvent('blur'));
    expect(focus).toHaveBeenCalledWith({ editor, event: focusEvent });
    expect(blur).toHaveBeenCalledTimes(1);
  });

  it('removes a handler with off', () => {
    const editor = createCoreEditor('<p>ab</p>');
    const update = vi.fn();
    editor.on('update', update);
    editor.off('update', update);
    editor.setHTML('<p>x</p>');
    expect(update).not.toHaveBeenCalled();
  });
});

describe('Editor: destroy', () => {
  function destroyed(): { editor: Editor; handler: ReturnType<typeof vi.fn> } {
    const editor = createCoreEditor('<p>a</p>');
    const handler = vi.fn();
    editor.on('destroy', handler);
    editor.destroy();
    return { editor, handler };
  }

  it('emits destroy once and marks the editor as destroyed', () => {
    const { editor, handler } = destroyed();
    editor.destroy();
    expect(editor.isDestroyed).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ editor });
  });

  it('removes its DOM from the container', async () => {
    const { Editor } = await import('./editor');
    const { Document, Paragraph, Text } = await import('../extensions');
    const element = document.createElement('div');
    const editor = new Editor({ element, extensions: [Document(), Text(), Paragraph()] });
    editor.destroy();
    expect(element.childNodes).toHaveLength(0);
  });

  it('ignores transactions after destroy', () => {
    const { editor } = destroyed();
    const update = vi.fn();
    editor.on('update', update);
    expect(() => editor.view.dispatch(editor.state.tr.insertText('x'))).not.toThrow();
    expect(update).not.toHaveBeenCalled();
  });
});

describe('Editor: node selection', () => {
  it('reports the selected node as active', () => {
    const editor = createCoreEditor('<p>a</p><hr><p>b</p>');
    selectNode(editor, 3);
    expect(editor.isActive('rule')).toBe(true);
    expect(editor.isActive('paragraph')).toBe(false);
  });
});
