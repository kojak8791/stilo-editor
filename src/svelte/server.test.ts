// @vitest-environment node
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { StiloEditor } from './index';

describe('StiloEditor on the server', () => {
  it('renders its empty element without touching the DOM', () => {
    expect(typeof document).toBe('undefined');
    const { body } = render(StiloEditor, { props: { class: 'my-editor' } });
    // `<!--[-->` and `<!--]-->` are Svelte's hydration markers.
    expect(body).toBe('<!--[--><div class="my-editor"></div><!--]-->');
  });
});
