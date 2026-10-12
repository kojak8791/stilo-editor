import type { Placement, VirtualElement } from '@floating-ui/dom';
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';

/** Why a popover closed. `api` = `close()` or `destroy()` was called. */
export type PopoverCloseReason = 'escape' | 'outside' | 'api';

export interface PopoverOptions {
  /** What the popover is anchored to: an element, or a rectangle (e.g. the selection). */
  anchor: Element | VirtualElement;
  /** The floating element; the popover appends it to `container`. */
  content: HTMLElement;
  /**
   * The element the popover scrolls with: it gets the class `stilo-popover-host`
   * (`position: relative`), so the browser moves the popover with it on scroll.
   */
  container: HTMLElement;
  /** Default: 'bottom-start'. */
  placement?: Placement;
  /** Distance from the anchor in px. Default: 4. */
  offset?: number;
  /** Called on every open → closed transition. */
  onClose?(reason: PopoverCloseReason): void;
}

export interface Popover {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  destroy(): void;
}

export function createPopover(options: PopoverOptions): Popover {
  const {
    anchor,
    content,
    container,
    placement = 'bottom-start',
    offset: offsetValue = 4,
    onClose,
  } = options;

  let isDestroyed = false;
  let isOpen = false;
  let stopAutoUpdate: (() => void) | undefined;
  let positionGeneration = 0;

  // Initial state: closed
  content.classList.add('stilo-popover');
  content.setAttribute('hidden', '');
  container.classList.add('stilo-popover-host');
  container.appendChild(content);

  function position(): void {
    // Ignore results that arrive after the popover closed
    const gen = ++positionGeneration;
    Promise.resolve(
      computePosition(anchor, content, {
        strategy: 'absolute',
        placement,
        middleware: [offset(offsetValue), flip(), shift({ padding: 8 })],
      }).then((coords) => {
        if (isDestroyed || positionGeneration !== gen) return;
        content.style.left = `${coords.x}px`;
        content.style.top = `${coords.y}px`;
      }),
    );
  }

  function open(): void {
    if (isOpen || isDestroyed) return;
    isOpen = true;
    content.removeAttribute('hidden');

    stopAutoUpdate = autoUpdate(anchor, content, () => {
      if (isOpen) position();
    });

    // Listen for outside pointer down (capture)
    document.addEventListener('pointerdown', onOutsidePointerDown, true);
    // Listen for Escape (capture)
    document.addEventListener('keydown', onEscape, true);
  }

  function close(reason: PopoverCloseReason = 'api'): void {
    if (!isOpen || isDestroyed) return;
    isOpen = false;
    content.setAttribute('hidden', '');
    stopAutoUpdate?.();
    stopAutoUpdate = undefined;
    document.removeEventListener('pointerdown', onOutsidePointerDown, true);
    document.removeEventListener('keydown', onEscape, true);
    onClose?.(reason);
  }

  function destroy(): void {
    if (isDestroyed) return;
    isDestroyed = true;
    if (isOpen) {
      isOpen = false;
      content.setAttribute('hidden', '');
      stopAutoUpdate?.();
      stopAutoUpdate = undefined;
      document.removeEventListener('pointerdown', onOutsidePointerDown, true);
      document.removeEventListener('keydown', onEscape, true);
      onClose?.('api');
    }
    if (container.contains(content)) {
      container.removeChild(content);
    }
    if (!container.querySelector(':scope > .stilo-popover')) {
      container.classList.remove('stilo-popover-host');
    }
  }

  function onOutsidePointerDown(e: PointerEvent): void {
    if (!isOpen || isDestroyed) return;
    const target = e.target as Node;
    // Check if target is inside content
    if (content.contains(target)) return;
    // Check if target is inside the anchor (when it's an element)
    if (typeof anchor === 'object' && 'nodeType' in anchor && anchor.nodeType === 1) {
      if (anchor.contains(target)) return;
    }
    close('outside');
  }

  function onEscape(e: KeyboardEvent): void {
    if (!isOpen || isDestroyed) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close('escape');
    }
  }

  return {
    get isOpen() {
      return isOpen;
    },
    open,
    close,
    destroy,
  };
}
