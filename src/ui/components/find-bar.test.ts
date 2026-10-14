import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestEditor, getHTMLWithSelection, mockScrollIntoView } from '../../../tests/helpers';
import { defaultExtensions, getSearchResults } from '../../index';
import { createToolbar, it as italian } from '../index';

function setup(html: string, extensions = [defaultExtensions()]) {
  const editor = createTestEditor({ html, extensions });
  document.body.append(editor.view.dom.parentElement!);
  const container = document.createElement('div');
  document.body.append(container);
  const toolbar = createToolbar(editor, { container });
  const bar = container.querySelector<HTMLElement>('.stilo-find-bar')!;
  const [find, replace] = bar ? [...bar.querySelectorAll('input')] : [];
  const buttons = bar ? [...bar.querySelectorAll('button')] : [];
  const [previous, next, matchCase, wholeWord, close, replaceOne, replaceAll] = buttons;
  const count = bar?.querySelector<HTMLElement>('.stilo-find-bar__count');
  const button = toolbar.element.querySelector<HTMLButtonElement>('[data-item="find"]')!;
  const modF = (target: Element = editor.view.dom) => press(target, 'f', { ctrlKey: true });
  return {
    ...{ editor, toolbar, container, bar, find: find!, replace: replace!, count: count!, button },
    ...{ previous, next, matchCase, wholeWord, close, replaceOne, replaceAll, modF },
  };
}

