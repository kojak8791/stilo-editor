import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from '../../tests/helpers/react';
import type { Editor } from '../index';
import { defaultExtensions } from '../index';
import { type UseStiloEditorOptions, useStiloEditor } from './use-stilo-editor';

/** The editors returned by every render of {@link Host}. */
let renders: Array<Editor | null> = [];

function Host(options: UseStiloEditorOptions) {
  const { ref, editor } = useStiloEditor(options);
  renders.push(editor);
  return createElement('div', { ref });
}

afterEach(() => {
  renders = [];
  document.body.innerHTML = '';
});

describe('useStiloEditor', () => {
  it('returns null first, then the editor created inside the element', () => {
    const { container } = render(
      createElement(Host, { extensions: [defaultExtensions()], content: '<p>Hi</p>' }),
    );
    const editor = renders.at(-1);
    expect(renders[0]).toBeNull();
    expect(editor?.getHTML()).toBe('<p>Hi</p>');
    expect(container.firstElementChild?.firstElementChild).toBe(editor?.view.dom);
  });

  it('follows editable', () => {
    const extensions = [defaultExtensions()];
    const { rerender } = render(createElement(Host, { extensions }));
    rerender(createElement(Host, { extensions, editable: false }));
    expect(renders.at(-1)?.isEditable).toBe(false);
  });

  it('destroys the editor on unmount', () => {
    const { unmount } = render(createElement(Host, { extensions: [defaultExtensions()] }));
    const editor = renders.at(-1);
    unmount();
    expect(editor?.isDestroyed).toBe(true);
  });
});
