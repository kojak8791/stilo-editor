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
/** Default toolbar items and layout. */
export {
  DEFAULT_ITEMS,
  DEFAULT_TOOLBAR,
  headingDropdown,
  highlightButton,
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
  ToolbarItem,
} from './toolbar/types';
