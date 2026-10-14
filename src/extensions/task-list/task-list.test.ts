import { describe, expect, it } from 'vitest';
import { createTestEditor, getHTMLWithSelection, pressKey, typeText } from '../../../tests/helpers';

const ul = (items: string) => `<ul data-type="taskList">${items}</ul>`;
const li = (checked: boolean, content: string) => `<li data-checked="${checked}">${content}</li>`;

describe('TaskList: parse and serialize', () => {
  it.each([
    [ul(li(true, 'a') + li(false, 'b')), ul(li(true, 'a') + li(false, 'b'))],
    [ul('<li>a</li>'), ul(li(false, 'a'))],
    [ul('<li data-checked="x">a</li>'), ul(li(false, 'a'))],
    [ul(li(true, '<p>a</p>')), ul(li(true, 'a'))],
    [ul(li(true, '<p>a</p><p>b</p>')), ul(li(true, '<p>a</p><p>b</p>'))],
    [ul(li(false, `a${ul(li(true, 'b'))}`)), ul(li(false, `<p>a</p>${ul(li(true, 'b'))}`))],
    [`<ul><li>a${ul(li(true, 'b'))}</li></ul>`, `<ul><li><p>a</p>${ul(li(true, 'b'))}</li></ul>`],
    [ul(li(true, 'a<ol><li>b</li></ol>')), ul(li(true, '<p>a</p><ol><li>b</li></ol>'))],
    ['<ul><li data-checked="true">a</li></ul>', '<ul><li>a</li></ul>'],
    [
      ul(
        li(true, '<label><input type="checkbox" checked><span></span></label><div><p>a</p></div>'),
      ),
      ul(li(true, 'a')),
    ],
  ])('parses %j as %j', (html, expected) => {
    expect(createTestEditor({ html }).getHTML()).toBe(expected);
  });

  it('is idempotent', () => {
    const editor = createTestEditor({ html: ul(li(true, `a${ul(li(false, 'b'))}`)) });
    const html = editor.getHTML();
    editor.setHTML(html);
    expect(editor.getHTML()).toBe(html);
  });
});

describe('TaskList: toggleTaskList command', () => {
  it.each([
    ['<p>a|</p>', ul(li(false, 'a|'))],
    ['<p>[a</p><p>b]</p>', ul(li(false, '[a') + li(false, 'b]'))],
    [ul(li(true, 'a|')), '<p>a|</p>'],
    ['<ul><li>a|</li><li>b</li></ul>', ul(li(false, 'a|') + li(false, 'b'))],
    [
      '<ol start="3"><li><p>a</p><ul><li>b</li></ul></li><li>c|</li></ol>',
      ul(li(false, '<p>a</p><ul><li>b</li></ul>') + li(false, 'c|')),
    ],
    [`<ul><li><p>a</p>${ul(li(true, 'b|'))}</li></ul>`, '<ul><li><p>a</p><p>b|</p></li></ul>'],
  ])('on %j gives %j', (html, expected) => {
    const editor = createTestEditor({ html });
    expect(editor.commands.toggleTaskList()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it.each([
    ['toggleBulletList', '<ul><li>a|</li><li>b</li></ul>'],
    ['toggleOrderedList', '<ol><li>a|</li><li>b</li></ol>'],
  ] as const)('%s converts a task list, which loses the checked state', (command, expected) => {
    const editor = createTestEditor({ html: ul(li(true, 'a|') + li(false, 'b')) });
    expect(editor.commands[command]()).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it('keeps a range selection when it converts a list', () => {
    const editor = createTestEditor({ html: '<ul><li>a[b</li><li>c]d</li></ul>' });
    editor.commands.toggleTaskList();
    expect(getHTMLWithSelection(editor)).toBe(ul(li(false, 'a[b') + li(false, 'c]d')));
  });

  it('converts a list in one undo step', () => {
    const editor = createTestEditor({ html: '<ul><li>a|</li><li>b</li></ul>' });
    editor.commands.toggleTaskList();
    expect(pressKey(editor, 'Mod-z')).toBe(true);
    expect(editor.getHTML()).toBe('<ul><li>a</li><li>b</li></ul>');
  });
});

describe('TaskList: keymap', () => {
  it('toggles with Mod-Shift-9', () => {
    const editor = createTestEditor({ html: '<p>a|</p>' });
    expect(pressKey(editor, 'Mod-Shift-9')).toBe(true);
    expect(getHTMLWithSelection(editor)).toBe(ul(li(false, 'a|')));
  });
});

describe('TaskList: input rules', () => {
  it.each([
    ['<p>|</p>', '[ ] a', ul(li(false, 'a|'))],
    ['<p>|</p>', '[x] a', ul(li(true, 'a|'))],
    ['<p>|</p>', '[X] a', ul(li(true, 'a|'))],
    ['<p>|b</p>', '[x] ', ul(li(true, '|b'))],
    [`${ul(li(true, 'a'))}<p>|</p>`, '[ ] ', ul(li(true, 'a') + li(false, '|'))],
    [`${ul(li(false, 'a'))}<p>|</p>`, '[x] ', ul(li(false, 'a') + li(true, '|'))],
    ['<ul><li>a</li></ul><p>|</p>', '[ ] ', `<ul><li>a</li></ul>${ul(li(false, '|'))}`],
  ])('in %j, typing %j gives %j', (html, text, expected) => {
    const editor = createTestEditor({ html });
    typeText(editor, text);
    expect(getHTMLWithSelection(editor)).toBe(expected);
  });

  it.each(['[]', '[y]', 'a[x]'])('leaves %j followed by a space as text', (text) => {
    const editor = createTestEditor({ html: '<p>|</p>' });
    typeText(editor, `${text} `);
    expect(editor.getHTML()).toBe(`<p>${text} </p>`);
  });
});
