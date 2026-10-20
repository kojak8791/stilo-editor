import { afterEach, describe, expect, it, vi } from 'vitest';
import { Bold, Document, defaultExtensions, type Editor, Paragraph, Text } from '../index';
import { type StiloEditorOptions, stiloEditor } from './editor-action';

/** Runs the action on a new element in the document; returns the element, action and editor. */
function run(options: StiloEditorOptions) {
  const node = document.body.appendChild(document.createElement('div'));
  const onready = vi.fn<(editor: Editor) => void>();
  const action = stiloEditor(node, { onready, ...options });
  const editor = onready.mock.calls[0]?.[0];
  if (!editor) throw new Error('onready was not called');
  return { node, action, editor, onready };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('stiloEditor', () => {
  it('creates the editor inside the element with the options and calls onready once', () => {
    const { node, editor, onready } = run({
      extensions: [Document(), Text(), Paragraph(), Bold()],
      content: '<p>Hello <strong>world</strong></p>',
      ariaLabel: 'Notes',
    });
    expect(onready).toHaveBeenCalledOnce();
    expect(editor.getHTML()).toBe('<p>Hello <strong>world</strong></p>');
    expect(node.firstElementChild).toBe(editor.view.dom);
    expect(editor.view.dom.getAttribute('aria-label')).toBe('Notes');
  });

  it('follows editable on update', () => {
    const extensions = [defaultExtensions()];
    const { action, editor } = run({ extensions, editable: false });
    expect(editor.isEditable).toBe(false);
    action.update?.({ extensions, editable: true });
    expect(editor.isEditable).toBe(true);
    action.update?.({ extensions, editable: false });
    expect(editor.isEditable).toBe(false);
  });

  it('reads the other options only when the editor is created', () => {
    const extensions = [defaultExtensions()];
    const { action, editor } = run({ extensions, content: '<p>One</p>' });
    action.update?.({ extensions, content: '<p>Two</p>' });
    expect(editor.getHTML()).toBe('<p>One</p>');
    expect(editor.isEditable).toBe(true);
  });

  it('destroys the editor and empties the element on destroy', () => {
    const { node, action, editor } = run({ extensions: [defaultExtensions()] });
    action.destroy?.();
    expect(editor.isDestroyed).toBe(true);
    expect(node.innerHTML).toBe('');
  });
});
