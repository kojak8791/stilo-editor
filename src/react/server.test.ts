// @vitest-environment node
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StiloEditor } from './index';

describe('StiloEditor on the server', () => {
  it('renders the empty containers without touching the DOM', () => {
    expect(typeof document).toBe('undefined');
    const html = renderToString(createElement(StiloEditor, { className: 'my-editor' }));
    expect(html).toBe('<div class="my-editor"><div></div><div></div></div>');
  });
});
