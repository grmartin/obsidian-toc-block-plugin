import { App, PluginSettingTab, Setting } from 'obsidian';
import TocBlockPlugin from './main';

export type TocDisplayInlineMode = 'links' | 'block' | 'hide';

export interface TocBlockSettings {
	displayInline: TocDisplayInlineMode;
	tocPatterns: string[];
	insertMarker: string;
}

export const DEFAULT_SETTINGS: TocBlockSettings = {
	displayInline: 'links',
	tocPatterns: ['^\\[TOC\\]$'],
	insertMarker: '[TOC]',
};

// 'block' is intentionally left out of the picker for now — not supporting
// it yet — but stays a valid TocDisplayInlineMode so existing rendering
// logic (live-preview.ts, main.ts) doesn't need to change if it comes back.
const DISPLAY_INLINE_OPTIONS: Record<Exclude<TocDisplayInlineMode, 'block'>, string> = {
	links: 'Links',
	// block: 'Block',
	hide: 'Hide',
};

export class TocBlockSettingTab extends PluginSettingTab {
	plugin: TocBlockPlugin;

	constructor(app: App, plugin: TocBlockPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Display inline')
			.setDesc(
				'How a recognized table of contents tag renders in reading view.',
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(DISPLAY_INLINE_OPTIONS)
					.setValue(this.plugin.settings.displayInline)
					.onChange(async (value) => {
						this.plugin.settings.displayInline =
							value as TocDisplayInlineMode;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Insert marker text')
			.setDesc(
				"Text inserted by the 'Insert table of contents' command and context-menu item. Can span multiple lines — for example, an opening `toc` code fence on one line and a closing fence on the next, for systems that mark a table of contents that way instead of using `[TOC]`.",
			)
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.insertMarker)
					.onChange(async (value) => {
						this.plugin.settings.insertMarker = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('TOC patterns')
			.setDesc(
				'Regular expressions matched against a line to treat it as a table of contents tag, in addition to the literal [TOC] tag.',
			)
			.setHeading();

		this.plugin.settings.tocPatterns.forEach((pattern, index) => {
			new Setting(containerEl)
				.setName(`Pattern ${index + 1}`)
				.addText((text) =>
					text.setValue(pattern).onChange(async (value) => {
						this.plugin.settings.tocPatterns[index] = value;
						await this.plugin.saveSettings();
					}),
				)
				.addExtraButton((button) =>
					button
						.setIcon('trash')
						.setTooltip('Remove pattern')
						.onClick(async () => {
							this.plugin.settings.tocPatterns.splice(index, 1);
							await this.plugin.saveSettings();
							this.display();
						}),
				);
		});

		new Setting(containerEl).addButton((button) =>
			button
				.setButtonText('Add pattern')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.tocPatterns.push('');
					await this.plugin.saveSettings();
					this.display();
				}),
		);
	}
}
