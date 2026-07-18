import { Editor, HeadingCache, MarkdownPostProcessorContext } from 'obsidian';

export function insertTocMarker(editor: Editor, marker: string): void {
	const cursor = editor.getCursor();
	const line = editor.getLine(cursor.line);
	const before = line.slice(0, cursor.ch);
	const after = line.slice(cursor.ch);

	const leading = before.trim().length > 0 ? '\n\n' : '';
	const trailing = after.trim().length > 0 ? '\n\n' : '';

	editor.replaceSelection(`${leading}${marker}${trailing}`);
}

export function compileTocPatterns(patterns: string[]): RegExp[] {
	const compiled: RegExp[] = [];
	for (const pattern of patterns) {
		try {
			compiled.push(new RegExp(pattern));
		} catch {
			// Invalid regex in settings; skip it rather than break rendering.
		}
	}
	return compiled;
}

export function lineMatchesToc(line: string, patterns: RegExp[]): boolean {
	return patterns.some((pattern) => pattern.test(line));
}

export function slugifyHeading(text: string): string {
	return text
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s-]/gu, '')
		.replace(/\s+/g, '-');
}

// Headings with identical text would otherwise collide on the same slug,
// producing duplicate ids/hrefs that all resolve to the first occurrence.
// Disambiguate repeats in document order: first occurrence keeps the plain
// slug, subsequent ones get -1, -2, etc appended.
export function computeHeadingSlugs(
	headings: HeadingCache[],
): Map<HeadingCache, string> {
	const counts = new Map<string, number>();
	const slugs = new Map<HeadingCache, string>();

	for (const heading of headings) {
		const base = slugifyHeading(heading.heading);
		const count = counts.get(base) ?? 0;
		counts.set(base, count + 1);
		slugs.set(heading, count === 0 ? base : `${base}-${count}`);
	}

	return slugs;
}

// Reading view/export render headings without a stable, predictable `id`
// attribute we can rely on, so we assign our own (matching the slug used for
// the TOC's anchor hrefs) to every heading element we encounter. Native
// `href="#id"` anchors are what makes links clickable in exported PDFs,
// which have no JS to intercept clicks the way the live app does.
export function assignHeadingIds(
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
	fileHeadings: HeadingCache[],
): void {
	const slugs = computeHeadingSlugs(fileHeadings);

	el.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((headingEl) => {
		const info = ctx.getSectionInfo(headingEl as HTMLElement);
		if (!info) return;

		const match = fileHeadings.find(
			(h) => h.position.start.line === info.lineStart,
		);
		if (match) {
			headingEl.id = slugs.get(match)!;
		}
	});
}

export function buildTocList(headings: HeadingCache[]): HTMLElement {
	if (headings.length === 0) {
		return createDiv({
			cls: 'toc-block-empty',
			text: 'No headings found.',
		});
	}

	const slugs = computeHeadingSlugs(headings);
	const root = createEl('ul', { cls: 'toc-block-list' });
	const stack: { level: number; list: HTMLElement }[] = [
		{ level: 0, list: root },
	];

	for (const heading of headings) {
		while (
			stack.length > 1 &&
			stack[stack.length - 1]!.level >= heading.level
		) {
			stack.pop();
		}

		const item = stack[stack.length - 1]!.list.createEl('li');
		item.createEl('a', {
			cls: 'internal-link toc-block-link',
			text: heading.heading,
			href: `#${slugs.get(heading)}`,
			attr: { 'data-href': `#${heading.heading}` },
		});

		const childList = item.createEl('ul');
		stack.push({ level: heading.level, list: childList });
	}

	root.querySelectorAll('ul:empty').forEach((el) => el.remove());

	return root;
}
