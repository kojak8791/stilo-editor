import { createElement, StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '../../tests/helpers/react';
import type { Editor } from '../index';
import { Bold, Document, Paragraph, Text } from '../index';
import { it as italian } from '../ui/index';
import { StiloEditor, type StiloEditorProps } from './stilo-editor';

/** Renders `StiloEditor` and returns the editor given to `onReady`. */
function renderEditor(props: StiloEditorProps = {}) {
  let editor: Editor | undefined;
  const onReady = (created: Editor) => {
    editor = created;
  };
  const rendered = render(createElement(StiloEditor, { onReady, ...props }));
  if (!editor) throw new Error('onReady was not called');
  return { ...rendered, editor };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('StiloEditor', () => {
  it('creates the editor with the content and the default extensions', () => {
    const { editor, container } = renderEditor({ content: '<p>Hello <strong>world</strong></p>' });
    expect(editor.getHTML()).toBe('<p>Hello <strong>world</strong></p>');
    expect('toggleBulletList' in editor.commands).toBe(true);
    expect(container.querySelectorAll('.stilo-content')).toHaveLength(1);
  });

  it('loads the given extensions', () => {
    const extensions = [Document(), Text(), Paragraph(), Bold()];
    const { editor } = renderEditor({ extensions, toolbar: false });
    expect('toggleBold' in editor.commands).toBe(true);
    expect('toggleItalic' in editor.commands).toBe(false);
  });

  it('passes the editor options', () => {
    const { container, editor } = renderEditor({
      ariaLabel: 'Notes',
      editable: false,
      markdownShortcuts: false,
    });
    const content = container.querySelector('.stilo-content');
    expect(content?.getAttribute('aria-label')).toBe('Notes');
    expect(content?.getAttribute('contenteditable')).toBe('false');
    expect(editor.state.plugins.some((p) => 'isInputRules' in p.spec)).toBe(false);
  });

  it('puts the toolbar before the editor in the element with className', () => {
    const { container } = renderEditor({ className: 'my-editor' });
    const root = container.firstElementChild;
    expect(root?.className).toBe('my-editor');
    expect(root?.children).toHaveLength(2);
    expect(root?.children[0]?.querySelector('.stilo-toolbar')).not.toBeNull();
    expect(root?.children[0]?.classList.contains('stilo-toolbar-host')).toBe(true);
    expect(root?.children[1]?.querySelector('.stilo-content')).not.toBeNull();
  });

  it('passes the toolbar options and the messages', () => {
    const { container } = renderEditor({
      toolbar: { items: [['bold']], sticky: false },
      messages: italian,
    });
    const buttons = container.querySelectorAll('.stilo-toolbar button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.getAttribute('aria-label')).toBe(italian['toolbar.bold']);
    expect(container.querySelector('.stilo-toolbar-host')).toBeNull();
  });

  it('shows no toolbar with toolbar false', () => {
    const { container } = renderEditor({ toolbar: false });
    expect(container.querySelector('.stilo-toolbar')).toBeNull();
    expect(container.firstElementChild?.children).toHaveLength(1);
  });

  it('shows the status bar under the editor with statusBar', () => {
    const { container } = renderEditor({ statusBar: true });
    const root = container.firstElementChild;
    expect(root?.children).toHaveLength(3);
    expect(root?.children[2]?.querySelector('.stilo-status-bar')).not.toBeNull();
  });

  it('calls onReady once', () => {
    const onReady = vi.fn();
    render(createElement(StiloEditor, { onReady }));
    expect(onReady).toHaveBeenCalledOnce();
  });

  it('forwards the events to the current handlers', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { editor, rerender } = renderEditor({ onInput: first });
    rerender(createElement(StiloEditor, { onInput: second }));
    editor.commands.insertText('x');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(second.mock.calls[0]?.[0].editor).toBe(editor);
  });

  it('forwards selectionchange, transaction, focus and blur', () => {
    const onSelectionChange = vi.fn();
    const onTransaction = vi.fn();
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const { editor } = renderEditor({
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

  it('follows editable', () => {
    const { editor, rerender } = renderEditor();
    rerender(createElement(StiloEditor, { editable: false }));
    expect(editor.isEditable).toBe(false);
    rerender(createElement(StiloEditor, { editable: true }));
    expect(editor.isEditable).toBe(true);
  });

  it('reads content only when the editor is created', () => {
    const { editor, rerender } = renderEditor({ content: '<p>One</p>' });
    rerender(createElement(StiloEditor, { content: '<p>Two</p>' }));
    expect(editor.getHTML()).toBe('<p>One</p>');
  });

  it('destroys the editor on unmount', () => {
    const { editor, container, unmount } = renderEditor({ statusBar: true });
    unmount();
    expect(editor.isDestroyed).toBe(true);
    expect(container.innerHTML).toBe('');
  });

  it('keeps one live editor and one toolbar in Strict Mode', () => {
    const editors: Editor[] = [];
    const onReady = (editor: Editor) => {
      editors.push(editor);
    };
    const { container } = render(
      createElement(StrictMode, null, createElement(StiloEditor, { onReady })),
    );
    expect(editors.filter((editor) => !editor.isDestroyed)).toHaveLength(1);
    expect(container.querySelectorAll('.stilo-content')).toHaveLength(1);
    expect(container.querySelectorAll('.stilo-toolbar')).toHaveLength(1);
  });
});
