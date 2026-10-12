import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPopover, type PopoverCloseReason, type PopoverOptions } from './popover';

function setup(overrides: Partial<PopoverOptions> = {}) {
  const container = document.createElement('div');
  const anchor = document.createElement('button');
  const content = document.createElement('div');
  const outside = document.createElement('p');
  document.body.append(container, anchor, outside);
  const reasons: PopoverCloseReason[] = [];
  const popover = createPopover({
    anchor,
    content,
    container,
    onClose: (reason) => reasons.push(reason),
    ...overrides,
  });
  return { container, anchor, content, outside, reasons, popover };
}

function pointerDown(target: Element): void {
  target.dispatchEvent(new Event('pointerdown', { bubbles: true }));
}

function pressEscape(target: Element): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('createPopover', () => {
  it('is created closed, inside the container', () => {
    const { container, content, popover } = setup();
    expect(popover.isOpen).toBe(false);
    expect(content.parentElement).toBe(container);
    expect(content.classList.contains('stilo-popover')).toBe(true);
    expect(content.hidden).toBe(true);
  });

  it('opens and writes its position in px', async () => {
    const { content, popover } = setup();
    popover.open();
    expect(popover.isOpen).toBe(true);
    expect(content.hidden).toBe(false);
    await vi.waitFor(() => {
      expect(content.style.left).toMatch(/^-?[\d.]+px$/);
      expect(content.style.top).toMatch(/^-?[\d.]+px$/);
    });
  });

  it('closes on Escape and on pointer down outside, not inside', () => {
    const { anchor, content, outside, reasons, popover } = setup();
    popover.open();
    pointerDown(content);
    pointerDown(anchor);
    expect(popover.isOpen).toBe(true);
    pressEscape(content);
    expect(popover.isOpen).toBe(false);
    expect(content.hidden).toBe(true);

    popover.open();
    pointerDown(outside);
    expect(popover.isOpen).toBe(false);
    expect(reasons).toEqual(['escape', 'outside']);
  });

  it('close() reports api once; listeners are removed when closed', () => {
    const { outside, reasons, popover } = setup();
    popover.open();
    popover.open();
    popover.close();
    popover.close();
    pressEscape(outside);
    pointerDown(outside);
    expect(reasons).toEqual(['api']);
  });

  it('destroy() closes and removes the content; a second call does nothing', () => {
    const { container, reasons, popover } = setup();
    popover.open();
    popover.destroy();
    popover.destroy();
    expect(container.childElementCount).toBe(0);
    expect(popover.isOpen).toBe(false);
    expect(reasons).toEqual(['api']);
  });

  it('accepts a virtual anchor', () => {
    const rect = { x: 10, y: 20, width: 0, height: 16, top: 20, left: 10, right: 10, bottom: 36 };
    const anchor = { getBoundingClientRect: () => rect };
    const { outside, reasons, popover } = setup({ anchor });
    popover.open();
    expect(popover.isOpen).toBe(true);
    pointerDown(outside);
    expect(reasons).toEqual(['outside']);
  });
});
