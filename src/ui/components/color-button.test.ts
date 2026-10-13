import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestEditor, getHTMLWithSelection } from '../../../tests/helpers';
import { StarterKit } from '../../index';
import {
  createToolbar,
  DEFAULT_PALETTE,
  it as itLocale,
  type Messages,
  type ToolbarOptions,
  textColorButton,
} from '../index';

function setup(html: string, options: Partial<ToolbarOptions> = {}, extensions = [StarterKit()]) {
  const editor = createTestEditor({ html, extensions });
  document.body.append(editor.view.dom.parentElement!);
  // jsdom has no layout: scrolling the selection into view needs coordsAtPos.
  vi.spyOn(editor.view, 'coordsAtPos').mockReturnValue({ left: 0, right: 0, top: 0, bottom: 0 });
  const container = document.createElement('div');
  document.body.append(container);
  const toolbar = createToolbar(editor, { container, ...options });
  const parts = (id: string) => {
    const [main, arrow] = [
      ...toolbar.element.querySelectorAll<HTMLButtonElement>(`[data-item="${id}"]`),
    ];
    return { main: main!, arrow: arrow! };
  };
  const pickers = () => [...toolbar.element.querySelectorAll<HTMLElement>('.stilo-color-picker')];
  const swatches = (picker: HTMLElement) => [
    ...picker.querySelectorAll<HTMLButtonElement>('.stilo-color-picker__swatch'),
  ];
  return { editor, toolbar, parts, pickers, swatches };
}

