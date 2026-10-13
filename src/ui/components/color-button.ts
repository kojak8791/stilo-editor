import { ChevronDown } from 'lucide';
import type { Editor } from '../../index';
import type { Messages } from '../i18n/types';
import type { ToolbarColorButton } from '../toolbar/types';
import { createIcon } from './icon';
import { createPopover } from './popover';

/** Options of {@link createColorButton}. */
export interface ColorButtonOptions {
  /** The element the popover scrolls with: the toolbar. */
  container: HTMLElement;
  messages: Messages;
}

/** A color split button and its popover (T-026). */
export interface ColorButton {
  /** The wrapper of the two parts. */
  readonly element: HTMLElement;
  /** Applies the last used color. */
  readonly main: HTMLButtonElement;
  /** Opens the popover. */
  readonly arrow: HTMLButtonElement;
  /** Refreshes the enabled and pressed states. */
  update(): void;
  destroy(): void;
}

/** Columns of the palette grid: also `grid-template-columns` in ui.css. */
const COLUMNS = 8;

/** The color of a `<mark>` without a color (CSS system color). */
const MARK_COLOR = 'Mark';

const HEX_COLOR = /^#[0-9a-f]{6}$/;

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}

function createButton(className: string, label: string): HTMLButtonElement {
  const button = createElement('button', className);
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.title = label;
  return button;
}

