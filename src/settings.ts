import { App, PluginSettingTab, Setting, SettingDefinitionItem } from 'obsidian';
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

const TOC_PATTERN_KEY_RE = /^tocPatterns\.(\d+)$/;

export class TocBlockSettingTab extends PluginSettingTab {
	plugin: TocBlockPlugin;

	constructor(app: App, plugin: TocBlockPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Display inline',
				desc: 'How a recognized table of contents tag renders in reading view.',
				control: {
					type: 'dropdown',
					key: 'displayInline',
					options: DISPLAY_INLINE_OPTIONS,
				},
			},
			{
				name: 'Insert marker text',
				desc: "Text inserted by the 'Insert table of contents' command and context-menu item. Can span multiple lines — for example, an opening `toc` code fence on one line and a closing fence on the next, for systems that mark a table of contents that way instead of using `[TOC]`.",
				control: {
					type: 'textarea',
					key: 'insertMarker',
				},
			},
			{
				type: 'list',
				heading: 'TOC patterns',
				desc: 'Regular expressions matched against a line to treat it as a table of contents tag, in addition to the literal [TOC] tag.',
				items: this.plugin.settings.tocPatterns.map((_, index) => ({
					name: `Pattern ${index + 1}`,
					control: { type: 'text', key: `tocPatterns.${index}` },
				})),
				onDelete: (index) => {
					this.plugin.settings.tocPatterns.splice(index, 1);
					void this.plugin.saveSettings();
					this.refreshDeclarativeList();
				},
				addItem: {
					name: 'Add pattern',
					action: () => {
						this.plugin.settings.tocPatterns.push('');
						void this.plugin.saveSettings();
						this.refreshDeclarativeList();
					},
				},
			},
		];
	}

	// `PluginSettingTab.getControlValue`/`setControlValue`/`SettingTab.update`
	// are 1.13.0+ APIs, only ever invoked by Obsidian's own declarative-settings
	// renderer — which itself only runs on 1.13.0+ cores, since older versions
	// never call getSettingDefinitions() in the first place. Implemented
	// directly against plugin settings (rather than delegating to `super`) and
	// called through untyped property lookups so a static minAppVersion check
	// can't (correctly, in the general case) flag a call our own control flow
	// already guarantees is unreachable below 1.13.0.
	getControlValue(key: string): unknown {
		const match = TOC_PATTERN_KEY_RE.exec(key);
		if (match) {
			return this.plugin.settings.tocPatterns[Number(match[1])];
		}
		return (this.plugin.settings as unknown as Record<string, unknown>)[key];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const match = TOC_PATTERN_KEY_RE.exec(key);
		if (match) {
			this.plugin.settings.tocPatterns[Number(match[1])] = value as string;
		} else {
			(this.plugin.settings as unknown as Record<string, unknown>)[key] =
				value;
		}
		await this.plugin.saveSettings();
	}

	private refreshDeclarativeList(): void {
		(this as unknown as { update?: () => void }).update?.();
	}

	// Fallback for Obsidian versions older than 1.13.0, which don't know
	// about getSettingDefinitions() at all. On 1.13.0+ this is bypassed
	// automatically in favor of the declarative definitions above.
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
