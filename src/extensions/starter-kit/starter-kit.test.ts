import { describe, expect, it } from 'vitest';
import { StarterKit } from '.';

describe('StarterKit', () => {
  it('returns the implemented default extensions', () => {
    expect(StarterKit().map((ext) => ext.name)).toEqual([
      'doc',
      'text',
      'paragraph',
      'bold',
      'italic',
      'underline',
      'strike',
      'code',
    ]);
  });

  it('leaves out the extensions set to false', () => {
    expect(StarterKit({ bold: false }).map((ext) => ext.name)).toEqual([
      'doc',
      'text',
      'paragraph',
      'italic',
      'underline',
      'strike',
      'code',
    ]);
  });
});
