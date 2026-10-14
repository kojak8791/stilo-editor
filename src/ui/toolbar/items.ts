import {
  Bold,
  Code,
  FaceSlightlySmilingPlus,
  Highlighter,
  Italic,
  Link,
  List,
  ListChevronsUpDown,
  ListOrdered,
  Minus,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Subscript,
  Superscript,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignJustify,
  TextAlignStart,
  TextQuote,
  Type,
  Underline,
  Undo2,
} from 'lucide';
import type { Editor, FontSizeUnit, HeadingLevel, TextAlignment } from '../../index';
import { canEditLink } from '../components/link-popover';
import type { MessageKey } from '../i18n/types';
import { DEFAULT_FONT_SIZES, DEFAULT_FONTS } from './fonts';
import { DEFAULT_PALETTE } from './palette';
import type {
  ToolbarColor,
  ToolbarColorButton,
  ToolbarDropdown,
  ToolbarFont,
  ToolbarFontSizeInput,
  ToolbarIconMenu,
  ToolbarItem,
} from './types';

/** Default toolbar item IDs for the `items` configuration. */
export const DEFAULT_TOOLBAR: ReadonlyArray<ReadonlyArray<string>> = [
  ['undo', 'redo'],
  ['heading'],
  ['fontFamily', 'fontSize'],
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
  ['textColor', 'highlight'],
  ['textAlign', 'lineHeight'],
  ['bulletList', 'orderedList', 'blockquote', 'horizontalRule', 'characters'],
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
    isEnabled: (e) => e.commands.undo.can(),
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
    isEnabled: (e) => e.commands.redo.can(),
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
    isEnabled: (e) => 'toggleBold' in e.commands && e.commands.toggleBold.can(),
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
    isEnabled: (e) => 'toggleItalic' in e.commands && e.commands.toggleItalic.can(),
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
    isEnabled: (e) => 'toggleUnderline' in e.commands && e.commands.toggleUnderline.can(),
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
    isEnabled: (e) => 'toggleStrike' in e.commands && e.commands.toggleStrike.can(),
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
    isEnabled: (e) => 'toggleCode' in e.commands && e.commands.toggleCode.can(),
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
    isEnabled: (e) => 'toggleSubscript' in e.commands && e.commands.toggleSubscript.can(),
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
    isEnabled: (e) => 'toggleSuperscript' in e.commands && e.commands.toggleSuperscript.can(),
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
    isEnabled: (e) => 'clearFormatting' in e.commands && e.commands.clearFormatting.can(),
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
    isEnabled: (e) => 'toggleBulletList' in e.commands && e.commands.toggleBulletList.can(),
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
    isEnabled: (e) => 'toggleOrderedList' in e.commands && e.commands.toggleOrderedList.can(),
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
    isEnabled: (e) => 'toggleBlockquote' in e.commands && e.commands.toggleBlockquote.can(),
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
    isEnabled: (e) => 'setHorizontalRule' in e.commands && e.commands.setHorizontalRule.can(),
    isAvailable: (e) => 'setHorizontalRule' in e.commands,
  },
  characters: {
    id: 'characters',
    kind: 'button',
    icon: FaceSlightlySmilingPlus,
    labelKey: 'toolbar.characters',
    run: (_e, toolbar) => {
      toolbar.toggleCharacterPicker();
    },
    isAvailable: (e) => 'insertText' in e.commands,
  },
  heading: headingDropdown(),
  fontFamily: fontFamilyDropdown(),
  fontSize: fontSizeInput(),
  textAlign: textAlignMenu(),
  lineHeight: lineHeightDropdown(),
  textColor: textColorButton(),
  highlight: highlightButton(),
};

/** The `color` attribute of a mark at the selection, `null` when there is none. */
function markColor(editor: Editor, mark: string): string | null {
  const { color } = editor.getAttributes(mark);
  return typeof color === 'string' ? color : null;
}

