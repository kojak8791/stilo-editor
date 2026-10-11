import { describe, expect, it } from 'vitest';
import { typeText } from '../../../tests/helpers';
import { createCoreEditor, select } from '../../../tests/helpers/core';
import { defineExtension } from '../extension';
import { markInputRule } from './input-rules';

const StrongRules = defineExtension({
  name: 'strongRules',
  inputRules: ({ schema }) => [
    markInputRule(/(?:^|[^*])\*\*([^*]+)\*\*$/, schema.marks.strong!),
    markInputRule(/(?:^|[^_])_([^_]+)_$/, schema.marks.strong!),
  ],
});

function typed(html: string, text: string, at?: number) {
  const editor = createCoreEditor(html, [StrongRules()]);
  select(editor, at ?? editor.state.doc.content.size - 1);
  typeText(editor, text);
  return editor;
}

describe('markInputRule', () => {
  it.each([
    ['<p></p>', '**ab**', '<p><strong>ab</strong></p>'],
    ['<p></p>', 'x **ab**', '<p>x <strong>ab</strong></p>'],
    ['<p>x</p>', '_ab_', '<p>x<strong>ab</strong></p>'],
    ['<p></p>', '_a_', '<p><strong>a</strong></p>'],
    ['<p></p>', '***ab**', '<p>***ab**</p>'],
    ['<p></p>', '****', '<p>****</p>'],
  ])('in %j, typing %j gives %j', (html, text, expected) => {
    expect(typed(html, text).getHTML()).toBe(expected);
  });

  it('continues typing without the mark', () => {
    const editor = typed('<p></p>', '**ab**c');
    expect(editor.getHTML()).toBe('<p><strong>ab</strong>c</p>');
  });

  it('keeps the other marks of the text', () => {
    // "a" is strong: the rule re-applies strong, the text keeps it and loses the syntax.
    const editor = createCoreEditor('<p>**<strong>a</strong>b*</p>', [StrongRules()]);
    select(editor, 6);
    typeText(editor, '*');
    expect(editor.getHTML()).toBe('<p><strong>ab</strong></p>');
  });

  it('does not apply where the parent does not allow the mark', () => {
    expect(typed('<h1></h1>', '**ab**').getHTML()).toBe('<h1>**ab**</h1>');
  });
});
