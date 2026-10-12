import type { VirtualElement } from '@floating-ui/dom';
import type { Editor } from '../../index';
import type { Messages } from '../i18n/types';
import { createPopover } from './popover';

/** Options of {@link createLinkPopover}. */
export interface LinkPopoverOptions {
  /** Inside the UI root, so that `--stilo-*` custom properties are inherited. */
  container: HTMLElement;
  messages: Messages;
}

/** The link popover: adds, edits or removes the link of the selection. */
export interface LinkPopover {
  readonly isOpen: boolean;
  /** Opens the popover under the selection; does nothing when {@link canEditLink} is false. */
  open(): void;
  close(): void;
  destroy(): void;
}

/** Any allowed URL: asks `can().setLink()` whether the selection can take a link. */
const PROBE_HREF = 'https://example.com';

/** Whether the selection is in a link or can be linked (a cursor outside a link cannot). */
export function canEditLink(editor: Editor): boolean {
  return editor.isActive('link') || editor.can().setLink({ href: PROBE_HREF });
}

/** Creates the link popover (closed), anchored to the selection of `editor`. */
export function createLinkPopover(editor: Editor, options: LinkPopoverOptions): LinkPopover {
  const { container, messages } = options;

  const anchor: VirtualElement = {
    contextElement: editor.view.dom,
    getBoundingClientRect: () => {
      const { from, to } = editor.state.selection;
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      const left = Math.min(start.left, end.left);
      const right = Math.max(start.right, end.right);
      const { top } = start;
      const { bottom } = end;
      return {
        x: left,
        y: top,
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top,
      };
    },
  };

  const content = document.createElement('div');
  content.className = 'stilo-link-popover';
  content.setAttribute('role', 'dialog');
  content.setAttribute('aria-label', messages['toolbar.link']);

  const form = document.createElement('form');
  form.className = 'stilo-link-popover__form';

  const url = document.createElement('input');
  url.type = 'text';
  url.inputMode = 'url';
  url.className = 'stilo-link-popover__url';
  url.placeholder = 'https://';
  url.autocomplete = 'off';
  url.spellcheck = false;
  url.setAttribute('aria-label', messages['link.url']);

  const newTabLabel = document.createElement('label');
  newTabLabel.className = 'stilo-link-popover__new-tab';
  const newTab = document.createElement('input');
  newTab.type = 'checkbox';
  newTabLabel.append(newTab, messages['link.newTab']);

  const actions = document.createElement('div');
  actions.className = 'stilo-link-popover__actions';
  const apply = createButton('submit', messages['link.apply']);
  apply.classList.add('stilo-link-popover__button--primary');
  const remove = createButton('button', messages['link.remove']);
  actions.append(apply, remove);

  form.append(url, newTabLabel, actions);
  content.append(form);

  const popover = createPopover({
    anchor,
    content,
    container,
    onClose: (reason) => {
      if (reason === 'escape') editor.focus();
    },
  });

  function finish(): void {
    popover.close();
    editor.focus();
  }

  // An empty URL removes the link; a URL the Link extension refuses keeps the popover open.
  const onSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    const href = url.value.trim();
    const done = href
      ? editor.commands.setLink({ href, target: newTab.checked ? '_blank' : null })
      : !editor.isActive('link') || editor.commands.unsetLink();
    if (!done) {
      url.setAttribute('aria-invalid', 'true');
      url.focus();
      return;
    }
    finish();
  };

  const onRemove = (): void => {
    editor.commands.unsetLink();
    finish();
  };

  const onInput = (): void => {
    url.removeAttribute('aria-invalid');
  };

  form.addEventListener('submit', onSubmit);
  remove.addEventListener('click', onRemove);
  url.addEventListener('input', onInput);

  function open(): void {
    if (popover.isOpen || !canEditLink(editor)) return;
    const { href, target } = editor.getAttributes('link');
    url.value = typeof href === 'string' ? href : '';
    url.removeAttribute('aria-invalid');
    newTab.checked = target === '_blank';
    remove.hidden = !editor.isActive('link');
    popover.open();
    url.focus();
    url.select();
  }

  function destroy(): void {
    form.removeEventListener('submit', onSubmit);
    remove.removeEventListener('click', onRemove);
    url.removeEventListener('input', onInput);
    popover.destroy();
  }

  return {
    get isOpen() {
      return popover.isOpen;
    },
    open,
    close: () => popover.close(),
    destroy,
  };
}

function createButton(type: 'submit' | 'button', label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = type;
  button.className = 'stilo-link-popover__button';
  button.textContent = label;
  return button;
}
