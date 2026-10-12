import { TextSelection } from 'prosemirror-state';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestEditor } from '../../../tests/helpers';
import { StarterKit } from '../../index';
import { createToolbar } from '../index';

function setup(html: string, extensions = [StarterKit()]) {
  const editor = createTestEditor({ html, extensions });
  document.body.append(editor.view.dom.parentElement!);
  // jsdom has no layout: coordsAtPos needs Range.getClientRects.
  vi.spyOn(editor.view, 'coordsAtPos').mockReturnValue({ left: 0, right: 0, top: 0, bottom: 0 });
  const container = document.createElement('div');
  document.body.append(container);
  const toolbar = createToolbar(editor, { container });
  const button = toolbar.element.querySelector<HTMLButtonElement>('[data-item="link"]')!;
  const host = editor.view.dom.parentElement!;
  const dialog = host.querySelector<HTMLElement>('.stilo-link-popover')!;
  const bubble = host.querySelector<HTMLElement>('.stilo-link-bubble')!;
  const url = dialog?.querySelector<HTMLInputElement>('.stilo-link-popover__url');
  const newTab = dialog?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  const [apply, remove] = dialog ? [...dialog.querySelectorAll('button')] : [];
  const modK = () => press(editor.view.dom, 'k', { ctrlKey: true });
  return { editor, toolbar, host, button, dialog, bubble, url, newTab, apply, remove, modK };
}

function press(target: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

function type(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('link button', () => {
  it('is a toggle with the Mod-k shortcut, enabled where a link can be edited', () => {
    const { editor, toolbar, button } = setup('<p>a|b <a href="https://x.com">link</a></p>');
    expect(button.getAttribute('title')).toBe('Link (Ctrl+K)');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('aria-disabled')).toBe('true');

    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 6)));
    toolbar.update();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.hasAttribute('aria-disabled')).toBe(false);
  });

  it('is not rendered without the Link extension, and Mod-k is left alone', () => {
    const { toolbar, dialog, bubble, modK } = setup('<p>ab</p>', [StarterKit({ link: false })]);
    expect(toolbar.element.querySelector('[data-item="link"]')).toBeNull();
    expect(dialog).toBeNull();
    expect(bubble).toBeNull();
    expect(modK().defaultPrevented).toBe(false);
  });
});

