import { SearchQuery } from 'prosemirror-search';
import {
  type Command,
  type EditorState,
  Plugin,
  PluginKey,
  TextSelection,
  type Transaction,
} from 'prosemirror-state';
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
  /** Highlights at most this many matches; the count then says there are more. Default: 1000. */
  maxMatches: number;
}

/** The matches of the active search, from {@link getSearchResults}. */
export interface SearchResults {
  /** The number of highlighted matches. */
  count: number;
  /** `true` when there are more matches than `maxMatches`. */
  limited: boolean;
  /** The 1-based index of the selected match; 0 when the selection is not a highlighted match. */
  current: number;
}

interface Range {
  from: number;
  to: number;
}

interface SearchState {
  query: SearchQuery;
  matches: DecorationSet;
  limited: boolean;
  /** The selection, when it is exactly a match. */
  current: Range | null;
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
  limited: false,
  current: null,
  reveal: false,
};

/** Finds up to `max` matches between `from` and `to`. */
function scan(state: EditorState, query: SearchQuery, range: Range, max: number): Decoration[] {
  const found: Decoration[] = [];
  for (let pos = range.from; found.length < max; ) {
    const match = query.findNext(state, pos, range.to);
    if (!match) break;
    found.push(Decoration.inline(match.from, match.to, { class: MATCH_CLASS }));
    pos = Math.max(match.to, pos + 1);
  }
  return found;
}

/** The selection, when it is exactly a match of `query`. */
function selectedMatch(state: EditorState, query: SearchQuery): Range | null {
  const { from, to, empty } = state.selection;
  if (empty || !query.valid) return null;
  const match = query.findNext(state, from, to);
  return match && match.from === from && match.to === to ? { from, to } : null;
}

/**
 * The part of `tr.doc` changed by `tr`, widened to whole textblocks (a match never crosses a
 * textblock). `null` when no step replaced content.
 */
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
  if (from > to) return null;
  const $from = tr.doc.resolve(from);
  const $to = tr.doc.resolve(to);
  return {
    from: $from.parent.inlineContent ? $from.start() : from,
    to: $to.parent.inlineContent ? $to.end() : to,
  };
}

/** Keeps the first `max` highlights; `limited` when some were dropped. */
function capMatches(state: SearchState, max: number): SearchState {
  const all = state.matches.find().sort((a, b) => a.from - b.from);
  if (all.length <= max) return state;
  return { ...state, matches: state.matches.remove(all.slice(max)), limited: true };
}

/** Rescans the textblocks changed by `tr`; the other highlights are mapped. */
function update(prev: SearchState, tr: Transaction, state: EditorState, max: number): SearchState {
  const { query } = prev;
  let next: SearchState = { ...prev, matches: prev.matches.map(tr.mapping, tr.doc) };
  const range = changedRange(tr);
  const last = next.matches.find().reduce((end, match) => Math.max(end, match.to), 0);
  // Past the last highlight of a limited search the matches are not highlighted: keep it so.
  if (range && !(prev.limited && range.from > last)) {
    const matches = next.matches.remove(next.matches.find(range.from, range.to));
    const found = scan(state, query, range, max + 1);
    const limited = prev.limited && range.to < tr.doc.content.size;
    next = capMatches({ ...next, matches: matches.add(tr.doc, found), limited }, max);
  }
  return { ...next, current: selectedMatch(state, query) };
}

/** A fresh search for `query`: one scan of the document, up to `max` highlights. */
function start(state: EditorState, query: SearchQuery, max: number): SearchState {
  if (!query.valid) return EMPTY;
  const found = scan(state, query, { from: 0, to: state.doc.content.size }, max + 1);
  return {
    query,
    matches: DecorationSet.create(state.doc, found.slice(0, max)),
    limited: found.length > max,
    current: selectedMatch(state, query),
    reveal: false,
  };
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

/** The next plugin state: `reveal` holds only for the transaction that asked for it. */
function nextState(tr: Transaction, prev: SearchState, state: EditorState, max: number) {
  const query = tr.getMeta(searchKey) as SearchQuery | undefined;
  if (query) return start(state, query, max);
  if (!prev.query.valid) return prev;
  if (tr.docChanged) return update(prev, tr, state, max);
  return tr.selectionSet ? { ...prev, current: selectedMatch(state, prev.query) } : prev;
}

function searchPlugin(max: number): Plugin<SearchState> {
  return new Plugin<SearchState>({
    key: searchKey,
    state: {
      init: () => EMPTY,
      apply(tr, prev, _oldState, state) {
        const next = nextState(tr, prev, state, max);
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
function replaceMatch(tr: Transaction, match: Range, text: string): void {
  const from = tr.mapping.map(match.from, 1);
  const to = tr.mapping.map(match.to, -1);
  if (!text) {
    tr.delete(from, to);
    return;
  }
  const marks = tr.doc.resolve(from).marksAcross(tr.doc.resolve(to));
  tr.replaceWith(from, to, tr.doc.type.schema.text(text, marks));
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
    for (let pos = 0; ; ) {
      const match = query.findNext(state, pos);
      if (!match) break;
      matches.push(match);
      pos = Math.max(match.to, pos + 1);
    }
    if (matches.length === 0) return false;
    if (dispatch) {
      const tr = state.tr;
      for (const match of matches) replaceMatch(tr, match, replacement);
      dispatch(tr);
    }
    return true;
  };

/**
 * The matches of the active search of `editor`: how many are highlighted and which one is
 * selected. All zero without a search or without the {@link Search} extension.
 */
export function getSearchResults(editor: Editor): SearchResults {
  const { matches, limited, current } = searchKey.getState(editor.state) ?? EMPTY;
  const all = matches.find();
  const index = current
    ? all.some((match) => match.from === current.from && match.to === current.to)
      ? all.filter((match) => match.from < current.from).length + 1
      : 0
    : 0;
  return { count: all.length, limited, current: index };
}

/**
 * Find and replace, docs/SPEC.md F-902 (ADR 0004). Matching follows `SearchQuery` of
 * `prosemirror-search` (literal text, case, whole word); the matches get
 * `class="stilo-search-match"`, the selected one also `stilo-search-match--current`.
 * Setting a search scans the document once; later edits rescan only the changed textblocks.
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
