import { type Component, flushSync, mount, unmount } from 'svelte';

/** A Svelte component mounted in its own container, appended to `document.body`. */
export interface Mounted {
  container: HTMLElement;
  unmount(): void;
}

/**
 * Mounts `component` with `props` and flushes its effects, so that its actions have run and the
 * editor exists on return. Change `$state` read by the props, then call `flushSync()`.
 */
export function render<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
): Mounted {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const instance = mount(component, { target: container, props });
  flushSync();
  return {
    container,
    unmount: () => {
      // Without outro transitions, unmount removes the component synchronously.
      void unmount(instance);
      container.remove();
    },
  };
}
