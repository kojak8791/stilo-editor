import type { Node } from 'prosemirror-model';
import { SearchQuery } from 'prosemirror-search';
import {
  type Command,
  EditorState,
  Plugin,
  PluginKey,
  TextSelection,
  type Transaction,
} from 'prosemirror-state';
import { StepMap, Transform } from 'prosemirror-transform';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';
import type { Editor } from '../../core/editor';
import { defineExtension } from '../../core/extension';

declare module '../../core/types' {
  interface Commands {
    /** Searches for `term` and highlights the matches; an empty `text` clears the search. */
    setSearch: (term: SearchTerm) => Command;
    /** Clears the search and its highlights. */
    clearSearch: () => Command;
    /** Selects the next match after the selection, wrapping at the end of the document. */
    findNext: () => Command;
    /** Selects the match before the selection, wrapping at the start of the document. */
    findPrevious: () => Command;
    /** Replaces the selected match with `replacement` and selects the next one. */
    replaceNext: (replacement: string) => Command;
    /** Replaces every match with `replacement`, in one undoable step. */
    replaceAll: (replacement: string) => Command;
  }
}

/** What {@link Search} looks for. */
export interface SearchTerm {
  /** The text to find, taken literally. */
  text: string;
  /** Default: `false`. */
  caseSensitive?: boolean;
  /** Matches only whole words. Default: `false`. */
  wholeWord?: boolean;
}

/** Options of {@link Search}. */
export interface SearchOptions {
  /** Highlights at most the first this many matches; all are counted. Default: 1000. */
  maxMatches: number;
}

/** The matches of the active search, from {@link getSearchResults}. */
export interface SearchResults {
  /** The number of matches in the document. */
  count: number;
  /** `true` when only the first `maxMatches` matches are highlighted. */
  limited: boolean;
  /** The 1-based index of the selected match; 0 when the selection is not a match. */
  current: number;
}

interface Range {
  from: number;
  to: number;
}

interface SearchState {
  query: SearchQuery;
  /** The highlights: always the first matches of the document, at most `maxMatches`. */
  matches: DecorationSet;
  /** All the matches of the document, highlighted or not. */
  total: number;
  /** The selection, when it is exactly a match. */
  current: Range | null;
  /** The 1-based index of `current` among all the matches; 0 without `current`. */
  index: number;
  /** The transaction asked to scroll the selected match into view. */
  reveal: boolean;
}

const MATCH_CLASS = 'stilo-search-match';
const CURRENT_CLASS = 'stilo-search-match--current';
const searchKey = new PluginKey<SearchState>('stiloSearch');
/** Transaction meta: scroll the selected match into view. */
const REVEAL_META = 'stiloSearchReveal';
const NO_QUERY = new SearchQuery({ search: '' });
const EMPTY: SearchState = {
  query: NO_QUERY,
  matches: DecorationSet.empty,
  total: 0,
  current: null,
  index: 0,
  reveal: false,
};

/** Whether `block` may hold a match: its text contains the searched text. */
function mayMatch(block: Node, query: SearchQuery): boolean {
  const text = block.textContent;
  return query.caseSensitive
    ? text.includes(query.search)
    : text.toLowerCase().includes(query.search.toLowerCase());
}

/**
 * Calls `f` with each match between `from` and `to` of `doc`, in order, until it returns `false`.
 * It goes one top-level block at a time: `findNext` walks the top-level blocks from the first one
 * at every call, quadratic on the whole document, so each block that may match is searched as
 * the document of its own state.
 */
function forEachMatch(
  doc: Node,
  query: SearchQuery,
  range: Range,
  f: (match: Range) => boolean,
): void {
  let { index, offset } = doc.childAfter(range.from);
  for (let going = true; going && index < doc.childCount && offset <= range.to; index++) {
    const block = doc.child(index);
    const start = offset + 1;
    offset += block.nodeSize;
    const from = Math.max(0, range.from - start);
    const to = Math.min(block.content.size, range.to - start);
    if (from > to || !mayMatch(block, query)) continue;
    const state = EditorState.create({ doc: block });
    for (let pos = from; going; ) {
      const match = query.findNext(state, pos, to);
      if (!match) break;
      going = f({ from: start + match.from, to: start + match.to });
      pos = Math.max(match.to, pos + 1);
    }
  }
}

function countMatches(doc: Node, query: SearchQuery, range: Range): number {
  let count = 0;
  forEachMatch(doc, query, range, () => {
    count++;
    return true;
  });
  return count;
}

