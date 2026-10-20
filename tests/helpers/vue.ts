import { createApp, nextTick, type VNodeChild } from 'vue';

/** A Vue app mounted in its own container, appended to `document.body`. */
export interface Mounted {
  container: HTMLElement;
  unmount(): void;
}

/**
 * Mounts an app that renders `render()` and waits a tick, so that the watchers which create the
 * editor have run on return. Change reactive state read by `render`, then `await nextTick()`.
 */
export async function mount(render: () => VNodeChild): Promise<Mounted> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const app = createApp({ render });
  app.mount(container);
  await nextTick();
  return {
    container,
    unmount: () => {
      app.unmount();
      container.remove();
    },
  };
}
