# TOC Block

An [Obsidian](https://obsidian.md) plugin that adds Typora-like `[TOC]` tag support for rendering an inline table of contents.

Drop a `[TOC]` tag into a note and it renders as a live table of contents built from the note's headings — the same shorthand [Typora](https://typora.io) users are used to.

## Status

Functional. Bootstrapped from the [official Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin); not yet published to the community plugin directory.

## Features

- **`[TOC]` tag detection** — matches the literal `[TOC]` tag by default, plus any number of your own regular expressions (Settings → TOC patterns), so alternate conventions can be recognized too.
- **Configurable insert marker** — the "Insert table of contents" command (and its right-click context-menu item) drops your configured marker text at the cursor, wrapped in blank lines if needed to keep it on its own paragraph. Defaults to `[TOC]`, but can be set to anything, including multi-line text like a fenced ` ```toc ` code block.
- **Live Preview rendering** — a matched line renders as a real, built-out table of contents (or is hidden entirely, per the "Display inline" setting), while raw source mode is left completely untouched. Raw marker text stays visible and editable while your cursor is on that line.
- **Reading View / export rendering** — renders as a real table of contents with clickable, native `#id`-anchor links to each heading (duplicate heading names get disambiguated with `-1`, `-2`, etc., same as Obsidian's own convention).
- **Stays in sync** — the TOC updates automatically as headings are added, edited, or removed, without needing to reopen the note.

## Settings

- **Display inline** — how a recognized TOC tag renders: `Links` (a real, built-out table of contents) or `Hide` (nothing).
- **Insert marker text** — the text the insert command/menu item drops at the cursor. Defaults to `[TOC]`.
- **TOC patterns** — regular expressions matched against a line to recognize it as a TOC tag, in addition to the default `^\[TOC\]$` pattern.

## Known issues

**Links aren't clickable in exported PDFs.** In "Links" display mode, the table of contents renders as real clickable links in Live Preview and Reading View. In a PDF exported from Obsidian, those same links render but aren't clickable — this is a limitation of Obsidian's PDF exporter, not this plugin.

Obsidian's PDF export goes through Electron's `printToPDF`, which is Chromium's print pipeline. That pipeline doesn't convert same-document `href="#id"` fragment anchors into real PDF navigation links, regardless of how the underlying HTML is built — external `http(s)://` links survive export as clickable, but same-note anchor links don't. This is tracked upstream as a [Chromium bug](https://issues.chromium.org/issues/347674894) and has been a standing Obsidian [feature request](https://forum.obsidian.md/t/pdf-export-make-links-within-same-document-functional/16384) for years with no fix in Obsidian core.

The only known workaround ([obsidian-pdf-anchors](https://github.com/prehensileBBC/obsidian-pdf-anchors)) rewrites the already-exported PDF file's internal link destinations after the fact — a fundamentally different (and much larger) kind of engineering than rendering markdown, and out of scope here for now.

## Development

- Requires NodeJS v18+ (`node --version`)
- `npm i` to install dependencies
- `npm run dev` to compile `src/main.ts` → `main.js` in watch mode
- `npm run build` to type-check and produce a production build
- `npm run lint` to run ESLint (including [Obsidian-specific rules](https://github.com/obsidianmd/eslint-plugin))

### Testing in a vault

Copy (or symlink) `main.js`, `styles.css`, and `manifest.json` into `VaultFolder/.obsidian/plugins/toc-block/`, then enable the plugin under Settings → Community plugins in Obsidian.

## Releasing

- Bump the version with `npm version patch|minor|major` (updates `manifest.json`, `package.json`, and `versions.json` together), or update `manifest.json`/`versions.json` manually.
- Push a git tag matching the exact version number (no `v` prefix). The [release workflow](.github/workflows/release.yml) builds the plugin and creates a **draft** GitHub release with `main.js`, `manifest.json`, and `styles.css` attached automatically.
- Review the draft release on GitHub and publish it.

## License

[MIT](LICENSE)
