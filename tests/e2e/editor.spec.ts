import { expect, type Locator, type Page, test } from '@playwright/test';

/** Opens the demo with an empty, focused editor. */
async function openEmpty(page: Page) {
  await page.goto('/demo/');
  const editor = page.getByRole('textbox', { name: 'Demo editor' });
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
  await expect(page.locator('#output')).toHaveText('<p></p>');
}

/**
 * Pastes `data` (MIME type → content) into the editor through a `paste` event. The system
 * clipboard is not used: it is shared by parallel workers. Firefox drops the `clipboardData` of
 * a constructed event, so the property is defined on the event itself.
 */
async function paste(page: Page, data: Record<string, string>) {
  await page.getByRole('textbox', { name: 'Demo editor' }).evaluate((element, data) => {
    const clipboardData = new DataTransfer();
    for (const [type, value] of Object.entries(data)) clipboardData.setData(type, value);
    const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: clipboardData });
    element.dispatchEvent(event);
  }, data);
}

const output = (page: Page) => page.locator('#output');

/**
 * Waits for a rendered frame. Real key presses make the browser render; Playwright's synthetic
 * ones do not, so Chromium keeps a new block skipped by `content-visibility` (ADR 0003) and
 * puts the caret before the first character typed into it.
 */
async function nextFrame(page: Page) {
  await page.evaluate(() => new Promise(requestAnimationFrame));
}

/** Types `text` with a rendered frame before each character, like real keys (see {@link nextFrame}). */
async function type(page: Page, text: string) {
  for (const char of text) {
    await nextFrame(page);
    await page.keyboard.type(char);
  }
}

test('typing builds paragraphs and runs input rules', async ({ page }) => {
  await openEmpty(page);
  await type(page, 'Hello world');
  await page.keyboard.press('Enter');
  await type(page, '## Title');
  await expect(output(page)).toHaveText('<p>Hello world</p><h2>Title</h2>');
});

test('marks from the keyboard and the toolbar', async ({ page }) => {
  await openEmpty(page);
  await page.keyboard.press('ControlOrMeta+b');
  await type(page, 'bold');
  await page.keyboard.press('ControlOrMeta+b');
  await type(page, ' plain ');
  await page.getByRole('button', { name: 'Italic' }).click();
  await type(page, 'italic');
  await expect(output(page)).toHaveText('<p><strong>bold</strong> plain <em>italic</em></p>');
  await expect(page.getByRole('button', { name: 'Italic' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('Mod-k opens the link popover under the selection', async ({ page }) => {
  await openEmpty(page);
  await type(page, 'Stilo');
  for (let i = 0; i < 'Stilo'.length; i++) await page.keyboard.press('Shift+ArrowLeft');
  // ProseMirror reads the new selection on `selectionchange`, which Chromium fires later.
  await nextFrame(page);
  await page.keyboard.press('ControlOrMeta+k');

  const popover = page.getByRole('dialog', { name: 'Link' });
  const url = popover.getByRole('textbox', { name: 'URL' });
  await expect(popover).toBeVisible();
  await expect(url).toBeFocused();
  const text = await page.locator('.ProseMirror p').boundingBox();
  const box = await popover.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(text!.y + text!.height);

  await url.fill('https://example.com');
  await page.keyboard.press('Enter');
  await expect(popover).toBeHidden();
  await expect(output(page)).toHaveText('<p><a href="https://example.com">Stilo</a></p>');
  await expect(page.getByRole('textbox', { name: 'Demo editor' })).toBeFocused();
  await nextFrame(page);
  await page.keyboard.press('ArrowRight');
  await type(page, '!');
  await expect(output(page)).toHaveText('<p><a href="https://example.com">Stilo</a>!</p>');
});

test('pasted HTML is sanitized', async ({ page }) => {
  await openEmpty(page);
  await paste(page, {
    'text/html':
      '<p onclick="alert(1)">Hi <b>there</b><script>alert(1)</script>' +
      '<a href="javascript:alert(1)">bad</a></p>',
    'text/plain': 'Hi there bad',
  });
  await expect(output(page)).toHaveText('<p>Hi <strong>there</strong>bad</p>');
});

test('a pasted image file is inserted and resized with its side handles', async ({ page }) => {
  await openEmpty(page);
  await page.getByRole('textbox', { name: 'Demo editor' }).evaluate(async (element) => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 100;
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!)));
    const clipboardData = new DataTransfer();
    clipboardData.items.add(new File([blob], 'a.png', { type: 'image/png' }));
    const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: clipboardData });
    element.dispatchEvent(event);
  });
  await expect(output(page)).toHaveText(/^<p><img src="data:image\/png;base64,[^"]+"><\/p>$/);

  await page.locator('.stilo-image img').click();
  const box = (await page.locator('.stilo-image__handle--right').boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 100, y, { steps: 5 });
  await page.mouse.up();
  await expect(output(page)).toHaveText(/<img src="data:[^"]+" width="100" height="50">/);
});

