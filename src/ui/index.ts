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
export { DEFAULT_ITEMS, DEFAULT_TOOLBAR, headingDropdown } from './toolbar/items';
/** Toolbar element and creation function. */
export { createToolbar, type Toolbar, type ToolbarOptions } from './toolbar/toolbar';
/** Toolbar item types. */
export type {
  ToolbarButton,
  ToolbarContext,
  ToolbarDropdown,
  ToolbarDropdownOption,
  ToolbarItem,
} from './toolbar/types';
