import type { IconNode } from 'lucide';
import type { Editor, FontSizeUnit } from '../../index';

/** A toolbar button. */
export interface ToolbarButton {
  /** Unique within the toolbar; written as `data-item`. */
  id: string;
  kind: 'button';
  icon: IconNode;
  /** Key of the label in `messages`; a missing key is shown as is. */
  labelKey: string;
  /** Keymap notation shown in the tooltip, e.g. 'Mod-b'. */
  shortcut?: string;
  /** Runs on click, after the editor got the focus back. */
  run(editor: Editor, context: ToolbarContext): void;
  /** Present = toggle button (`aria-pressed`). */
  isActive?(editor: Editor): boolean;
  /** Default: always enabled. */
  isEnabled?(editor: Editor): boolean;
  /** False = not rendered (e.g. its extension is disabled). Default: available. */
  isAvailable?(editor: Editor): boolean;
}

/** UI services the toolbar offers to {@link ToolbarButton.run}. */
export interface ToolbarContext {
  /** Opens the link popover under the selection (no-op without the `Link` extension). */
  openLinkPopover(): void;
  /** Opens or closes the character picker (no-op without the `characters` item). */
  toggleCharacterPicker(): void;
  /** Opens the find bar (no-op without the `Search` extension). */
  openFindBar(): void;
}

/** A dropdown of mutually exclusive options (T-014). */
export interface ToolbarDropdown {
  id: string;
  kind: 'dropdown';
  /** Key of the accessible name of the trigger and of the menu. */
  labelKey: string;
  /** Shown by the trigger instead of the active option (T-040); default: the option label. */
  icon?: IconNode;
  options: ToolbarDropdownOption[];
  /**
   * The text of the trigger when no option is active, e.g. a font size that is not in the list;
   * `null` (or no function) shows the dropdown label.
   */
  getValueLabel?(editor: Editor): string | null;
  isAvailable?(editor: Editor): boolean;
}

/** An option of a {@link ToolbarDropdown}. */
export interface ToolbarDropdownOption {
  /** Unique within the dropdown; used in the class `stilo-dropdown__option--<id>`. */
  id: string;
  labelKey: string;
  shortcut?: string;
  /** Shows the option label in this font family (a CSS `font-family` list). */
  fontFamily?: string;
  run(editor: Editor): void;
  isActive(editor: Editor): boolean;
  /** Default: always enabled. */
  isEnabled?(editor: Editor): boolean;
}

/** A color of a {@link ToolbarColorButton} palette. */
export interface ToolbarColor {
  /** A CSS color, written as the editor stores it (e.g. lowercase `#rrggbb`). */
  color: string;
  /** Key of the color name in `messages`; a missing key is shown as is. */
  labelKey: string;
}

/**
 * A split button that applies a color (T-026): the main part applies the last used color (or
 * removes it when the whole selection has it), the arrow opens a popover with the palette.
 */
export interface ToolbarColorButton {
  /** Unique within the toolbar; written as `data-item` on both parts. */
  id: string;
  kind: 'color';
  icon: IconNode;
  labelKey: string;
  palette: readonly ToolbarColor[];
  /** The color the main part applies until one is picked (`null`: the mark without a color). */
  defaultColor: string | null;
  /**
   * Shows a "Default" choice next to "No color" that applies the color `null`; its label is
   * drawn inside a `<mark>`, the browser's look of a highlight without a color.
   */
  defaultChoice?: boolean;
  /** Applies `color` to the selection; `false` when the color is refused. */
  setColor(editor: Editor, color: string | null): boolean;
  /** Removes the color from the selection. */
  unsetColor(editor: Editor): void;
  /** Whether the whole selection has `color`. */
  hasColor(editor: Editor, color: string | null): boolean;
  /** The color at the selection, `null` when there is none. */
  getColor(editor: Editor): string | null;
  /** Default: always enabled. */
  isEnabled?(editor: Editor): boolean;
  isAvailable?(editor: Editor): boolean;
}

/** A font of the `fontFamilyDropdown` list. */
export interface ToolbarFont {
  /** A CSS `font-family` list, written as the editor stores it (`'Times New Roman', serif`). */
  fontFamily: string;
  /** Key of the font name in `messages`; a missing key is shown as is. */
  labelKey: string;
}

/**
 * The font size control (T-038): a decrease button, a field that shows the size at the selection,
 * takes a typed size and opens a list of sizes, and an increase button.
 */
export interface ToolbarFontSizeInput {
  /** Unique within the toolbar; written as `data-item` on the three parts. */
  id: string;
  kind: 'fontSize';
  /** Key of the accessible name of the field and of the list. */
  labelKey: string;
  /** The unit the field shows and writes; `rem` shows px and writes rem. */
  unit: FontSizeUnit;
  /** The sizes of the list, in `unit` (px for `rem`). */
  sizes: readonly number[];
  isAvailable?(editor: Editor): boolean;
}

/**
 * A button that shows the icon of the active option (of the first one when none is active) and
 * opens the options as icons in a row (T-039).
 */
export interface ToolbarIconMenu {
  /** Unique within the toolbar; written as `data-item`. */
  id: string;
  kind: 'iconMenu';
  /** Key of the accessible name of the trigger and of the menu. */
  labelKey: string;
  options: ToolbarIconMenuOption[];
  isAvailable?(editor: Editor): boolean;
}

/** An option of a {@link ToolbarIconMenu}. */
export interface ToolbarIconMenuOption {
  /** Unique within the menu; used in the class `stilo-icon-menu__option--<id>`. */
  id: string;
  icon: IconNode;
  labelKey: string;
  /** Keymap notation shown in the tooltip. */
  shortcut?: string;
  run(editor: Editor): void;
  isActive(editor: Editor): boolean;
  /** Default: always enabled. */
  isEnabled?(editor: Editor): boolean;
}

/** A single item in the toolbar. */
export type ToolbarItem =
  | ToolbarButton
  | ToolbarDropdown
  | ToolbarColorButton
  | ToolbarFontSizeInput
  | ToolbarIconMenu;
