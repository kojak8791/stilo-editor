import type { Extension } from '../../core/extension';
import { Blockquote } from '../blockquote';
import { Bold } from '../bold';
import { BulletList } from '../bullet-list';
import { ClearFormatting } from '../clear-formatting';
import { Code } from '../code';
import { Document } from '../document';
import { DropCursor, type DropCursorOptions } from '../drop-cursor';
import { GapCursor } from '../gap-cursor';
import { HardBreak } from '../hard-break';
import { Heading, type HeadingOptions } from '../heading';
import { Highlight } from '../highlight';
import { History, type HistoryOptions } from '../history';
import { HorizontalRule } from '../horizontal-rule';
import { Image, type ImageOptions } from '../image';
import { Italic } from '../italic';
import { LineHeight } from '../line-height';
import { Link } from '../link';
import { ListItem } from '../list-item';
import { MoveBlock } from '../move-block';
import { OrderedList } from '../ordered-list';
import { Paragraph } from '../paragraph';
import { Placeholder, type PlaceholderOptions } from '../placeholder';
import { Search, type SearchOptions } from '../search';
import { Strike } from '../strike';
import { Subscript } from '../subscript';
import { Superscript } from '../superscript';
import { Text } from '../text';
import { TextAlign } from '../text-align';
import { TextStyle } from '../text-style';
import { Underline } from '../underline';

/**
 * Options of {@link defaultExtensions}, by extension name: `false` disables the extension, an object
 * configures it. Extensions without options accept only `false`.
 */
export interface DefaultExtensionsOptions {
  doc?: false;
  text?: false;
  paragraph?: false;
  heading?: false | Partial<HeadingOptions>;
  blockquote?: false;
  horizontalRule?: false;
  image?: false | Partial<ImageOptions>;
  hardBreak?: false;
  bulletList?: false;
  orderedList?: false;
  listItem?: false;
  bold?: false;
  italic?: false;
  underline?: false;
  strike?: false;
  subscript?: false;
  superscript?: false;
  code?: false;
  link?: false;
  textStyle?: false;
  textAlign?: false;
  lineHeight?: false;
  highlight?: false;
  clearFormatting?: false;
  history?: false | Partial<HistoryOptions>;
  moveBlock?: false;
  placeholder?: false | Partial<PlaceholderOptions>;
  search?: false | Partial<SearchOptions>;
  dropCursor?: false | Partial<DropCursorOptions>;
  gapCursor?: false;
}

/** Returns the extension unless its option is `false`. */
function include<O extends object>(
  factory: (options?: Partial<O>) => Extension<O>,
  option: false | Partial<O> | undefined,
): Extension<O>[] {
  return option === false ? [] : [factory(option)];
}

/**
 * The default extension set (docs/ARCHITECTURE.md §6.3). M1 extensions are added here as they
 * are implemented.
 *
 * ```ts
 * new Editor({ element, extensions: [defaultExtensions({ bold: false })] });
 * ```
 */
export function defaultExtensions(options: DefaultExtensionsOptions = {}): Extension[] {
  return [
    ...include(Document, options.doc),
    ...include(Text, options.text),
    ...include(Paragraph, options.paragraph),
    ...include(Heading, options.heading),
    ...include(Blockquote, options.blockquote),
    ...include(HorizontalRule, options.horizontalRule),
    ...include(HardBreak, options.hardBreak),
    ...include(Image, options.image),
    ...include(BulletList, options.bulletList),
    ...include(OrderedList, options.orderedList),
    ...include(ListItem, options.listItem),
    ...include(Bold, options.bold),
    ...include(Italic, options.italic),
    ...include(Underline, options.underline),
    ...include(Strike, options.strike),
    ...include(Subscript, options.subscript),
    ...include(Superscript, options.superscript),
    ...include(Code, options.code),
    ...include(Link, options.link),
    ...include(TextStyle, options.textStyle),
    ...include(Highlight, options.highlight),
    ...include(TextAlign, options.textAlign),
    ...include(LineHeight, options.lineHeight),
    ...include(ClearFormatting, options.clearFormatting),
    ...include(History, options.history),
    ...include(MoveBlock, options.moveBlock),
    ...include(Placeholder, options.placeholder),
    ...include(Search, options.search),
    ...include(DropCursor, options.dropCursor),
    ...include(GapCursor, options.gapCursor),
  ];
}
