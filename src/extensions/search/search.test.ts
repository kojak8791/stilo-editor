import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTestEditor,
  getHTMLWithSelection,
  mockScrollIntoView,
  typeText,
} from '../../../tests/helpers';
import type { Editor } from '../../core/editor';
import { defaultExtensions } from '../default-extensions';
import { getSearchResults, type SearchTerm } from '.';

beforeEach(() => {
  mockScrollIntoView();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

/** The text of each highlighted match, in document order. */
function highlights(editor: Editor): string[] {
  return [...editor.view.dom.querySelectorAll('.stilo-search-match')].map((el) => el.textContent);
}

function current(editor: Editor): string[] {
  const elements = editor.view.dom.querySelectorAll('.stilo-search-match--current');
  return [...elements].map((el) => el.textContent);
}

function search(html: string, term: SearchTerm | string, maxMatches?: number): Editor {
  const extensions = maxMatches ? [defaultExtensions({ search: { maxMatches } })] : undefined;
  const editor = createTestEditor({ html, extensions });
  editor.commands.setSearch(typeof term === 'string' ? { text: term } : term);
  return editor;
}

describe('Search: matching', () => {
  it.each([
    ['<p>Cat cat CAT</p>', 'cat', ['Cat', 'cat', 'CAT']],
    ['<p>Cat cat CAT</p>', { text: 'cat', caseSensitive: true }, ['cat']],
    ['<p>cat catalog bobcat cat</p>', { text: 'cat', wholeWord: true }, ['cat', 'cat']],
    ['<p>città Città</p>', 'CITTÀ', ['città', 'Città']],
    ['<p>a\\nb</p>', 'a\\nb', ['a\\nb']],
    ['<p>a.c abc</p>', 'a.c', ['a.c']],
    ['<p>one</p><p>two one</p>', 'one', ['one', 'one']],
    ['<p>cat</p>', 'dog', []],
  ] as const)('in %j, %j highlights %j', (html, term, expected) => {
    expect(highlights(search(html, term))).toEqual(expected);
  });

  it('matches across marks', () => {
    const editor = search('<p>bo<strong>ld</strong> bold</p>', 'bold');
    expect(getSearchResults(editor)).toEqual({ count: 2, limited: false, current: 0 });
  });

  it('does not match across paragraphs', () => {
    expect(highlights(search('<p>ab</p><p>cd</p>', 'bc'))).toEqual([]);
  });

  it('clears the highlights with an empty text or clearSearch', () => {
    const editor = search('<p>cat cat</p>', 'cat');
    expect(editor.commands.setSearch({ text: '' })).toBe(true);
    expect(highlights(editor)).toEqual([]);
    editor.commands.setSearch({ text: 'cat' });
    expect(editor.commands.clearSearch()).toBe(true);
    expect(highlights(editor)).toEqual([]);
    expect(getSearchResults(editor)).toEqual({ count: 0, limited: false, current: 0 });
  });

  it('stops at maxMatches and says there are more', () => {
    const editor = search('<p>a a a</p>', 'a', 2);
    expect(highlights(editor)).toEqual(['a', 'a']);
    expect(getSearchResults(editor)).toEqual({ count: 2, limited: true, current: 0 });
  });

  it('is empty without the extension', () => {
    const editor = createTestEditor({
      html: '<p>cat</p>',
      extensions: [defaultExtensions({ search: false })],
    });
    expect('setSearch' in editor.commands).toBe(false);
    expect(getSearchResults(editor)).toEqual({ count: 0, limited: false, current: 0 });
  });
});

describe('Search: editing updates the highlights', () => {
  it('adds a match typed in', () => {
    const editor = search('<p>ca|</p><p>cat</p>', 'cat');
    typeText(editor, 't');
    expect(highlights(editor)).toEqual(['cat', 'cat']);
  });

  it('removes a match edited inside', () => {
    const editor = search('<p>c|at</p><p>cat</p>', 'cat');
    typeText(editor, 'x');
    expect(highlights(editor)).toEqual(['cat']);
    expect(editor.getHTML()).toBe('<p>cxat</p><p>cat</p>');
  });

  it('keeps the matches after an edit before them', () => {
    const editor = search('<p>|</p><p>a cat</p>', 'cat');
    typeText(editor, 'new ');
    expect(highlights(editor)).toEqual(['cat']);
    expect(getSearchResults(editor).count).toBe(1);
  });

  it('finds a match made by joining two paragraphs', () => {
    const editor = search('<p>ca</p><p>t</p>', 'cat');
    editor.commands.select(4);
    editor.view.dispatch(editor.state.tr.join(4));
    expect(editor.getHTML()).toBe('<p>cat</p>');
    expect(highlights(editor)).toEqual(['cat']);
  });

  it('follows undo', () => {
    const editor = search('<p>c|at</p>', 'cat');
    typeText(editor, 'x');
    expect(highlights(editor)).toEqual([]);
    editor.commands.undo();
    expect(highlights(editor)).toEqual(['cat']);
  });

  it('follows a new content', () => {
    const editor = search('<p>cat</p>', 'cat');
    editor.setHTML('<p>cat and cat</p>');
    expect(highlights(editor)).toEqual(['cat', 'cat']);
  });

  it('adds no highlight past the last one of a limited search', () => {
    const editor = search('<p>a a</p><p>a|</p>', 'a', 2);
    typeText(editor, ' a');
    expect(getSearchResults(editor)).toEqual({ count: 2, limited: true, current: 0 });
    expect(editor.getHTML()).toBe('<p>a a</p><p>a a</p>');
  });

  it('stays at maxMatches when an edit adds a match', () => {
    const editor = search('<p>|</p><p>a a</p>', 'a', 2);
    expect(getSearchResults(editor).limited).toBe(false);
    typeText(editor, 'a');
    expect(getSearchResults(editor)).toEqual({ count: 2, limited: true, current: 0 });
  });
});

describe('Search: findNext / findPrevious', () => {
  it('selects the next match and wraps around', () => {
    const editor = search('<p>cat |cat cat</p>', 'cat');
    expect(editor.commands.findNext()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>cat [cat] cat</p>');
    expect(current(editor)).toEqual(['cat']);
    expect(getSearchResults(editor)).toEqual({ count: 3, limited: false, current: 2 });
    editor.commands.findNext();
    editor.commands.findNext();
    expect(getHTMLWithSelection(editor)).toBe('<p>[cat] cat cat</p>');
    expect(getSearchResults(editor).current).toBe(1);
  });

  it('selects the previous match and wraps around', () => {
    const editor = search('<p>cat |cat cat</p>', 'cat');
    expect(editor.commands.findPrevious()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>[cat] cat cat</p>');
    editor.commands.findPrevious();
    expect(getHTMLWithSelection(editor)).toBe('<p>cat cat [cat]</p>');
  });

  it('selects the only match again', () => {
    const editor = search('<p>a cat|</p>', 'cat');
    editor.commands.findNext();
    expect(editor.commands.findNext()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>a [cat]</p>');
  });

  it('reaches the matches past maxMatches', () => {
    const editor = search('<p>a a a|</p>', 'a', 2);
    editor.commands.select(5, 6);
    expect(getHTMLWithSelection(editor)).toBe('<p>a a [a]</p>');
    expect(getSearchResults(editor).current).toBe(0);
    expect(editor.commands.findPrevious()).toBe(true);
    expect(getSearchResults(editor).current).toBe(2);
  });

  it.each([
    ['without a search', ''],
    ['without matches', 'dog'],
  ])('returns false %s', (_case, text) => {
    const editor = search('<p>cat</p>', text);
    expect(editor.commands.findNext()).toBe(false);
    expect(editor.commands.findPrevious.can()).toBe(false);
  });
});

describe('Search: scrolling to the selected match', () => {
  /** Places every element `top` px from the top of the viewport, 20 px high. */
  function placeAt(top: number): void {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 0, y: top, width: 50, height: 20 }),
    );
  }

  it('scrolls a match out of view to the middle, also without the focus', () => {
    const scroll = mockScrollIntoView();
    const editor = search('<p>|cat cat</p>', 'cat');
    document.body.append(editor.view.dom.parentElement!);
    placeAt(5000);
    editor.commands.findNext();
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith({ block: 'center', inline: 'nearest' });
    expect(scroll.mock.contexts[0]).toHaveProperty(
      'className',
      'stilo-search-match stilo-search-match--current',
    );
    editor.commands.findPrevious();
    editor.commands.replaceNext('dog');
    expect(scroll).toHaveBeenCalledTimes(3);
  });

  it('does not scroll a visible match, nor on other transactions', () => {
    const scroll = mockScrollIntoView();
    const editor = search('<p>|cat cat</p>', 'cat');
    document.body.append(editor.view.dom.parentElement!);
    placeAt(100);
    editor.commands.findNext();
    expect(scroll).not.toHaveBeenCalled();
    placeAt(5000);
    editor.commands.setSearch({ text: 'cat' });
    typeText(editor, 'x');
    expect(scroll).not.toHaveBeenCalled();
  });
});

describe('Search: replaceNext', () => {
  it('first selects the next match', () => {
    const editor = search('<p>|cat cat</p>', 'cat');
    expect(editor.commands.replaceNext('dog')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe('<p>[cat] cat</p>');
  });

  it('replaces the selected match and selects the next one', () => {
    const editor = search('<p>|cat cat</p>', 'cat');
    editor.commands.findNext();
    editor.commands.replaceNext('lion');
    expect(getHTMLWithSelection(editor)).toBe('<p>lion [cat]</p>');
    editor.commands.replaceNext('lion');
    expect(getHTMLWithSelection(editor)).toBe('<p>lion lion|</p>');
    expect(editor.commands.replaceNext('lion')).toBe(false);
  });

  it('keeps the marks of the match', () => {
    const editor = search('<p><strong>|cat</strong> cat</p>', 'cat');
    editor.commands.findNext();
    editor.commands.replaceNext('dog');
    expect(editor.getHTML()).toBe('<p><strong>dog</strong> cat</p>');
  });

  it.each([
    ['$&', '<p>$&amp; b</p>'],
    ['$1', '<p>$1 b</p>'],
    ['', '<p> b</p>'],
  ])('inserts %j literally', (replacement, expected) => {
    const editor = search('<p>|a b</p>', 'a');
    editor.commands.findNext();
    editor.commands.replaceNext(replacement);
    expect(editor.getHTML()).toBe(expected);
  });
});

describe('Search: replaceAll', () => {
  it('replaces every match in one undoable step', () => {
    const editor = search('<p>cat <em>Cat</em></p><p>bobcat</p>', 'cat');
    expect(editor.commands.replaceAll('dog')).toBe(true);
    expect(editor.getHTML()).toBe('<p>dog <em>dog</em></p><p>bobdog</p>');
    expect(highlights(editor)).toEqual([]);
    editor.commands.undo();
    expect(editor.getHTML()).toBe('<p>cat <em>Cat</em></p><p>bobcat</p>');
  });

  it('replaces also the matches past maxMatches', () => {
    const editor = search('<p>a a a</p>', 'a', 2);
    editor.commands.replaceAll('b');
    expect(editor.getHTML()).toBe('<p>b b b</p>');
  });

  it('returns false without matches', () => {
    const editor = search('<p>cat</p>', 'dog');
    expect(editor.commands.replaceAll('x')).toBe(false);
  });
});