describe('link popover', () => {
  it('opens with Mod-k on a selection, empty, with the focus in the URL field', () => {
    const { dialog, url, newTab, remove, modK } = setup('<p>[ab]</p>');
    expect(dialog.hidden).toBe(true);
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('Link');
    expect(modK().defaultPrevented).toBe(true);
    expect(dialog.hidden).toBe(false);
    expect(document.activeElement).toBe(url);
    expect(url!.value).toBe('');
    expect(newTab!.checked).toBe(false);
    expect(remove!.hidden).toBe(true);
  });

  it('opens from the toolbar button and keeps the focus in the URL field', () => {
    const { dialog, url, button } = setup('<p>[ab]</p>');
    button.click();
    expect(dialog.hidden).toBe(false);
    expect(document.activeElement).toBe(url);
  });

  it('does not open at a cursor outside a link, but still takes Mod-k', () => {
    const { dialog, modK } = setup('<p>a|b</p>');
    expect(modK().defaultPrevented).toBe(true);
    expect(dialog.hidden).toBe(true);
  });

  it('links the selection on Apply, then gives the focus back to the editor', () => {
    const { editor, dialog, url, newTab, apply, modK } = setup('<p>[ab]c</p>');
    modK();
    type(url!, ' https://x.com ');
    newTab!.checked = true;
    apply!.click();
    expect(editor.getHTML()).toBe(
      '<p><a href="https://x.com" target="_blank" rel="noopener noreferrer nofollow">ab</a>c</p>',
    );
    expect(dialog.hidden).toBe(true);
    expect(document.activeElement).toBe(editor.view.dom);
  });

  it('edits the whole link at the cursor, prefilled', () => {
    const html = '<p><a href="https://x.com" target="_blank">a|b</a>c</p>';
    const { editor, url, newTab, remove, apply, modK } = setup(html);
    modK();
    expect(url!.value).toBe('https://x.com');
    expect(newTab!.checked).toBe(true);
    expect(remove!.hidden).toBe(false);
    type(url!, 'https://y.com');
    newTab!.checked = false;
    apply!.click();
    expect(editor.getHTML()).toBe('<p><a href="https://y.com">ab</a>c</p>');
  });

  it.each([
    ['Remove', true],
    ['an empty URL', false],
  ])('removes the link with %s', (_label, useRemove) => {
    const { editor, dialog, url, remove, apply, modK } = setup(
      '<p><a href="https://x.com">a|b</a>c</p>',
    );
    modK();
    if (useRemove) remove!.click();
    else {
      type(url!, '');
      apply!.click();
    }
    expect(editor.getHTML()).toBe('<p>abc</p>');
    expect(dialog.hidden).toBe(true);
  });

  it('keeps a refused URL in the field, marked invalid until edited', () => {
    const { editor, dialog, url, apply, modK } = setup('<p>[ab]</p>');
    modK();
    type(url!, 'javascript:alert(1)');
    apply!.click();
    expect(editor.getHTML()).toBe('<p>ab</p>');
    expect(dialog.hidden).toBe(false);
    expect(url!.getAttribute('aria-invalid')).toBe('true');
    type(url!, 'https://x.com');
    expect(url!.hasAttribute('aria-invalid')).toBe(false);
  });

  it('closes on Escape and gives the focus back to the editor', () => {
    const { editor, dialog, url, modK } = setup('<p>[ab]</p>');
    modK();
    press(url!, 'Escape');
    expect(dialog.hidden).toBe(true);
    expect(document.activeElement).toBe(editor.view.dom);
    expect(editor.getHTML()).toBe('<p>ab</p>');
  });

  it('is mounted next to the editable element, which becomes the popover host', () => {
    const { editor, host, dialog, bubble } = setup('<p>[ab]</p>');
    expect(dialog.parentElement).toBe(host);
    expect(bubble.parentElement).toBe(host);
    expect(editor.view.dom.contains(dialog)).toBe(false);
    expect(host.classList.contains('stilo-popover-host')).toBe(true);
  });

  it('is removed by toolbar.destroy(), with the host class', () => {
    const { toolbar, host, dialog, bubble, modK } = setup('<p>[ab]</p>');
    modK();
    toolbar.destroy();
    expect(dialog.isConnected).toBe(false);
    expect(bubble.isConnected).toBe(false);
    expect(host.classList.contains('stilo-popover-host')).toBe(false);
  });
});

describe('link bubble', () => {
  const html = '<p><a href="https://x.com" target="_blank">a|b</a>c</p>';

  function cursor(editor: ReturnType<typeof createTestEditor>, from: number, to = from): void {
    editor.view.dispatch(
      editor.state.tr.setSelection(TextSelection.create(editor.state.doc, from, to)),
    );
  }

  it('shows the link at the cursor while the editor has the focus', () => {
    const { editor, bubble } = setup(html);
    expect(bubble.hidden).toBe(true);
    editor.focus();
    expect(bubble.hidden).toBe(false);
    expect(bubble.getAttribute('role')).toBe('group');
    const url = bubble.querySelector('a')!;
    expect(url.getAttribute('href')).toBe('https://x.com');
    expect(url.textContent).toBe('https://x.com');
    expect(url.target).toBe('_blank');
    expect(url.rel).toBe('noopener noreferrer');
    const labels = [...bubble.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['Edit link', 'Remove link']);
  });

  it('hides outside a link, on a range and on blur', () => {
    const { editor, bubble } = setup(html);
    editor.focus();
    cursor(editor, 4);
    expect(bubble.hidden).toBe(true);
    cursor(editor, 2);
    expect(bubble.hidden).toBe(false);
    cursor(editor, 1, 3);
    expect(bubble.hidden).toBe(true);
    cursor(editor, 2);
    editor.blur();
    expect(bubble.hidden).toBe(true);
  });

  it('removes the link, keeping the focus in the editor', () => {
    const { editor, bubble } = setup(html);
    editor.focus();
    const removeButton = bubble.querySelectorAll('button')[1]!;
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    removeButton.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    removeButton.click();
    expect(editor.getHTML()).toBe('<p>abc</p>');
    expect(bubble.hidden).toBe(true);
  });

  it('opens the link popover, prefilled, with the edit button', () => {
    const { editor, bubble, dialog, url } = setup(html);
    editor.focus();
    bubble.querySelector('button')!.click();
    expect(dialog.hidden).toBe(false);
    expect(url!.value).toBe('https://x.com');
    expect(document.activeElement).toBe(url);
    expect(bubble.hidden).toBe(true);
  });
});