function highlight(match: Range): Decoration {
  return Decoration.inline(match.from, match.to, { class: MATCH_CLASS });
}

/** The selection, when it is exactly a match of `query`. */
function selectedMatch(state: EditorState, query: SearchQuery): Range | null {
  const { from, to, empty } = state.selection;
  if (empty || !query.valid) return null;
  const match = query.findNext(state, from, to);
  return match && match.from === from && match.to === to ? { from, to } : null;
}

/** `from`–`to` of `doc` widened to whole textblocks (a match never crosses a textblock). */
function widen(doc: Node, from: number, to: number): Range {
  const $from = doc.resolve(from);
  const $to = doc.resolve(to);
  return {
    from: $from.parent.inlineContent ? $from.start() : from,
    to: $to.parent.inlineContent ? $to.end() : to,
  };
}

/** The part of `tr.doc` changed by `tr`, in whole textblocks; `null` when no content changed. */
function changedRange(tr: Transaction): Range | null {
  let from = Number.POSITIVE_INFINITY;
  let to = Number.NEGATIVE_INFINITY;
  tr.mapping.maps.forEach((map, index) => {
    const rest = tr.mapping.slice(index + 1);
    map.forEach((_oldFrom, _oldTo, newFrom, newTo) => {
      from = Math.min(from, rest.map(newFrom, -1));
      to = Math.max(to, rest.map(newTo, 1));
    });
  });
  return from > to ? null : widen(tr.doc, from, to);
}

/** The highlights sorted by position. */
function sorted(matches: DecorationSet): Decoration[] {
  return matches.find().sort((a, b) => a.from - b.from);
}

/**
 * The 1-based index of `current` among all the matches. The highlights are the first matches:
 * past them, the matches up to `current` are counted.
 */
function indexOf(doc: Node, query: SearchQuery, matches: DecorationSet, current: Range): number {
  const all = sorted(matches);
  const found = all.findIndex((match) => match.from === current.from);
  if (found >= 0) return found + 1;
  const from = all[all.length - 1]?.to ?? 0;
  return all.length + countMatches(doc, query, { from, to: current.from }) + 1;
}

/**
 * Updates the highlights and the total after `tr`: the changed textblocks are counted before
 * and after the change and searched again; the other highlights are mapped.
 */
function update(prev: SearchState, tr: Transaction, max: number): SearchState {
  const { query } = prev;
  const range = changedRange(tr);
  let matches = prev.matches.map(tr.mapping, tr.doc);
  if (!range) return { ...prev, matches };
  const inverse = tr.mapping.invert();
  const before = widen(tr.before, inverse.map(range.from, -1), inverse.map(range.to, 1));
  const total =
    prev.total - countMatches(tr.before, query, before) + countMatches(tr.doc, query, range);
  const all = sorted(matches);
  // Past the last highlight of a limited search the matches are not highlighted: keep it so.
  const limited = prev.total > prev.matches.find().length;
  if (!(limited && range.from > (all[all.length - 1]?.to ?? 0))) {
    matches = matches.remove(matches.find(range.from, range.to));
    const found: Decoration[] = [];
    forEachMatch(tr.doc, query, range, (match) => found.push(highlight(match)) < max);
    matches = matches.add(tr.doc, found);
    const extra = sorted(matches).slice(max);
    if (extra.length > 0) matches = matches.remove(extra);
  }
  return { ...prev, matches, total };
}

/** A fresh search for `query`: one scan of the document, the first `max` matches highlighted. */
function start(doc: Node, query: SearchQuery, max: number): SearchState {
  if (!query.valid) return EMPTY;
  const found: Decoration[] = [];
  let total = 0;
  forEachMatch(doc, query, { from: 0, to: doc.content.size }, (match) => {
    if (total++ < max) found.push(highlight(match));
    return true;
  });
  return { ...EMPTY, query, matches: DecorationSet.create(doc, found), total };
}

/** The visible part of the page around `view`: the viewport less the scroll margins. */
function visibleBounds(view: EditorView): { top: number; bottom: number } {
  const margin = view.someProp('scrollMargin') ?? 5;
  const top = typeof margin === 'number' ? margin : margin.top;
  const bottom = typeof margin === 'number' ? margin : margin.bottom;
  const bounds = { top, bottom: window.innerHeight - bottom };
  for (let node = view.dom.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY !== 'auto' && overflowY !== 'scroll') continue;
    const box = node.getBoundingClientRect();
    bounds.top = Math.max(bounds.top, box.top);
    bounds.bottom = Math.min(bounds.bottom, box.bottom);
  }
  return bounds;
}

