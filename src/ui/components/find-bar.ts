import { CaseSensitive, ChevronDown, ChevronUp, type IconNode, WholeWord, X } from 'lucide';
import type { Editor } from '../../index';
import { getSearchResults } from '../../index';
import type { MessageKey, Messages } from '../i18n/types';
import { createIcon } from './icon';
import { isMacPlatform } from './shortcut';

/** Options of {@link createFindBar}. */
export interface FindBarOptions {
  /** The find bar is appended inside it, after the toolbar. */
  container: HTMLElement;
  messages: Messages;
  /** The toolbar button that toggles the bar: it gets `aria-expanded`. */
  button?: HTMLElement | null;
}

/** The find and replace bar (T-043). */
export interface FindBar {
  readonly element: HTMLElement;
  readonly isOpen: boolean;
  /** Shows the bar and focuses the find field, prefilled with the selected text. */
  open(): void;
  /** Hides the bar, clears the search and gives the focus back to the editor. */
  close(): void;
  /** Closes the bar when it is open, otherwise opens it. */
  toggle(): void;
  destroy(): void;
}

/** Milliseconds after the last keystroke in the find field before searching (ADR 0004). */
const SEARCH_DELAY = 350;
/** Shorter texts are not searched (ADR 0004). */
const MIN_LENGTH = 2;

