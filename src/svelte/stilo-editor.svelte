<script>
  import { stiloEditorWithUI } from './action.js';

  let {
    editor = $bindable(null),
    extensions,
    content,
    editable,
    autofocus,
    ariaLabel,
    compactParagraphs,
    toolbar,
    statusBar,
    messages,
    onready,
    oninput,
    onselectionchange,
    ontransaction,
    onfocus,
    onblur,
    ...attributes
  } = $props();
</script>

<div
  {...attributes}
  use:stiloEditorWithUI={{
    extensions,
    content,
    editable,
    autofocus,
    ariaLabel,
    compactParagraphs,
    toolbar,
    statusBar,
    messages,
    oninput,
    onselectionchange,
    ontransaction,
    onfocus,
    onblur,
    onready: (created) => {
      editor = created;
      onready?.(created);
    },
  }}
></div>
