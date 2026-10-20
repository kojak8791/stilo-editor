import '../../src/styles/content.css';
import '../demo.css';
import '../../src/styles/ui.css';
import { createApp, h, ref } from 'vue';
import { StiloEditor } from '../../src/vue';

const content = [
  '<h2>Stilo in Vue</h2>',
  '<p>This editor is the <code>StiloEditor</code> component of <code>stilo-editor/vue</code>, ',
  'written with render functions.</p>',
  '<ul><li>First item</li><li>Second item</li></ul>',
].join('');

const App = {
  setup() {
    const html = ref(content);
    const readOnly = ref(false);
    return () =>
      h('main', { class: 'demo' }, [
        h('h1', { class: 'demo__title' }, 'Stilo — Vue'),
        h('label', { class: 'demo__option' }, [
          h('input', {
            type: 'checkbox',
            checked: readOnly.value,
            onChange: () => {
              readOnly.value = !readOnly.value;
            },
          }),
          ' Read-only',
        ]),
        h(StiloEditor, {
          class: 'demo__editor',
          content,
          editable: !readOnly.value,
          statusBar: true,
          ariaLabel: 'Demo editor',
          onInput: ({ editor }) => {
            html.value = editor.getHTML();
          },
        }),
        h('h2', { class: 'demo__subtitle' }, 'getHTML()'),
        h('pre', { class: 'demo__output' }, html.value),
      ]);
  },
};

createApp(App).mount('#app');
