<script lang="ts">
  import { StiloEditor } from '../../src/svelte';

  const content = [
    '<h2>Stilo in Svelte</h2>',
    '<p>This editor is the <code>StiloEditor</code> component of <code>stilo-editor/svelte</code>, ',
    'in an app written with <strong>runes</strong>.</p>',
    '<ul><li>First item</li><li>Second item</li></ul>',
  ].join('');

  let html = $state(content);
  let readOnly = $state(false);
</script>

<main class="demo">
  <h1 class="demo__title">Stilo — Svelte</h1>
  <label class="demo__option">
    <input type="checkbox" bind:checked={readOnly} /> Read-only
  </label>
  <StiloEditor
    class="demo__editor"
    {content}
    editable={!readOnly}
    statusBar
    ariaLabel="Demo editor"
    oninput={({ editor }) => (html = editor.getHTML())}
  />
  <h2 class="demo__subtitle">getHTML()</h2>
  <pre class="demo__output">{html}</pre>
</main>
