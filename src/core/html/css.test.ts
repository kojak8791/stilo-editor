import { describe, expect, it } from 'vitest';
import {
  buildStyle,
  normalizeColor,
  normalizeFontFamily,
  normalizeFontSize,
  normalizeStyleValue,
  normalizeTextAlign,
  parseStyle,
  readStyle,
  sanitizeStyle,
} from './css';

function entries(style: string): [string, string][] {
  return [...parseStyle(style).entries()];
}

describe('parseStyle', () => {
  it('parses declarations into property/value pairs', () => {
    expect(entries('color: red; font-size: 12px')).toEqual([
      ['color', 'red'],
      ['font-size', '12px'],
    ]);
  });

  it('accepts a trailing semicolon and missing spaces', () => {
    expect(entries('color:red;font-size:12px;')).toEqual([
      ['color', 'red'],
      ['font-size', '12px'],
    ]);
  });

  it('lowercases and trims properties, trims values without changing their case', () => {
    expect(entries('  COLOR :  Red  ')).toEqual([['color', 'Red']]);
  });

  it('removes !important', () => {
    expect(entries('color: red !important; font-size: 12px!important')).toEqual([
      ['color', 'red'],
      ['font-size', '12px'],
    ]);
  });

  it('splits property and value on the first colon only', () => {
    expect(entries('font-family: a:b')).toEqual([['font-family', 'a:b']]);
  });

  it('skips declarations without a colon or with an empty property or value', () => {
    expect(entries('color; : red; font-size: ; font-family: Arial')).toEqual([
      ['font-family', 'Arial'],
    ]);
  });

  it('keeps the last value when a property appears twice', () => {
    expect(parseStyle('color: red; color: blue').get('color')).toBe('blue');
    expect(parseStyle('color: red; color: blue').size).toBe(1);
  });

  it('returns an empty map for empty input', () => {
    expect(parseStyle('').size).toBe(0);
    expect(parseStyle(' ; ;; ').size).toBe(0);
  });
});

describe('normalizeColor', () => {
  it.each([
    ['#abc', '#aabbcc'],
    ['#ABC', '#aabbcc'],
    ['#AbCdEf', '#abcdef'],
    ['  #fff  ', '#ffffff'],
    ['#123456', '#123456'],
  ])('normalizes hex %s → %s', (input, expected) => {
    expect(normalizeColor(input)).toBe(expected);
  });

  it.each(['#abcd', '#ggg', '#abcdefa', '#12345', '#'])('rejects invalid hex %s', (input) => {
    expect(normalizeColor(input)).toBeNull();
  });

  it.each([
    ['rgb(255, 0, 0)', '#ff0000'],
    ['rgb(255,0,0)', '#ff0000'],
    ['RGB( 0 , 128 , 255 )', '#0080ff'],
    ['rgb(1, 2, 3)', '#010203'],
  ])('converts %s → %s', (input, expected) => {
    expect(normalizeColor(input)).toBe(expected);
  });

  it.each([
    'rgb(256, 0, 0)',
    'rgb(1, 2)',
    'rgb(1, 2, 3, 4)',
    'rgb(100%, 0%, 0%)',
    'rgb(1.5, 2, 3)',
    'rgb(-1, 2, 3)',
  ])('rejects %s', (input) => {
    expect(normalizeColor(input)).toBeNull();
  });

  it.each([
    ['rgba(10, 20, 30, 1)', '#0a141e'],
    ['rgba(10,20,30,1.0)', '#0a141e'],
    ['rgba(10, 20, 30, 100%)', '#0a141e'],
  ])('converts opaque %s → %s', (input, expected) => {
    expect(normalizeColor(input)).toBe(expected);
  });

  it.each([
    ['rgba(10,20,30,0.5)', 'rgba(10, 20, 30, 0.5)'],
    ['RGBA( 10 , 20 , 30 , 0.12345 )', 'rgba(10, 20, 30, 0.123)'],
    ['rgba(10, 20, 30, 0)', 'rgba(10, 20, 30, 0)'],
    ['rgba(10, 20, 30, 50%)', 'rgba(10, 20, 30, 0.5)'],
    ['rgba(0, 0, 0, 0.25)', 'rgba(0, 0, 0, 0.25)'],
  ])('keeps translucent %s → %s', (input, expected) => {
    expect(normalizeColor(input)).toBe(expected);
  });

  it.each([
    'rgba(10, 20, 30, 1.5)',
    'rgba(10, 20, 30, 101%)',
    'rgba(10, 20, 30, -0.1)',
    'rgba(10, 20, 30)',
    'rgba(300, 20, 30, 0.5)',
  ])('rejects %s', (input) => {
    expect(normalizeColor(input)).toBeNull();
  });

  it.each([
    ['red', 'red'],
    ['Red', 'red'],
    ['transparent', 'transparent'],
    [' BLUE ', 'blue'],
  ])('keeps keyword %s → %s', (input, expected) => {
    expect(normalizeColor(input)).toBe(expected);
  });

  it.each([
    'inherit',
    'initial',
    'unset',
    'revert',
    'currentColor',
    'ab',
    'red-ish',
    'abcdefghijklmnopqrstu',
    'hsl(0, 0%, 0%)',
    '',
  ])('rejects %s', (input) => {
    expect(normalizeColor(input)).toBeNull();
  });
});