test('pasted plain text becomes paragraphs', async ({ page }) => {
  await openEmpty(page);
  await paste(page, { 'text/plain': 'one\ntwo\n\n\nthree' });
  await expect(output(page)).toHaveText('<p>one</p><p>two</p><p>three</p>');
});

test('undo and redo', async ({ page }) => {
  await openEmpty(page);
  await type(page, 'first');
  await page.keyboard.press('Enter');
  // Typing pauses longer than the history group delay start a new undo step.
  await page.waitForTimeout(600);
  await type(page, 'second');
  await expect(output(page)).toHaveText('<p>first</p><p>second</p>');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(output(page)).toHaveText('<p>first</p><p></p>');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(output(page)).toHaveText('<p>first</p><p>second</p>');
});

test('alignment shortcuts', async ({ page }) => {
  await openEmpty(page);
  await type(page, 'Stilo');
  const shortcuts = [
    ['e', '<p style="text-align: center">Stilo</p>'],
    ['r', '<p style="text-align: right">Stilo</p>'],
    ['j', '<p style="text-align: justify">Stilo</p>'],
    ['l', '<p>Stilo</p>'],
  ] as const;
  for (const [key, html] of shortcuts) {
    await page.keyboard.press(`ControlOrMeta+Shift+${key}`);
    await expect(output(page)).toHaveText(html);
  }
});

/** Drags the selection with the mouse, from its middle, to the point (`x`, `y`). */
async function dragTo(page: Page, x: number, y: number) {
  const from = await page.evaluate(() => {
    const rect = getSelection()!.getRangeAt(0).getClientRects()[0]!;
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  });
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 10, from.y, { steps: 5 });
  await page.mouse.move(x, y, { steps: 10 });
  await page.mouse.up();
}

/** Drags the selection with the mouse to just above `target`. */
async function dragAbove(page: Page, target: Locator) {
  const to = (await target.boundingBox())!;
  await dragTo(page, to.x + 10, to.y - 2);
}

/** Drags the selection with the mouse to the text offset `offset` of `target`. */
async function dragIntoText(page: Page, target: Locator, offset: number) {
  const point = await target.evaluate((element, offset) => {
    const range = document.createRange();
    const text = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode()!;
    range.setStart(text, offset);
    const rect = range.getBoundingClientRect();
    return { x: rect.x + 1, y: rect.y + rect.height / 2 };
  }, offset);
  await dragTo(page, point.x, point.y);
}

test('dragging a whole paragraph moves it without leaving an empty one', async ({ page }) => {
  await openEmpty(page);
  await type(page, 'Title');
  await page.keyboard.press('Enter');
  await type(page, 'Text');
  const paragraphs = page.locator('.ProseMirror p');
  await paragraphs.nth(1).click({ clickCount: 3, position: { x: 5, y: 5 } });
  await dragAbove(page, paragraphs.nth(0));
  await expect(output(page)).toHaveText('<p>Text</p><p>Title</p>');

  await paragraphs.nth(0).click({ clickCount: 3, position: { x: 5, y: 5 } });
  await dragAbove(page, paragraphs.nth(0));
  await expect(output(page)).toHaveText('<p>Text</p><p>Title</p>');
});

// Playwright's WebKit on Windows resolves every point of the target text to offset 0 during a
// drop (`caretRangeFromPoint`), so these drops land before the target; Safari is checked by hand.
const webkitDropPoint = 'Playwright WebKit resolves drop points to the start of the text';

test('a whole paragraph dropped inside text splits the target', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', webkitDropPoint);
  await openEmpty(page);
  await type(page, 'abcd');
  await page.keyboard.press('Enter');
  await type(page, 'xyz');
  const paragraphs = page.locator('.ProseMirror p');
  await paragraphs.nth(1).click({ clickCount: 3, position: { x: 5, y: 5 } });
  await dragIntoText(page, paragraphs.nth(0), 2);
  await expect(output(page)).toHaveText('<p>ab</p><p>xyz</p><p>cd</p>');
});

test('a whole paragraph dropped inside a list item becomes an item', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'webkit', webkitDropPoint);
  await openEmpty(page);
  await type(page, '- abcd');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await type(page, 'xyz');
  await expect(output(page)).toHaveText('<ul><li>abcd</li></ul><p>xyz</p>');
  const paragraph = page.locator('.ProseMirror > p');
  await paragraph.click({ clickCount: 3, position: { x: 5, y: 5 } });
  await dragIntoText(page, page.locator('.ProseMirror li p'), 2);
  await expect(output(page)).toHaveText('<ul><li>ab</li><li>xyz</li><li>cd</li></ul>');
});
