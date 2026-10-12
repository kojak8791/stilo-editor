import type { VirtualElement } from '@floating-ui/dom';
import { ExternalLink, Pencil, Unlink } from 'lucide';
import type { Editor } from '../../index';
import type { Messages } from '../i18n/types';
import { createIcon } from './icon';
import { createPopover } from './popover';

/** Options of {@link createLinkBubble}. */
export interface LinkBubbleOptions {
  /** The element the bubble scrolls with: the parent of the editable element. */
  container: HTMLElement;
  messages: Messages;
  /** Called by the edit button (the toolbar opens the link popover). */
  onEdit(): void;
}

/** The link bubble: shown under the link at the cursor while the editor has the focus. */
export interface LinkBubble {
  readonly isOpen: boolean;
  /** Shows, moves or hides the bubble after the selection or the focus changed. */
  update(): void;
  destroy(): void;
}

/** Creates the link bubble, which follows the editor on its own. */
export function createLinkBubble(editor: Editor, options: LinkBubbleOptions): LinkBubble {
  const { container, messages, onEdit } = options;
  let link: HTMLAnchorElement | null = null;

  const anchor: VirtualElement = {
    contextElement: editor.view.dom,
    getBoundingClientRect: () => (link ?? editor.view.dom).getBoundingClientRect(),
  };

  const content = document.createElement('div');
  content.className = 'stilo-link-bubble';
  content.setAttribute('role', 'group');
  content.setAttribute('aria-label', messages['toolbar.link']);

  const url = document.createElement('a');
  url.className = 'stilo-link-bubble__button';
  url.target = '_blank';
  url.rel = 'noopener noreferrer';
  url.setAttribute('aria-label', messages['link.open']);
  url.append(createIcon(ExternalLink));

  const edit = createButton(Pencil, messages['link.edit']);
  const remove = createButton(Unlink, messages['link.remove']);
  content.append(url, edit, remove);

  const popover = createPopover({ anchor, content, container });

  // The editor keeps the focus (and the bubble stays) while its buttons are clicked.
  const onMousedown = (event: MouseEvent): void => {
    event.preventDefault();
  };
  const onEditClick = (): void => {
    popover.close();
    onEdit();
  };
  const onRemoveClick = (): void => {
    editor.commands.unsetLink();
  };

  content.addEventListener('mousedown', onMousedown);
  edit.addEventListener('click', onEditClick);
  remove.addEventListener('click', onRemoveClick);
  editor.on('transaction', update);
  editor.on('focus', update);
  editor.on('blur', update);

  /** The `<a>` of the link at the cursor, or `null` when the bubble must be hidden. */
  function currentLink(): HTMLAnchorElement | null {
    const { selection } = editor.state;
    if (!selection.empty || !editor.isActive('link') || !editor.view.hasFocus()) return null;
    const { node } = editor.view.domAtPos(selection.from);
    const element = node instanceof Element ? node : node.parentElement;
    return element?.closest('a') ?? null;
  }

  function update(): void {
    const next = currentLink();
    // Another link: close first, so that the popover is positioned again on opening.
    if (next !== link) popover.close();
    link = next;
    if (!link) return;
    const href = String(editor.getAttributes('link').href ?? '');
    url.href = href;
    url.title = `${messages['link.open']}: ${href}`;
    popover.open();
  }

  function destroy(): void {
    editor.off('transaction', update);
    editor.off('focus', update);
    editor.off('blur', update);
    content.removeEventListener('mousedown', onMousedown);
    edit.removeEventListener('click', onEditClick);
    remove.removeEventListener('click', onRemoveClick);
    popover.destroy();
  }

  return {
    get isOpen() {
      return popover.isOpen;
    },
    update,
    destroy,
  };
}

function createButton(icon: Parameters<typeof createIcon>[0], label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'stilo-link-bubble__button';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.append(createIcon(icon));
  return button;
}
