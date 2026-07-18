# TOC Block

An [Obsidian](https://obsidian.md) plugin that adds Typora-like `[TOC]` tag support for rendering an inline table of contents.

Drop a `[TOC]` tag into a note and it renders as a live table of contents built from the note's headings — the same shorthand [Typora](https://typora.io) users are used to.

## Status

Early development, bootstrapped from the [official Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin). Not yet functional or published.

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
- Create a GitHub release using the exact version number (no `v` prefix) as the tag.
- Attach `manifest.json`, `main.js`, and `styles.css` as binary attachments to the release. `manifest.json` must also stay committed at the repo root.

## License

[MIT](LICENSE)
