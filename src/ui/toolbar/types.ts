import type { IconNode } from 'lucide';
import type { Editor } from '../../index';

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
  run(editor: Editor): void;
  /** Present = toggle button (`aria-pressed`). */
  isActive?(editor: Editor): boolean;
  /** Default: always enabled. */
  isEnabled?(editor: Editor): boolean;
  /** False = not rendered (e.g. its extension is disabled). Default: available. */
  isAvailable?(editor: Editor): boolean;
}

/** A dropdown of mutually exclusive options (T-014). */
export interface ToolbarDropdown {
  id: string;
  kind: 'dropdown';
  /** Key of the accessible name of the trigger and of the menu. */
  labelKey: string;
  options: ToolbarDropdownOption[];
  isAvailable?(editor: Editor): boolean;
}

/** An option of a {@link ToolbarDropdown}. */
export interface ToolbarDropdownOption {
  /** Unique within the dropdown; used in the class `stilo-dropdown__option--<id>`. */
  id: string;
  labelKey: string;
  shortcut?: string;
  run(editor: Editor): void;
  isActive(editor: Editor): boolean;
  /** Default: always enabled. */
  isEnabled?(editor: Editor): boolean;
}

/** A single item in the toolbar (T-013: `ToolbarButton` only). */
export type ToolbarItem = ToolbarButton | ToolbarDropdown;
