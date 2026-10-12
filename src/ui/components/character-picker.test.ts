import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestEditor, getHTMLWithSelection } from '../../../tests/helpers';
import { createToolbar } from '../index';
import { EMOJI, SYMBOLS } from './characters';

function setup(html = '<p>a|</p>') {
  const editor = createTestEditor({ html });
  document.body.append(editor.view.dom.parentElement!);
  const container = document.createElement('div');
  document.body.append(container);
  const toolbar = createToolbar(editor, { container });
  const button = toolbar.element.querySelector<HTMLButtonElement>('[data-item="characters"]')!;
  const picker = toolbar.element.querySelector<HTMLElement>('.stilo-char-picker')!;
  const search = picker.querySelector<HTMLInputElement>('.stilo-char-picker__search')!;
  const [symbolsTab, emojiTab] = [
    ...picker.querySelectorAll<HTMLButtonElement>('.stilo-char-picker__tab'),
  ];
  const cells = () => [...picker.querySelectorAll<HTMLButtonElement>('.stilo-char-picker__char')];
  const cell = (character: string) => cells().find((c) => c.textContent === character)!;
  const open = async () => {
    button.click();
    await vi.waitFor(() => expect(cells().length).toBeGreaterThan(0));
  };
  return { editor, toolbar, button, picker, search, symbolsTab, emojiTab, cells, cell, open };
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

describe('character picker: data', () => {
  it('has unique characters, each with a name', () => {
    const characters = [...SYMBOLS, ...EMOJI].flatMap((category) => category.characters);
    expect(new Set(characters.map(([character]) => character)).size).toBe(characters.length);
    expect(characters.every(([, name]) => name.length > 0)).toBe(true);
  });
});

describe('character picker', () => {
  it('is a dialog button, closed, with its data not loaded yet', () => {
    const { button, picker, cells } = setup();
    expect(button.getAttribute('title')).toBe('Insert character');
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(picker.hidden).toBe(true);
    expect(picker.getAttribute('role')).toBe('dialog');
    expect(cells()).toHaveLength(0);
  });

  it('opens on the symbols tab, by category, with the focus in the search field', async () => {
    const { button, picker, search, symbolsTab, emojiTab, cells, open } = setup();
    await open();
    expect(picker.hidden).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(search);
    expect(symbolsTab!.getAttribute('aria-selected')).toBe('true');
    expect(emojiTab!.getAttribute('aria-selected')).toBe('false');
    const headings = [...picker.querySelectorAll('.stilo-char-picker__heading')];
    expect(headings.map((h) => h.textContent)).toEqual([
      'Punctuation',
      'Currency',
      'Math',
      'Arrows',
      'Greek',
      'Accented letters',
      'Signs and shapes',
    ]);
    expect(cells()[0]!.tabIndex).toBe(0);
    expect(cells()[0]!.getAttribute('aria-label')).toBe(
      'Left-pointing double angle quotation mark',
    );
  });

  it('inserts a character at the cursor and stays open', async () => {
    const { editor, picker, cell, open } = setup('<p><strong>a|</strong></p>');
    await open();
    cell('€').click();
    cell('→').click();
    expect(getHTMLWithSelection(editor)).toBe('<p><strong>a€→|</strong></p>');
    expect(picker.hidden).toBe(false);
    expect(document.activeElement).toBe(cell('→'));
  });

  it('switches to emoji with a click and with the arrow keys', async () => {
    const { picker, symbolsTab, emojiTab, cells, open } = setup();
    await open();
    emojiTab!.click();
    expect(emojiTab!.getAttribute('aria-selected')).toBe('true');
    expect(cells()[0]!.textContent).toBe('😀');
    expect(picker.querySelector('.stilo-char-picker__heading')!.textContent).toBe('Smileys');
    press(emojiTab!, 'ArrowLeft');
    expect(symbolsTab!.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(symbolsTab);
    expect(cells()[0]!.textContent).toBe('«');
  });

  it('searches both tabs by name, hiding the tabs', async () => {
    const { picker, search, cells, open } = setup();
    await open();
    type(search, 'Euro sign');
    expect(cells().map((c) => c.textContent)).toEqual(['€']);
    type(search, 'heart');
    expect(cells().map((c) => c.textContent)).toContain('❤️');
    expect(cells().map((c) => c.textContent)).toContain('♥');
    expect(picker.querySelector<HTMLElement>('.stilo-char-picker__tabs')!.hidden).toBe(true);
    type(search, 'zzzz');
    expect(cells()).toHaveLength(0);
    expect(picker.querySelector('.stilo-char-picker__empty')!.textContent).toBe('No results');
    type(search, '');
    expect(picker.querySelector<HTMLElement>('.stilo-char-picker__tabs')!.hidden).toBe(false);
    expect(cells()[0]!.textContent).toBe('«');
  });

  it('moves with the arrow keys: by character left/right, by row up/down across categories', async () => {
    const { search, cell, open } = setup();
    await open();
    press(search, 'ArrowDown');
    expect(document.activeElement).toBe(cell('«'));
    press(cell('«'), 'ArrowRight');
    expect(document.activeElement).toBe(cell('»'));
    expect(cell('»').tabIndex).toBe(0);
    expect(cell('«').tabIndex).toBe(-1);
    press(cell('»'), 'ArrowDown');
    expect(document.activeElement).toBe(cell('–'));
    // Punctuation has 24 characters: its last row has 4 of them.
    press(cell('€'), 'ArrowUp');
    expect(document.activeElement).toBe(cell('¿'));
    press(cell('‰'), 'ArrowDown');
    expect(document.activeElement).toBe(cell('¢'));
    press(cell('€'), 'ArrowLeft');
    expect(document.activeElement).toBe(cell('‰'));
  });

  it('closes with Escape and with its button, giving the focus back to the editor', async () => {
    const { editor, button, picker, open } = setup();
    await open();
    press(document.activeElement!, 'Escape');
    expect(picker.hidden).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(editor.view.hasFocus()).toBe(true);
    await open();
    button.click();
    expect(picker.hidden).toBe(true);
    expect(editor.view.hasFocus()).toBe(true);
  });

  it('lets clicks inside it take the focus, unlike the toolbar buttons', async () => {
    const { button, search, open } = setup();
    await open();
    const inside = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    search.dispatchEvent(inside);
    expect(inside.defaultPrevented).toBe(false);
    const onButton = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    button.dispatchEvent(onButton);
    expect(onButton.defaultPrevented).toBe(true);
  });

  it('is removed by toolbar.destroy(), with the button attributes', async () => {
    const { toolbar, button, picker, open } = setup();
    await open();
    toolbar.destroy();
    expect(picker.isConnected).toBe(false);
    expect(button.hasAttribute('aria-haspopup')).toBe(false);
  });
});
