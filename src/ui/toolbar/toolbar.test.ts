import { Star } from 'lucide';
import { NodeSelection } from 'prosemirror-state';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestEditor, mockRenderedFontSizes } from '../../../tests/helpers';
import { defaultExtensions, StiloError } from '../../index';
import {
  createToolbar,
  en,
  fontFamilyDropdown,
  fontSizeInput,
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

    // The toolbar, then the find bar (T-043).
    expect(container.children.length).toBe(2);
    expect(container.firstElementChild).toBe(toolbar.element);
    expect(container.lastElementChild!.className).toBe('stilo-find-bar');
    expect(toolbar.element.getAttribute('role')).toBe('toolbar');
    expect(toolbar.element.getAttribute('aria-label')).toBe('Formatting');
    expect(toolbar.element.getAttribute('aria-orientation')).toBe('horizontal');

    // Groups are direct children of the toolbar (the dropdown menu is appended after them).
    const groups = [...toolbar.element.children].filter(
      (el) => el.getAttribute('role') === 'group',
    );
    expect(groups.length).toBe(8);
    expect(toolbar.element.firstElementChild).toBe(groups[0]);

    const items = [...toolbar.element.querySelectorAll('[data-item]')].map((el) =>
      el.getAttribute('data-item'),
    );
    expect(items).toEqual([
      'undo',
      'redo',
      'heading',
      'fontFamily',
      'fontSize',
      'fontSize',
      'fontSize',
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
      'textAlign',
      'lineHeight',
      'bulletList',
      'orderedList',
      'taskList',
      'blockquote',
      'codeBlock',
      'horizontalRule',
      'table',
      'characters',
      'find',
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
    expect(from('undo', 'ArrowLeft')).toBe('find');
    expect(from('find', 'ArrowLeft')).toBe('characters');
    expect(from('characters', 'ArrowLeft')).toBe('table');
    expect(from('table', 'ArrowLeft')).toBe('horizontalRule');
    expect(from('horizontalRule', 'ArrowLeft')).toBe('codeBlock');
    expect(from('find', 'ArrowRight')).toBe('undo');
    expect(from('redo', 'ArrowRight')).toBe('heading');
    expect(from('bold', 'End')).toBe('find');
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

describe('font family dropdown', () => {
  function setup(html: string, options: Partial<ToolbarOptions> = {}) {
    const editor = createTestEditor({ html });
    attachEditor(editor);
    // jsdom has no layout: scrolling the selection into view needs Range.getClientRects.
    vi.spyOn(editor.view, 'coordsAtPos').mockReturnValue({ left: 0, right: 0, top: 0, bottom: 0 });
    const toolbar = createToolbar(editor, { container: createToolbarContainer(), ...options });
    const trigger = toolbar.element.querySelector<HTMLButtonElement>('[data-item="fontFamily"]')!;
    const value = () => trigger.querySelector('.stilo-dropdown__value')!.textContent;
    trigger.click();
    const menu = toolbar.element.querySelector<HTMLElement>('.stilo-dropdown__menu:not([hidden])')!;
    trigger.click();
    const option = (id: string) => menu.querySelector<HTMLElement>(`[data-option="${id}"]`)!;
    const ids = () =>
      [...menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]')].map(
        (el) => el.dataset.option,
      );
    return { editor, toolbar, trigger, value, menu, option, ids };
  }

  it('lists Default, the generic families and the fonts, each drawn in its font', () => {
    const { trigger, value, option, ids } = setup('<p>a|b</p>');
    expect(ids()).toEqual([
      'default',
      'sans-serif',
      'serif',
      'monospace',
      'arial',
      'verdana',
      'tahoma',
      'trebuchet-ms',
      'georgia',
      'times-new-roman',
      'courier-new',
    ]);
    expect(value()).toBe('Font');
    expect(trigger.getAttribute('aria-label')).toBe('Font: Font');
    const label = (id: string) => option(id).querySelector<HTMLElement>('.stilo-dropdown__label')!;
    expect(label('default').textContent).toBe('Default');
    expect(label('default').style.fontFamily).toBe('');
    expect(label('sans-serif').textContent).toBe('Sans serif');
    expect(label('times-new-roman').textContent).toBe('Times New Roman');
    expect(label('times-new-roman').style.fontFamily).toBe('"Times New Roman", Times, serif');
  });

  it('applies and removes a font family', () => {
    const { editor, toolbar, value, option } = setup('<p>[ab]</p>');
    option('georgia').click();
    expect(editor.getHTML()).toBe('<p><span style="font-family: Georgia, serif">ab</span></p>');
    toolbar.update();
    expect(value()).toBe('Georgia');
    expect(option('georgia').getAttribute('aria-checked')).toBe('true');
    expect(option('default').getAttribute('aria-checked')).toBe('false');
    option('default').click();
    expect(editor.getHTML()).toBe('<p>ab</p>');
  });

  it('shows a font that is not in the list by its first name', () => {
    const { trigger, value, menu } = setup(
      '<p><span style="font-family: Calibri, sans-serif">a|b</span></p>',
    );
    expect(value()).toBe('Calibri');
    expect(trigger.getAttribute('aria-label')).toBe('Font: Calibri');
    expect(menu.querySelector('[aria-checked="true"]')).toBeNull();
  });

  it('shows the dropdown label for a selection with different fonts', () => {
    const { value } = setup(
      '<p>[<span style="font-family: Arial">a</span><span style="font-family: Georgia">b</span>]</p>',
    );
    expect(value()).toBe('Font');
  });

  it('is disabled inside code', () => {
    const { trigger } = setup('<p><code>a|b</code></p>');
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
  });

  it('takes a custom list', () => {
    const { ids } = setup('<p>a|b</p>', {
      items: [
        [fontFamilyDropdown([{ fontFamily: "'Comic Sans MS', cursive", labelKey: 'Comic' }])],
      ],
    });
    expect(ids()).toEqual(['default', 'comic-sans-ms']);
  });
});

describe('font size control', () => {
  function setup(html: string, options: Partial<ToolbarOptions> = {}) {
    const editor = createTestEditor({ html });
    attachEditor(editor);
    vi.spyOn(editor.view, 'coordsAtPos').mockReturnValue({ left: 0, right: 0, top: 0, bottom: 0 });
    mockRenderedFontSizes();
    const toolbar = createToolbar(editor, { container: createToolbarContainer(), ...options });
    const parts = [...toolbar.element.querySelectorAll<HTMLElement>('[data-item="fontSize"]')];
    const [decrease, input, increase] = parts as [
      HTMLButtonElement,
      HTMLInputElement,
      HTMLButtonElement,
    ];
    const list = toolbar.element.querySelector<HTMLElement>('.stilo-font-size__list')!;
    const option = (size: string) => list.querySelector<HTMLElement>(`[data-size="${size}"]`)!;
    const sizes = () =>
      [...list.querySelectorAll<HTMLElement>('[role="option"]')].map((el) => el.textContent);
    return { editor, toolbar, decrease, input, increase, list, option, sizes };
  }

  it('renders −, the field and +, and the list of sizes in pt', () => {
    const { decrease, input, increase, list, sizes } = setup('<p>a|b</p>');
    expect(decrease.getAttribute('aria-label')).toBe('Decrease font size');
    expect(increase.getAttribute('aria-label')).toBe('Increase font size');
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-label')).toBe('Font size');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-controls')).toBe(list.id);
    expect(list.getAttribute('role')).toBe('listbox');
    expect(list.hidden).toBe(true);
    expect(sizes()).toEqual(['8', '9', '10', '11', '12', '14', '18', '24', '36', '48', '72']);
  });

  it.each([
    ['<p>a|b</p>', '12'],
    ['<h1>a|b</h1>', '24'],
    ['<p><span style="font-size: 11pt">a|b</span></p>', '11'],
    ['<p><span style="font-size: 18px">a|b</span></p>', '13.5'],
    ['<p>[<span style="font-size: 11pt">a</span><span style="font-size: 14pt">b</span>]</p>', ''],
  ])('shows the size of %j as %j', (html, expected) => {
    expect(setup(html).input.value).toBe(expected);
  });

  it('shows the size stored for the next typed text', () => {
    const { toolbar, input, increase } = setup('<p>a|</p>');
    increase.click();
    toolbar.update();
    expect(input.value).toBe('13');
  });

  it('steps the size with − and +', () => {
    const { editor, decrease, increase } = setup('<p>[ab]</p>');
    increase.click();
    expect(editor.getHTML()).toBe('<p><span style="font-size: 13pt">ab</span></p>');
    decrease.click();
    decrease.click();
    expect(editor.getHTML()).toBe('<p><span style="font-size: 11pt">ab</span></p>');
  });

  it('opens the list on click, with the shown size selected; an option applies it', () => {
    const { editor, input, list, option } = setup('<p>[ab]</p>');
    input.focus();
    input.click();
    expect(list.hidden).toBe(false);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(option('12').getAttribute('aria-selected')).toBe('true');
    option('18').click();
    expect(list.hidden).toBe(true);
    expect(editor.getHTML()).toBe('<p><span style="font-size: 18pt">ab</span></p>');
    expect(document.activeElement).toBe(editor.view.dom);
  });

  it('moves in the list with the arrows and applies with Enter', () => {
    const { editor, input, list, option } = setup('<p>[ab]</p>');
    input.focus();
    press(input, 'ArrowDown');
    expect(list.hidden).toBe(false);
    expect(input.getAttribute('aria-activedescendant')).toBe(option('14').id);
    expect(option('14').classList.contains('stilo-font-size__option--active')).toBe(true);
    press(input, 'ArrowUp');
    press(input, 'ArrowUp');
    expect(input.getAttribute('aria-activedescendant')).toBe(option('11').id);
    press(input, 'Enter');
    expect(editor.getHTML()).toBe('<p><span style="font-size: 11pt">ab</span></p>');
  });

  it.each([
    ['15', '15pt'],
    ['10,5', '10.5pt'],
    ['20px', '20px'],
    ['1.5EM', '1.5em'],
    ['0.8rem', '0.8rem'],
  ])('applies the typed %j as %j', (typed, expected) => {
    const { editor, input } = setup('<p>[ab]</p>');
    input.focus();
    input.value = typed;
    press(input, 'Enter');
    expect(editor.getHTML()).toBe(`<p><span style="font-size: ${expected}">ab</span></p>`);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it.each(['abc', '0', '401', '500px', '-3'])('refuses the typed %j', (typed) => {
    const { editor, input } = setup('<p>[ab]</p>');
    input.focus();
    input.value = typed;
    press(input, 'Enter');
    expect(editor.getHTML()).toBe('<p>ab</p>');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(input);
    input.dispatchEvent(new Event('input'));
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('Escape gives the focus back to the text and shows the size again', () => {
    const { editor, input } = setup('<p>[ab]</p>');
    input.focus();
    input.value = '30';
    press(input, 'Escape');
    expect(editor.getHTML()).toBe('<p>ab</p>');
    expect(document.activeElement).toBe(editor.view.dom);
    expect(input.value).toBe('12');
  });

  it('arrows leave the field only at the ends of its text', () => {
    const { input, decrease, increase } = setup('<p>a|b</p>');
    input.focus();
    input.setSelectionRange(1, 1);
    press(input, 'ArrowLeft');
    expect(document.activeElement).toBe(input);
    input.setSelectionRange(0, 0);
    press(input, 'ArrowLeft');
    expect(document.activeElement).toBe(decrease);
    increase.focus();
    press(increase, 'ArrowLeft');
    expect(document.activeElement).toBe(input);
  });

  it('is disabled inside code', () => {
    const { decrease, input, increase } = setup('<p><code>a|b</code></p>');
    for (const part of [decrease, input, increase]) {
      expect(part.getAttribute('aria-disabled')).toBe('true');
    }
    expect(input.readOnly).toBe(true);
    expect(input.value).toBe('');
  });

  it('takes another unit and list', () => {
    const { editor, input, increase, sizes } = setup('<p>[ab]</p>', {
      items: [[fontSizeInput({ unit: 'px', sizes: [12, 16] })]],
    });
    expect(input.value).toBe('16');
    expect(sizes()).toEqual(['12', '16']);
    increase.click();
    expect(editor.getHTML()).toBe('<p><span style="font-size: 17px">ab</span></p>');
  });

  it('writes rem from the px it shows', () => {
    const { editor, input, sizes } = setup('<p>[ab]</p>', {
      items: [[fontSizeInput({ unit: 'rem' })]],
    });
    expect(input.value).toBe('16');
    expect(sizes()[0]).toBe('10');
    input.focus();
    input.value = '20';
    press(input, 'Enter');
    expect(editor.getHTML()).toBe('<p><span style="font-size: 1.25rem">ab</span></p>');
  });
});

describe('text alignment menu', () => {
  function setup(html: string, options: Partial<ToolbarOptions> = {}) {
    const editor = createTestEditor({ html });
    attachEditor(editor);
    vi.spyOn(editor.view, 'coordsAtPos').mockReturnValue({ left: 0, right: 0, top: 0, bottom: 0 });
    const toolbar = createToolbar(editor, { container: createToolbarContainer(), ...options });
    const trigger = toolbar.element.querySelector<HTMLButtonElement>('[data-item="textAlign"]')!;
    const menu = toolbar.element.querySelector<HTMLElement>('.stilo-icon-menu')!;
    const option = (id: string) => menu.querySelector<HTMLButtonElement>(`[data-option="${id}"]`)!;
    return { editor, toolbar, trigger, menu, option };
  }

  it('renders the trigger and the four options in a row', () => {
    const { trigger, menu, option } = setup('<p>a|b</p>');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-label')).toBe('Alignment: Align left');
    expect(trigger.title).toBe('Alignment');
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.getAttribute('aria-orientation')).toBe('horizontal');
    expect(menu.hidden).toBe(true);
    const ids = [...menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]')].map(
      (el) => el.dataset.option,
    );
    expect(ids).toEqual(['left', 'center', 'right', 'justify']);
    expect(option('center').getAttribute('aria-label')).toBe('Center');
    expect(option('center').title).toBe('Center (Ctrl+Shift+E)');
    expect(option('left').getAttribute('aria-checked')).toBe('true');
    expect(option('center').getAttribute('aria-checked')).toBe('false');
  });

  it('shows the alignment of the block at the selection', () => {
    const { trigger, option } = setup('<h2 style="text-align: right">a|b</h2>', {
      messages: itLocale,
    });
    expect(trigger.getAttribute('aria-label')).toBe('Allineamento: Allinea a destra');
    expect(option('right').getAttribute('aria-checked')).toBe('true');
    expect(option('right').classList.contains('stilo-toolbar__button--active')).toBe(true);
  });

  it('opens on click with the focus on the checked option; an option aligns', () => {
    const { editor, trigger, menu, option } = setup('<p style="text-align: justify">a|b</p>');
    trigger.click();
    expect(menu.hidden).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(option('justify'));
    option('center').click();
    expect(menu.hidden).toBe(true);
    expect(editor.getHTML()).toBe('<p style="text-align: center">ab</p>');
    expect(document.activeElement).toBe(editor.view.dom);
  });

  it('moves between the options with the arrows, Home and End, wrapping', () => {
    const { trigger, option } = setup('<p>a|b</p>');
    trigger.focus();
    press(trigger, 'ArrowDown');
    expect(document.activeElement).toBe(option('left'));
    press(option('left'), 'ArrowLeft');
    expect(document.activeElement).toBe(option('justify'));
    press(option('justify'), 'ArrowRight');
    expect(document.activeElement).toBe(option('left'));
    press(option('left'), 'End');
    expect(document.activeElement).toBe(option('justify'));
    press(option('justify'), 'Home');
    expect(document.activeElement).toBe(option('left'));
  });

  it('Escape closes and gives the focus to the trigger', () => {
    const { trigger, menu, option } = setup('<p>a|b</p>');
    trigger.click();
    press(option('left'), 'Escape');
    expect(menu.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it('is disabled on a selected horizontal rule', () => {
    const { editor, toolbar, trigger, menu } = setup('<p>a</p><hr><p>b</p>');
    editor.commands.selectNode(3);
    toolbar.update();
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
    trigger.click();
    expect(menu.hidden).toBe(true);
  });

  it('is not rendered without the TextAlign extension', () => {
    const editor = createTestEditor({
      html: '<p>ab</p>',
      extensions: [defaultExtensions({ textAlign: false })],
    });
    attachEditor(editor);
    const toolbar = createToolbar(editor, { container: createToolbarContainer() });
    expect(toolbar.element.querySelector('[data-item="textAlign"]')).toBeNull();
  });
});

describe('line spacing dropdown', () => {
  function setup(html: string, options: Partial<ToolbarOptions> = {}) {
    const editor = createTestEditor({ html });
    attachEditor(editor);
    vi.spyOn(editor.view, 'coordsAtPos').mockReturnValue({ left: 0, right: 0, top: 0, bottom: 0 });
    const toolbar = createToolbar(editor, { container: createToolbarContainer(), ...options });
    const trigger = toolbar.element.querySelector<HTMLButtonElement>('[data-item="lineHeight"]')!;
    const menu = toolbar.element.querySelector('.stilo-dropdown__option--1-15')!.parentElement!;
    const option = (id: string) => menu.querySelector<HTMLElement>(`[data-option="${id}"]`)!;
    return { editor, toolbar, trigger, menu, option };
  }

  it('renders an icon trigger and the options, "Default" checked without a line height', () => {
    const { trigger, menu, option } = setup('<p>a|b</p>');
    expect(trigger.classList.contains('stilo-dropdown__trigger--icon')).toBe(true);
    expect(trigger.querySelector('.stilo-dropdown__value')).toBeNull();
    expect(trigger.getAttribute('aria-label')).toBe('Line spacing: Default');
    const labels = [...menu.querySelectorAll('[role="menuitemradio"]')].map((el) => el.textContent);
    expect(labels).toEqual(['Default', '1', '1.15', '1.5', '2']);
    expect(option('default').getAttribute('aria-checked')).toBe('true');
  });

  it('shows the line height of the block at the selection', () => {
    const { trigger, option } = setup('<h2 style="line-height: 1.15">a|b</h2>', {
      messages: itLocale,
    });
    expect(trigger.getAttribute('aria-label')).toBe('Interlinea: 1.15');
    expect(option('1-15').getAttribute('aria-checked')).toBe('true');
    expect(option('default').getAttribute('aria-checked')).toBe('false');
  });

  it('sets the line height, and "Default" removes it', () => {
    const { editor, trigger, menu, option } = setup('<p>a|b</p>');
    trigger.click();
    option('1-5').click();
    expect(menu.hidden).toBe(true);
    expect(editor.getHTML()).toBe('<p style="line-height: 1.5">ab</p>');
    trigger.click();
    option('default').click();
    expect(editor.getHTML()).toBe('<p>ab</p>');
  });

  it('is disabled on a selected horizontal rule', () => {
    const { editor, toolbar, trigger } = setup('<p>a</p><hr><p>b</p>');
    editor.commands.selectNode(3);
    toolbar.update();
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
  });

  it('is not rendered without the LineHeight extension', () => {
    const editor = createTestEditor({
      html: '<p>ab</p>',
      extensions: [defaultExtensions({ lineHeight: false })],
    });
    attachEditor(editor);
    const toolbar = createToolbar(editor, { container: createToolbarContainer() });
    expect(toolbar.element.querySelector('[data-item="lineHeight"]')).toBeNull();
  });
});

describe('font controls without TextStyle', () => {
  it('are not rendered', () => {
    const editor = createTestEditor({
      html: '<p>ab</p>',
      extensions: [defaultExtensions({ textStyle: false })],
    });
    attachEditor(editor);
    const toolbar = createToolbar(editor, { container: createToolbarContainer() });
    expect(toolbar.element.querySelector('[data-item="fontFamily"]')).toBeNull();
    expect(toolbar.element.querySelector('[data-item="fontSize"]')).toBeNull();
  });
});