/** The text color split button (`TextStyle` extension), default color black. */
export function textColorButton(
  palette: readonly ToolbarColor[] = DEFAULT_PALETTE,
): ToolbarColorButton {
  return {
    id: 'textColor',
    kind: 'color',
    icon: Type,
    labelKey: 'toolbar.textColor',
    palette,
    defaultColor: '#000000',
    setColor: (e, color) => color !== null && e.commands.setColor(color),
    unsetColor: (e) => {
      e.commands.unsetColor();
    },
    hasColor: (e, color) => e.isActive('textStyle', { color }),
    getColor: (e) => markColor(e, 'textStyle'),
    isEnabled: (e) => 'setColor' in e.commands && e.commands.setColor.can('#000000'),
    isAvailable: (e) => 'setColor' in e.commands,
  };
}

/** The highlight split button (`Highlight` extension), default a plain `<mark>`. */
export function highlightButton(
  palette: readonly ToolbarColor[] = DEFAULT_PALETTE,
): ToolbarColorButton {
  return {
    id: 'highlight',
    kind: 'color',
    icon: Highlighter,
    labelKey: 'toolbar.highlight',
    palette,
    defaultColor: null,
    defaultChoice: true,
    setColor: (e, color) => e.commands.setHighlight({ color }),
    unsetColor: (e) => {
      e.commands.unsetHighlight();
    },
    hasColor: (e, color) => e.isActive('highlight', { color }),
    getColor: (e) => markColor(e, 'highlight'),
    isEnabled: (e) => 'setHighlight' in e.commands && e.commands.setHighlight.can(),
    isAvailable: (e) => 'setHighlight' in e.commands,
  };
}