/** Creates the split button of `item` and its popover (closed), mounted in `container`. */
export function createColorButton(
  editor: Editor,
  item: ToolbarColorButton,
  options: ColorButtonOptions,
): ColorButton {
  const { container, messages } = options;
  const label = messages[item.labelKey] ?? item.labelKey;
  let lastColor = item.defaultColor;

  const element = createElement('span', 'stilo-split');
  const main = createButton('stilo-toolbar__button stilo-split__main', label);
  const bar = createElement('span', 'stilo-split__color');
  main.append(createIcon(item.icon), bar);
  const arrow = createButton(
    'stilo-toolbar__button stilo-split__arrow',
    `${label}: ${messages['color.more']}`,
  );
  arrow.append(createIcon(ChevronDown));
  for (const button of [main, arrow]) {
    button.dataset.item = item.id;
    button.tabIndex = -1;
  }
  main.setAttribute('aria-pressed', 'false');
  arrow.setAttribute('aria-haspopup', 'dialog');
  arrow.setAttribute('aria-expanded', 'false');
  element.append(main, arrow);

  const content = createElement('div', 'stilo-color-picker');
  content.setAttribute('role', 'dialog');
  content.setAttribute('aria-label', label);
  const none = createElement('button', 'stilo-color-picker__none');
  none.type = 'button';
  none.textContent = messages['color.none'];
  const grid = createElement('div', 'stilo-color-picker__grid');
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', label);
  const swatches = item.palette.map(({ color, labelKey }) => {
    const swatch = createButton('stilo-color-picker__swatch', messages[labelKey] ?? labelKey);
    swatch.tabIndex = -1;
    swatch.dataset.color = color;
    swatch.style.backgroundColor = color;
    return swatch;
  });
  grid.append(...swatches);
  const form = createElement('form', 'stilo-color-picker__custom');
  const native = createElement('input', 'stilo-color-picker__native');
  native.type = 'color';
  native.setAttribute('aria-label', messages['color.pick']);
  const value = createElement('input', 'stilo-color-picker__value');
  value.type = 'text';
  value.placeholder = '#000000';
  value.autocomplete = 'off';
  value.spellcheck = false;
  value.setAttribute('aria-label', messages['color.custom']);
  const apply = createElement('button', 'stilo-color-picker__apply');
  apply.type = 'submit';
  apply.textContent = messages['color.apply'];
  form.append(native, value, apply);
  content.append(none, grid, form);

  const popover = createPopover({
    anchor: element,
    content,
    container,
    onClose: (reason) => {
      arrow.setAttribute('aria-expanded', 'false');
      if (reason === 'escape') editor.focus();
    },
  });

  function showLastColor(): void {
    bar.style.backgroundColor = lastColor ?? MARK_COLOR;
  }

  function isEnabled(): boolean {
    return item.isEnabled?.(editor) ?? true;
  }

  function update(): void {
    const enabled = isEnabled();
    for (const button of [main, arrow]) {
      if (enabled) button.removeAttribute('aria-disabled');
      else button.setAttribute('aria-disabled', 'true');
    }
    const active = enabled && item.hasColor(editor, lastColor);
    main.setAttribute('aria-pressed', String(active));
    main.classList.toggle('stilo-toolbar__button--active', active);
  }

  function focusSwatch(swatch: HTMLButtonElement | undefined, focus?: FocusOptions): void {
    if (!swatch) return;
    for (const other of swatches) other.tabIndex = -1;
    swatch.tabIndex = 0;
    swatch.focus(focus);
  }

  function open(): void {
    const current = item.getColor(editor);
    for (const swatch of swatches) {
      swatch.setAttribute('aria-pressed', String(swatch.dataset.color === current));
    }
    value.value = current ?? '';
    value.removeAttribute('aria-invalid');
    native.value = current && HEX_COLOR.test(current) ? current : '#000000';
    popover.open();
    arrow.setAttribute('aria-expanded', 'true');
    // The position arrives asynchronously: a scrolling focus would jump to the container top.
    const pressed = swatches.find((swatch) => swatch.getAttribute('aria-pressed') === 'true');
    focusSwatch(pressed ?? swatches[0], { preventScroll: true });
  }

  function close(): void {
    popover.close();
    editor.focus();
  }

  /** Applies `color` and remembers it as the last used color; `false` when it was refused. */
  function applyColor(color: string | null): boolean {
    if (!item.setColor(editor, color)) return false;
    // The editor normalizes the color (`#F00` → `#ff0000`).
    lastColor = item.getColor(editor);
    showLastColor();
    return true;
  }

  const onMainClick = (): void => {
    if (!isEnabled()) return;
    popover.close();
    editor.focus();
    if (item.hasColor(editor, lastColor)) item.unsetColor(editor);
    else applyColor(lastColor);
  };

  const onArrowClick = (): void => {
    if (popover.isOpen) close();
    else if (isEnabled()) open();
  };

  const onNoneClick = (): void => {
    item.unsetColor(editor);
    close();
  };

  const onGridClick = (event: MouseEvent): void => {
    const swatch = (event.target as Element).closest<HTMLButtonElement>(
      '.stilo-color-picker__swatch',
    );
    if (!swatch?.dataset.color) return;
    applyColor(swatch.dataset.color);
    close();
  };

  const onGridKeydown = (event: KeyboardEvent): void => {
    const steps: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -COLUMNS,
      ArrowDown: COLUMNS,
    };
    const step = steps[event.key];
    const index = swatches.indexOf(event.target as HTMLButtonElement);
    if (step === undefined || index === -1) return;
    event.preventDefault();
    focusSwatch(swatches[index + step]);
  };

  const onNativeInput = (): void => {
    value.value = native.value;
    value.removeAttribute('aria-invalid');
  };

  const onValueInput = (): void => value.removeAttribute('aria-invalid');

  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (applyColor(value.value.trim())) {
      close();
    } else {
      value.setAttribute('aria-invalid', 'true');
      value.focus();
    }
  };

  main.addEventListener('click', onMainClick);
  arrow.addEventListener('click', onArrowClick);
  none.addEventListener('click', onNoneClick);
  grid.addEventListener('click', onGridClick);
  grid.addEventListener('keydown', onGridKeydown);
  native.addEventListener('input', onNativeInput);
  value.addEventListener('input', onValueInput);
  form.addEventListener('submit', onSubmit);

  showLastColor();

  function destroy(): void {
    main.removeEventListener('click', onMainClick);
    arrow.removeEventListener('click', onArrowClick);
    none.removeEventListener('click', onNoneClick);
    grid.removeEventListener('click', onGridClick);
    grid.removeEventListener('keydown', onGridKeydown);
    native.removeEventListener('input', onNativeInput);
    value.removeEventListener('input', onValueInput);
    form.removeEventListener('submit', onSubmit);
    popover.destroy();
    element.remove();
  }

  return { element, main, arrow, update, destroy };
}
