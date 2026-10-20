import { history, undo } from 'prosemirror-history';
import { type Command, Selection } from 'prosemirror-state';
import { describe, expect, it, vi } from 'vitest';
import { createCoreEditor, select, selectNode } from '../../tests/helpers/core';
import type { Editor } from './editor';
import { defineExtension } from './extension';
import type { CommandRunner, CommandRunners } from './types';

type Runners = Record<string, CommandRunner<unknown[]>>;

/** `commands` without module augmentation of `Commands`. */
function runners(commands: CommandRunners): Runners {
  return commands as unknown as Runners;
}

const insertTestText: (text: string) => Command = (text) => (state, dispatch) => {
  if (text === '') return false;
  dispatch?.(state.tr.insertText(text));
  return true;
};

const selectTestStart: () => Command = () => (state, dispatch) => {
  dispatch?.(state.tr.setSelection(Selection.atStart(state.doc)));
  return true;
};

const storeTestStrong: () => Command = () => (state, dispatch) => {
  dispatch?.(state.tr.addStoredMark(state.schema.marks.strong!.create()));
  return true;
};

const TestCommands = defineExtension({
  name: 'testCommands',
  commands: () => ({ insertTestText, selectTestStart, storeTestStrong }) as never,
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
  it('replaces the content in one transaction, puts the selection at start and emits input', () => {
    const editor = createCoreEditor('<p>old</p>');
    select(editor, 3);
    const transaction = vi.fn();
    const input = vi.fn();
    editor.on('transaction', transaction);
    editor.on('input', input);
    editor.setHTML('<p>new</p><p>text</p>');
    expect(editor.getHTML()).toBe('<p>new</p><p>text</p>');
    expect(editor.state.selection.from).toBe(1);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(input).toHaveBeenCalledTimes(1);
    expect(input.mock.calls[0]?.[0].transaction).toBe(transaction.mock.calls[0]?.[0].transaction);
  });

  it('does not emit input with emitInput: false', () => {
    const editor = createCoreEditor('<p>old</p>');
    const input = vi.fn();
    editor.on('input', input);
    editor.setHTML('<p>new</p>', { emitInput: false });
    editor.setHTML('<p>newer</p>', { emitInput: false, resetHistory: true });
    expect(editor.getHTML()).toBe('<p>newer</p>');
    expect(input).not.toHaveBeenCalled();
  });

  it('creates a fresh state with the same plugins with resetHistory: true', () => {
    const editor = createCoreEditor('<p>old</p>');
    const previous = editor.state;
    const input = vi.fn();
    editor.on('input', input);
    editor.setHTML('<p>new</p>', { resetHistory: true });
    expect(editor.state).not.toBe(previous);
    expect(editor.state.plugins).toEqual(previous.plugins);
    expect(editor.getHTML()).toBe('<p>new</p>');
    expect(input).toHaveBeenCalledWith({ editor, transaction: null });
  });

  it('clears a DOM selection inside the editor before replacing the content', () => {
    const editor = createCoreEditor('<p>old</p>');
    document.body.append(editor.view.dom);
    const selection = document.getSelection()!;
    selection.collapse(editor.view.dom.firstChild, 0);
    editor.setHTML('<p>new</p>');
    expect(selection.rangeCount).toBe(0);
    editor.view.dom.remove();
  });

  it('keeps a DOM selection outside the editor', () => {
    const editor = createCoreEditor('<p>old</p>');
    const outside = document.createElement('p');
    outside.textContent = 'outside';
    document.body.append(outside);
    const selection = document.getSelection()!;
    selection.collapse(outside.firstChild, 2);
    editor.setHTML('<p>new</p>');
    expect(selection.anchorNode).toBe(outside.firstChild);
    outside.remove();
  });

  it('is undone as its own step, not grouped with the changes just before it', () => {
    const TestHistory = defineExtension({ name: 'history', plugins: () => [history()] });
    const editor = createCoreEditor('<p>a</p>', [TestHistory()]);
    select(editor, 2);
    editor.view.dispatch(editor.state.tr.insertText('b'));
    editor.setHTML('<p>new</p>');
    const runUndo = () => undo(editor.state, (tr) => editor.view.dispatch(tr));
    expect(runUndo()).toBe(true);
    expect(editor.getHTML()).toBe('<p>ab</p>');
    expect(runUndo()).toBe(true);
    expect(editor.getHTML()).toBe('<p>a</p>');
  });
});

