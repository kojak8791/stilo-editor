import { describe, expect, it } from 'vitest';
import { createTestEditor } from '../../../tests/helpers';
import { StarterKit } from '../starter-kit';
import { DropCursor } from '.';

describe('DropCursor: options', () => {
  it('defaults', () => {
    expect(DropCursor().options).toEqual({ color: 'currentColor', width: 1 });
  });

  it('custom options', () => {
    expect(DropCursor({ width: 2, class: 'x' }).options).toEqual({
      color: 'currentColor',
      width: 2,
      class: 'x',
    });
  });
});

describe('DropCursor: plugin count', () => {
  it('adds one plugin', () => {
    const withPlugin = createTestEditor().state.plugins.length;
    const without = createTestEditor({ extensions: [StarterKit({ dropCursor: false })] }).state
      .plugins.length;
    expect(withPlugin).toBe(without + 1);
  });
});