function press(target: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

function type(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  vi.useFakeTimers();
  mockScrollIntoView();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('find button and Mod-f', () => {
  it('is a button with the Mod-f shortcut that opens the bar under the toolbar', () => {
    const { button, bar, container, toolbar, find } = setup('<p>ab</p>');
    expect(button.getAttribute('title')).toBe('Find and replace (Ctrl+F)');
    expect(toolbar.element.nextElementSibling).toBe(bar);
    expect(container.lastElementChild).toBe(bar);
    expect(bar.hidden).toBe(true);
    button.click();
    expect(bar.hidden).toBe(false);
    expect(document.activeElement).toBe(find);
  });

  it('Mod-f in the editor opens the bar, prefilled with the selected text', () => {
    const { bar, find, modF, editor, count } = setup('<p>a [cat] and a cat</p>');
    const event = modF();
    expect(event.defaultPrevented).toBe(true);
    expect(bar.hidden).toBe(false);
    expect(find.value).toBe('cat');
    expect(getSearchResults(editor)).toEqual({ count: 2, limited: false, current: 1 });
    expect(count.textContent).toBe('1 of 2');
  });

  it('does not prefill a selection across blocks', () => {
    const { find, modF } = setup('<p>a [cat</p><p>dog] b</p>');
    modF();
    expect(find.value).toBe('');
  });

  it('the button closes an open bar, like Escape, and shows the state with aria-expanded', () => {
    const { button, bar, find, editor } = setup('<p>cat</p>');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    button.click();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    type(find, 'cat');
    vi.advanceTimersByTime(350);
    button.click();
    expect(bar.hidden).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(getSearchResults(editor).count).toBe(0);
    button.click();
    expect(find.value).toBe('cat');
    expect(getSearchResults(editor).count).toBe(1);
  });

  it('Mod-f in the bar selects the find field instead of the browser find', () => {
    const { button, find, replace, modF } = setup('<p>ab</p>');
    button.click();
    replace.focus();
    expect(modF(replace).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(find);
  });

  it('is not rendered without the Search extension, and Mod-f is left alone', () => {
    const { bar, button, modF } = setup('<p>ab</p>', [defaultExtensions({ search: false })]);
    expect(bar).toBeNull();
    expect(button).toBeNull();
    expect(modF().defaultPrevented).toBe(false);
  });
});

describe('find field', () => {
  it('searches 350 ms after the last keystroke', () => {
    const { button, find, editor, count } = setup('<p>cat cat</p>');
    button.click();
    type(find, 'ca');
    vi.advanceTimersByTime(200);
    type(find, 'cat');
    vi.advanceTimersByTime(349);
    expect(getSearchResults(editor).count).toBe(0);
    vi.advanceTimersByTime(1);
    expect(getSearchResults(editor).count).toBe(2);
    expect(count.textContent).toBe('Results: 2');
  });

  it('does not search one character', () => {
    const { button, find, editor, count } = setup('<p>cat cat</p>');
    button.click();
    type(find, 'c');
    vi.advanceTimersByTime(350);
    expect(getSearchResults(editor).count).toBe(0);
    expect(count.textContent).toBe('');
  });

  it('says when there is no result, and counts the matches past maxMatches', () => {
    const { button, find, count } = setup('<p>ab ab</p>', [
      defaultExtensions({ search: { maxMatches: 1 } }),
    ]);
    button.click();
    type(find, 'xy');
    vi.advanceTimersByTime(350);
    expect(count.textContent).toBe('No results');
    type(find, 'ab');
    vi.advanceTimersByTime(350);
    expect(count.textContent).toBe('Results: 2');
    press(find, 'Enter');
    press(find, 'Enter');
    expect(count.textContent).toBe('2 of 2');
  });

  it('Enter searches at once and selects the next match; Shift+Enter the previous one', () => {
    const { button, find, editor, count } = setup('<p>|cat cat</p>');
    button.click();
    type(find, 'cat');
    press(find, 'Enter');
    expect(getHTMLWithSelection(editor)).toBe('<p>[cat] cat</p>');
    expect(count.textContent).toBe('1 of 2');
    press(find, 'Enter');
    expect(getHTMLWithSelection(editor)).toBe('<p>cat [cat]</p>');
    press(find, 'Enter', { shiftKey: true });
    expect(getHTMLWithSelection(editor)).toBe('<p>[cat] cat</p>');
    expect(document.activeElement).toBe(find);
  });

  it('the previous and next buttons move between the matches', () => {
    const { button, find, editor, previous, next } = setup('<p>|cat cat</p>');
    button.click();
    type(find, 'cat');
    next!.click();
    expect(getHTMLWithSelection(editor)).toBe('<p>[cat] cat</p>');
    previous!.click();
    expect(getHTMLWithSelection(editor)).toBe('<p>cat [cat]</p>');
  });

  it('match case and whole word search again at once', () => {
    const { button, find, editor, matchCase, wholeWord } = setup('<p>Cat cat catalog</p>');
    button.click();
    type(find, 'cat');
    vi.advanceTimersByTime(350);
    expect(getSearchResults(editor).count).toBe(3);
    matchCase!.click();
    expect(matchCase!.getAttribute('aria-pressed')).toBe('true');
    expect(getSearchResults(editor).count).toBe(2);
    wholeWord!.click();
    expect(getSearchResults(editor).count).toBe(1);
  });
});

describe('replace', () => {
  it('Replace replaces the selected match and selects the next one', () => {
    const { button, find, replace, editor, replaceOne } = setup('<p>|cat cat</p>');
    button.click();
    type(find, 'cat');
    type(replace, 'dog');
    replaceOne!.click();
    expect(getHTMLWithSelection(editor)).toBe('<p>[cat] cat</p>');
    press(replace, 'Enter');
    expect(getHTMLWithSelection(editor)).toBe('<p>dog [cat]</p>');
  });

  it('Replace all replaces every match', () => {
    const { button, find, replace, editor, replaceAll, count } = setup('<p>cat cat</p>');
    button.click();
    type(find, 'cat');
    type(replace, 'dog');
    replaceAll!.click();
    expect(editor.getHTML()).toBe('<p>dog dog</p>');
    expect(count.textContent).toBe('No results');
  });

  it('is hidden in a read-only editor', () => {
    const { button, editor, replace } = setup('<p>cat</p>');
    editor.setEditable(false);
    button.click();
    expect(replace.parentElement!.hidden).toBe(true);
  });
});

describe('closing', () => {
  it.each(['Escape', 'close'])('%s hides the bar, clears the search, focuses the editor', (how) => {
    const { button, find, editor, bar, close } = setup('<p>cat</p>');
    button.click();
    type(find, 'cat');
    vi.advanceTimersByTime(350);
    if (how === 'close') close!.click();
    else press(find, 'Escape');
    expect(bar.hidden).toBe(true);
    expect(getSearchResults(editor).count).toBe(0);
    expect(editor.view.hasFocus()).toBe(true);
  });

  it('a pending search does not run after closing', () => {
    const { button, find, editor, close } = setup('<p>cat</p>');
    button.click();
    type(find, 'cat');
    close!.click();
    vi.advanceTimersByTime(350);
    expect(getSearchResults(editor).count).toBe(0);
  });

  it('destroying the toolbar removes the bar', () => {
    const { toolbar, container } = setup('<p>cat</p>');
    expect(container.classList.contains('stilo-find-bar-host')).toBe(true);
    toolbar.destroy();
    expect(container.querySelector('.stilo-find-bar')).toBeNull();
    expect(container.classList.contains('stilo-find-bar-host')).toBe(false);
  });
});

describe('strings', () => {
  it('uses the given messages', () => {
    const editor = createTestEditor({ html: '<p>|cat</p>' });
    const container = document.createElement('div');
    document.body.append(editor.view.dom.parentElement!, container);
    createToolbar(editor, { container, messages: italian });
    const bar = container.querySelector<HTMLElement>('.stilo-find-bar')!;
    expect(bar.getAttribute('aria-label')).toBe('Trova e sostituisci');
    container.querySelector<HTMLElement>('[data-item="find"]')!.click();
    const find = bar.querySelector('input')!;
    type(find, 'cat');
    press(find, 'Enter');
    expect(bar.querySelector('.stilo-find-bar__count')!.textContent).toBe('1 di 1');
  });
});
