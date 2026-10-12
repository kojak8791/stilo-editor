import type { Editor } from '../../index';
import type { Messages } from '../i18n/types';
import type { CharacterCategory } from './characters';
import { createPopover } from './popover';

/** Options of {@link createCharacterPicker}. */
export interface CharacterPickerOptions {
  /** The toolbar button that opens the picker. */
  anchor: HTMLElement;
  /** The element the picker scrolls with: the toolbar. */
  container: HTMLElement;
  messages: Messages;
}

/** The special characters and emoji picker; it stays open after each insertion. */
export interface CharacterPicker {
  readonly isOpen: boolean;
  /** Opens the picker, loading its data the first time; the focus goes to the search field. */
  open(): Promise<void>;
  /** Closes the picker and gives the focus back to the editor. */
  close(): void;
  toggle(): void;
  destroy(): void;
}

type Tab = 'symbols' | 'emoji';

/** Columns of the grids: also `grid-template-columns` in ui.css. */
const COLUMNS = 10;

/** Loads the picker data (a separate chunk). */
async function loadCharacters(): Promise<Record<Tab, readonly CharacterCategory[]>> {
  const { SYMBOLS, EMOJI } = await import('./characters');
  return { symbols: SYMBOLS, emoji: EMOJI };
}

/** Creates the character picker (closed), anchored to the toolbar button. */
export function createCharacterPicker(
  editor: Editor,
  options: CharacterPickerOptions,
): CharacterPicker {
  const { anchor, container, messages } = options;

  const content = document.createElement('div');
  content.className = 'stilo-char-picker';
  content.setAttribute('role', 'dialog');
  content.setAttribute('aria-label', messages['toolbar.characters']);

  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'stilo-char-picker__search';
  search.placeholder = messages['characters.search'];
  search.autocomplete = 'off';
  search.spellcheck = false;
  search.setAttribute('aria-label', messages['characters.search']);

  const tabList = document.createElement('div');
  tabList.className = 'stilo-char-picker__tabs';
  tabList.setAttribute('role', 'tablist');
  const tabs = new Map<Tab, HTMLButtonElement>();
  for (const tab of ['symbols', 'emoji'] as const) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'stilo-char-picker__tab';
    button.setAttribute('role', 'tab');
    button.textContent = messages[`characters.${tab}`];
    tabs.set(tab, button);
    tabList.append(button);
  }

  const panel = document.createElement('div');
  panel.className = 'stilo-char-picker__panel';
  panel.setAttribute('role', 'tabpanel');

  content.append(search, tabList, panel);

  anchor.setAttribute('aria-haspopup', 'dialog');
  anchor.setAttribute('aria-expanded', 'false');

  const popover = createPopover({
    anchor,
    content,
    container,
    onClose: (reason) => {
      anchor.setAttribute('aria-expanded', 'false');
      if (reason === 'escape') editor.focus();
    },
  });

  let data: Record<Tab, readonly CharacterCategory[]> | null = null;
  let activeTab: Tab = 'symbols';
  // The visible characters, in order and by row of the grids, for the arrow keys.
  let cells: HTMLButtonElement[] = [];
  let rows: HTMLButtonElement[][] = [];

  function selectTab(tab: Tab): void {
    activeTab = tab;
    for (const [id, button] of tabs) {
      const selected = id === tab;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
  }

  /** One grid of characters, cut in rows of {@link COLUMNS}. */
  function renderGrid(characters: CharacterCategory['characters'], label: string): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'stilo-char-picker__grid';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', label);
    const buttons = characters.map(([character, name]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'stilo-char-picker__char';
      button.tabIndex = -1;
      button.title = name;
      button.setAttribute('aria-label', name);
      button.dataset.character = character;
      button.textContent = character;
      return button;
    });
    grid.append(...buttons);
    cells.push(...buttons);
    for (let i = 0; i < buttons.length; i += COLUMNS) rows.push(buttons.slice(i, i + COLUMNS));
    return grid;
  }

  function render(): void {
    if (!data) return;
    cells = [];
    rows = [];
    panel.replaceChildren();
    const query = search.value.trim().toLowerCase();
    tabList.hidden = query !== '';
    if (query) {
      const matches = [...data.symbols, ...data.emoji]
        .flatMap((category) => category.characters)
        .filter(([character, name]) => character === query || name.toLowerCase().includes(query));
      if (matches.length > 0) {
        panel.append(renderGrid(matches, messages['characters.search']));
      } else {
        const empty = document.createElement('p');
        empty.className = 'stilo-char-picker__empty';
        empty.textContent = messages['characters.noResults'];
        panel.append(empty);
      }
    } else {
      for (const category of data[activeTab]) {
        const label = messages[category.labelKey];
        const heading = document.createElement('div');
        heading.className = 'stilo-char-picker__heading';
        heading.textContent = label;
        panel.append(heading, renderGrid(category.characters, label));
      }
    }
    if (cells[0]) cells[0].tabIndex = 0;
  }

  function focusCell(cell: HTMLButtonElement | undefined): void {
    if (!cell) return;
    for (const other of cells) other.tabIndex = -1;
    cell.tabIndex = 0;
    cell.focus();
  }

  /** The cell an arrow key moves to: left/right in reading order, up/down by row. */
  function cellFrom(cell: HTMLButtonElement, key: string): HTMLButtonElement | undefined {
    if (key === 'ArrowLeft') return cells[cells.indexOf(cell) - 1];
    if (key === 'ArrowRight') return cells[cells.indexOf(cell) + 1];
    const row = rows.findIndex((r) => r.includes(cell));
    const column = rows[row]!.indexOf(cell);
    const target = rows[key === 'ArrowUp' ? row - 1 : row + 1];
    return target?.[Math.min(column, target.length - 1)];
  }

  const onSearchInput = (): void => render();

  const onSearchKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowDown' || !cells[0]) return;
    event.preventDefault();
    focusCell(cells[0]);
  };

  const onTabClick = (event: MouseEvent): void => {
    const tab = [...tabs].find(([, button]) => button === event.target)?.[0];
    if (!tab) return;
    selectTab(tab);
    render();
  };

  const onTabKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const tab: Tab = activeTab === 'symbols' ? 'emoji' : 'symbols';
    selectTab(tab);
    render();
    tabs.get(tab)!.focus();
  };

  const onPanelClick = (event: MouseEvent): void => {
    const cell = (event.target as Element).closest<HTMLButtonElement>('.stilo-char-picker__char');
    if (!cell?.dataset.character) return;
    editor.commands.insertText(cell.dataset.character);
    focusCell(cell);
  };

  const onPanelKeydown = (event: KeyboardEvent): void => {
    const cell = (event.target as Element).closest<HTMLButtonElement>('.stilo-char-picker__char');
    if (!cell || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    focusCell(cellFrom(cell, event.key));
  };

  search.addEventListener('input', onSearchInput);
  search.addEventListener('keydown', onSearchKeydown);
  tabList.addEventListener('click', onTabClick);
  tabList.addEventListener('keydown', onTabKeydown);
  panel.addEventListener('click', onPanelClick);
  panel.addEventListener('keydown', onPanelKeydown);

  selectTab(activeTab);

  async function open(): Promise<void> {
    if (popover.isOpen) return;
    popover.open();
    anchor.setAttribute('aria-expanded', 'true');
    data ??= await loadCharacters();
    if (!popover.isOpen) return;
    search.value = '';
    render();
    // The position arrives asynchronously: a scrolling focus would jump to the container top.
    search.focus({ preventScroll: true });
  }

  function close(): void {
    if (!popover.isOpen) return;
    popover.close();
    editor.focus();
  }

  function destroy(): void {
    search.removeEventListener('input', onSearchInput);
    search.removeEventListener('keydown', onSearchKeydown);
    tabList.removeEventListener('click', onTabClick);
    tabList.removeEventListener('keydown', onTabKeydown);
    panel.removeEventListener('click', onPanelClick);
    panel.removeEventListener('keydown', onPanelKeydown);
    popover.destroy();
    anchor.removeAttribute('aria-haspopup');
    anchor.removeAttribute('aria-expanded');
  }

  return {
    get isOpen() {
      return popover.isOpen;
    },
    open,
    close,
    toggle: () => (popover.isOpen ? close() : void open()),
    destroy,
  };
}
