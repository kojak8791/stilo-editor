import type { Editor } from '../editor';

/** Words and characters of a document, from {@link getWordCount}. */
export interface WordCount {
  /** Runs of non-space characters with at least one letter or digit. */
  words: number;
  /** Characters of the text, spaces included, line and paragraph breaks excluded. */
  characters: number;
}

const WORD = /\S*[\p{L}\p{N}]\S*/gu;

/**
 * Counts the words and characters of the document, docs/SPEC.md F-901. It reads the whole
 * document: call it on demand or debounced, never on every transaction (ADR 0003).
 */
export function getWordCount(editor: Editor): WordCount {
  const { doc } = editor.state;
  const text = doc.textBetween(0, doc.content.size, '\n', '\n');
  let characters = 0;
  for (const char of text) if (char !== '\n') characters++;
  return { words: text.match(WORD)?.length ?? 0, characters };
}