/** The first name of a CSS `font-family` list, unquoted: `'Times New Roman', serif` → `Times New Roman`. */
function firstFamily(fontFamily: string): string {
  return fontFamily.split(',')[0]!.replace(/'/g, '').trim();
}

/** A class-safe option ID for a CSS value: `'Times New Roman', serif` → `times-new-roman`. */
function optionId(value: string): string {
  return firstFamily(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}

/** The font family when the whole selection has the same one, otherwise `null`. */
function selectedFontFamily(editor: Editor): string | null {
  const { fontFamily } = editor.getAttributes('textStyle');
  return typeof fontFamily === 'string' && editor.isActive('textStyle', { fontFamily })
    ? fontFamily
    : null;
}

/**
 * The font family dropdown (`TextStyle` extension): "Default" removes the font family, then one
 * option per font, drawn in that font. A font that is not in the list is shown by its first name.
 */
export function fontFamilyDropdown(fonts: readonly ToolbarFont[] = DEFAULT_FONTS): ToolbarDropdown {
  return {
    id: 'fontFamily',
    kind: 'dropdown',
    labelKey: 'toolbar.fontFamily',
    options: [
      {
        id: 'default',
        labelKey: 'font.default',
        run: (e: Editor) => {
          e.commands.unsetFontFamily();
        },
        isActive: () => false,
        isEnabled: (e: Editor) => e.commands.setFontFamily.can('serif'),
      },
      ...fonts.map(({ fontFamily, labelKey }) => ({
        id: optionId(fontFamily),
        labelKey,
        fontFamily,
        run: (e: Editor) => {
          e.commands.setFontFamily(fontFamily);
        },
        isActive: (e: Editor) => e.isActive('textStyle', { fontFamily }),
        isEnabled: (e: Editor) => e.commands.setFontFamily.can(fontFamily),
      })),
    ],
    getValueLabel: (e: Editor) => {
      const value = selectedFontFamily(e);
      return value === null ? null : firstFamily(value);
    },
    isAvailable: (e: Editor) => 'setFontFamily' in e.commands,
  };
}

/** Options of {@link fontSizeInput}. */
export interface FontSizeInputOptions {
  /** The unit the field shows and writes. Default: `pt`. */
  unit?: FontSizeUnit;
  /** The sizes of the list, in `unit` (px for `rem`). Default: `DEFAULT_FONT_SIZES` of the unit. */
  sizes?: readonly number[];
}

/** The font size control (`TextStyle` extension): −, a field with a list of sizes, +. */
export function fontSizeInput(options: FontSizeInputOptions = {}): ToolbarFontSizeInput {
  const { unit = 'pt', sizes = DEFAULT_FONT_SIZES[unit === 'pt' ? 'pt' : 'px'] } = options;
  return {
    id: 'fontSize',
    kind: 'fontSize',
    labelKey: 'toolbar.fontSize',
    unit,
    sizes,
    isAvailable: (e: Editor) => 'stepFontSize' in e.commands,
  };
}

/** The alignment of the textblock at the start of the selection. */
function blockAlignment(editor: Editor): TextAlignment {
  const textAlign =
    editor.getAttributes('heading').textAlign ?? editor.getAttributes('paragraph').textAlign;
  return typeof textAlign === 'string' ? (textAlign as TextAlignment) : 'left';
}

/** The text alignment menu (`TextAlign` extension): left, center, right, justify. */
export function textAlignMenu(): ToolbarIconMenu {
  const alignments = [
    ['left', TextAlignStart, 'Mod-Shift-l'],
    ['center', TextAlignCenter, 'Mod-Shift-e'],
    ['right', TextAlignEnd, 'Mod-Shift-r'],
    ['justify', TextAlignJustify, 'Mod-Shift-j'],
  ] as const;
  return {
    id: 'textAlign',
    kind: 'iconMenu',
    labelKey: 'toolbar.textAlign',
    options: alignments.map(([alignment, icon, shortcut]) => ({
      id: alignment,
      icon,
      labelKey: `align.${alignment}`,
      shortcut,
      run: (e: Editor) => {
        e.commands.setTextAlign(alignment);
      },
      isActive: (e: Editor) => blockAlignment(e) === alignment,
      isEnabled: (e: Editor) => e.commands.setTextAlign.can(alignment),
    })),
    isAvailable: (e: Editor) => 'setTextAlign' in e.commands,
  };
}

/** The line height of the textblock at the start of the selection, `null` when it has none. */
function blockLineHeight(editor: Editor): unknown {
  return editor.getAttributes('heading').lineHeight ?? editor.getAttributes('paragraph').lineHeight;
}

/**
 * The line spacing dropdown (`LineHeight` extension): "Default" (no line height of its own) and
 * the `values`, shown as numbers.
 */
export function lineHeightDropdown(values: readonly number[] = [1, 1.15, 1.5, 2]): ToolbarDropdown {
  return {
    id: 'lineHeight',
    kind: 'dropdown',
    labelKey: 'toolbar.lineHeight',
    icon: ListChevronsUpDown,
    options: [
      {
        id: 'default',
        labelKey: 'lineHeight.default',
        run: (e: Editor) => {
          e.commands.unsetLineHeight();
        },
        isActive: (e: Editor) => blockLineHeight(e) == null,
        isEnabled: (e: Editor) => e.commands.unsetLineHeight.can(),
      },
      ...values.map((value) => ({
        id: String(value).replace('.', '-'),
        labelKey: String(value),
        run: (e: Editor) => {
          e.commands.setLineHeight(value);
        },
        isActive: (e: Editor) => blockLineHeight(e) === String(value),
        isEnabled: (e: Editor) => e.commands.setLineHeight.can(value),
      })),
    ],
    isAvailable: (e: Editor) => 'setLineHeight' in e.commands,
  };
}

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
      isEnabled: (e: Editor) => e.isActive('paragraph') || e.commands.setParagraph.can(),
    },
    ...levels.map((level) => ({
      id: `h${level}`,
      labelKey: `heading.h${level}` as MessageKey,
      shortcut: `Mod-Alt-${level}`,
      run: (e: Editor) => {
        e.commands.setHeading({ level });
      },
      isActive: (e: Editor) => e.isActive('heading', { level }),
      isEnabled: (e: Editor) =>
        e.isActive('heading', { level }) || e.commands.setHeading.can({ level }),
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
