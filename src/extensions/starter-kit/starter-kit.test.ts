import { describe, expect, it } from 'vitest';
import { StarterKit } from '.';

describe('StarterKit', () => {
  it('returns the implemented default extensions', () => {
    expect(StarterKit().map((ext) => ext.name)).toEqual([
      'doc',
      'text',
      'paragraph',
      'heading',
      'blockquote',
      'horizontalRule',
      'hardBreak',
      'bulletList',
      'orderedList',
      'listItem',
      'bold',
      'italic',
      'underline',
      'strike',
      'subscript',
      'superscript',
      'code',
      'link',
      'textStyle',
      'highlight',
      'clearFormatting',
      'history',
      'moveBlock',
      'placeholder',
      'dropCursor',
      'gapCursor',
    ]);
  });

  it('leaves out the extensions set to false', () => {
    expect(StarterKit({ bold: false }).map((ext) => ext.name)).toEqual([
      'doc',
      'text',
      'paragraph',
      'heading',
      'blockquote',
      'horizontalRule',
      'hardBreak',
      'bulletList',
      'orderedList',
      'listItem',
      'italic',
      'underline',
      'strike',
      'subscript',
      'superscript',
      'code',
      'link',
      'textStyle',
      'highlight',
      'clearFormatting',
      'history',
      'moveBlock',
      'placeholder',
      'dropCursor',
      'gapCursor',
    ]);
  });
});
