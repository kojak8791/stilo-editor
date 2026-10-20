import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, shallowRef } from 'vue';
import { mount } from '../../tests/helpers/vue';
import type { Editor } from '../index';
import { defaultExtensions } from '../index';
import { type UseStiloEditorOptions, useStiloEditor } from './use-stilo-editor';

/** The editor of the last {@link Host}. */
let editor: Editor | null = null;

const Host = defineComponent<{ options: UseStiloEditorOptions }>(
  (props) => {
    const result = useStiloEditor(props.options);
    return () => {
      editor = result.editor.value;
      return h('div', { ref: result.element });
    };
  },
  { props: ['options'] },
);

afterEach(() => {
  editor = null;
  document.body.innerHTML = '';
});

describe('useStiloEditor', () => {
  it('creates the editor inside the element', async () => {
    const options = { extensions: [defaultExtensions()], content: '<p>Hi</p>' };
    const { container } = await mount(() => h(Host, { options }));
    expect(editor?.getHTML()).toBe('<p>Hi</p>');
    expect(container.firstElementChild?.firstElementChild).toBe(editor?.view.dom);
  });

  it('creates the editor when the element appears and destroys it when the element goes', async () => {
    const shown = shallowRef(false);
    let result: ReturnType<typeof useStiloEditor> | undefined;
    const Toggle = defineComponent(() => {
      result = useStiloEditor({ extensions: [defaultExtensions()] });
      return () => (shown.value ? h('div', { ref: result?.element }) : null);
    });
    await mount(() => h(Toggle));
    expect(result?.editor.value).toBeNull();
    shown.value = true;
    await nextTick();
    const created = result?.editor.value;
    expect(created?.isDestroyed).toBe(false);
    shown.value = false;
    await nextTick();
    expect(created?.isDestroyed).toBe(true);
    expect(result?.editor.value).toBeNull();
  });

  it('follows editable from a ref', async () => {
    const editable = shallowRef(true);
    await mount(() => h(Host, { options: { extensions: [defaultExtensions()], editable } }));
    expect(editor?.isEditable).toBe(true);
    editable.value = false;
    await nextTick();
    expect(editor?.isEditable).toBe(false);
  });

  it('creates the editor read-only when editable starts false', async () => {
    await mount(() =>
      h(Host, { options: { extensions: [defaultExtensions()], editable: () => false } }),
    );
    expect(editor?.isEditable).toBe(false);
  });

  it('destroys the editor on unmount', async () => {
    const { unmount } = await mount(() =>
      h(Host, { options: { extensions: [defaultExtensions()] } }),
    );
    const created = editor;
    unmount();
    expect(created?.isDestroyed).toBe(true);
  });
});