describe('Editor: commands', () => {
  it('runs a command and returns its result', () => {
    const editor = createCoreEditor('<p>a</p>', [TestCommands()]);
    select(editor, 2);
    expect(runners(editor.commands).insertTestText?.('b')).toBe(true);
    expect(editor.getHTML()).toBe('<p>ab</p>');
    expect(runners(editor.commands).insertTestText?.('')).toBe(false);
  });

  it('dry-runs a command with .can() without dispatching', () => {
    const editor = createCoreEditor('<p>a</p>', [TestCommands()]);
    const transaction = vi.fn();
    editor.on('transaction', transaction);
    expect(runners(editor.commands).insertTestText?.can('b')).toBe(true);
    expect(runners(editor.commands).insertTestText?.can('')).toBe(false);
    expect(editor.getHTML()).toBe('<p>a</p>');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('does not apply a content change in read-only mode, also with .can()', () => {
    const editor = createCoreEditor('<p>a</p>', [TestCommands()]);
    select(editor, 2);
    editor.setEditable(false);
    const transaction = vi.fn();
    editor.on('transaction', transaction);
    expect(runners(editor.commands).insertTestText?.can('b')).toBe(false);
    expect(runners(editor.commands).insertTestText?.('b')).toBe(false);
    expect(runners(editor.commands).storeTestStrong?.()).toBe(false);
    expect(editor.state.storedMarks).toBeNull();
    expect(editor.getHTML()).toBe('<p>a</p>');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('runs a selection change in read-only mode', () => {
    const editor = createCoreEditor('<p>ab</p>', [TestCommands()]);
    select(editor, 3);
    editor.setEditable(false);
    expect(runners(editor.commands).selectTestStart?.can()).toBe(true);
    expect(editor.state.selection.from).toBe(3);
    expect(runners(editor.commands).selectTestStart?.()).toBe(true);
    expect(editor.state.selection.from).toBe(1);
  });

  it('applies content changes again when editable', () => {
    const editor = createCoreEditor('<p>a</p>', [TestCommands()]);
    select(editor, 2);
    editor.setEditable(false);
    editor.setEditable(true);
    expect(runners(editor.commands).insertTestText?.('b')).toBe(true);
    expect(editor.getHTML()).toBe('<p>ab</p>');
  });

  it('replaces the content with setHTML in read-only mode', () => {
    const editor = createCoreEditor('<p>a</p>', [TestCommands()]);
    editor.setEditable(false);
    editor.setHTML('<p>b</p>');
    expect(editor.getHTML()).toBe('<p>b</p>');
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

describe('Editor: getAttributes', () => {
  it('reads the selected node or the nearest ancestor; {} when absent or unknown', () => {
    const editor = createCoreEditor('<h2>t</h2><hr>');
    select(editor, 2);
    expect(editor.getAttributes('title')).toEqual({ level: 2 });
    expect(editor.getAttributes('strong')).toEqual({});
    expect(editor.getAttributes('unknown')).toEqual({});
    selectNode(editor, 3);
    expect(editor.getAttributes('rule')).toEqual({});
    expect(editor.getAttributes('title')).toEqual({});
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

  it('emits transaction when the read-only mode changes, not when it stays', () => {
    const editor = createCoreEditor('<p>a</p>');
    const transaction = vi.fn();
    const input = vi.fn();
    editor.on('transaction', transaction);
    editor.on('input', input);
    editor.setEditable(true);
    expect(transaction).not.toHaveBeenCalled();
    editor.setEditable(false);
    expect(transaction).toHaveBeenCalledTimes(1);
    editor.setEditable(false);
    editor.setEditable(true);
    expect(transaction).toHaveBeenCalledTimes(2);
    expect(input).not.toHaveBeenCalled();
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

  it('emits input for document changes and selectionchange for selection-only changes', () => {
    const editor = createCoreEditor('<p>ab</p>');
    const input = vi.fn();
    const selectionChange = vi.fn();
    editor.on('input', input);
    editor.on('selectionchange', selectionChange);
    select(editor, 2);
    expect(selectionChange).toHaveBeenCalledTimes(1);
    expect(input).not.toHaveBeenCalled();
    editor.view.dispatch(editor.state.tr.insertText('x'));
    expect(input).toHaveBeenCalledTimes(1);
    expect(selectionChange).toHaveBeenCalledTimes(1);
  });

  it('emits no event for a transaction that changes nothing but metadata', () => {
    const editor = createCoreEditor('<p>ab</p>');
    const input = vi.fn();
    const selectionChange = vi.fn();
    const transaction = vi.fn();
    editor.on('input', input);
    editor.on('selectionchange', selectionChange);
    editor.on('transaction', transaction);
    editor.view.dispatch(editor.state.tr.setMeta('x', 1));
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(input).not.toHaveBeenCalled();
    expect(selectionChange).not.toHaveBeenCalled();
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
    const input = vi.fn();
    editor.on('input', input);
    editor.off('input', input);
    editor.setHTML('<p>x</p>');
    expect(input).not.toHaveBeenCalled();
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
    const input = vi.fn();
    editor.on('input', input);
    expect(() => editor.view.dispatch(editor.state.tr.insertText('x'))).not.toThrow();
    expect(input).not.toHaveBeenCalled();
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
