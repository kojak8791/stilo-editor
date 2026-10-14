import type { Node } from 'prosemirror-model';
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
 * Counts of top-level blocks. Nodes are immutable and an edit keeps the blocks it does not touch,
 * so after the first count only the changed blocks are counted again.
 */
const blockCounts = new WeakMap<Node, WordCount>();

function countBlock(block: Node): WordCount {
  const cached = blockCounts.get(block);
  if (cached) return cached;
  const text = block.textBetween(0, block.content.size, '\n', '\n');
  let characters = 0;
  for (const char of text) if (char !== '\n') characters++;
  const count = { words: text.match(WORD)?.length ?? 0, characters };
  blockCounts.set(block, count);
  return count;
}

/**
 * Counts the words and characters of the document, docs/SPEC.md F-901. The first call reads the
 * whole document, later calls only the changed top-level blocks: call it on demand or debounced,
 * never on every transaction (ADR 0003).
 */
export function getWordCount(editor: Editor): WordCount {
  const total = { words: 0, characters: 0 };
  editor.state.doc.forEach((block) => {
    const count = countBlock(block);
    total.words += count.words;
    total.characters += count.characters;
  });
  return total;
}
