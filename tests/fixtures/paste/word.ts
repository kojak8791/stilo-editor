/**
 * HTML that Microsoft Word for Windows puts on the clipboard: Office namespaces, class styles in
 * the head, `<o:p>` paragraph ends, list paragraphs with their marker in a `mso-list: Ignore`
 * span between `<![if !supportLists]>` and `<![endif]>`.
 */

const HEAD =
  '<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" ' +
  'xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head>' +
  '<meta http-equiv=Content-Type content="text/html; charset=utf-8">' +
  '<meta name=ProgId content=Word.Document><meta name=Generator content="Microsoft Word 15">' +
  '<style><!-- p.MsoNormal {margin:0cm; line-height:107%; font-size:11.0pt; ' +
  'font-family:"Calibri",sans-serif;} --></style></head>' +
  "<body lang=IT style='tab-interval:35.4pt;word-wrap:break-word'><!--StartFragment-->";

const FONT = 'font-size:12.0pt;line-height:107%;font-family:"Times New Roman",serif';

function text(content: string, extra = ''): string {
  return `<span lang=EN-US style='${FONT}${extra}'>${content}</span>`;
}

function listItem(list: string, level: number, marker: string, content: string): string {
  return (
    `<p class=MsoListParagraphCxSpMiddle style='margin-left:${18 * level}.0pt;` +
    `mso-add-space:auto;text-indent:-18.0pt;mso-list:${list} level${level} lfo1'>` +
    "<![if !supportLists]><span style='font-family:Symbol;mso-fareast-font-family:Symbol'>" +
    `<span style='mso-list:Ignore'>${marker}<span style='font:7.0pt "Times New Roman"'>` +
    '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]>' +
    `${text(content)}<o:p></o:p></p>`
  );
}

/** Heading, formatted runs, an empty paragraph, a nested bullet list, a numbered list, a table. */
export const WORD_HTML =
  HEAD +
  `<h1><span lang=EN-US>Title<o:p></o:p></span></h1>` +
  `<p class=MsoNormal>${text('Plain text, ')}<b>${text('bold')}</b>${text(', ')}` +
  `<i>${text('italic')}</i>${text(' and ')}${text('red', ';color:red')}${text('.')}<o:p></o:p></p>` +
  '<p class=MsoNormal><o:p>&nbsp;</o:p></p>' +
  listItem('l0', 1, '·', 'One') +
  listItem('l0', 2, 'o', 'Nested') +
  listItem('l0', 1, '·', 'Two') +
  `<p class=MsoNormal>${text('Between the lists')}<o:p></o:p></p>` +
  listItem('l1', 1, '3.', 'Three') +
  listItem('l1', 1, '4.', 'Four') +
  "<table class=MsoTableGrid border=1 cellspacing=0 cellpadding=0 style='border-collapse:collapse;border:none'>" +
  "<tr><td width=200 valign=top style='width:150.0pt;border:solid windowtext 1.0pt;padding:0cm 5.4pt'>" +
  `<p class=MsoNormal>${text('A1')}<o:p></o:p></p></td>` +
  "<td width=120 valign=top style='width:90.0pt;border:solid windowtext 1.0pt;padding:0cm 5.4pt'>" +
  `<p class=MsoNormal>${text('B1')}<o:p></o:p></p></td></tr></table>` +
  '<!--EndFragment--></body></html>';
