import type { Extension } from '../../core/extension';
import { Blockquote } from '../blockquote';
import { Bold } from '../bold';
import { BulletList } from '../bullet-list';
import { Code } from '../code';
import { Document } from '../document';
import { HardBreak } from '../hard-break';
import { Heading, type HeadingOptions } from '../heading';
import { HorizontalRule } from '../horizontal-rule';
import { Italic } from '../italic';
import { Link } from '../link';
import { ListItem } from '../list-item';
import { OrderedList } from '../ordered-list';
import { Paragraph } from '../paragraph';
import { Strike } from '../strike';
import { Text } from '../text';
import { Underline } from '../underline';

/**
 * Options of {@link StarterKit}, by extension name: `false` disables the extension, an object
 * configures it. Extensions without options accept only `false`.
 */
export interface StarterKitOptions {
  doc?: false;
  text?: false;
  paragraph?: false;
  heading?: false | Partial<HeadingOptions>;
  blockquote?: false;
  horizontalRule?: false;
  hardBreak?: false;
  bulletList?: false;
  orderedList?: false;
  listItem?: false;
  bold?: false;
  italic?: false;
  underline?: false;
  strike?: false;
  code?: false;
  link?: false;
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
 * new Editor({ element, extensions: [StarterKit({ bold: false })] });
 * ```
 */
export function StarterKit(options: StarterKitOptions = {}): Extension[] {
  return [
    ...include(Document, options.doc),
    ...include(Text, options.text),
    ...include(Paragraph, options.paragraph),
    ...include(Heading, options.heading),
    ...include(Blockquote, options.blockquote),
    ...include(HorizontalRule, options.horizontalRule),
    ...include(HardBreak, options.hardBreak),
    ...include(BulletList, options.bulletList),
    ...include(OrderedList, options.orderedList),
    ...include(ListItem, options.listItem),
    ...include(Bold, options.bold),
    ...include(Italic, options.italic),
    ...include(Underline, options.underline),
    ...include(Strike, options.strike),
    ...include(Code, options.code),
    ...include(Link, options.link),
  ];
}
