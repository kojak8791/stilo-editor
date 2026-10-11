import type { Extension } from '../../core/extension';
import { Bold } from '../bold';
import { Code } from '../code';
import { Document } from '../document';
import { Italic } from '../italic';
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
  bold?: false;
  italic?: false;
  underline?: false;
  strike?: false;
  code?: false;
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
    ...include(Bold, options.bold),
    ...include(Italic, options.italic),
    ...include(Underline, options.underline),
    ...include(Strike, options.strike),
    ...include(Code, options.code),
  ];
}
