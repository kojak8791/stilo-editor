import { describe, expect, it } from 'vitest';
import { textDecorationRules } from './parse-rules';

describe('textDecorationRules', () => {
  it('returns non-consuming rules for both properties matching the keyword', () => {
    const rules = textDecorationRules('underline');
    expect(rules.map((rule) => [rule.style, rule.consuming])).toEqual([
      ['text-decoration', false],
      ['text-decoration-line', false],
    ]);
    const getAttrs = rules[0]!.getAttrs!;
    expect(getAttrs('underline')).toBeNull();
    expect(getAttrs('line-through underline')).toBeNull();
    expect(getAttrs('line-through')).toBe(false);
    expect(getAttrs('underlined')).toBe(false);
  });
});
