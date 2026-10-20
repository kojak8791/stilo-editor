import { afterEach, describe, expect, it, vi } from 'vitest';
import { h, nextTick, shallowRef } from 'vue';
import { mount } from '../../tests/helpers/vue';
import type { Editor } from '../index';
import { Bold, Document, Paragraph, Text } from '../index';
import { it as italian } from '../ui/index';
import { StiloEditor, type StiloEditorProps } from './stilo-editor';

/** Mounts `StiloEditor` and returns the editor given to `ready`. */
async function mountEditor(props: StiloEditorProps & Record<string, unknown> = {}) {
  let editor: Editor | undefined;
  const onReady = (created: Editor) => {
    editor = created;
  };
  const mounted = await mount(() => h(StiloEditor, { onReady, ...props }));
  if (!editor) throw new Error('ready was not emitted');
  return { ...mounted, editor };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('StiloEditor', () => {
  it('creates the editor with the content and the default extensions', async () => {
    const { editor, container } = await mountEditor({
      content: '<p>Hello <strong>world</strong></p>',
    });
    expect(editor.getHTML()).toBe('<p>Hello <strong>world</strong></p>');
    expect('toggleBulletList' in editor.commands).toBe(true);
    expect(container.querySelectorAll('.stilo-content')).toHaveLength(1);
  });

  it('loads the given extensions', async () => {
    const extensions = [Document(), Text(), Paragraph(), Bold()];
    const { editor } = await mountEditor({ extensions, toolbar: false });
    expect('toggleBold' in editor.commands).toBe(true);
    expect('toggleItalic' in editor.commands).toBe(false);
  });

  it('passes the editor options, not as attributes of the element', async () => {
    const { container } = await mountEditor({ ariaLabel: 'Notes', editable: false });
    const content = container.querySelector('.stilo-content');
    expect(content?.getAttribute('aria-label')).toBe('Notes');
    expect(content?.getAttribute('contenteditable')).toBe('false');
    expect(container.firstElementChild?.hasAttribute('aria-label')).toBe(false);
  });

  it('reads a bare boolean attribute as true', async () => {
    const { container } = await mountEditor({ statusBar: '' as unknown as boolean });
    expect(container.querySelector('.stilo-status-bar')).not.toBeNull();
  });

  it('puts the toolbar before the editor in the element with the class', async () => {
    const { container } = await mountEditor({ class: 'my-editor' });
    const root = container.firstElementChild;
    expect(root?.className).toBe('my-editor');
    expect(root?.children).toHaveLength(2);
    expect(root?.children[0]?.querySelector('.stilo-toolbar')).not.toBeNull();
    expect(root?.children[0]?.classList.contains('stilo-toolbar-host')).toBe(true);
    expect(root?.children[1]?.querySelector('.stilo-content')).not.toBeNull();
  });

  it('passes the toolbar options and the messages', async () => {
    const { container } = await mountEditor({
      toolbar: { items: [['bold']], sticky: false },
      messages: italian,
    });
    const buttons = container.querySelectorAll('.stilo-toolbar button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.getAttribute('aria-label')).toBe(italian['toolbar.bold']);
    expect(container.querySelector('.stilo-toolbar-host')).toBeNull();
  });

  it('shows no toolbar with toolbar false', async () => {
    const { container } = await mountEditor({ toolbar: false });
    expect(container.querySelector('.stilo-toolbar')).toBeNull();
    expect(container.firstElementChild?.children).toHaveLength(1);
  });

  it('shows the status bar under the editor with statusBar', async () => {
    const { container } = await mountEditor({ statusBar: true });
    const root = container.firstElementChild;
    expect(root?.children).toHaveLength(3);
    expect(root?.children[2]?.querySelector('.stilo-status-bar')).not.toBeNull();
  });

  it('emits ready once', async () => {
    const onReady = vi.fn();
    await mount(() => h(StiloEditor, { onReady }));
    expect(onReady).toHaveBeenCalledOnce();
  });

  it('emits the events to the current listeners', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const onInput = shallowRef(first);
    let editor: Editor | undefined;
    await mount(() =>
      h(StiloEditor, {
        onInput: onInput.value,
        onReady: (created: Editor) => {
          editor = created;
        },
      }),
    );
    onInput.value = second;
    await nextTick();
    editor?.commands.insertText('x');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(second.mock.calls[0]?.[0].editor).toBe(editor);
  });

  it('emits selectionChange, transaction, focus and blur', async () => {
    const onSelectionChange = vi.fn();
    const onTransaction = vi.fn();
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const { editor } = await mountEditor({
      content: '<p>Hello</p>',
      onSelectionChange,
      onTransaction,
      onFocus,
      onBlur,
    });
    editor.commands.selectAll();
    expect(onSelectionChange).toHaveBeenCalledOnce();
    expect(onTransaction).toHaveBeenCalledOnce();
    editor.view.dom.dispatchEvent(new FocusEvent('focus'));
    editor.view.dom.dispatchEvent(new FocusEvent('blur'));
    expect(onFocus).toHaveBeenCalledOnce();
    expect(onBlur).toHaveBeenCalledOnce();
  });

  it('follows editable', async () => {
    const editable = shallowRef(true);
    let editor: Editor | undefined;
    await mount(() =>
      h(StiloEditor, {
        editable: editable.value,
        onReady: (created: Editor) => {
          editor = created;
        },
      }),
    );
    editable.value = false;
    await nextTick();
    expect(editor?.isEditable).toBe(false);
    editable.value = true;
    await nextTick();
    expect(editor?.isEditable).toBe(true);
  });

  it('reads content only when the editor is created', async () => {
    const content = shallowRef('<p>One</p>');
    let editor: Editor | undefined;
    await mount(() =>
      h(StiloEditor, {
        content: content.value,
        onReady: (created: Editor) => {
          editor = created;
        },
      }),
    );
    content.value = '<p>Two</p>';
    await nextTick();
    expect(editor?.getHTML()).toBe('<p>One</p>');
  });

  it('destroys the editor on unmount', async () => {
    const { editor, container, unmount } = await mountEditor({ statusBar: true });
    unmount();
    expect(editor.isDestroyed).toBe(true);
    expect(container.innerHTML).toBe('');
  });
});
