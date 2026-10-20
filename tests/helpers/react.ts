import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** A React tree rendered in its own container, appended to `document.body`. */
export interface Rendered {
  container: HTMLElement;
  rerender(node: ReactNode): void;
  unmount(): void;
}

/** Renders `node` with `createRoot` inside `act`, so that the effects have run on return. */
export function render(node: ReactNode): Rendered {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => root.render(node));
  return {
    container,
    rerender: (next) => act(() => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}
