import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestEditor, typeText } from '../../../tests/helpers';
import { createStatusBar, it as italian } from '../index';

function setup(html: string) {
  const editor = createTestEditor({ html });
  const container = document.createElement('div');
  document.body.append(editor.view.dom.parentElement!, container);
  return { editor, container, statusBar: createStatusBar(editor, { container }) };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('createStatusBar', () => {
  it('shows the word and character count of the document', () => {
    const { container, statusBar } = setup('<p>Hello world</p><p>again|</p>');
    expect(container.lastElementChild).toBe(statusBar.element);
    expect(statusBar.element.className).toBe('stilo-status-bar');
    expect(statusBar.element.textContent).toBe('Words: 3Characters: 16');
  });

  it('counts again 500 ms after the last change', () => {
    const { editor, statusBar } = setup('<p>one|</p>');
    typeText(editor, ' two');
    vi.advanceTimersByTime(300);
    typeText(editor, ' three');
    vi.advanceTimersByTime(499);
    expect(statusBar.element.firstElementChild!.textContent).toBe('Words: 1');
    vi.advanceTimersByTime(1);
    expect(statusBar.element.firstElementChild!.textContent).toBe('Words: 3');
  });

  it('update() counts at once', () => {
    const { editor, statusBar } = setup('<p>one|</p>');
    typeText(editor, ' two');
    statusBar.update();
    expect(statusBar.element.firstElementChild!.textContent).toBe('Words: 2');
  });

  it('uses the given messages', () => {
    const editor = createTestEditor({ html: '<p>uno</p>' });
    const container = document.createElement('div');
    const statusBar = createStatusBar(editor, { container, messages: italian });
    expect(statusBar.element.textContent).toBe('Parole: 1Caratteri: 3');
  });

  it('is removed by destroy() and with the editor', () => {
    const first = setup('<p>a</p>');
    first.statusBar.destroy();
    first.statusBar.destroy();
    expect(first.container.children).toHaveLength(0);
    const second = setup('<p>a</p>');
    second.editor.destroy();
    expect(second.container.children).toHaveLength(0);
    typeText(first.editor, 'b');
    vi.advanceTimersByTime(500);
  });
});
