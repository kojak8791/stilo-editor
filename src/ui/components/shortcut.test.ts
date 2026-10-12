import { describe, expect, it, vi } from 'vitest';
import { formatShortcut, isMacPlatform } from './shortcut';

const cases: ReadonlyArray<[shortcut: string, pc: string, mac: string]> = [
  ['Mod-b', 'Ctrl+B', '⌘B'],
  ['Mod-Shift-z', 'Ctrl+Shift+Z', '⇧⌘Z'],
  ['Mod-Alt-1', 'Ctrl+Alt+1', '⌥⌘1'],
  ['Mod-Shift-8', 'Ctrl+Shift+8', '⇧⌘8'],
  ['Mod-\\', 'Ctrl+\\', '⌘\\'],
  ['Shift-Enter', 'Shift+Enter', '⇧Enter'],
  ['Alt-F10', 'Alt+F10', '⌥F10'],
  ['Shift-Alt-Mod-k', 'Ctrl+Alt+Shift+K', '⌥⇧⌘K'],
  ['Ctrl-Shift-a', 'Ctrl+Shift+A', '⌃⇧A'],
  ['Mod-Ctrl-a', 'Ctrl+A', '⌃⌘A'],
  ['Escape', 'Escape', 'Escape'],
];

describe('formatShortcut', () => {
  it.each(cases)('PC: %s → %s', (shortcut, pc) => {
    expect(formatShortcut(shortcut, false)).toBe(pc);
  });

  it.each(cases)('Mac: %s → %s', (shortcut, _pc, mac) => {
    expect(formatShortcut(shortcut, true)).toBe(mac);
  });
});

describe('isMacPlatform', () => {
  it('returns true for MacIntel', () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    expect(isMacPlatform()).toBe(true);
  });

  it('returns true for iPhone', () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('iPhone');
    expect(isMacPlatform()).toBe(true);
  });

  it('returns false for Win32', () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');
    expect(isMacPlatform()).toBe(false);
  });

  it('returns false for empty string', () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('');
    expect(isMacPlatform()).toBe(false);
  });
});
