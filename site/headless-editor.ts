import {
  Bold,
  BulletList,
  Document,
  Editor,
  Heading,
  History,
  Italic,
  ListItem,
  Paragraph,
  Text,
} from '../src';

/** A toolbar button: its label, its command, and when it is pressed or enabled. */
interface Button {
  label: string;
  run: (editor: Editor) => boolean;
  isActive?: (editor: Editor) => boolean;
  isEnabled?: (editor: Editor) => boolean;
}

const BUTTONS: Button[] = [
  {
    label: 'Bold',
    run: (editor) => editor.commands.toggleBold(),
    isActive: (editor) => editor.isActive('bold'),
  },
  {
    label: 'Italic',
    run: (editor) => editor.commands.toggleItalic(),
    isActive: (editor) => editor.isActive('italic'),
  },
  {
    label: 'Heading',
    run: (editor) => editor.commands.toggleHeading({ level: 2 }),
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
  },
  {
    label: 'List',
    run: (editor) => editor.commands.toggleBulletList(),
    isActive: (editor) => editor.isActive('bulletList'),
  },
  {
    label: 'Undo',
    run: (editor) => editor.commands.undo(),
    isEnabled: (editor) => editor.commands.undo.can(),
  },
  {
    label: 'Redo',
    run: (editor) => editor.commands.redo(),
    isEnabled: (editor) => editor.commands.redo.can(),
  },
];

/** An editor with only the extensions it needs and a toolbar of plain buttons. */
export function createHeadlessEditor(toolbar: HTMLElement, element: HTMLElement): Editor {
  const editor = new Editor({
    element,
    extensions: [
      Document(),
      Text(),
      Paragraph(),
      Heading({ levels: [2] }),
      Bold(),
      Italic(),
      BulletList(),
      ListItem(),
      History(),
    ],
    content:
      '<h2>Headless</h2><p>Select some words and press <strong>Bold</strong>. ' +
      'Markdown works too: <em>**bold**</em>, <em>## </em> or <em>- </em> as you type.</p>',
  });

  const buttons = BUTTONS.map((spec) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = spec.label;
    // Keep the focus, and with it the selection, in the editor.
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => spec.run(editor));
    toolbar.append(button);
    return { button, spec };
  });

  const refresh = () => {
    for (const { button, spec } of buttons) {
      if (spec.isActive) button.setAttribute('aria-pressed', String(spec.isActive(editor)));
      if (spec.isEnabled) button.disabled = !spec.isEnabled(editor);
    }
  };
  editor.on('input', refresh);
  editor.on('selectionchange', refresh);
  refresh();
  return editor;
}
