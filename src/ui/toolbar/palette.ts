import type { MessageKey } from '../i18n/types';
import type { ToolbarColor } from './types';

/** One swatch of the default palette. */
function swatch(color: string, labelKey: MessageKey): ToolbarColor {
  return { color, labelKey };
}

/**
 * The default palette of the color buttons, 8 columns: grays, then 8 hues in their vivid, light
 * and dark shades.
 */
export const DEFAULT_PALETTE: readonly ToolbarColor[] = [
  swatch('#000000', 'color.black'),
  swatch('#404040', 'color.darkGray2'),
  swatch('#737373', 'color.darkGray1'),
  swatch('#a3a3a3', 'color.gray'),
  swatch('#d4d4d4', 'color.lightGray1'),
  swatch('#e5e5e5', 'color.lightGray2'),
  swatch('#f5f5f5', 'color.lightGray3'),
  swatch('#ffffff', 'color.white'),
  swatch('#ef4444', 'color.red'),
  swatch('#f97316', 'color.orange'),
  swatch('#eab308', 'color.yellow'),
  swatch('#22c55e', 'color.green'),
  swatch('#06b6d4', 'color.cyan'),
  swatch('#3b82f6', 'color.blue'),
  swatch('#a855f7', 'color.purple'),
  swatch('#ec4899', 'color.pink'),
  swatch('#fecaca', 'color.lightRed'),
  swatch('#fed7aa', 'color.lightOrange'),
  swatch('#fef08a', 'color.lightYellow'),
  swatch('#bbf7d0', 'color.lightGreen'),
  swatch('#a5f3fc', 'color.lightCyan'),
  swatch('#bfdbfe', 'color.lightBlue'),
  swatch('#e9d5ff', 'color.lightPurple'),
  swatch('#fbcfe8', 'color.lightPink'),
  swatch('#991b1b', 'color.darkRed'),
  swatch('#9a3412', 'color.darkOrange'),
  swatch('#854d0e', 'color.darkYellow'),
  swatch('#166534', 'color.darkGreen'),
  swatch('#155e75', 'color.darkCyan'),
  swatch('#1e40af', 'color.darkBlue'),
  swatch('#6b21a8', 'color.darkPurple'),
  swatch('#9d174d', 'color.darkPink'),
];
