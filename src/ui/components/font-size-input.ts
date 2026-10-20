import { Minus, Plus } from 'lucide';
import { type Editor, getFontSize, toFontSize } from '../../index';
import type { Messages } from '../i18n/types';
import type { ToolbarFontSizeInput } from '../toolbar/types';
import { createIcon } from './icon';
import { createPopover } from './popover';

/** Options of {@link createFontSizeInput}. */
export interface CreateFontSizeInputOptions {
  /** The element the list scrolls with: the toolbar. */
  container: HTMLElement;
  messages: Messages;
}

/** The font size control and its list (T-038). */
export interface FontSizeInput {
  /** The wrapper of the three parts. */
  readonly element: HTMLElement;
  /** The toolbar items, in order: decrease, field, increase. */
  readonly parts: readonly HTMLElement[];
  /** Shows the size at the selection and refreshes the enabled state. */
  update(): void;
  destroy(): void;
}

/** A typed size: a number in the unit of the control, or a number with a CSS unit. */
const TYPED_SIZE = /^(\d+(?:[.,]\d+)?)\s*(px|pt|em|rem|%)?$/i;

const MIN_SIZE = 1;
const MAX_SIZE = 400;

/** Whether the selected text carries different font sizes (written ones, `null` for none). */
function hasMixedSizes(editor: Editor): boolean {
  const { from, to, empty } = editor.state.selection;
  if (empty) return false;
  const sizes = new Set<unknown>();
  editor.state.doc.nodesBetween(from, to, (node) => {
    if (node.isText) {
      sizes.add(node.marks.find((mark) => mark.type.name === 'textStyle')?.attrs.fontSize ?? null);
    }
    return sizes.size < 2;
  });
  return sizes.size > 1;
}

function createButton(className: string, label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `stilo-toolbar__button ${className}`;
  button.setAttribute('aria-label', label);
  button.title = label;
  return button;
}

