import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Editor } from '../index';
import { Bold, Document, Paragraph, Text } from '../index';
import { it as italian } from '../ui/index';
import { type StiloEditorWithUIOptions, stiloEditorWithUI } from './editor-with-ui-action';

/** Runs the action on a new element in the document; returns the element, action and editor. */
function run(options: StiloEditorWithUIOptions = {}) {
  const node = document.body.appendChild(document.createElement('div'));
  const onready = vi.fn<(editor: Editor) => void>();
  const action = stiloEditorWithUI(node, { onready, ...options });
  const editor = onready.mock.calls[0]?.[0];
  if (!editor) throw new Error('onready was not called');
  return { node, action, editor, onready };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('stiloEditorWithUI', () => {
  it('creates the editor with the content and the default extensions', () => {
    const { editor, node, onready } = run({ content: '<p>Hello <strong>world</strong></p>' });
    expect(onready).toHaveBeenCalledOnce();
    expect(editor.getHTML()).toBe('<p>Hello <strong>world</strong></p>');
    expect('toggleBulletList' in editor.commands).toBe(true);
    expect(node.querySelectorAll('.stilo-content')).toHaveLength(1);
  });

  it('loads the given extensions', () => {
    const { editor } = run({
      extensions: [Document(), Text(), Paragraph(), Bold()],
      toolbar: false,
    });
    expect('toggleBold' in editor.commands).toBe(true);
    expect('toggleItalic' in editor.commands).toBe(false);
  });

  it('passes the editor options', () => {
    const { node } = run({ ariaLabel: 'Notes', editable: false });
    const content = node.querySelector('.stilo-content');
    expect(content?.getAttribute('aria-label')).toBe('Notes');
    expect(content?.getAttribute('contenteditable')).toBe('false');
  });

  it('puts the toolbar before the editor', () => {
    const { node } = run();
    expect(node.children).toHaveLength(2);
    expect(node.children[0]?.querySelector('.stilo-toolbar')).not.toBeNull();
    expect(node.children[0]?.classList.contains('stilo-toolbar-host')).toBe(true);
    expect(node.children[1]?.querySelector('.stilo-content')).not.toBeNull();
  });

  it('passes the toolbar options and the messages', () => {
    const { node } = run({ toolbar: { items: [['bold']], sticky: false }, messages: italian });
    const buttons = node.querySelectorAll('.stilo-toolbar button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.getAttribute('aria-label')).toBe(italian['toolbar.bold']);
    expect(node.querySelector('.stilo-toolbar-host')).toBeNull();
  });

  it('shows no toolbar with toolbar false', () => {
    const { node } = run({ toolbar: false });
    expect(node.querySelector('.stilo-toolbar')).toBeNull();
    expect(node.children).toHaveLength(1);
  });

  it('shows the status bar under the editor with statusBar', () => {
    const { node } = run({ statusBar: true });
    expect(node.children).toHaveLength(3);
    expect(node.children[2]?.querySelector('.stilo-status-bar')).not.toBeNull();
  });

  it('calls the callbacks of the last update', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { action, editor } = run({ oninput: first });
    action.update?.({ oninput: second });
    editor.commands.insertText('x');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(second.mock.calls[0]?.[0].editor).toBe(editor);
  });

  it('calls onselectionchange, ontransaction, onfocus and onblur', () => {
    const onselectionchange = vi.fn();
    const ontransaction = vi.fn();
    const onfocus = vi.fn();
    const onblur = vi.fn();
    const { editor } = run({
      content: '<p>Hello</p>',
      onselectionchange,
      ontransaction,
      onfocus,
      onblur,
    });
    editor.commands.selectAll();
    expect(onselectionchange).toHaveBeenCalledOnce();
    expect(ontransaction).toHaveBeenCalledOnce();
    editor.view.dom.dispatchEvent(new FocusEvent('focus'));
    editor.view.dom.dispatchEvent(new FocusEvent('blur'));
    expect(onfocus).toHaveBeenCalledOnce();
    expect(onblur).toHaveBeenCalledOnce();
  });

  it('follows editable and reads the content only when the editor is created', () => {
    const { action, editor } = run({ content: '<p>One</p>' });
    action.update?.({ content: '<p>Two</p>', editable: false });
    expect(editor.isEditable).toBe(false);
    expect(editor.getHTML()).toBe('<p>One</p>');
  });

  it('destroys the editor and removes its containers on destroy', () => {
    const { node, action, editor } = run({ statusBar: true });
    action.destroy?.();
    expect(editor.isDestroyed).toBe(true);
    expect(node.innerHTML).toBe('');
  });
});