function press(target: Element, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

function type(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('color buttons: rendering', () => {
  it('renders the two parts of each split button and a closed dialog', () => {
    const { parts, pickers } = setup('<p>a</p>');
    const { main, arrow } = parts('textColor');
    expect(main.getAttribute('aria-label')).toBe('Text color');
    expect(main.getAttribute('aria-pressed')).toBe('false');
    expect(main.querySelector('.stilo-split__color')).not.toBeNull();
    expect(arrow.getAttribute('aria-label')).toBe('Text color: more colors');
    expect(arrow.getAttribute('aria-haspopup')).toBe('dialog');
    expect(arrow.getAttribute('aria-expanded')).toBe('false');
    expect(parts('highlight').main.getAttribute('aria-label')).toBe('Highlight');

    const [textPicker] = pickers();
    expect(pickers()).toHaveLength(2);
    expect(textPicker!.hidden).toBe(true);
    expect(textPicker!.getAttribute('role')).toBe('dialog');
    expect(textPicker!.getAttribute('aria-label')).toBe('Text color');
  });

  it('shows the default palette with color names', () => {
    const { pickers, swatches } = setup('<p>a</p>');
    const all = swatches(pickers()[0]!);
    expect(all).toHaveLength(32);
    expect(all.map((s) => s.dataset.color)).toEqual(DEFAULT_PALETTE.map((c) => c.color));
    expect(all[0]!.getAttribute('aria-label')).toBe('Black');
    expect(all[16]!.getAttribute('title')).toBe('Light red');
    expect(all[8]!.style.backgroundColor).toBe('rgb(239, 68, 68)');
  });

  it('accepts a custom palette and translated labels', () => {
    const messages: Messages = { ...itLocale, 'brand.blue': 'Blu aziendale' };
    const items = [[textColorButton([{ color: '#123456', labelKey: 'brand.blue' }])]];
    const { parts, pickers, swatches } = setup('<p>a</p>', { items, messages });
    expect(parts('textColor').main.getAttribute('aria-label')).toBe('Colore testo');
    expect(parts('textColor').arrow.getAttribute('aria-label')).toBe('Colore testo: altri colori');
    const [only] = swatches(pickers()[0]!);
    expect(swatches(pickers()[0]!)).toHaveLength(1);
    expect(only!.getAttribute('aria-label')).toBe('Blu aziendale');
    expect(pickers()[0]!.querySelector('.stilo-color-picker__none')!.textContent).toBe(
      'Nessun colore',
    );
  });

  it('is not rendered without its extension', () => {
    const { parts } = setup('<p>a</p>', {}, [StarterKit({ textStyle: false, highlight: false })]);
    expect(parts('textColor').main).toBeUndefined();
    expect(parts('highlight').main).toBeUndefined();
  });

  it('is disabled inside code', () => {
    const { editor, toolbar, parts, pickers } = setup('<p><code>a[b]c</code></p>');
    const { main, arrow } = parts('textColor');
    expect(main.getAttribute('aria-disabled')).toBe('true');
    expect(arrow.getAttribute('aria-disabled')).toBe('true');
    main.click();
    arrow.click();
    expect(pickers()[0]!.hidden).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p><code>a[b]c</code></p>');
    toolbar.destroy();
  });
});

describe('color buttons: main part', () => {
  it('applies the last used color, red by default, and removes it when present', () => {
    const { editor, toolbar, parts } = setup('<p>a[b]c</p>');
    const { main } = parts('textColor');
    main.click();
    expect(getHTMLWithSelection(editor)).toBe('<p>a<span style="color: #ef4444">[b]</span>c</p>');
    toolbar.update();
    expect(main.getAttribute('aria-pressed')).toBe('true');
    expect(main.classList.contains('stilo-toolbar__button--active')).toBe(true);
    main.click();
    expect(getHTMLWithSelection(editor)).toBe('<p>a[b]c</p>');
    toolbar.update();
    expect(main.getAttribute('aria-pressed')).toBe('false');
  });

  it('highlights with a plain <mark> by default', () => {
    const { editor, parts } = setup('<p>a[b]c</p>');
    parts('highlight').main.click();
    expect(getHTMLWithSelection(editor)).toBe('<p>a<mark>[b]</mark>c</p>');
  });
});

describe('color buttons: popover', () => {
  it('opens on the arrow with the focus on the first swatch', () => {
    const { parts, pickers, swatches } = setup('<p>a[b]c</p>');
    const { arrow } = parts('textColor');
    arrow.click();
    const picker = pickers()[0]!;
    expect(picker.hidden).toBe(false);
    expect(arrow.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(swatches(picker)[0]);
    expect(swatches(picker)[0]!.tabIndex).toBe(0);
    expect(swatches(picker).every((s) => s.getAttribute('aria-pressed') === 'false')).toBe(true);
    arrow.click();
    expect(picker.hidden).toBe(true);
    expect(arrow.getAttribute('aria-expanded')).toBe('false');
  });

  it('marks and focuses the color of the selection, and prefills the custom fields', () => {
    const { parts, pickers, swatches } = setup('<p><span style="color: #3b82f6">a[b]c</span></p>');
    parts('textColor').arrow.click();
    const picker = pickers()[0]!;
    const blue = swatches(picker).find((s) => s.dataset.color === '#3b82f6')!;
    expect(blue.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(blue);
    expect(picker.querySelector<HTMLInputElement>('.stilo-color-picker__value')!.value).toBe(
      '#3b82f6',
    );
    expect(picker.querySelector<HTMLInputElement>('.stilo-color-picker__native')!.value).toBe(
      '#3b82f6',
    );
  });

  it('applies a swatch, closes, focuses the editor and remembers the color', () => {
    const { editor, parts, pickers, swatches } = setup('<p>a[b]c</p>');
    const { main, arrow } = parts('highlight');
    arrow.click();
    const picker = pickers()[1]!;
    swatches(picker)
      .find((s) => s.dataset.color === '#fef08a')!
      .click();
    expect(getHTMLWithSelection(editor)).toBe(
      '<p>a<mark style="background-color: #fef08a">[b]</mark>c</p>',
    );
    expect(picker.hidden).toBe(true);
    expect(document.activeElement).toBe(editor.view.dom);
    main.click();
    expect(getHTMLWithSelection(editor)).toBe('<p>a[b]c</p>');
    main.click();
    expect(getHTMLWithSelection(editor)).toBe(
      '<p>a<mark style="background-color: #fef08a">[b]</mark>c</p>',
    );
  });

  it('removes the color with "No color"', () => {
    const { editor, parts, pickers } = setup('<p><mark>a[b]c</mark></p>');
    parts('highlight').arrow.click();
    const picker = pickers()[1]!;
    picker.querySelector<HTMLButtonElement>('.stilo-color-picker__none')!.click();
    expect(getHTMLWithSelection(editor)).toBe('<p><mark>a</mark>[b]<mark>c</mark></p>');
    expect(picker.hidden).toBe(true);
  });

  it('applies a custom color and remembers it normalized', () => {
    const { editor, toolbar, parts, pickers } = setup('<p>a[b]c</p>');
    const { main, arrow } = parts('textColor');
    arrow.click();
    const picker = pickers()[0]!;
    const value = picker.querySelector<HTMLInputElement>('.stilo-color-picker__value')!;
    type(value, ' #0F0 ');
    picker.querySelector<HTMLButtonElement>('.stilo-color-picker__apply')!.click();
    expect(getHTMLWithSelection(editor)).toBe('<p>a<span style="color: #00ff00">[b]</span>c</p>');
    expect(picker.hidden).toBe(true);
    toolbar.update();
    expect(main.getAttribute('aria-pressed')).toBe('true');
  });

  it('refuses an invalid custom color and keeps the dialog open', () => {
    const { editor, parts, pickers } = setup('<p>a[b]c</p>');
    parts('textColor').arrow.click();
    const picker = pickers()[0]!;
    const value = picker.querySelector<HTMLInputElement>('.stilo-color-picker__value')!;
    type(value, 'url(x)');
    picker.querySelector<HTMLButtonElement>('.stilo-color-picker__apply')!.click();
    expect(getHTMLWithSelection(editor)).toBe('<p>a[b]c</p>');
    expect(picker.hidden).toBe(false);
    expect(value.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(value);
    type(value, 'red');
    expect(value.hasAttribute('aria-invalid')).toBe(false);
  });

  it('copies the native color picker value into the custom field', () => {
    const { parts, pickers } = setup('<p>a[b]c</p>');
    parts('textColor').arrow.click();
    const picker = pickers()[0]!;
    const native = picker.querySelector<HTMLInputElement>('.stilo-color-picker__native')!;
    type(native, '#123456');
    expect(picker.querySelector<HTMLInputElement>('.stilo-color-picker__value')!.value).toBe(
      '#123456',
    );
  });

  it('moves between swatches with the arrow keys', () => {
    const { parts, pickers, swatches } = setup('<p>a[b]c</p>');
    parts('textColor').arrow.click();
    const all = swatches(pickers()[0]!);
    expect(press(all[0]!, 'ArrowRight').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(all[1]);
    press(all[1]!, 'ArrowDown');
    expect(document.activeElement).toBe(all[9]);
    expect(all[9]!.tabIndex).toBe(0);
    expect(all[1]!.tabIndex).toBe(-1);
    press(all[9]!, 'ArrowLeft');
    expect(document.activeElement).toBe(all[8]);
    press(all[8]!, 'ArrowUp');
    expect(document.activeElement).toBe(all[0]);
    press(all[0]!, 'ArrowUp');
    expect(document.activeElement).toBe(all[0]);
  });

  it('closes with Escape and gives the focus back to the editor', () => {
    const { editor, parts, pickers, swatches } = setup('<p>a[b]c</p>');
    const { arrow } = parts('textColor');
    arrow.click();
    press(swatches(pickers()[0]!)[0]!, 'Escape');
    expect(pickers()[0]!.hidden).toBe(true);
    expect(arrow.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(editor.view.dom);
  });

  it('is removed with the toolbar', () => {
    const { toolbar, pickers } = setup('<p>a</p>');
    toolbar.destroy();
    expect(pickers()).toHaveLength(0);
    expect(document.querySelector('.stilo-color-picker')).toBeNull();
  });
});
