import { describe, expect, it } from 'vitest';
import { GOOGLE_DOCS_HTML } from '../../../../tests/fixtures/paste/google-docs';
import { WORD_HTML } from '../../../../tests/fixtures/paste/word';
import { createTestEditor, pasteHTML } from '../../../../tests/helpers';

/** Pastes `html` into an empty editor and returns its HTML. */
function paste(html: string): string {
  const editor = createTestEditor({ html: '<p>|</p>' });
  pasteHTML(editor, html);
  return editor.getHTML();
}

const GDOCS = (content: string) =>
  `<b style="font-weight:normal;" id="docs-internal-guid-1">${content}</b>`;

describe('paste from Google Docs', () => {
  it('keeps the structure and the formatting, drops the base style', () => {
    expect(paste(GOOGLE_DOCS_HTML)).toBe(
      '<h1>Title</h1>' +
        '<p>Plain text, <strong>bold</strong>, <em>italic</em>, <u>underlined</u>, ' +
        '<span style="color: #ff0000">red</span>, <span style="font-size: 14pt">14 pt</span> and ' +
        '<span style="font-family: Georgia, sans-serif">Georgia</span>.</p>' +
        '<p></p>' +
        '<p style="text-align: center">Centered</p>' +
        '<ul><li><p>One</p><ul><li>Nested</li></ul></li><li>Heading item</li></ul>' +
        '<table><colgroup><col style="width: 200px"><col style="width: 120px"></colgroup>' +
        '<tbody><tr><td data-colwidth="200"><p style="line-height: 1.2">A1</p></td>' +
        '<td data-colwidth="120"><p style="line-height: 1.2">B1</p></td></tr></tbody></table>',
    );
  });

  it('turns each <br> between blocks into an empty paragraph, not one inside a paragraph', () => {
    expect(paste(GDOCS('<p>a</p><br><br><p>b<br>c</p>'))).toBe(
      '<p>a</p><p></p><p></p><p>b<br>c</p>',
    );
  });

  it('removes the value that covers most of the text, keeps the others', () => {
    const span = (style: string, text: string) => `<span style="${style}">${text}</span>`;
    expect(
      paste(
        GDOCS(
          `<p>${span('font-size:12pt;color:#00ff00', 'mostly green')}${span('font-size:10pt', 'small')}</p>`,
        ),
      ),
    ).toBe('<p>mostly green<span style="font-size: 10pt">small</span></p>');
  });

  it('removes nothing when most of the text has no value', () => {
    expect(paste(GDOCS('<p>plain text <span style="color:#ff0000">red</span></p>'))).toBe(
      '<p>plain text <span style="color: #ff0000">red</span></p>',
    );
  });

  it('compares normalized values', () => {
    expect(
      paste(
        GDOCS(
          '<p><span style="color:rgb(0,0,0)">black</span><span style="color:#000">!</span></p>',
        ),
      ),
    ).toBe('<p>black!</p>');
  });

  it('removes font-size inside headings, the heading level gives it', () => {
    expect(
      paste(
        GDOCS(
          '<h2><span style="font-size:16pt;color:#434343">Head</span></h2><p>body text here</p>',
        ),
      ),
    ).toBe('<h2><span style="color: #434343">Head</span></h2><p>body text here</p>');
  });
});

describe('paste from Microsoft Word', () => {
  it('keeps the structure and the formatting, builds the lists, drops the base style', () => {
    expect(paste(WORD_HTML)).toBe(
      '<h1>Title</h1>' +
        '<p>Plain text, <strong>bold</strong>, <em>italic</em> and ' +
        '<span style="color: red">red</span>.</p>' +
        '<p></p>' +
        '<ul><li><p>One</p><ul><li>Nested</li></ul></li><li>Two</li></ul>' +
        '<p>Between the lists</p>' +
        '<ol start="3"><li>Three</li><li>Four</li></ol>' +
        '<table><colgroup><col style="width: 200px"><col style="width: 120px"></colgroup>' +
        '<tbody><tr><td data-colwidth="200">A1</td><td data-colwidth="120">B1</td></tr></tbody>' +
        '</table>',
    );
  });

  const WORD = (content: string) =>
    `<html xmlns:w="urn:schemas-microsoft-com:office:word"><body>${content}</body></html>`;
  const item = (level: number, marker: string, text: string) =>
    `<p style="mso-list:l0 level${level} lfo1"><span style="mso-list:Ignore">${marker}&nbsp; </span>${text}</p>`;

  it.each([
    ['1.', '<ol><li>a</li><li>b</li></ol>'],
    ['a)', '<ol><li>a</li><li>b</li></ol>'],
    ['iv.', '<ol><li>a</li><li>b</li></ol>'],
    ['5.', '<ol start="5"><li>a</li><li>b</li></ol>'],
    ['·', '<ul><li>a</li><li>b</li></ul>'],
    ['o', '<ul><li>a</li><li>b</li></ul>'],
    ['§', '<ul><li>a</li><li>b</li></ul>'],
  ])('a list with the marker %s', (marker, expected) => {
    expect(paste(WORD(item(1, marker, 'a') + item(1, marker, 'b')))).toBe(expected);
  });

  it('nests by level and goes back to an outer level', () => {
    expect(
      paste(WORD(item(1, '·', 'a') + item(2, 'o', 'b') + item(3, '§', 'c') + item(1, '·', 'd'))),
    ).toBe('<ul><li><p>a</p><ul><li><p>b</p><ul><li>c</li></ul></li></ul></li><li>d</li></ul>');
  });

  it('starts a new list after a paragraph that is not in a list', () => {
    expect(paste(WORD(`${item(1, '·', 'a')}<p>x</p>${item(1, '·', 'b')}`))).toBe(
      '<ul><li>a</li></ul><p>x</p><ul><li>b</li></ul>',
    );
  });

  it('removes the paragraph ends (<o:p>)', () => {
    expect(paste(WORD('<p>a<o:p></o:p></p><p><o:p>&nbsp;</o:p></p>'))).toBe('<p>a</p><p></p>');
  });
});

