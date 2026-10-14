/** Public API of the Stilo default UI. */

/** Dropdown component. */
export type {
  Dropdown,
  DropdownOptions,
  DropdownOptionView,
  DropdownState,
} from './components/dropdown';
/** Shortcut formatting utilities. */
export { formatShortcut } from './components/shortcut';
/** English UI strings. */
export { en } from './i18n/en';
/** Italian UI strings. */
export { it } from './i18n/it';
/** i18n types. */
export type { MessageKey, Messages } from './i18n/types';
/** Default lists of the font dropdowns. */
export { DEFAULT_FONT_SIZES, DEFAULT_FONTS } from './toolbar/fonts';
/** Default toolbar items and layout. */
export {
  DEFAULT_ITEMS,
  DEFAULT_TOOLBAR,
  type FontSizeInputOptions,
  fontFamilyDropdown,
  fontSizeInput,
  headingDropdown,
  highlightButton,
  lineHeightDropdown,
  textAlignMenu,
  textColorButton,
} from './toolbar/items';
/** Default palette of the color buttons. */
export { DEFAULT_PALETTE } from './toolbar/palette';
/** Toolbar element and creation function. */
export { createToolbar, type Toolbar, type ToolbarOptions } from './toolbar/toolbar';
/** Toolbar item types. */
export type {
  ToolbarButton,
  ToolbarColor,
  ToolbarColorButton,
  ToolbarContext,
  ToolbarDropdown,
  ToolbarDropdownOption,
  ToolbarFont,
  ToolbarFontSizeInput,
  ToolbarIconMenu,
  ToolbarIconMenuOption,
  ToolbarItem,
} from './toolbar/types';
