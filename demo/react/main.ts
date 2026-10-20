import '../../src/styles/content.css';
import '../demo.css';
import '../../src/styles/ui.css';
import { createElement, StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StiloEditor } from '../../src/react';

const content = [
  '<h2>Stilo in React</h2>',
  '<p>This editor is the <code>StiloEditor</code> component of <code>stilo-editor/react</code>, ',
  'rendered in <strong>Strict Mode</strong>.</p>',
  '<ul><li>First item</li><li>Second item</li></ul>',
].join('');

function App() {
  const [html, setHTML] = useState(content);
  const [readOnly, setReadOnly] = useState(false);
  return createElement(
    'main',
    { className: 'demo' },
    createElement('h1', { className: 'demo__title' }, 'Stilo — React'),
    createElement(
      'label',
      { className: 'demo__option' },
      createElement('input', {
        type: 'checkbox',
        checked: readOnly,
        onChange: () => setReadOnly(!readOnly),
      }),
      ' Read-only',
    ),
    createElement(StiloEditor, {
      className: 'demo__editor',
      content,
      editable: !readOnly,
      statusBar: true,
      ariaLabel: 'Demo editor',
      onInput: ({ editor }) => setHTML(editor.getHTML()),
    }),
    createElement('h2', { className: 'demo__subtitle' }, 'getHTML()'),
    createElement('pre', { className: 'demo__output' }, html),
  );
}

createRoot(document.querySelector('#app')!).render(
  createElement(StrictMode, null, createElement(App)),
);