/**
 * Scrolls the selected match to the middle of the view when it is not visible. ProseMirror's
 * `scrollIntoView` scrolls only while the DOM selection is in the editor, not while a find field
 * has the focus.
 */
function revealCurrent(view: EditorView): void {
  const element = view.dom.querySelector(`.${CURRENT_CLASS}`);
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const bounds = visibleBounds(view);
  if (rect.top >= bounds.top && rect.bottom <= bounds.bottom) return;
  element.scrollIntoView({ block: 'center', inline: 'nearest' });
}

/** The plugin state after `tr`, before `current`, `index` and `reveal`. */
function nextState(tr: Transaction, prev: SearchState, state: EditorState, max: number) {
  const query = tr.getMeta(searchKey) as SearchQuery | undefined;
  if (query) return start(state.doc, query, max);
  if (!prev.query.valid || !tr.docChanged) return prev;
  return update(prev, tr, max);
}

/**
 * The index of `current` from the previous selected match, in the same document: one more or one
 * less when moving to the next or previous match, without counting from the start.
 */
function stepIndex(doc: Node, query: SearchQuery, last: Range, lastIndex: number, current: Range) {
  if (current.from >= last.to) {
    return lastIndex + countMatches(doc, query, { from: last.to, to: current.from }) + 1;
  }
  if (current.to <= last.from) {
    return lastIndex - countMatches(doc, query, { from: current.to, to: last.from }) - 1;
  }
  return lastIndex;
}

/** Sets `current` and its `index` when `tr` may have changed them. */
function withCurrent(
  next: SearchState,
  prev: SearchState,
  tr: Transaction,
  state: EditorState,
): SearchState {
  const { query } = next;
  if (!query.valid || (!tr.docChanged && !tr.selectionSet && !tr.getMeta(searchKey))) return next;
  const current = selectedMatch(state, query);
  if (!current) return { ...next, current, index: 0 };
  const last = prev.current;
  const index =
    last && prev.index > 0 && !tr.docChanged && prev.query === query
      ? stepIndex(state.doc, query, last, prev.index, current)
      : indexOf(state.doc, query, next.matches, current);
  return { ...next, current, index };
}

function searchPlugin(max: number): Plugin<SearchState> {
  return new Plugin<SearchState>({
    key: searchKey,
    state: {
      init: () => EMPTY,
      apply(tr, prev, _oldState, state) {
        const next = withCurrent(nextState(tr, prev, state, max), prev, tr, state);
        const reveal = tr.getMeta(REVEAL_META) === true;
        return next.reveal === reveal ? next : { ...next, reveal };
      },
    },
    view: () => ({
      update(view, prevState) {
        const search = searchKey.getState(view.state);
        if (search?.reveal && search !== searchKey.getState(prevState)) revealCurrent(view);
      },
    }),
    props: {
      decorations(state) {
        const { matches, current } = searchKey.getState(state) ?? EMPTY;
        if (!current) return matches;
        const highlight = Decoration.inline(current.from, current.to, { class: CURRENT_CLASS });
        return matches.add(state.doc, [highlight]);
      },
    },
  });
}

/** The active query, or `null` when there is no search. */
function activeQuery(state: EditorState): SearchQuery | null {
  const query = searchKey.getState(state)?.query;
  return query?.valid ? query : null;
}

/** Selects `match` and scrolls it into view. */
function selectMatch(state: EditorState, match: Range, dispatch?: (tr: Transaction) => void) {
  const selection = TextSelection.create(state.doc, match.from, match.to);
  dispatch?.(state.tr.setSelection(selection).scrollIntoView().setMeta(REVEAL_META, true));
  return true;
}

/** The first match after `to`, or from the start of the document up to `to`. */
function nextMatch(state: EditorState, query: SearchQuery, to: number): Range | null {
  return query.findNext(state, to) ?? query.findNext(state, 0, to);
}

/** Replaces `match` in `tr` with `text`, which takes the marks shared by the whole match. */
function replaceMatch(tr: Transform, match: Range, text: string): void {
  const from = tr.mapping.map(match.from, 1);
  const to = tr.mapping.map(match.to, -1);
  if (!text) {
    tr.delete(from, to);
    return;
  }
  const marks = tr.doc.resolve(from).marksAcross(tr.doc.resolve(to));
  tr.replaceWith(from, to, tr.doc.type.schema.text(text, marks));
}

