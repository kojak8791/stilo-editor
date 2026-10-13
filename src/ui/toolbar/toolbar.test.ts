import { Star } from 'lucide';
import { NodeSelection } from 'prosemirror-state';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestEditor } from '../../../tests/helpers';
import { defaultExtensions, StiloError } from '../../index';
import {
  createToolbar,
  en,
  headingDropdown,
  it as itLocale,
  type ToolbarButton,
  type ToolbarOptions,
} from '../index';

function attachEditor(editor: ReturnType<typeof createTestEditor>): void {
  document.body.append(editor.view.dom.parentElement!);
}

function press(target: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
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

    expect(container.children.length).toBe(1);
    expect(container.firstElementChild).toBe(toolbar.element);
    expect(toolbar.element.getAttribute('role')).toBe('toolbar');
    expect(toolbar.element.getAttribute('aria-label')).toBe('Formatting');
    expect(toolbar.element.getAttribute('aria-orientation')).toBe('horizontal');

    // Groups are direct children of the toolbar (the dropdown menu is appended after them).
    const groups = [...toolbar.element.children].filter(
      (el) => el.getAttribute('role') === 'group',
    );
    expect(groups.length).toBe(5);
    expect(toolbar.element.firstElementChild).toBe(groups[0]);

    const items = [...toolbar.element.querySelectorAll('[data-item]')].map((el) =>
      el.getAttribute('data-item'),
    );
    expect(items).toEqual([
      'undo',
      'redo',
      'heading',
      'bold',
      'italic',
      'underline',
      'strike',
      'code',
      'subscript',
      'superscript',
      'link',
      'clearFormatting',
      'textColor',
      'textColor',
      'highlight',
      'highlight',
      'bulletList',
      'orderedList',
      'blockquote',
      'horizontalRule',
      'characters',
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

  it('3b: buttons refresh on a selected horizontal rule', () => {
    const editor = createTestEditor({ html: '<p>a</p><hr>' });
    attachEditor(editor);
    const toolbar = createToolbar(editor, { container: createToolbarContainer() });
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 3)));
    toolbar.update();

    const btn = toolbar.element.querySelector('[data-item="horizontalRule"]') as HTMLButtonElement;
    expect(btn.hasAttribute('aria-disabled')).toBe(false);

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
      extensions: [defaultExtensions({ bold: false })],
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

  it.each([
    [{}, true],
    [{ sticky: true }, true],
    [{ sticky: false }, false],
  ])('sticky option %j: container has stilo-toolbar-host = %s', (option, expected) => {
    const editor = createTestEditor({ html: '<p>ab</p>' });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container, ...option });

    expect(container.classList.contains('stilo-toolbar-host')).toBe(expected);
    // jsdom has no layout: the toolbar height is 0, the margin is ProseMirror's default.
    const margin = expected ? { top: 5, right: 5, bottom: 5, left: 5 } : undefined;
    expect(editor.view.props.scrollMargin).toEqual(margin);
    toolbar.destroy();
    expect(container.classList.contains('stilo-toolbar-host')).toBe(false);
    expect(editor.view.props.scrollMargin).toBeUndefined();
    editor.destroy();
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
    const items = [...toolbar.element.querySelectorAll<HTMLElement>('[data-item]')];
    const byId = (id: string) => items.find((el) => el.dataset.item === id)!;
    const from = (id: string, key: string) => {
      byId(id).focus();
      press(byId(id), key);
      return (document.activeElement as HTMLElement).dataset.item;
    };

    expect(from('undo', 'ArrowRight')).toBe('redo');
    expect(byId('redo').getAttribute('tabindex')).toBe('0');
    expect(byId('undo').getAttribute('tabindex')).toBe('-1');
    expect(from('redo', 'ArrowLeft')).toBe('undo');
    expect(from('undo', 'ArrowLeft')).toBe('characters');
    expect(from('characters', 'ArrowLeft')).toBe('horizontalRule');
    expect(from('horizontalRule', 'ArrowLeft')).toBe('blockquote');
    expect(from('characters', 'ArrowRight')).toBe('undo');
    expect(from('redo', 'ArrowRight')).toBe('heading');
    expect(from('bold', 'End')).toBe('characters');
    expect(from('bold', 'Home')).toBe('undo');
    expect(items.filter((el) => el.getAttribute('tabindex') === '0')).toEqual([byId('undo')]);

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

describe('heading dropdown', () => {
  function setup(
    html: string,
    options: Partial<ToolbarOptions> = {},
    starter = defaultExtensions(),
  ) {
    const editor = createTestEditor({ html, extensions: [starter] });
    attachEditor(editor);
    const container = createToolbarContainer();
    const toolbar = createToolbar(editor, { container, ...options });
    const trigger = toolbar.element.querySelector<HTMLButtonElement>('[data-item="heading"]')!;
    const menu = toolbar.element.querySelector<HTMLElement>('[role="menu"]')!;
    const option = (id: string) => menu.querySelector<HTMLElement>(`[data-option="${id}"]`)!;
    const focused = () => (document.activeElement as HTMLElement).dataset.option;
    return { editor, container, toolbar, trigger, menu, option, focused };
  }

  it('renders the trigger and the menu', () => {
    const { trigger, menu, option } = setup('<p>a|b</p>');
    expect(trigger.classList.contains('stilo-toolbar__button')).toBe(true);
    expect(trigger.classList.contains('stilo-dropdown__trigger')).toBe(true);
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('title')).toBe('Text style');
    expect(trigger.querySelector('.stilo-dropdown__value')!.textContent).toBe('Paragraph');
    expect(trigger.getAttribute('aria-label')).toBe('Text style: Paragraph');

    expect(menu.hidden).toBe(true);
    expect(menu.classList.contains('stilo-popover')).toBe(true);
    expect(menu.classList.contains('stilo-dropdown__menu')).toBe(true);
    expect(menu.getAttribute('aria-label')).toBe('Text style');
    const ids = [...menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]')].map(
      (el) => el.dataset.option,
    );
    expect(ids).toEqual(['paragraph', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
    expect(option('h1').classList.contains('stilo-dropdown__option--h1')).toBe(true);
    expect(option('h1').querySelector('.stilo-dropdown__label')!.textContent).toBe('Heading 1');
    expect(option('h1').querySelector('.stilo-dropdown__shortcut')!.textContent).toBe('Ctrl+Alt+1');
    expect(option('paragraph').getAttribute('aria-checked')).toBe('true');
    expect(option('h1').getAttribute('aria-checked')).toBe('false');
  });

  it('shows the active block type', () => {
    const { trigger, option } = setup('<h2>a|b</h2>', { messages: itLocale });
    expect(trigger.querySelector('.stilo-dropdown__value')!.textContent).toBe('Titolo 2');
    expect(trigger.getAttribute('aria-label')).toBe('Stile testo: Titolo 2');
    expect(option('h2').getAttribute('aria-checked')).toBe('true');
    expect(option('paragraph').getAttribute('aria-checked')).toBe('false');
  });

  it('shows the dropdown label and is disabled when no option applies', () => {
    const { editor, toolbar, trigger, menu } = setup('<p>a</p><hr>');
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 3)));
    toolbar.update();
    expect(trigger.querySelector('.stilo-dropdown__value')!.textContent).toBe('Text style');
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
    trigger.click();
    expect(menu.hidden).toBe(true);
  });

  it('opens on click and focuses the checked option; a second click closes', () => {
    const { trigger, menu, focused } = setup('<h3>a|b</h3>');
    trigger.click();
    expect(menu.hidden).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(focused()).toBe('h3');
    trigger.click();
    expect(menu.hidden).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens with ArrowDown and ArrowUp on the trigger; Escape returns to it', () => {
    const { trigger, menu, focused } = setup('<p>a|b</p>');
    trigger.focus();
    press(trigger, 'ArrowDown');
    expect(menu.hidden).toBe(false);
    expect(focused()).toBe('paragraph');
    press(document.activeElement!, 'Escape');
    expect(menu.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
    press(trigger, 'ArrowUp');
    expect(focused()).toBe('h6');
  });

  it('moves through the options with the keyboard', () => {
    const { trigger, focused } = setup('<p>a|b</p>');
    trigger.click();
    const keys: Array<[key: string, expected: string]> = [
      ['ArrowDown', 'h1'],
      ['End', 'h6'],
      ['ArrowDown', 'paragraph'],
      ['ArrowUp', 'h6'],
      ['Home', 'paragraph'],
    ];
    for (const [key, expected] of keys) {
      press(document.activeElement!, key);
      expect(focused()).toBe(expected);
    }
  });

  it('skips disabled options and ignores clicks on them', () => {
    const { trigger, menu, option, focused } = setup(
      '<p>a|b</p>',
      {},
      defaultExtensions({ heading: { levels: [1, 2] } }),
    );
    expect(option('h2').hasAttribute('aria-disabled')).toBe(false);
    expect(option('h3').getAttribute('aria-disabled')).toBe('true');
    trigger.click();
    press(document.activeElement!, 'ArrowUp');
    expect(focused()).toBe('h2');
    press(document.activeElement!, 'ArrowDown');
    expect(focused()).toBe('paragraph');
    option('h4').click();
    expect(menu.hidden).toBe(false);
  });

  it('selects with Enter, then focuses the editor', () => {
    const { editor, toolbar, trigger, menu } = setup('<p>a|b</p>');
    trigger.click();
    press(document.activeElement!, 'ArrowDown');
    press(document.activeElement!, 'Enter');
    expect(editor.getHTML()).toBe('<h1>ab</h1>');
    expect(menu.hidden).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(editor.view.dom);
    toolbar.update();
    expect(trigger.querySelector('.stilo-dropdown__value')!.textContent).toBe('Heading 1');
  });

  it('selects with a click; the active option stays enabled', () => {
    const { editor, trigger, option } = setup('<h3>a|b</h3>');
    expect(option('h3').hasAttribute('aria-disabled')).toBe(false);
    trigger.click();
    option('paragraph').click();
    expect(editor.getHTML()).toBe('<p>ab</p>');
  });

  it('closes on Tab and on pointer down outside', () => {
    const { trigger, menu } = setup('<p>a|b</p>');
    trigger.click();
    press(document.activeElement!, 'Tab');
    expect(menu.hidden).toBe(true);
    trigger.click();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(menu.hidden).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('follows the configured levels and the Heading extension', () => {
    const custom = setup('<p>a|b</p>', { items: [[headingDropdown([1, 2])]] });
    const ids = [...custom.menu.querySelectorAll<HTMLElement>('[data-option]')].map(
      (el) => el.dataset.option,
    );
    expect(ids).toEqual(['paragraph', 'h1', 'h2']);

    const { toolbar } = setup('<p>ab</p>', {}, defaultExtensions({ heading: false }));
    expect(toolbar.element.querySelector('[data-item="heading"]')).toBeNull();
  });

  it('destroy() removes the open menu', () => {
    const { container, toolbar, trigger } = setup('<p>a|b</p>');
    trigger.click();
    toolbar.destroy();
    expect(container.childElementCount).toBe(0);
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(() => press(document.body, 'Escape')).not.toThrow();
  });
  it('keeps the order of a group that mixes buttons and the dropdown', () => {
    const { toolbar } = setup('<p>ab</p>', { items: [['bold', 'heading', 'italic']] });
    const groups = toolbar.element.querySelectorAll('[role="group"]');
    expect(groups.length).toBe(1);
    const ids = [...groups[0]!.querySelectorAll('[data-item]')].map((el) =>
      el.getAttribute('data-item'),
    );
    expect(ids).toEqual(['bold', 'heading', 'italic']);
  });

  it('keeps the dropdown component internal', async () => {
    const names = Object.keys(await import('../index'));
    expect(names).toContain('headingDropdown');
    expect(names).not.toContain('createDropdown');
    expect(names).not.toContain('isMacPlatform');
  });
});
