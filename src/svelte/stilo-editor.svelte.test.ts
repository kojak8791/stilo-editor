import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '../../tests/helpers/svelte';
import type { Editor } from '../index';
import { it as italian } from '../ui/index';
import { StiloEditor, type StiloEditorProps } from './index';

/** Mounts `StiloEditor` and returns the editor given to `onready`. */
function mountEditor(props: StiloEditorProps = {}) {
  const onready = vi.fn<(editor: Editor) => void>();
  const mounted = render(StiloEditor, { onready, ...props });
  const editor = onready.mock.calls[0]?.[0];
  if (!editor) throw new Error('onready was not called');
  return { ...mounted, editor, onready };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('StiloEditor', () => {
  it('creates the editor with the content and the default extensions, once', () => {
    const { editor, container, onready } = mountEditor({
      content: '<p>Hello <strong>world</strong></p>',
    });
    expect(onready).toHaveBeenCalledOnce();
    expect(editor.getHTML()).toBe('<p>Hello <strong>world</strong></p>');
    expect('toggleBulletList' in editor.commands).toBe(true);
    expect(container.querySelectorAll('.stilo-content')).toHaveLength(1);
  });

  it('puts the attributes on its element and the editor options on the editor', () => {
    const { container } = mountEditor({
      class: 'my-editor',
      id: 'notes',
      ariaLabel: 'Notes',
      editable: false,
    });
    const root = container.firstElementChild;
    expect(root?.className).toBe('my-editor');
    expect(root?.id).toBe('notes');
    expect(root?.hasAttribute('aria-label')).toBe(false);
    const content = container.querySelector('.stilo-content');
    expect(content?.getAttribute('aria-label')).toBe('Notes');
    expect(content?.getAttribute('contenteditable')).toBe('false');
  });

  it('passes the toolbar, the status bar and the messages', () => {
    const { container } = mountEditor({
      toolbar: { items: [['bold']] },
      statusBar: true,
      messages: italian,
    });
    const root = container.firstElementChild;
    expect(root?.children).toHaveLength(3);
    const buttons = container.querySelectorAll('.stilo-toolbar button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.getAttribute('aria-label')).toBe(italian['toolbar.bold']);
    expect(root?.children[2]?.querySelector('.stilo-status-bar')).not.toBeNull();
  });

  it('binds the editor', () => {
    let bound: Editor | null = null;
    const onready = vi.fn<(editor: Editor) => void>();
    // Accessors, as Svelte compiles `bind:editor`.
    render(StiloEditor, {
      onready,
      get editor() {
        return bound;
      },
      set editor(value) {
        bound = value ?? null;
      },
    });
    expect(bound).not.toBeNull();
    expect(bound).toBe(onready.mock.calls[0]?.[0]);
  });

  it('follows editable and the callbacks, and reads content only once', () => {
    const first = vi.fn();
    const second = vi.fn();
    let editor: Editor | undefined;
    const props = $state({
      content: '<p>One</p>',
      editable: true,
      oninput: first,
      onready: (created: Editor) => {
        editor = created;
      },
    });
    render(StiloEditor, props);
    if (!editor) throw new Error('onready was not called');
    props.editable = false;
    props.content = '<p>Two</p>';
    props.oninput = second;
    flushSync();
    expect(editor.isEditable).toBe(false);
    expect(editor.getHTML()).toBe('<p>One</p>');
    editor.setHTML('<p>Three</p>');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    props.editable = true;
    flushSync();
    expect(editor.isEditable).toBe(true);
  });

  it('destroys the editor on unmount', () => {
    const { editor, container, unmount } = mountEditor({ statusBar: true });
    unmount();
    expect(editor.isDestroyed).toBe(true);
    expect(container.innerHTML).toBe('');
  });
});
