import { expect, type Page, test } from '@playwright/test';

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
