import type { Node } from 'prosemirror-model';
import type { EditorView, NodeView, ViewMutationRecord } from 'prosemirror-view';

/**
 * The `taskItem` node in the editor: `<li data-checked>` holding a checkbox
 * (`input.stilo-task-item__checkbox`) and the content (`div.stilo-task-item__content`). Clicking
 * the checkbox sets `checked`; it leaves the focus in the editor and does nothing when the editor
 * is not editable.
 */
export class TaskItemView implements NodeView {
  readonly dom: HTMLElement;
  readonly contentDOM: HTMLElement;
  private readonly checkbox: HTMLInputElement;
  private node: Node;

  constructor(
    node: Node,
    private readonly view: EditorView,
    private readonly getPos: () => number | undefined,
  ) {
    this.node = node;
    this.dom = document.createElement('li');
    this.checkbox = document.createElement('input');
    this.checkbox.type = 'checkbox';
    this.checkbox.className = 'stilo-task-item__checkbox';
    this.checkbox.contentEditable = 'false';
    this.checkbox.addEventListener('mousedown', (event) => event.preventDefault());
    this.checkbox.addEventListener('click', (event) => {
      if (!this.view.editable) event.preventDefault();
    });
    this.checkbox.addEventListener('change', () => this.setChecked(this.checkbox.checked));
    this.contentDOM = document.createElement('div');
    this.contentDOM.className = 'stilo-task-item__content';
    this.dom.append(this.checkbox, this.contentDOM);
    this.render();
  }

  update(node: Node): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.render();
    return true;
  }

  /** The checkbox handles its own events: ProseMirror must not move the selection. */
  stopEvent(event: Event): boolean {
    return event.target === this.checkbox;
  }

  /** Only the content is ProseMirror's: the checkbox and the `data-checked` are the view's. */
  ignoreMutation(mutation: ViewMutationRecord): boolean {
    return mutation.type !== 'selection' && !this.contentDOM.contains(mutation.target);
  }

  private render(): void {
    const checked = this.node.attrs.checked === true;
    this.dom.dataset.checked = String(checked);
    this.checkbox.checked = checked;
  }

  private setChecked(checked: boolean): void {
    const pos = this.getPos();
    if (pos === undefined) return;
    this.view.dispatch(this.view.state.tr.setNodeAttribute(pos, 'checked', checked));
  }
}
