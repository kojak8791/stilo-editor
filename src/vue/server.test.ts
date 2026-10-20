// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { StiloEditor } from './index';

describe('StiloEditor on the server', () => {
  it('renders the empty containers without touching the DOM', async () => {
    expect(typeof document).toBe('undefined');
    const app = createSSRApp({ render: () => h(StiloEditor, { class: 'my-editor' }) });
    // `<!---->` stands for the hidden status bar, as on the client.
    expect(await renderToString(app)).toBe(
      '<div class="my-editor"><div></div><div></div><!----></div>',
    );
  });
});
