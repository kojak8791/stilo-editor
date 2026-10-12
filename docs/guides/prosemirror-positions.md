# ProseMirror positions: a practical guide

Read this before a task that moves, deletes, inserts or wraps nodes. Every number below was
checked against ProseMirror. Official reference: <https://prosemirror.net/docs/guide/#doc.indexing>.

## 1. How positions are counted

A position is a point **between** two tokens of the document. Counting starts at 0, at the start
of the document's content. The tokens are:

- entering a node with content (paragraph, list, list item, blockquote): 1;
- each character of text: 1;
- a leaf node (`<hr>`, `<br>`): 1 in total;
- leaving a node with content: 1.

So `node.nodeSize` is `node.content.size + 2` for a node with content, and 1 for a leaf.

Example, `<p>ab</p><p>cd</p>`:

```text
 0   1   2   3   4   5   6   7   8
 | <p> a   b </p> | <p> c   d </p> |
```

| Position | Meaning |
|---|---|
| 0 | before the first `<p>` |
| 1 | start of the first paragraph's text (before `a`) |
| 3 | end of the first paragraph's text (after `b`) |
| 4 | after the first `<p>` = before the second `<p>` |
| 6 | between `c` and `d` |
| 8 | after the second `<p>` = `doc.content.size` |

Each `<p>` has `nodeSize` 4. Nesting adds 2 per level: in `<ul><li><p>a</p></li></ul>` the `<ul>`
has `nodeSize` 7 and the text `a` is between positions 3 and 4.

## 2. `ResolvedPos`: what a position is inside of

`doc.resolve(pos)` returns a `ResolvedPos` (`$pos` by convention). For position 6 above:

| Expression | Value | Meaning |
|---|---|---|
| `$pos.depth` | 1 | 0 = doc, 1 = a child of doc, … |
| `$pos.parent` | the second `<p>` | the innermost node containing the position (`$pos.node($pos.depth)`) |
| `$pos.node(0)` | the doc | ancestor at depth 0 |
| `$pos.index(0)` | 1 | the ancestor at depth 1 is child number 1 of the doc |
| `$pos.start()` | 5 | where the parent's content starts |
| `$pos.end()` | 7 | where the parent's content ends |
| `$pos.before()` | 4 | position just before the parent node (depth ≥ 1) |
| `$pos.after()` | 8 | position just after the parent node |
| `$pos.parentOffset` | 1 | offset inside the parent's content |

All of them take an optional depth: `$pos.before(d)` is the position before the ancestor at depth
`d`.

## 3. Indexes are not positions

- An **index** counts children: `parent.child(i)`, `$pos.index(d)`, `range.startIndex`.
- A **position** counts tokens in the whole document: `tr.delete(from, to)`, `tr.insert(pos, …)`,
  `doc.resolve(pos)`.

Never pass an index where a position is expected. To get the position before child `i` of a node
whose content starts at `start`, add the `nodeSize` of the children before it.

`node.resolve(x)` on a node that is not the document counts from **that node's** content, not
from the document: its results are not document positions. Use `doc.resolve` (or
`state.doc.resolve`).

## 4. `NodeRange`: the children covered by a selection

`$from.blockRange($to, predicate)` returns the children of the innermost common ancestor
accepted by `predicate` that the range `$from`…`$to` covers (or `null`). In `<p>a</p><p>b</p><p>c</p>`
(paragraphs at 0–3, 3–6, 6–9), with `$from` = 5 (in `b`) and `$to` = 8 (in `c`):

| Field | Value | Meaning |
|---|---|---|
| `range.depth` | 0 | depth of the parent (here the doc) |
| `range.parent` | the doc | the ancestor whose children are covered |
| `range.startIndex` | 1 | first covered child |
| `range.endIndex` | 3 | one past the last covered child (exclusive) |
| `range.start` | 3 | document position before the first covered child |
| `range.end` | 9 | document position after the last covered child |

The previous sibling, if `startIndex > 0`, is `parent.child(startIndex - 1)` and occupies
`range.start - its nodeSize` … `range.start`. The next sibling, if `endIndex < parent.childCount`,
is `parent.child(endIndex)` and occupies `range.end` … `range.end + its nodeSize`.

## 5. Transactions: each step changes the positions of the next one

The steps of a transaction run in order, and each step works on the document **as the previous
steps left it**. After `tr.delete(a, b)`, every position after `b` is `b - a` smaller.

- `tr.mapping.map(pos)` converts a position of the original document into the current one.
- The selection is mapped through every step automatically: a selection that is not inside a
  deleted range follows its content.

Example: swap the paragraphs of `<p>ab</p><p>cd</p>`.

```text
original:          <p>ab</p><p>cd</p>     first <p> at 0–4, second at 4–8
tr.delete(0, 4):   <p>cd</p>              the old position 8 is now 4
tr.insert(4, …):   <p>cd</p><p>ab</p>     4 = tr.mapping.map(8)
```

A position inside a deleted range maps to the deletion point: anything that pointed into
the deleted node is lost. That is why moving a **neighbor** keeps the selection, while deleting
and re-inserting the **selected** content does not.

## 6. When a position bug resists: print, do not guess

Write a throwaway test that prints the real numbers, read them, then fix the code. Delete it
before committing.

```ts
const { doc } = createTestEditor({ html: '<p>a</p><p>b|</p>' }).state;
doc.descendants((node, pos) => {
  console.log(pos, node.type.name, node.nodeSize);
});
```

Five minutes of printing replaces an hour of reasoning about positions.