/** Creates the find bar (hidden). */
export function createFindBar(editor: Editor, options: FindBarOptions): FindBar {
  const { container, messages, button: toggleButton } = options;
  const mac = isMacPlatform();

  const element = document.createElement('div');
  element.className = 'stilo-find-bar';
  element.setAttribute('role', 'search');
  element.setAttribute('aria-label', messages['toolbar.find']);
  element.hidden = true;
  toggleButton?.setAttribute('aria-expanded', 'false');

  function input(labelKey: MessageKey, modifier: string): HTMLInputElement {
    const field = document.createElement('input');
    field.type = 'text';
    field.className = `stilo-find-bar__input stilo-find-bar__input--${modifier}`;
    field.placeholder = messages[labelKey];
    field.autocomplete = 'off';
    field.spellcheck = false;
    field.setAttribute('aria-label', messages[labelKey]);
    return field;
  }

  function button(labelKey: MessageKey, icon: IconNode | null, title?: string): HTMLButtonElement {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'stilo-find-bar__button';
    if (icon) {
      control.append(createIcon(icon));
      control.setAttribute('aria-label', messages[labelKey]);
      control.title = title ?? messages[labelKey];
    } else {
      control.classList.add('stilo-find-bar__button--text');
      control.textContent = messages[labelKey];
    }
    return control;
  }

  function toggle(labelKey: MessageKey, icon: IconNode): HTMLButtonElement {
    const control = button(labelKey, icon);
    control.classList.add('stilo-find-bar__toggle');
    control.setAttribute('aria-pressed', 'false');
    return control;
  }

  const findField = input('find.find', 'find');
  const count = document.createElement('span');
  count.className = 'stilo-find-bar__count';
  count.setAttribute('aria-live', 'polite');
  const previous = button('find.previous', ChevronUp, `${messages['find.previous']} (Shift+Enter)`);
  const next = button('find.next', ChevronDown, `${messages['find.next']} (Enter)`);
  const matchCase = toggle('find.matchCase', CaseSensitive);
  const wholeWord = toggle('find.wholeWord', WholeWord);
  const close = button('find.close', X, `${messages['find.close']} (Esc)`);
  const replaceField = input('find.replace', 'replace');
  const replaceOne = button('find.replaceOne', null);
  const replaceAll = button('find.replaceAll', null);

  const findRow = document.createElement('div');
  findRow.className = 'stilo-find-bar__row';
  findRow.append(findField, count, previous, next, matchCase, wholeWord, close);
  const replaceRow = document.createElement('div');
  replaceRow.className = 'stilo-find-bar__row';
  replaceRow.append(replaceField, replaceOne, replaceAll);
  element.append(findRow, replaceRow);
  container.append(element);
  container.classList.add('stilo-find-bar-host');

  let timer = 0;
  let searched = '';

  function isPressed(control: HTMLElement): boolean {
    return control.getAttribute('aria-pressed') === 'true';
  }

  /** Searches for the find field now, cancelling a pending delayed search. */
  function search(): void {
    clearTimeout(timer);
    timer = 0;
    searched = findField.value.length >= MIN_LENGTH ? findField.value : '';
    if (searched) {
      editor.commands.setSearch({
        text: searched,
        caseSensitive: isPressed(matchCase),
        wholeWord: isPressed(wholeWord),
      });
    } else {
      editor.commands.clearSearch();
    }
    showCount();
  }

  /** Runs a pending delayed search at once. */
  function flush(): void {
    if (timer) search();
  }

  function showCount(): void {
    if (!searched) {
      count.textContent = '';
      return;
    }
    const results = getSearchResults(editor);
    const total = results.count.toLocaleString();
    count.textContent =
      results.count === 0
        ? messages['find.noResults']
        : results.current > 0
          ? messages['find.position']
              .replace('{current}', results.current.toLocaleString())
              .replace('{total}', total)
          : messages['find.results'].replace('{total}', total);
  }

  /** The selected text when it lies in one textblock, to prefill the find field. */
  function selectedText(): string {
    const { $from, $to, empty } = editor.state.selection;
    if (empty || !$from.sameParent($to) || !$from.parent.isTextblock) return '';
    return editor.state.doc.textBetween($from.pos, $to.pos);
  }

  function open(): void {
    const text = selectedText();
    element.hidden = false;
    toggleButton?.setAttribute('aria-expanded', 'true');
    replaceRow.hidden = !editor.isEditable;
    if (text) findField.value = text;
    findField.focus({ preventScroll: true });
    findField.select();
    search();
  }

  function hide(): void {
    if (element.hidden) return;
    clearTimeout(timer);
    timer = 0;
    element.hidden = true;
    toggleButton?.setAttribute('aria-expanded', 'false');
    searched = '';
    editor.commands.clearSearch();
    editor.focus();
  }

  const onFindInput = (): void => {
    clearTimeout(timer);
    timer = window.setTimeout(search, SEARCH_DELAY);
  };

  const onKeydown = (event: KeyboardEvent): void => {
    const mod = mac ? event.metaKey : event.ctrlKey;
    if (event.key === 'Escape') {
      event.preventDefault();
      hide();
    } else if (mod && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      findField.focus();
      findField.select();
    } else if (event.key === 'Enter' && event.target === findField) {
      event.preventDefault();
      flush();
      if (event.shiftKey) editor.commands.findPrevious();
      else editor.commands.findNext();
    } else if (event.key === 'Enter' && event.target === replaceField) {
      event.preventDefault();
      flush();
      editor.commands.replaceNext(replaceField.value);
    }
  };

  const onClick = (event: MouseEvent): void => {
    const target = (event.target as Element).closest('button');
    if (target === matchCase || target === wholeWord) {
      target.setAttribute('aria-pressed', String(!isPressed(target)));
      search();
      return;
    }
    flush();
    if (target === previous) editor.commands.findPrevious();
    else if (target === next) editor.commands.findNext();
    else if (target === replaceOne) editor.commands.replaceNext(replaceField.value);
    else if (target === replaceAll) editor.commands.replaceAll(replaceField.value);
    else if (target === close) hide();
  };

  const onTransaction = (): void => {
    if (element.hidden) return;
    replaceRow.hidden = !editor.isEditable;
    showCount();
  };

  findField.addEventListener('input', onFindInput);
  element.addEventListener('keydown', onKeydown);
  element.addEventListener('click', onClick);
  editor.on('transaction', onTransaction);

  return {
    element,
    get isOpen() {
      return !element.hidden;
    },
    open,
    close: hide,
    toggle: () => (element.hidden ? open() : hide()),
    destroy(): void {
      clearTimeout(timer);
      findField.removeEventListener('input', onFindInput);
      element.removeEventListener('keydown', onKeydown);
      element.removeEventListener('click', onClick);
      editor.off('transaction', onTransaction);
      element.remove();
      container.classList.remove('stilo-find-bar-host');
      toggleButton?.removeAttribute('aria-expanded');
    },
  };
}