/**
 * Replaces every match (in document order) with `text` in one step. A step per match copies the
 * list of top-level blocks at every match: 48,000 matches in 50,000 paragraphs ran out of
 * memory. Each block with matches is rebuilt on its own, then the blocks from the first to the
 * last changed one replace the old ones at once (the unchanged ones are the same nodes). The
 * selection follows through a map of the replacements.
 */
function replaceMatches(state: EditorState, matches: Range[], text: string): Transaction {
  const blocks: Node[] = [];
  const ranges: number[] = [];
  let from = -1;
  let to = 0;
  let changed = 0;
  let next = 0;
  state.doc.forEach((block, offset) => {
    const end = offset + block.nodeSize;
    const local = new Transform(block);
    for (; next < matches.length && matches[next]!.to <= end; next++) {
      const match = matches[next]!;
      replaceMatch(local, { from: match.from - offset - 1, to: match.to - offset - 1 }, text);
      ranges.push(match.from, match.to - match.from, text.length);
    }
    if (local.docChanged) {
      if (from < 0) from = offset;
      to = end;
      changed = blocks.length + 1;
    }
    if (from >= 0) blocks.push(local.doc);
  });
  const tr = state.tr.replaceWith(from, to, blocks.slice(0, changed));
  return tr.setSelection(state.selection.map(tr.doc, new StepMap(ranges)));
}

const findNext: Command = (state, dispatch) => {
  const query = activeQuery(state);
  const match = query && nextMatch(state, query, state.selection.to);
  return match ? selectMatch(state, match, dispatch) : false;
};

const findPrevious: Command = (state, dispatch) => {
  const query = activeQuery(state);
  const { from } = state.selection;
  const match =
    query && (query.findPrev(state, from) ?? query.findPrev(state, state.doc.content.size, from));
  return match ? selectMatch(state, match, dispatch) : false;
};

const replaceNext =
  (replacement: string): Command =>
  (state, dispatch) => {
    const query = activeQuery(state);
    if (!query) return false;
    const current = searchKey.getState(state)?.current;
    if (!current) return findNext(state, dispatch);
    if (dispatch) {
      const following = nextMatch(state, query, current.to);
      const tr = state.tr;
      replaceMatch(tr, current, replacement);
      const target =
        following && following.from !== current.from
          ? { from: tr.mapping.map(following.from, 1), to: tr.mapping.map(following.to, -1) }
          : null;
      const end = tr.mapping.map(current.to);
      const selection = target
        ? TextSelection.create(tr.doc, target.from, target.to)
        : TextSelection.create(tr.doc, end);
      dispatch(tr.setSelection(selection).scrollIntoView().setMeta(REVEAL_META, true));
    }
    return true;
  };

const replaceAll =
  (replacement: string): Command =>
  (state, dispatch) => {
    const query = activeQuery(state);
    if (!query) return false;
    const matches: Range[] = [];
    const range = { from: 0, to: state.doc.content.size };
    forEachMatch(state.doc, query, range, (match) => {
      matches.push(match);
      return true;
    });
    if (matches.length === 0) return false;
    dispatch?.(replaceMatches(state, matches, replacement));
    return true;
  };

/**
 * The matches of the active search of `editor`: how many there are, whether only some are
 * highlighted, and which one is selected. All zero without a search or without the
 * {@link Search} extension.
 */
export function getSearchResults(editor: Editor): SearchResults {
  const { matches, total, index } = searchKey.getState(editor.state) ?? EMPTY;
  return { count: total, limited: total > matches.find().length, current: index };
}

/**
 * Find and replace, docs/SPEC.md F-902 (ADR 0004). Matching follows `SearchQuery` of
 * `prosemirror-search` (literal text, case, whole word); the matches get
 * `class="stilo-search-match"`, the selected one also `stilo-search-match--current`.
 * Setting a search scans and counts the whole document once; later edits rescan only the
 * changed textblocks.
 */
export const Search = defineExtension<SearchOptions>({
  name: 'search',
  defaultOptions: { maxMatches: 1000 },
  commands: () => ({
    setSearch:
      ({ text, caseSensitive, wholeWord }) =>
      (state, dispatch) => {
        const query = new SearchQuery({ search: text, caseSensitive, wholeWord, literal: true });
        dispatch?.(state.tr.setMeta(searchKey, query));
        return true;
      },
    clearSearch: () => (state, dispatch) => {
      dispatch?.(state.tr.setMeta(searchKey, NO_QUERY));
      return true;
    },
    findNext: () => findNext,
    findPrevious: () => findPrevious,
    replaceNext,
    replaceAll,
  }),
  plugins: ({ options }) => [searchPlugin(options.maxMatches)],
});
