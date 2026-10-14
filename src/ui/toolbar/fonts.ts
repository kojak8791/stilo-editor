import type { ToolbarFont } from './types';

/**
 * The default fonts of the font family dropdown: the three generic families, which every system
 * resolves, then common fonts with fallbacks for the systems that lack them.
 */
export const DEFAULT_FONTS: readonly ToolbarFont[] = [
  { fontFamily: 'sans-serif', labelKey: 'font.sansSerif' },
  { fontFamily: 'serif', labelKey: 'font.serif' },
  { fontFamily: 'monospace', labelKey: 'font.monospace' },
  { fontFamily: 'Arial, Helvetica, sans-serif', labelKey: 'Arial' },
  { fontFamily: 'Verdana, Geneva, sans-serif', labelKey: 'Verdana' },
  { fontFamily: 'Tahoma, Geneva, sans-serif', labelKey: 'Tahoma' },
  { fontFamily: "'Trebuchet MS', Helvetica, sans-serif", labelKey: 'Trebuchet MS' },
  { fontFamily: 'Georgia, serif', labelKey: 'Georgia' },
  { fontFamily: "'Times New Roman', Times, serif", labelKey: 'Times New Roman' },
  { fontFamily: "'Courier New', Courier, monospace", labelKey: 'Courier New' },
];

/** The default sizes of the font size list, by unit (`rem` uses the px list). */
export const DEFAULT_FONT_SIZES: Readonly<Record<'pt' | 'px', readonly number[]>> = {
  pt: [8, 9, 10, 11, 12, 14, 18, 24, 36, 48, 72],
  px: [10, 12, 14, 16, 18, 20, 24, 32, 48, 64, 96],
};