describe('normalizeFontSize', () => {
  it.each([
    ['12px', '12px'],
    ['12PT', '12pt'],
    [' 1.5em ', '1.5em'],
    ['2rem', '2rem'],
    ['100%', '100%'],
  ])('accepts %s → %s', (input, expected) => {
    expect(normalizeFontSize(input)).toBe(expected);
  });

  it.each(['12', '12 px', '.5em', '-1px', '12vh', '1.em', 'large', ''])('rejects %s', (input) => {
    expect(normalizeFontSize(input)).toBeNull();
  });
});

describe('normalizeFontFamily', () => {
  it.each([
    ['"Times New Roman" ,serif', "'Times New Roman', serif"],
    ['Arial', 'Arial'],
    ["'Open Sans'", "'Open Sans'"],
    ['  Comic   Sans  MS , cursive', "'Comic Sans MS', cursive"],
    ['"Times   New Roman"', "'Times New Roman'"],
    ['Arial, , sans-serif', 'Arial, sans-serif'],
    ['Noto_Sans', "'Noto_Sans'"],
    ['Helvetica-Neue,Arial', 'Helvetica-Neue, Arial'],
  ])('normalizes %s → %s', (input, expected) => {
    expect(normalizeFontFamily(input)).toBe(expected);
  });

  it.each([
    ['Font"Evil, Arial', 'Arial'],
    ["Font'Evil, Arial", 'Arial'],
    ['a<b, serif', 'serif'],
    ['a>b, serif', 'serif'],
    ['x;y, serif', 'serif'],
  ])('drops unsafe names: %s → %s', (input, expected) => {
    expect(normalizeFontFamily(input)).toBe(expected);
  });

  it.each(['', '  ', ',', '"", \'\'', 'a<b'])('returns null when no name remains: %s', (input) => {
    expect(normalizeFontFamily(input)).toBeNull();
  });
});

describe('normalizeTextAlign', () => {
  it.each([
    ['left', 'left'],
    ['center', 'center'],
    ['RIGHT', 'right'],
    [' justify ', 'justify'],
    ['start', 'left'],
  ])('accepts %s → %s', (input, expected) => {
    expect(normalizeTextAlign(input)).toBe(expected);
  });

  it.each(['end', 'middle', 'inherit', ''])('rejects %s', (input) => {
    expect(normalizeTextAlign(input)).toBeNull();
  });
});

describe('normalizeStyleValue', () => {
  it('dispatches to the normalizer of each property', () => {
    expect(normalizeStyleValue('color', 'RGB(255,0,0)')).toBe('#ff0000');
    expect(normalizeStyleValue('background-color', '#FFF')).toBe('#ffffff');
    expect(normalizeStyleValue('font-size', '12PT')).toBe('12pt');
    expect(normalizeStyleValue('font-family', '"Times New Roman",serif')).toBe(
      "'Times New Roman', serif",
    );
    expect(normalizeStyleValue('text-align', 'start')).toBe('left');
  });

  it('returns null when the normalizer rejects the value', () => {
    expect(normalizeStyleValue('font-size', 'big')).toBeNull();
    expect(normalizeStyleValue('color', 'inherit')).toBeNull();
    expect(normalizeStyleValue('text-align', 'end')).toBeNull();
  });

  it.each([
    ['font-family', 'url(evil.woff)'],
    ['font-family', 'URL (evil.woff)'],
    ['color', 'expression(alert(1))'],
    ['color', 'Expression (alert(1))'],
    ['font-family', 'javascript:alert(1)'],
    ['font-family', 'Arial<script>'],
    ['font-family', 'a\\b'],
    ['font-family', '{x}'],
  ] as const)('rejects unsafe value for %s: %s', (property, value) => {
    expect(normalizeStyleValue(property, value)).toBeNull();
  });
});

