import type { Editor } from '../../index';
import { getWordCount } from '../../index';
import { en } from '../i18n/en';
import type { Messages } from '../i18n/types';

/** Options of {@link createStatusBar}. */
export interface StatusBarOptions {
  /** The status bar element is appended inside it. */
  container: HTMLElement;
  /** UI strings. Default: `en`. */
  messages?: Messages;
}

/** A status bar created by {@link createStatusBar}. */
export interface StatusBar {
  readonly element: HTMLElement;
  /** Counts again now (it also counts 500 ms after the last change). */
  update(): void;
  /** Removes the status bar and every listener. Calling it twice is a no-op. */
  destroy(): void;
}

/** Milliseconds after the last change before counting again (ADR 0003: never per keystroke). */
const COUNT_DELAY = 500;

/** Creates a status bar with the word and character count of the document (F-901). */
export function createStatusBar(editor: Editor, options: StatusBarOptions): StatusBar {
  const { container, messages = en } = options;

  const element = document.createElement('div');
  element.className = 'stilo-status-bar';
  const words = document.createElement('span');
  words.className = 'stilo-status-bar__words';
  const characters = document.createElement('span');
  characters.className = 'stilo-status-bar__characters';
  element.append(words, characters);
  container.append(element);

  let timer = 0;
  let destroyed = false;

  function update(): void {
    clearTimeout(timer);
    timer = 0;
    const counts = getWordCount(editor);
    words.textContent = `${messages['status.words']}: ${counts.words.toLocaleString()}`;
    characters.textContent = `${messages['status.characters']}: ${counts.characters.toLocaleString()}`;
  }

  const onInput = (): void => {
    clearTimeout(timer);
    timer = window.setTimeout(update, COUNT_DELAY);
  };

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    clearTimeout(timer);
    editor.off('input', onInput);
    editor.off('destroy', destroy);
    element.remove();
  }

  editor.on('input', onInput);
  editor.on('destroy', destroy);
  update();

  return { element, update, destroy };
}
