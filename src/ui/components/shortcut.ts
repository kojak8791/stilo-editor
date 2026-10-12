/** Whether the platform shows Mac shortcuts. */
export function isMacPlatform(): boolean {
  return /Mac|iPhone|iPad/.test(navigator.platform);
}

/**
 * Formats a keymap shortcut for display.
 *
 * Off Mac: `Mod` means `Ctrl`; modifiers in the order `Ctrl`, `Alt`, `Shift`, then the key,
 * joined with `+`. On Mac: `Ctrl` → `⌃`, `Alt` → `⌥`, `Shift` → `⇧`, `Mod` → `⌘`, in the
 * order `⌃⌥⇧⌘`, then the key, no separator. A single-character key is uppercased; longer
 * keys stay as written.
 */
export function formatShortcut(shortcut: string, mac: boolean): string {
  const parts = shortcut.split('-');
  const key = parts.pop()!;
  const modifiers: string[] = [];

  if (mac) {
    if (parts.includes('Ctrl')) modifiers.push('\u2303');
    if (parts.includes('Alt')) modifiers.push('\u2325');
    if (parts.includes('Shift')) modifiers.push('\u21E7');
    if (parts.includes('Mod')) modifiers.push('\u2318');
    return modifiers.join('') + (key.length === 1 ? key.toUpperCase() : key);
  }

  // Non-Mac: order Ctrl, Alt, Shift
  const hasMod = parts.includes('Mod');
  const hasCtrl = parts.includes('Ctrl');
  if (hasCtrl || (hasMod && !hasCtrl)) modifiers.push('Ctrl');
  if (parts.includes('Alt')) modifiers.push('Alt');
  if (parts.includes('Shift')) modifiers.push('Shift');
  return (
    modifiers.join('+') +
    (modifiers.length > 0 ? '+' : '') +
    (key.length === 1 ? key.toUpperCase() : key)
  );
}