describe('buildStyle', () => {
  it('builds the documented example', () => {
    expect(buildStyle({ color: 'RGB(255,0,0)', 'font-size': '12PT' })).toBe(
      'font-size: 12pt; color: #ff0000',
    );
  });

  it('outputs properties in the canonical order regardless of input order', () => {
    expect(
      buildStyle({
        'text-align': 'center',
        'background-color': 'yellow',
        color: '#F00',
        'font-size': '10px',
        'font-family': '"Times New Roman", serif',
      }),
    ).toBe(
      "font-family: 'Times New Roman', serif; font-size: 10px; color: #ff0000; " +
        'background-color: yellow; text-align: center',
    );
  });

  it('skips invalid, null and undefined values', () => {
    expect(
      buildStyle({
        color: 'not-a-color',
        'font-size': '12px',
        'font-family': null,
        'text-align': undefined,
      }),
    ).toBe('font-size: 12px');
  });

  it('returns null when nothing remains', () => {
    expect(buildStyle({})).toBeNull();
    expect(buildStyle({ color: 'inherit' })).toBeNull();
    expect(buildStyle({ color: null, 'font-size': undefined })).toBeNull();
  });
});

describe('readStyle', () => {
  function span(style?: string): HTMLElement {
    const element = document.createElement('span');
    if (style !== undefined) {
      element.setAttribute('style', style);
    }
    return element;
  }

  it('reads and normalizes a property', () => {
    const element = span('COLOR: RGB(0,0,255); font-size: 10PX');
    expect(readStyle(element, 'color')).toBe('#0000ff');
    expect(readStyle(element, 'font-size')).toBe('10px');
  });

  it('returns null when the property is absent', () => {
    expect(readStyle(span('color: red'), 'font-family')).toBeNull();
  });

  it('returns null when there is no style attribute', () => {
    expect(readStyle(span(), 'color')).toBeNull();
  });

  it('returns null when the value is invalid', () => {
    expect(readStyle(span('font-size: huge'), 'font-size')).toBeNull();
  });
});

describe('sanitizeStyle', () => {
  it('puts output properties first, then input-only properties', () => {
    expect(sanitizeStyle('font-weight: bold; color: red')).toBe('color: red; font-weight: bold');
  });

  it('normalizes output properties and lowercases input-only values', () => {
    expect(
      sanitizeStyle(
        'TEXT-DECORATION: Underline; FONT-WEIGHT: 700; COLOR: #F00; position: absolute',
      ),
    ).toBe('color: #ff0000; font-weight: 700; text-decoration: underline');
  });

  it('orders input-only properties as declared', () => {
    expect(
      sanitizeStyle(
        'vertical-align: super; text-decoration-line: line-through; font-style: italic; font-weight: BOLD',
      ),
    ).toBe(
      'font-weight: bold; font-style: italic; text-decoration-line: line-through; vertical-align: super',
    );
  });

  it('keeps all output properties in canonical order', () => {
    expect(
      sanitizeStyle(
        "text-align: start; background-color: rgba(0,0,0,0.5); color: blue; font-size: 2EM; font-family: 'Open Sans'",
      ),
    ).toBe(
      "font-family: 'Open Sans'; font-size: 2em; color: blue; " +
        'background-color: rgba(0, 0, 0, 0.5); text-align: left',
    );
  });

  it('accepts input-only values made of the allowed characters', () => {
    expect(sanitizeStyle('text-decoration: underline solid rgb(0, 0, 0)')).toBe(
      'text-decoration: underline solid rgb(0, 0, 0)',
    );
  });

  it('removes !important through parseStyle', () => {
    expect(sanitizeStyle('font-style: italic; font-weight: bold!important')).toBe(
      'font-weight: bold; font-style: italic',
    );
  });

  it('drops invalid and unsafe values', () => {
    expect(sanitizeStyle('font-weight: url(x)')).toBeNull();
    expect(sanitizeStyle('font-weight: "bold"')).toBeNull();
    expect(sanitizeStyle('font-style: italic;x')).toBe('font-style: italic');
    expect(sanitizeStyle('color: inherit; font-size: big')).toBeNull();
  });

  it('drops properties outside the allowlists', () => {
    expect(sanitizeStyle('position: fixed; display: none')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(sanitizeStyle('')).toBeNull();
  });
});