/** Creates the font size control of `item` (list closed); the list is mounted in `container`. */
export function createFontSizeInput(
  editor: Editor,
  item: ToolbarFontSizeInput,
  options: CreateFontSizeInputOptions,
): FontSizeInput {
  const { container, messages } = options;
  const { unit, sizes } = item;
  const label = messages[item.labelKey] ?? item.labelKey;

  const element = document.createElement('span');
  element.className = 'stilo-font-size';
  const decrease = createButton('stilo-font-size__decrease', messages['fontSize.decrease']);
  decrease.append(createIcon(Minus));
  const increase = createButton('stilo-font-size__increase', messages['fontSize.increase']);
  increase.append(createIcon(Plus));
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'stilo-font-size__input';
  input.inputMode = 'decimal';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-label', label);
  input.setAttribute('aria-autocomplete', 'none');
  input.setAttribute('aria-expanded', 'false');
  input.title = label;
  const parts = [decrease, input, increase];
  for (const part of parts) {
    part.dataset.item = item.id;
    part.tabIndex = -1;
  }
  element.append(...parts);

  const list = document.createElement('div');
  list.className = 'stilo-font-size__list';
  list.id = `stilo-font-size-${Math.random().toString(36).slice(2)}`;
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', label);
  input.setAttribute('aria-controls', list.id);
  const optionElements = sizes.map((size, index) => {
    const option = document.createElement('div');
    option.className = 'stilo-font-size__option';
    option.id = `${list.id}-${index}`;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', 'false');
    option.dataset.size = String(size);
    option.textContent = String(size);
    return option;
  });
  list.append(...optionElements);

  const popover = createPopover({
    anchor: input,
    content: list,
    container,
    onClose: () => {
      input.setAttribute('aria-expanded', 'false');
      setActive(-1);
    },
  });

  let shown = '';
  let active = -1;

  function isEnabled(): boolean {
    return editor.isEditable && editor.commands.setFontSize.can('12pt');
  }

  function setActive(index: number): void {
    active = index;
    optionElements.forEach((option, i) => {
      option.classList.toggle('stilo-font-size__option--active', i === index);
    });
    if (index >= 0) input.setAttribute('aria-activedescendant', optionElements[index]!.id);
    else input.removeAttribute('aria-activedescendant');
  }

  function update(): void {
    const enabled = isEnabled();
    for (const part of parts) {
      if (enabled) part.removeAttribute('aria-disabled');
      else part.setAttribute('aria-disabled', 'true');
    }
    input.readOnly = !enabled;
    shown = enabled && !hasMixedSizes(editor) ? String(getFontSize(editor, unit)) : '';
    // The field keeps what the user is typing.
    if (document.activeElement !== input) input.value = shown;
  }

  function open(): void {
    if (popover.isOpen || !isEnabled()) return;
    for (const option of optionElements) {
      option.setAttribute('aria-selected', String(option.dataset.size === shown));
    }
    popover.open();
    input.setAttribute('aria-expanded', 'true');
  }

  /** Back to the text: closes the list and shows the size again. */
  function leave(): void {
    popover.close();
    input.removeAttribute('aria-invalid');
    editor.focus();
    update();
  }

  /**
   * The CSS size for the typed text, `null` when it is not a size. A number in the unit of the
   * control, px or pt must be between 1 and 400.
   */
  function typedSize(text: string): string | null {
    const match = TYPED_SIZE.exec(text.trim());
    if (!match) return null;
    const value = Number(match[1]!.replace(',', '.'));
    const typedUnit = match[2]?.toLowerCase();
    const absolute = !typedUnit || typedUnit === 'px' || typedUnit === 'pt';
    if (value === 0 || (absolute && (value < MIN_SIZE || value > MAX_SIZE))) return null;
    return typedUnit ? `${value}${typedUnit}` : toFontSize(editor, value, unit);
  }

  function apply(text: string): void {
    const size = typedSize(text);
    if (size && editor.commands.setFontSize(size)) {
      leave();
    } else {
      input.setAttribute('aria-invalid', 'true');
    }
  }

  const onStep = (delta: number) => (): void => {
    if (!isEnabled()) return;
    popover.close();
    editor.focus();
    editor.commands.stepFontSize(delta, unit);
  };
  const onDecrease = onStep(-1);
  const onIncrease = onStep(1);

  const onFocus = (): void => input.select();

  const onClick = (): void => open();

  const onInput = (): void => {
    input.removeAttribute('aria-invalid');
    setActive(-1);
  };

  const onKeydown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        open();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const start =
          active === -1 ? optionElements.findIndex((o) => o.dataset.size === shown) : active;
        const next = start === -1 ? (step > 0 ? 0 : optionElements.length - 1) : start + step;
        setActive(Math.min(optionElements.length - 1, Math.max(0, next)));
        optionElements[active]?.scrollIntoView?.({ block: 'nearest' });
        break;
      }
      case 'Enter':
        event.preventDefault();
        apply(active >= 0 ? optionElements[active]!.dataset.size! : input.value);
        break;
      case 'Escape':
        event.preventDefault();
        leave();
        break;
    }
  };

  const onBlur = (): void => {
    popover.close();
    input.removeAttribute('aria-invalid');
    input.value = shown;
  };

  // The field keeps the focus while an option is clicked.
  const onListPointerdown = (event: PointerEvent): void => event.preventDefault();

  const onListClick = (event: MouseEvent): void => {
    const option = (event.target as Element).closest<HTMLElement>('.stilo-font-size__option');
    if (option?.dataset.size) apply(option.dataset.size);
  };

  decrease.addEventListener('click', onDecrease);
  increase.addEventListener('click', onIncrease);
  input.addEventListener('focus', onFocus);
  input.addEventListener('click', onClick);
  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKeydown);
  input.addEventListener('blur', onBlur);
  list.addEventListener('pointerdown', onListPointerdown);
  list.addEventListener('click', onListClick);

  let isDestroyed = false;

  function destroy(): void {
    if (isDestroyed) return;
    isDestroyed = true;
    decrease.removeEventListener('click', onDecrease);
    increase.removeEventListener('click', onIncrease);
    input.removeEventListener('focus', onFocus);
    input.removeEventListener('click', onClick);
    input.removeEventListener('input', onInput);
    input.removeEventListener('keydown', onKeydown);
    input.removeEventListener('blur', onBlur);
    list.removeEventListener('pointerdown', onListPointerdown);
    list.removeEventListener('click', onListClick);
    popover.destroy();
  }

  update();

  return { element, parts, update, destroy };
}
