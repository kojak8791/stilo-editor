/// <reference types="vite/client" />

const THEME_KEY = 'stilo-site-theme';

function currentTheme(): string {
  const root = document.documentElement;
  return (
    root.dataset.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
}

/** The theme toggle of the header: follows the system until the visitor picks a theme. */
function setUpThemeToggle(): void {
  const toggle = document.querySelector<HTMLButtonElement>('.theme-toggle')!;
  const label = () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    toggle.setAttribute('aria-label', `Switch to ${next} theme`);
  };
  toggle.addEventListener('click', () => {
    const theme = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage blocked: the theme lasts until the page is closed.
    }
    label();
  });
  label();
}

/** `.copy-button`: copies `data-copy`, or the text of the element whose id is `data-copy-from`. */
function setUpCopyButtons(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('.copy-button')) {
    button.addEventListener('click', async () => {
      const source = button.dataset.copyFrom;
      const text = source ? document.getElementById(source)?.textContent : button.dataset.copy;
      await navigator.clipboard.writeText(text ?? '');
      button.textContent = 'Copied';
      setTimeout(() => {
        button.textContent = 'Copy';
      }, 1500);
    });
  }
}

/** Calls `update` 150 ms after the last call: serializing on every keystroke costs. */
export function debounce(update: () => void): () => void {
  let pending = 0;
  return () => {
    clearTimeout(pending);
    pending = window.setTimeout(update, 150);
  };
}

/** Formats a byte count as B, KB or MB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** The parts every page shares: the theme toggle and the copy buttons. */
export function setUpPage(): void {
  setUpThemeToggle();
  setUpCopyButtons();
}
