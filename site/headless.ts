import '../src/styles/content.css';
import { setUpPage } from './common';
import { createHeadlessEditor } from './headless-editor';
import source from './headless-editor.ts?raw';
import { highlightTS } from './highlight';

setUpPage();

createHeadlessEditor(
  document.querySelector<HTMLElement>('#toolbar')!,
  document.querySelector<HTMLElement>('#editor')!,
);

// The page shows the code it runs, importing from the package as an application would.
document.querySelector<HTMLElement>('#source')!.innerHTML = highlightTS(
  source.replace("from '../src'", "from 'stilo-editor'"),
);
