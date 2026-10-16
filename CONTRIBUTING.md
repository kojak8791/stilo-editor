# Contributing to Stilo

Thank you for your interest. Stilo is young and its design is still settling, so the best
contributions right now are bug reports, ideas and feedback on the API.

## Reporting a bug or proposing a feature

Open an [issue](https://github.com/kojak8791/stilo-editor/issues/new/choose) and pick the bug
report or the feature request form. For a bug, the steps to reproduce, the Stilo version and the
browser are what makes it fixable. Security problems are reported privately instead: see
[SECURITY.md](SECURITY.md).

## Before you write code

Open an issue first and describe the change: it saves you work on something that does not fit
the plan. Then:

1. Read [AGENTS.md](AGENTS.md): the rules for everyone who changes the code, human or AI agent.
   The decisions behind the code are in [docs/](docs/) and in the [ADRs](docs/decisions/).
2. Work on a branch, with commits in
   [Conventional Commits](https://www.conventionalcommits.org) form
   (`fix(link): keep the target when editing a link`).
3. Before you open a pull request, run:

   ```sh
   npm run format
   npm run check   # typecheck + lint + unit tests, must pass
   ```

   Try the change in the demo (`npm run dev`) when it is visible there, and run
   `npm run test:e2e` when it touches typing, the clipboard, drag and drop or the UI.

## Keep the documents in sync

A change is complete when the documents describe it:

- **Features.** When a change adds, removes or changes a user-visible feature, a keyboard
  shortcut, a Markdown shortcut or a popover, update [docs/FEATURES.md](docs/FEATURES.md) (and
  the short list in the README when a feature comes or goes) in the same change.
- **Changelog.** A change that users notice gets a line under *Unreleased* in
  [CHANGELOG.md](CHANGELOG.md).
- **API.** A change of a public API updates [docs/API.md](docs/API.md) and
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (or [docs/UI.md](docs/UI.md) for the default UI).
- **HTML output.** It follows [ARCHITECTURE.md §7](docs/ARCHITECTURE.md#7-html-contract)
  exactly; a change to it updates that section first.

New dependencies and changes of the configuration files need a decision first: propose them in
an issue.

## Development

Requires Node.js 22 or later.

```sh
npm install
npm run check    # typecheck + lint + unit tests
npm run dev      # demo page
npm run site     # public site (published on GitHub Pages from main)
npm run bench    # performance benchmarks (needs: npx playwright install chromium)
npm run test:e2e # E2E tests in Chromium, Firefox and WebKit (needs: npx playwright install)
```

| Document | Content |
|---|---|
| [API.md](docs/API.md) | API reference for applications |
| [FEATURES.md](docs/FEATURES.md) | Every feature, shortcut and Markdown shortcut |
| [VISION.md](docs/VISION.md) | Why and what |
| [SPEC.md](docs/SPEC.md) | Features, non-functional requirements, roadmap |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, file layout, extension API, HTML contract |
| [UI.md](docs/UI.md) | Design of the default UI |
| [PERFORMANCE.md](docs/PERFORMANCE.md) | Performance in practice, how it is measured, limits |
| [BACKLOG.md](docs/BACKLOG.md) | Tasks done and planned |
| [AGENTS.md](AGENTS.md) | Rules for contributors and coding agents |

## License

By contributing, you agree that your contribution is licensed under the [MIT License](LICENSE).
