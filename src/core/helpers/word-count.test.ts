import { describe, expect, it } from 'vitest';
import { createTestEditor } from '../../../tests/helpers';
import { getWordCount } from './word-count';

describe('getWordCount', () => {
  it.each([
    ['<p></p>', 0, 0],
    ['<p>Hello world</p>', 2, 11],
    ['<p>Hello</p><p>world</p>', 2, 10],
    ['<p>Line one<br>line two</p>', 4, 16],
    ["<p>l'editor è pronto — 2 volte</p>", 5, 27],
    ['<p>bo<strong>ld</strong> text</p>', 2, 9],
    ['<ul><li>one</li><li>two</li></ul>', 2, 6],
    ['<p>— … !</p>', 0, 5],
    ['<p>😀 ok</p>', 1, 4],
  ])('%j has %i words and %i characters', (html, words, characters) => {
    expect(getWordCount(createTestEditor({ html }))).toEqual({ words, characters });
  });
});
