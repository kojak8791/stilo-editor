import {
  Bold,
  Code,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Subscript,
  Superscript,
  TextQuote,
  Underline,
  Undo2,
} from 'lucide';
import type { Editor, HeadingLevel } from '../../index';
import { canEditLink } from '../components/link-popover';
import type { MessageKey } from '../i18n/types';
import type { ToolbarDropdown, ToolbarItem } from './types';

/** Default toolbar item IDs for the `items` configuration. */
export const DEFAULT_TOOLBAR: ReadonlyArray<ReadonlyArray<string>> = [
  ['undo', 'redo'],
  ['heading'],
  [
    'bold',
    'italic',
    'underline',
    'strike',
    'code',
    'subscript',
    'superscript',
    'link',
    'clearFormatting',
  ],
  ['bulletList', 'orderedList', 'blockquote', 'horizontalRule'],
];

/** The default toolbar items, by ID. */
export const DEFAULT_ITEMS: Readonly<Record<string, ToolbarItem>> = {
  undo: {
    id: 'undo',
    kind: 'button',
    icon: Undo2,
    labelKey: 'toolbar.undo',
    shortcut: 'Mod-z',
    run: (e) => {
      e.commands.undo();
    },
    isEnabled: (e) => e.can().undo(),
  },
  redo: {
    id: 'redo',
    kind: 'button',
    icon: Redo2,
    labelKey: 'toolbar.redo',
    shortcut: 'Mod-Shift-z',
    run: (e) => {
      e.commands.redo();
    },
    isEnabled: (e) => e.can().redo(),
  },
  bold: {
    id: 'bold',
    kind: 'button',
    icon: Bold,
    labelKey: 'toolbar.bold',
    shortcut: 'Mod-b',
    run: (e) => {
      e.commands.toggleBold();
    },
    isActive: (e) => e.isActive('bold'),
    isEnabled: (e) => 'toggleBold' in e.commands && e.can().toggleBold(),
    isAvailable: (e) => 'toggleBold' in e.commands,
  },
  italic: {
    id: 'italic',
    kind: 'button',
    icon: Italic,
    labelKey: 'toolbar.italic',
    shortcut: 'Mod-i',
    run: (e) => {
      e.commands.toggleItalic();
    },
    isActive: (e) => e.isActive('italic'),
    isEnabled: (e) => 'toggleItalic' in e.commands && e.can().toggleItalic(),
    isAvailable: (e) => 'toggleItalic' in e.commands,
  },
  underline: {
    id: 'underline',
    kind: 'button',
    icon: Underline,
    labelKey: 'toolbar.underline',
    shortcut: 'Mod-u',
    run: (e) => {
      e.commands.toggleUnderline();
    },
    isActive: (e) => e.isActive('underline'),
    isEnabled: (e) => 'toggleUnderline' in e.commands && e.can().toggleUnderline(),
    isAvailable: (e) => 'toggleUnderline' in e.commands,
  },
  strike: {
    id: 'strike',
    kind: 'button',
    icon: Strikethrough,
    labelKey: 'toolbar.strike',
    shortcut: 'Mod-Shift-s',
    run: (e) => {
      e.commands.toggleStrike();
    },
    isActive: (e) => e.isActive('strike'),
    isEnabled: (e) => 'toggleStrike' in e.commands && e.can().toggleStrike(),
    isAvailable: (e) => 'toggleStrike' in e.commands,
  },
  code: {
    id: 'code',
    kind: 'button',
    icon: Code,
    labelKey: 'toolbar.code',
    shortcut: 'Mod-e',
    run: (e) => {
      e.commands.toggleCode();
    },
    isActive: (e) => e.isActive('code'),
    isEnabled: (e) => 'toggleCode' in e.commands && e.can().toggleCode(),
    isAvailable: (e) => 'toggleCode' in e.commands,
  },
  subscript: {
    id: 'subscript',
    kind: 'button',
    icon: Subscript,
    labelKey: 'toolbar.subscript',
    shortcut: 'Mod-,',
    run: (e) => {
      e.commands.toggleSubscript();
    },
    isActive: (e) => e.isActive('subscript'),
    isEnabled: (e) => 'toggleSubscript' in e.commands && e.can().toggleSubscript(),
    isAvailable: (e) => 'toggleSubscript' in e.commands,
  },
  superscript: {
    id: 'superscript',
    kind: 'button',
    icon: Superscript,
    labelKey: 'toolbar.superscript',
    shortcut: 'Mod-.',
    run: (e) => {
      e.commands.toggleSuperscript();
    },
    isActive: (e) => e.isActive('superscript'),
    isEnabled: (e) => 'toggleSuperscript' in e.commands && e.can().toggleSuperscript(),
    isAvailable: (e) => 'toggleSuperscript' in e.commands,
  },
  link: {
    id: 'link',
    kind: 'button',
    icon: Link,
    labelKey: 'toolbar.link',
    shortcut: 'Mod-k',
    run: (_e, toolbar) => {
      toolbar.openLinkPopover();
    },
    isActive: (e) => e.isActive('link'),
    isEnabled: (e) => 'setLink' in e.commands && canEditLink(e),
    isAvailable: (e) => 'setLink' in e.commands,
  },
  clearFormatting: {
    id: 'clearFormatting',
    kind: 'button',
    icon: RemoveFormatting,
    labelKey: 'toolbar.clearFormatting',
    shortcut: 'Mod-\\',
    run: (e) => {
      e.commands.clearFormatting();
    },
    isEnabled: (e) => 'clearFormatting' in e.commands && e.can().clearFormatting(),
    isAvailable: (e) => 'clearFormatting' in e.commands,
  },
  bulletList: {
    id: 'bulletList',
    kind: 'button',
    icon: List,
    labelKey: 'toolbar.bulletList',
    shortcut: 'Mod-Shift-8',
    run: (e) => {
      e.commands.toggleBulletList();
    },
    isActive: (e) => e.isActive('bulletList'),
    isEnabled: (e) => 'toggleBulletList' in e.commands && e.can().toggleBulletList(),
    isAvailable: (e) => 'toggleBulletList' in e.commands,
  },
  orderedList: {
    id: 'orderedList',
    kind: 'button',
    icon: ListOrdered,
    labelKey: 'toolbar.orderedList',
    shortcut: 'Mod-Shift-7',
    run: (e) => {
      e.commands.toggleOrderedList();
    },
    isActive: (e) => e.isActive('orderedList'),
    isEnabled: (e) => 'toggleOrderedList' in e.commands && e.can().toggleOrderedList(),
    isAvailable: (e) => 'toggleOrderedList' in e.commands,
  },
  blockquote: {
    id: 'blockquote',
    kind: 'button',
    icon: TextQuote,
    labelKey: 'toolbar.blockquote',
    shortcut: 'Mod-Shift-b',
    run: (e) => {
      e.commands.toggleBlockquote();
    },
    isActive: (e) => e.isActive('blockquote'),
    isEnabled: (e) => 'toggleBlockquote' in e.commands && e.can().toggleBlockquote(),
    isAvailable: (e) => 'toggleBlockquote' in e.commands,
  },
  horizontalRule: {
    id: 'horizontalRule',
    kind: 'button',
    icon: Minus,
    labelKey: 'toolbar.horizontalRule',
    run: (e) => {
      e.commands.setHorizontalRule();
    },
    isEnabled: (e) => 'setHorizontalRule' in e.commands && e.can().setHorizontalRule(),
    isAvailable: (e) => 'setHorizontalRule' in e.commands,
  },
  heading: headingDropdown(),
};

/** A heading dropdown toolbar item. */
export function headingDropdown(levels: HeadingLevel[] = [1, 2, 3, 4, 5, 6]): ToolbarDropdown {
  const options: ToolbarDropdown['options'] = [
    {
      id: 'paragraph',
      labelKey: 'heading.paragraph',
      shortcut: 'Mod-Alt-0',
      run: (e: Editor) => {
        e.commands.setParagraph();
      },
      isActive: (e: Editor) => e.isActive('paragraph'),
      isEnabled: (e: Editor) => e.isActive('paragraph') || e.can().setParagraph(),
    },
    ...levels.map((level) => ({
      id: `h${level}`,
      labelKey: `heading.h${level}` as MessageKey,
      shortcut: `Mod-Alt-${level}`,
      run: (e: Editor) => {
        e.commands.setHeading({ level });
      },
      isActive: (e: Editor) => e.isActive('heading', { level }),
      isEnabled: (e: Editor) => e.isActive('heading', { level }) || e.can().setHeading({ level }),
    })),
  ];

  return {
    id: 'heading',
    kind: 'dropdown',
    labelKey: 'toolbar.heading',
    options,
    isAvailable: (e: Editor) => 'setHeading' in e.commands,
  };
}
