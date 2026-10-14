import { Fragment, type Node } from 'prosemirror-model';
import type { Command, SelectionRange } from 'prosemirror-state';
import { Mapping, StepMap } from 'prosemirror-transform';
import { defineExtension } from '../../core/extension';

/**
 * A letter case: `upper` (UPPERCASE), `lower` (lowercase), `title` (Title Case), `sentence`
 * (Sentence case), `toggle` (tOGGLE cASE).
 */
export type LetterCase = 'upper' | 'lower' | 'title' | 'sentence' | 'toggle';

declare module '../../core/types' {
  interface Commands {
    /** Changes the case of the characters of the selection; marks are kept. */
    setTextCase: (letterCase: LetterCase) => Command;
  }
}

/** A letter or a digit: part of a word. */
const WORD_CHAR = /[\p{L}\p{N}\p{M}]/u;
/** Inside a word for Title Case: `l'amico` → `L'amico`. */
const APOSTROPHE = /['’]/;
const SENTENCE_END = /[.!?…]/;

/**
 * For `title` and `sentence`: the indexes of `text` whose character is uppercased, the first
 * letter or digit of each word or sentence. Every other character is lowercased.
 */
function capitals(text: string, letterCase: 'title' | 'sentence'): Set<number> {
  const result = new Set<number>();
  let next = true;
  for (let i = 0; i < text.length; ) {
    const char = String.fromCodePoint(text.codePointAt(i)!);
    if (WORD_CHAR.test(char)) {
      if (next) result.add(i);
      next = false;
    } else if (letterCase === 'title' ? !APOSTROPHE.test(char) : SENTENCE_END.test(char)) {
      next = true;
    }
    i += char.length;
  }
  return result;
}

/** The characters of `text` from `from` to `to` in `letterCase`. */
function convert(
  text: string,
  from: number,
  to: number,
  letterCase: LetterCase,
  upper: ReadonlySet<number>,
): string {
  if (letterCase === 'upper') return text.slice(from, to).toUpperCase();
  if (letterCase === 'lower') return text.slice(from, to).toLowerCase();
  let result = '';
  for (let i = from; i < to; ) {
    const char = String.fromCodePoint(text.codePointAt(i)!);
    const toUpper = letterCase === 'toggle' ? char === char.toLowerCase() : upper.has(i);
    result += toUpper ? char.toUpperCase() : char.toLowerCase();
    i += char.length;
  }
  return result;
}

/**
 * Rebuilds `node` (starting at `pos`) with the text inside `ranges` in `letterCase`. Records in
 * `changes` (`[pos, oldSize, newSize]`, ascending) the texts whose length changes (`ß` → `SS`).
 */
function convertNode(
  node: Node,
  pos: number,
  ranges: readonly SelectionRange[],
  letterCase: LetterCase,
  changes: number[],
): Node {
  const end = pos + node.nodeSize;
  if (!ranges.some((range) => range.$from.pos < end && range.$to.pos > pos)) return node;
  const children: Node[] = [];
  if (!node.isTextblock) {
    node.forEach((child, offset) => {
      children.push(convertNode(child, pos + 1 + offset, ranges, letterCase, changes));
    });
    return node.copy(Fragment.fromArray(children));
  }

  // The text of the whole block gives the context: the word or sentence a range starts in.
  const text = node.textBetween(0, node.content.size, undefined, '￼');
  const upper =
    letterCase === 'title' || letterCase === 'sentence' ? capitals(text, letterCase) : null;
  const start = pos + 1;
  node.forEach((child, offset) => {
    if (!child.isText) {
      children.push(child);
      return;
    }
    let done = offset;
    const childEnd = offset + child.nodeSize;
    for (const range of ranges) {
      const from = Math.max(range.$from.pos - start, done);
      const to = Math.min(range.$to.pos - start, childEnd);
      if (from >= to) continue;
      if (from > done) children.push(child.cut(done - offset, from - offset));
      const converted = convert(text, from, to, letterCase, upper ?? new Set());
      if (converted.length !== to - from) changes.push(start + from, to - from, converted.length);
      children.push(node.type.schema.text(converted, child.marks));
      done = to;
    }
    if (done < childEnd) children.push(child.cut(done - offset));
  });
  return node.copy(Fragment.fromArray(children));
}

/** Command: `setTextCase`, one step for the top-level blocks the selection touches. */
function setTextCase(letterCase: LetterCase): Command {
  return (state, dispatch) => {
    const { selection, doc } = state;
    if (selection.empty) return false;
    if (!dispatch) return true;

    const $from = doc.resolve(Math.min(...selection.ranges.map((range) => range.$from.pos)));
    const $to = doc.resolve(Math.max(...selection.ranges.map((range) => range.$to.pos)));
    const first = $from.index(0);
    const last = $to.depth === 0 ? $to.index(0) - 1 : $to.index(0);
    const from = $from.depth === 0 ? $from.pos : $from.before(1);
    const changes: number[] = [];
    const blocks: Node[] = [];
    let pos = from;
    for (let index = first; index <= last; index++) {
      const block = doc.child(index);
      blocks.push(convertNode(block, pos, selection.ranges, letterCase, changes));
      pos += block.nodeSize;
    }

    if (blocks.every((block, i) => block.eq(doc.child(first + i)))) return true;
    const tr = state.tr.replaceWith(from, pos, blocks);
    // The selection keeps its place: the replace step would collapse it.
    dispatch(
      tr.setSelection(selection.map(tr.doc, new Mapping([new StepMap(changes)]))).scrollIntoView(),
    );
    return true;
  };
}

/** The `setTextCase` command, docs/SPEC.md F-213: changes the characters, not a style. */
export const TextCase = defineExtension({
  name: 'textCase',
  commands: () => ({ setTextCase }),
});
