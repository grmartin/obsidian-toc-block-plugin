import type { EditorView } from '@codemirror/view';
import { MarkdownView, Plugin, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, TocBlockSettings, TocBlockSettingTab } from './settings';
import { buildTocLivePreviewPlugin, tocRefreshEffect } from './live-preview';
import {
	assignHeadingIds,
	buildTocList,
	compileTocPatterns,
	insertTocMarker,
	lineMatchesToc,
} from './toc';

export default class TocBlockPlugin extends Plugin {
	settings!: TocBlockSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new TocBlockSettingTab(this.app, this));
		this.registerEditorExtension(buildTocLivePreviewPlugin(this));

		this.addCommand({
			id: 'insert-toc',
			name: 'Insert table of contents',
			icon: 'list',
			editorCallback: (editor) =>
				insertTocMarker(editor, this.settings.insertMarker),
		});

		// Decorations rebuild synchronously on every keystroke, but they read
		// headings from the metadata cache, which only catches up after Obsidian
		// finishes reparsing the file — the same thing the built-in Outline pane
		// waits on. Refresh just the view(s) showing the file that changed the
		// moment that happens, so the TOC keeps pace with a newly-typed heading
		// instead of waiting for some unrelated trigger.
		this.registerEvent(
			this.app.metadataCache.on('changed', (file) => this.refreshFile(file)),
		);

		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor) => {
				menu.addItem((item) =>
					item
						.setTitle('Table of contents')
						.setIcon('list')
						.onClick(() =>
							insertTocMarker(editor, this.settings.insertMarker),
						),
				);
			}),
		);

		this.registerMarkdownPostProcessor((el, ctx) => {
			const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			const headings =
				file instanceof TFile
					? (this.app.metadataCache.getFileCache(file)?.headings ?? [])
					: [];

			// Headings need a stable, predictable id for the TOC's links to
			// resolve as native `href="#id"` anchors, which is what makes them
			// clickable in exported PDFs (no JS there to intercept clicks the
			// way the live app does). Every section may contain headings, not
			// just the one containing the [TOC] marker, so this must run
			// unconditionally per section rather than only where a marker matched.
			if (this.settings.displayInline === 'links') {
				assignHeadingIds(el, ctx, headings);
			}

			const patterns = compileTocPatterns(this.settings.tocPatterns);

			el.querySelectorAll('p').forEach((paragraph) => {
				if (!lineMatchesToc(paragraph.textContent ?? '', patterns)) return;

				if (this.settings.displayInline !== 'links') {
					paragraph.remove();
					return;
				}

				paragraph.replaceWith(buildTocList(headings));
			});
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<TocBlockSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.refreshAllViews();
	}

	private refreshAllViews() {
		this.app.workspace.getLeavesOfType('markdown').forEach((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				this.refreshView(leaf.view);
			}
		});
	}

	private refreshFile(file: TFile) {
		this.app.workspace.getLeavesOfType('markdown').forEach((leaf) => {
			if (leaf.view instanceof MarkdownView && leaf.view.file?.path === file.path) {
				this.refreshView(leaf.view);
			}
		});
	}

	private refreshView(view: MarkdownView) {
		// `Editor.cm` isn't part of the public API surface, but it's the
		// long-standing, widely-used way plugins reach the underlying CM6
		// EditorView to dispatch effects into it directly.
		const cm = (view.editor as unknown as { cm?: EditorView }).cm;
		cm?.dispatch({ effects: tocRefreshEffect.of(null) });
		view.previewMode.rerender(true);
	}
}
