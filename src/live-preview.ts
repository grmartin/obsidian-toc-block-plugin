import { RangeSetBuilder, StateEffect } from '@codemirror/state';
import {
	Decoration,
	DecorationSet,
	EditorView,
	PluginSpec,
	PluginValue,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from '@codemirror/view';
import { editorInfoField, editorLivePreviewField, HeadingCache, TFile } from 'obsidian';
import TocBlockPlugin from './main';
import { buildTocList, compileTocPatterns, lineMatchesToc } from './toc';
import { TocDisplayInlineMode } from './settings';

class TocWidget extends WidgetType {
	constructor(
		private readonly mode: Exclude<TocDisplayInlineMode, 'hide'>,
		private readonly headings: HeadingCache[],
	) {
		super();
	}

	eq(other: TocWidget): boolean {
		return (
			this.mode === other.mode &&
			this.headings.length === other.headings.length &&
			this.headings.every(
				(h, i) =>
					h.heading === other.headings[i]?.heading &&
					h.level === other.headings[i]?.level,
			)
		);
	}

	toDOM(): HTMLElement {
		if (this.mode === 'block') {
			return createDiv({
				cls: 'toc-block-placeholder',
				text: 'Table of contents',
			});
		}

		const wrapper = createDiv({ cls: 'toc-block-live-preview' });
		wrapper.appendChild(buildTocList(this.headings));
		return wrapper;
	}
}

// Dispatched at a specific editor to force its decorations to rebuild
// outside the normal doc/viewport/selection triggers — e.g. when the
// metadata cache finishes reparsing headings after an edit elsewhere in the
// same document, or a setting changes.
export const tocRefreshEffect = StateEffect.define<null>();

class HiddenTocWidget extends WidgetType {
	eq(): boolean {
		return true;
	}

	toDOM(): HTMLElement {
		return createDiv({ cls: 'toc-block-hidden' });
	}
}

export function buildTocLivePreviewPlugin(plugin: TocBlockPlugin) {
	class TocLivePreviewPlugin implements PluginValue {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = this.buildDecorations(view);
		}

		update(update: ViewUpdate) {
			const forcedRefresh = update.transactions.some((tr) =>
				tr.effects.some((effect) => effect.is(tocRefreshEffect)),
			);

			if (
				update.docChanged ||
				update.viewportChanged ||
				update.selectionSet ||
				forcedRefresh
			) {
				this.decorations = this.buildDecorations(update.view);
			}
		}

		buildDecorations(view: EditorView): DecorationSet {
			const builder = new RangeSetBuilder<Decoration>();

			// Raw source mode: leave the document untouched.
			if (!view.state.field(editorLivePreviewField)) {
				return builder.finish();
			}

			const patterns = compileTocPatterns(plugin.settings.tocPatterns);
			if (patterns.length === 0) {
				return builder.finish();
			}

			const file = view.state.field(editorInfoField).file;
			const headings =
				file instanceof TFile
					? (plugin.app.metadataCache.getFileCache(file)?.headings ?? [])
					: [];

			const selection = view.state.selection;

			for (let i = 1; i <= view.state.doc.lines; i++) {
				const line = view.state.doc.line(i);
				if (!lineMatchesToc(line.text, patterns)) continue;

				// Leave the raw marker text visible and editable while the
				// cursor/selection is on this line. Replacing it with a widget
				// out from under an active caret is what corrupts typing (e.g.
				// finishing "[TOC]" mid-keystroke) — this mirrors how Obsidian's
				// own Live Preview reveals raw markdown syntax under the cursor.
				const cursorOnLine = selection.ranges.some(
					(range) => range.from <= line.to && range.to >= line.from,
				);
				if (cursorOnLine) continue;

				const mode = plugin.settings.displayInline;
				if (mode === 'hide') {
					builder.add(
						line.from,
						line.to,
						Decoration.replace({ widget: new HiddenTocWidget(), block: true }),
					);
					continue;
				}

				builder.add(
					line.from,
					line.to,
					Decoration.replace({
						widget: new TocWidget(mode, headings),
						block: true,
					}),
				);
			}

			return builder.finish();
		}
	}

	const spec: PluginSpec<TocLivePreviewPlugin> = {
		decorations: (value) => value.decorations,
	};

	return ViewPlugin.fromClass(TocLivePreviewPlugin, spec);
}
