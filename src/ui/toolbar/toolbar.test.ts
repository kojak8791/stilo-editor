import { Star } from 'lucide';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestEditor } from '../../../tests/helpers';
import { StarterKit, StiloError } from '../../index';
import { createToolbar, en, it as itLocale, type ToolbarButton } from '../index';

function attachEditor(editor: ReturnType<typeof createTestEditor>): void {
  document.body.append(editor.view.dom.parentElement!);
}

function createToolbarContainer(): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('toolbar', () => {
  it('1: structure', () => {
    const editor = createTestEditor({ html: '<p>ab</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container });

    expect(toolbar.element.parentElement).toBe(container);
    expect(toolbar.element.children.length).toBe(1); // only child is the toolbar element
    expect(toolbar.element.getAttribute('role')).toBe('toolbar');
    expect(toolbar.element.getAttribute('aria-label')).toBe('Formatting');
    expect(toolbar.element.getAttribute('aria-orientation')).toBe('horizontal');

    const groups = toolbar.element.querySelectorAll('[role="group"]');
    expect(groups.length).toBe(3);

    const items: string[] = [];
    groups.forEach((group: Element) => {
      group.querySelectorAll('[data-item]').forEach((btn: Element) => {
        items.push(btn.getAttribute('data-item')!);
      });
    });

    expect(items).toEqual([
      'undo',
      'redo',
      'bold',
      'italic',
      'underline',
      'strike',
      'code',
      'clearFormatting',
      'bulletList',
      'orderedList',
      'blockquote',
      'horizontalRule',
    ]);

    toolbar.destroy();
    editor.destroy();
  });

  it('2: button bold', () => {
    const editor = createTestEditor({ html: '<p>ab</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container });

    const btn = toolbar.element.querySelector('[data-item="bold"]') as HTMLButtonElement;
    expect(btn.type).toBe('button');
    expect(btn.getAttribute('aria-label')).toBe('Bold');
    expect(btn.getAttribute('title')).toBe('Bold (Ctrl+B)');
    expect(btn.getAttribute('aria-pressed')).toBe('false');

    const svg = btn.querySelector('svg');
    expect(svg?.classList.contains('stilo-icon')).toBe(true);
    expect(svg?.getAttribute('aria-hidden')).toBe('true');

    toolbar.destroy();
    editor.destroy();
  });

  it('3: button horizontalRule', () => {
    const editor = createTestEditor({ html: '<p>ab</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container });

    const btn = toolbar.element.querySelector('[data-item="horizontalRule"]') as HTMLButtonElement;
    expect(btn.getAttribute('title')).toBe('Horizontal line');
    expect(btn.hasAttribute('aria-pressed')).toBe(false);

    toolbar.destroy();
    editor.destroy();
  });

  it('4: button titles', () => {
    const editor = createTestEditor({ html: '<p>ab</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container });

    const redo = toolbar.element.querySelector('[data-item="redo"]') as HTMLButtonElement;
    expect(redo.getAttribute('title')).toBe('Redo (Ctrl+Shift+Z)');

    const clear = toolbar.element.querySelector(
      '[data-item="clearFormatting"]',
    ) as HTMLButtonElement;
    expect(clear.getAttribute('title')).toBe('Clear formatting (Ctrl+\\)');

    toolbar.destroy();
    editor.destroy();
  });

  it('5: messages: it', () => {
    const editor = createTestEditor({ html: '<p>ab</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container, messages: itLocale });

    expect(toolbar.element.getAttribute('aria-label')).toBe('Formattazione');

    const bold = toolbar.element.querySelector('[data-item="bold"]') as HTMLButtonElement;
    expect(bold.getAttribute('aria-label')).toBe('Grassetto');
    expect(bold.getAttribute('title')).toBe('Grassetto (Ctrl+B)');

    toolbar.destroy();
    editor.destroy();
  });

  it('6: unknown item throws', () => {
    const editor = createTestEditor({ html: '<p>ab</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();

    expect(() =>
      createToolbar(editor, { container, items: [['bold', 'nope']] as never[] }),
    ).toThrow(StiloError);

    editor.destroy();
  });

  it('7: extensions disabled', () => {
    const editor = createTestEditor({
      html: '<p>ab</p>',
      extensions: [StarterKit({ bold: false })],
    });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container, items: [['bold'], ['italic']] });

    const groups = toolbar.element.querySelectorAll('[role="group"]');
    expect(groups.length).toBe(1);

    const items = groups[0]!.querySelectorAll('[data-item]');
    expect(items.length).toBe(1);
    expect(items[0]!.getAttribute('data-item')).toBe('italic');

    toolbar.destroy();
    editor.destroy();
  });

  it('8: custom item', () => {
    const custom: ToolbarButton = {
      id: 'hello',
      kind: 'button',
      icon: Star,
      labelKey: 'custom.hello',
      run: (e: ReturnType<typeof createTestEditor>) => {
        e.commands.toggleItalic();
      },
    };

    const editor = createTestEditor({ html: '<p>ab</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();

    // With custom messages
    const toolbar1 = createToolbar(editor, {
      container,
      items: [['bold', custom]],
      messages: { ...en, 'custom.hello': 'Hello' } as never,
    });

    const btn = toolbar1.element.querySelector('[data-item="hello"]') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('Hello');
    toolbar1.destroy();

    // With default messages (no custom.hello key)
    const container2 = createToolbarContainer();
    const toolbar2 = createToolbar(editor, {
      container: container2,
      items: [['bold', custom]],
    });

    const btn2 = toolbar2.element.querySelector('[data-item="hello"]') as HTMLButtonElement;
    expect(btn2.getAttribute('aria-label')).toBe('custom.hello');
    toolbar2.destroy();

    // Click test
    const editor2 = createTestEditor({ html: '<p>[ab]</p>' });
    attachEditor(editor2);
    const container3 = createToolbarContainer();
    const toolbar3 = createToolbar(editor2, {
      container: container3,
      items: [['bold', custom]],
    });

    const btn3 = toolbar3.element.querySelector('[data-item="hello"]') as HTMLButtonElement;
    btn3.click();

    expect(editor2.getHTML()).toBe('<p><em>ab</em></p>');

    toolbar3.destroy();
    editor2.destroy();
  });

  it('9: active state', () => {
    const editor = createTestEditor({ html: '<p><strong>a|b</strong></p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container });

    const bold = toolbar.element.querySelector('[data-item="bold"]') as HTMLButtonElement;
    expect(bold.getAttribute('aria-pressed')).toBe('true');
    expect(bold.classList.contains('stilo-toolbar__button--active')).toBe(true);

    const italic = toolbar.element.querySelector('[data-item="italic"]') as HTMLButtonElement;
    expect(italic.getAttribute('aria-pressed')).toBe('false');
    expect(italic.classList.contains('stilo-toolbar__button--active')).toBe(false);

    toolbar.destroy();
    editor.destroy();
  });

  it('10: fresh editor disabled states', () => {
    const editor = createTestEditor({ html: '<p>ab</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container });

    const undo = toolbar.element.querySelector('[data-item="undo"]') as HTMLButtonElement;
    expect(undo.getAttribute('aria-disabled')).toBe('true');

    const bold = toolbar.element.querySelector('[data-item="bold"]') as HTMLButtonElement;
    expect(bold.hasAttribute('aria-disabled')).toBe(false);

    toolbar.destroy();
    editor.destroy();
  });

  it('11: code context', () => {
    const editor = createTestEditor({ html: '<p><code>a|b</code></p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container });

    const code = toolbar.element.querySelector('[data-item="code"]') as HTMLButtonElement;
    expect(code.getAttribute('aria-pressed')).toBe('true');

    const bold = toolbar.element.querySelector('[data-item="bold"]') as HTMLButtonElement;
    expect(bold.getAttribute('aria-disabled')).toBe('true');

    bold.click();
    expect(editor.getHTML()).toBe('<p><code>ab</code></p>');

    toolbar.destroy();
    editor.destroy();
  });

  it('12: click bold', () => {
    const editor = createTestEditor({ html: '<p>[ab]</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container });

    const bold = toolbar.element.querySelector('[data-item="bold"]') as HTMLButtonElement;
    bold.click();

    expect(editor.getHTML()).toBe('<p><strong>ab</strong></p>');
    expect(document.activeElement).toBe(editor.view.dom);

    toolbar.destroy();
    editor.destroy();
  });

  it('13: mousedown prevents default', () => {
    const editor = createTestEditor({ html: '<p>ab</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container });

    const bold = toolbar.element.querySelector('[data-item="bold"]') as HTMLButtonElement;
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    bold.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);

    toolbar.destroy();
    editor.destroy();
  });

  it('14: refresh on transactions', () => {
    const editor = createTestEditor({ html: '<p>a|b</p>' });
    attachEditor(editor);
    vi.useFakeTimers();
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container });

    const spy = vi.spyOn(window, 'requestAnimationFrame');

    editor.commands.toggleBold();
    editor.commands.toggleItalic();

    const bold = toolbar.element.querySelector('[data-item="bold"]') as HTMLButtonElement;
    expect(bold.getAttribute('aria-pressed')).toBe('false');
    expect(spy).toHaveBeenCalledTimes(1);

    vi.advanceTimersToNextFrame();

    expect(bold.getAttribute('aria-pressed')).toBe('true');
    const italic = toolbar.element.querySelector('[data-item="italic"]') as HTMLButtonElement;
    expect(italic.getAttribute('aria-pressed')).toBe('true');

    toolbar.destroy();
    editor.destroy();
  });

  it('15: update()', () => {
    const editor = createTestEditor({ html: '<p>a|b</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container });

    editor.commands.toggleBold();
    toolbar.update();

    const bold = toolbar.element.querySelector('[data-item="bold"]') as HTMLButtonElement;
    expect(bold.getAttribute('aria-pressed')).toBe('true');

    toolbar.destroy();
    editor.destroy();
  });

  it('16: roving tabindex initial', () => {
    const editor = createTestEditor({ html: '<p>ab</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container });

    const buttons = toolbar.element.querySelectorAll<HTMLButtonElement>('[data-item]');
    expect(buttons[0]!.getAttribute('tabindex')).toBe('0');
    for (let i = 1; i < buttons.length; i++) {
      expect(buttons[i]!.getAttribute('tabindex')).toBe('-1');
    }

    toolbar.destroy();
    editor.destroy();
  });

  it('17: keys', () => {
    const editor = createTestEditor({ html: '<p>ab</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container });

    const buttons = toolbar.element.querySelectorAll<HTMLButtonElement>('[data-item]');

    // 17.1: ArrowRight from undo
    buttons[0]!.focus();
    buttons[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(buttons[1]);
    expect(buttons[1]!.getAttribute('tabindex')).toBe('0');
    expect(buttons[0]!.getAttribute('tabindex')).toBe('-1');

    // 17.2: ArrowLeft wraps to last
    buttons[buttons.length - 1]!.focus();
    buttons[buttons.length - 1]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
    // After the ArrowRight, redo is focused. ArrowLeft from redo should go to undo.
    // Let me re-do this properly.

    // Reset: start from undo
    buttons[0]!.focus();
    buttons[0]!.setAttribute('tabindex', '0');
    for (let i = 1; i < buttons.length; i++) buttons[i]!.setAttribute('tabindex', '-1');

    // ArrowRight from undo → redo
    buttons[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(buttons[1]);

    // ArrowLeft from redo → undo
    buttons[1]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(buttons[0]);

    // End: last item
    buttons[0]!.focus();
    buttons[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);

    // Home: first item
    buttons[buttons.length - 1]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(buttons[0]);

    // End then ArrowRight wraps to first
    buttons[0]!.focus();
    buttons[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }),
    );
    buttons[buttons.length - 1]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(buttons[0]);

    toolbar.destroy();
    editor.destroy();
  });

  it('18: ArrowRight on non-item', () => {
    const editor = createTestEditor({ html: '<p>ab</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container });

    const buttons = toolbar.element.querySelectorAll<HTMLButtonElement>('[data-item]');
    const initialTabindex = [...buttons].map((b) => b.getAttribute('tabindex'));

    const span = document.createElement('span');
    toolbar.element.appendChild(span);
    span.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );

    const finalTabindex = [...buttons].map((b) => b.getAttribute('tabindex'));
    expect(finalTabindex).toEqual(initialTabindex);

    toolbar.destroy();
    editor.destroy();
  });

  it('19: Escape on bold', () => {
    const editor = createTestEditor({ html: '<p>ab</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container });

    const bold = toolbar.element.querySelector('[data-item="bold"]') as HTMLButtonElement;
    bold.focus();
    bold.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(editor.view.dom);

    toolbar.destroy();
    editor.destroy();
  });

  it('20: Alt-F10', () => {
    const editor = createTestEditor({ html: '<p>ab</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container });

    const buttons = toolbar.element.querySelectorAll<HTMLButtonElement>('[data-item]');

    // Focus undo, press ArrowRight twice (bold now has tabindex="0")
    buttons[0]!.focus();
    buttons[0]!.setAttribute('tabindex', '0');
    for (let i = 1; i < buttons.length; i++) buttons[i]!.setAttribute('tabindex', '-1');

    buttons[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );
    buttons[1]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );

    editor.focus();
    const event = new KeyboardEvent('keydown', {
      key: 'F10',
      altKey: true,
      bubbles: true,
      cancelable: true,
    });
    editor.view.dom.dispatchEvent(event);

    expect(document.activeElement).toBe(buttons[2]); // bold
    expect(event.defaultPrevented).toBe(true);

    toolbar.destroy();
    editor.destroy();
  });

  it('21: toolbar.destroy()', () => {
    const editor = createTestEditor({ html: '<p>ab</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container });

    toolbar.destroy();
    expect(container.children.length).toBe(0);

    // toggleBold after destroy should not call rAF
    const spy = vi.spyOn(window, 'requestAnimationFrame');
    editor.commands.toggleBold();
    expect(spy).not.toHaveBeenCalled();

    // Alt-F10 after destroy should not change focus
    editor.focus();
    const event = new KeyboardEvent('keydown', {
      key: 'F10',
      altKey: true,
      bubbles: true,
      cancelable: true,
    });
    editor.view.dom.dispatchEvent(event);
    expect(document.activeElement).toBe(editor.view.dom);

    // Second destroy does not throw
    expect(() => toolbar.destroy()).not.toThrow();

    editor.destroy();
  });

  it('22: pending frame cancel', () => {
    vi.useFakeTimers();
    const editor = createTestEditor({ html: '<p>ab</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container });

    editor.commands.toggleBold();

    const spy = vi.spyOn(global, 'cancelAnimationFrame');
    toolbar.destroy();
    expect(spy).toHaveBeenCalled();

    vi.advanceTimersToNextFrame();
    expect(() => vi.advanceTimersToNextFrame()).not.toThrow();

    editor.destroy();
  });

  it('23: editor.destroy()', () => {
    const editor = createTestEditor({ html: '<p>ab</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const _toolbar = createToolbar(editor, { container });

    editor.destroy();
    expect(container.children.length).toBe(0);
  });
});
