/**
 * HTML that Google Docs puts on the clipboard (Chrome): every run of text in a span with the
 * document's base style, the whole selection in a `<b style="font-weight:normal">` wrapper.
 */

const RUN =
  'font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;' +
  'font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;' +
  'vertical-align:baseline;white-space:pre;white-space:pre-wrap;';
const P = 'line-height:1.38;margin-top:0pt;margin-bottom:0pt;';

function run(text: string, style = RUN): string {
  return `<span style="${style}">${text}</span>`;
}

function item(level: number, content: string): string {
  return (
    `<li dir="ltr" style="list-style-type:disc;font-size:11pt;font-family:Arial,sans-serif;` +
    `color:#000000;background-color:transparent;font-weight:400;font-style:normal;` +
    `font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;` +
    `" aria-level="${level}">${content}</li>`
  );
}

const UL = '<ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;">';

/** Heading, formatted runs, an empty paragraph, a nested list with a heading item, a table. */
export const GOOGLE_DOCS_HTML =
  '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-6f2c1a7e-7fff-1b2c-3d4e-5f6a7b8c9d0e">' +
  `<h1 dir="ltr" style="line-height:1.38;margin-top:20pt;margin-bottom:6pt;">` +
  run('Title', RUN.replace('11pt', '20pt')) +
  '</h1>' +
  `<p dir="ltr" style="${P}">` +
  run('Plain text, ') +
  run('bold', RUN.replace('font-weight:400', 'font-weight:700')) +
  run(', ') +
  run('italic', RUN.replace('font-style:normal', 'font-style:italic')) +
  run(', ') +
  run('underlined', RUN.replace('text-decoration:none', 'text-decoration:underline')) +
  run(', ') +
  run('red', RUN.replace('#000000', '#ff0000')) +
  run(', ') +
  run('14 pt', RUN.replace('11pt', '14pt')) +
  run(' and ') +
  run('Georgia', RUN.replace('Arial', 'Georgia')) +
  run('.') +
  '</p><br>' +
  `<p dir="ltr" style="line-height:1.38;text-align:center;margin-top:0pt;margin-bottom:0pt;">` +
  run('Centered') +
  '</p>' +
  UL +
  item(1, `<p dir="ltr" style="${P}" role="presentation">${run('One')}</p>`) +
  UL +
  item(2, `<p dir="ltr" style="${P}" role="presentation">${run('Nested')}</p>`) +
  '</ul>' +
  item(
    1,
    `<h2 dir="ltr" style="line-height:1.38;margin-top:18pt;margin-bottom:6pt;" role="presentation">` +
      `${run('Heading item', RUN.replace('11pt', '16pt'))}</h2>`,
  ) +
  '</ul>' +
  '<div dir="ltr" style="margin-left:0pt;" align="left"><table style="border:none;border-collapse:collapse;">' +
  '<colgroup><col width="200"><col width="120"></colgroup><tbody><tr style="height:0pt">' +
  `<td style="border-left:solid #000000 1pt;padding:5pt 5pt 5pt 5pt;"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;">${run('A1')}</p></td>` +
  `<td style="border-left:solid #000000 1pt;padding:5pt 5pt 5pt 5pt;"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;">${run('B1')}</p></td>` +
  '</tr></tbody></table></div></b>';