describe('paste from other sources', () => {
  it('keeps the base style of HTML that is not from a word processor', () => {
    expect(paste('<p><span style="font-size:11pt">a</span></p>')).toBe(
      '<p><span style="font-size: 11pt">a</span></p>',
    );
  });

  it('turns a heading that starts a list item into a paragraph', () => {
    expect(paste('<ul><li><h2 style="text-align:center">a</h2></li><li>b</li></ul>')).toBe(
      '<ul><li><p style="text-align: center">a</p></li><li>b</li></ul>',
    );
    expect(paste('<ul><li><p>a</p><h2>b</h2></li></ul>')).toBe(
      '<ul><li><p>a</p><h2>b</h2></li></ul>',
    );
  });
});

describe('paste of table column widths', () => {
  const table = (head: string, rows: string) => `<table>${head}<tbody>${rows}</tbody></table>`;
  const cols = (...widths: number[]) =>
    `<colgroup>${widths.map((width) => `<col style="width: ${width}px">`).join('')}</colgroup>`;

  it.each([
    ['<col width="200"><col width="100">', '<tr><td>a</td><td>b</td></tr>'],
    [
      '<colgroup><col width="200px"><col style="width:100px"></colgroup>',
      '<tr><td>a</td><td>b</td></tr>',
    ],
    ['<colgroup><col width="100" span="2"></colgroup>', '<tr><td>a</td><td>b</td></tr>'],
    ['', '<tr><td width="200">a</td><td style="width:100px">b</td></tr>'],
    ['', '<tr><td width="200.4">a</td><td width="100">b</td></tr>'],
  ])('reads %s %s', (head, rows) => {
    const widths = head.includes('span') ? [100, 100] : [200, 100];
    expect(paste(table(head, rows))).toBe(
      `<table>${cols(...widths)}<tbody><tr><td data-colwidth="${widths[0]}">a</td>` +
        `<td data-colwidth="${widths[1]}">b</td></tr></tbody></table>`,
    );
  });

  it('gives a cell the widths of every column it spans, skipping rowspans from above', () => {
    expect(
      paste(
        table(
          '<colgroup><col width="50"><col width="60"><col width="70"></colgroup>',
          '<tr><td rowspan="2">a</td><td colspan="2">b</td></tr><tr><td>c</td><td>d</td></tr>',
        ),
      ),
    ).toBe(
      `<table>${cols(50, 60, 70)}<tbody><tr><td rowspan="2" data-colwidth="50">a</td>` +
        '<td colspan="2" data-colwidth="60,70">b</td></tr>' +
        '<tr><td data-colwidth="60">c</td><td data-colwidth="70">d</td></tr></tbody></table>',
    );
  });

  it('leaves the columns without a pixel width fluid', () => {
    expect(paste(table('<col width="50%"><col width="80">', '<tr><td>a</td><td>b</td></tr>'))).toBe(
      '<table><colgroup><col><col style="width: 80px"></colgroup><tbody><tr><td>a</td>' +
        '<td data-colwidth="80">b</td></tr></tbody></table>',
    );
    expect(paste(table('', '<tr><td style="width:3em">a</td></tr>'))).toBe(
      '<table><tbody><tr><td>a</td></tr></tbody></table>',
    );
  });

  it('keeps the widths of a table that has data-colwidth', () => {
    expect(paste(table('<col width="300">', '<tr><td data-colwidth="90">a</td></tr>'))).toBe(
      `<table>${cols(90)}<tbody><tr><td data-colwidth="90">a</td></tr></tbody></table>`,
    );
  });
});
