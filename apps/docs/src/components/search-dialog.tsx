"use client";

import { useDocsSearch } from "fumadocs-core/search/client";
import { fetchClient } from "fumadocs-core/search/client/fetch";
import { useOnChange } from "fumadocs-core/utils/use-on-change";
import {
	SearchDialog,
	SearchDialogClose,
	SearchDialogContent,
	SearchDialogFooter,
	SearchDialogHeader,
	SearchDialogIcon,
	SearchDialogInput,
	SearchDialogList,
	SearchDialogOverlay,
} from "fumadocs-ui/components/dialog/search";
import type { DefaultSearchDialogProps } from "fumadocs-ui/components/dialog/search-default";
import { useI18n } from "fumadocs-ui/contexts/i18n";
import { type KeyboardEvent, useMemo, useState } from "react";
import { FrameworkIcon } from "@/components/framework-icon";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/**
 * The docs search dialog, built from Fumadocs' parts (as its default dialog
 * is), with one difference: the framework tags sit inside the dialog, under
 * the input.
 *
 * Fumadocs 16's default dialog renders its tag list in a footer outside the
 * dialog content. The search provider mounts the closed dialog up front, so
 * that footer showed as a stray row of buttons at the top of every page. Here
 * the tags only exist while the dialog is open, and they are real, reachable
 * controls: a toggle group that says which framework is ranked first.
 *
 * Ranking itself is the server's (`lib/search.ts`): `v9/vue` searches all of
 * v9 and puts Vue first.
 */
export default function StepperizeSearchDialog({
	defaultTag,
	tags = [],
	api,
	delayMs,
	links = [],
	footer,
	// `type: "static"` and `allowClear` are not used by this site.
	type: _type,
	allowClear: _allowClear,
	...props
}: DefaultSearchDialogProps) {
	const { locale } = useI18n();
	const [tag, setTag] = useState(defaultTag);
	// Moving to another framework's docs moves the default with it.
	useOnChange(defaultTag, (value) => setTag(value));

	const search = useDocsSearch({
		client: fetchClient({ api, locale, tag }),
		delayMs,
	});

	const defaultItems = useMemo(
		() =>
			links.length === 0
				? null
				: links.map(([name, url]) => ({
						type: "page" as const,
						id: name,
						content: name,
						url,
					})),
		[links],
	);

	return (
		<SearchDialog {...search} {...props}>
			<SearchDialogOverlay />
			<SearchDialogContent>
				<SearchDialogHeader>
					<SearchDialogIcon />
					<SearchDialogInput />
					<SearchDialogClose />
				</SearchDialogHeader>
				{tags.length > 0 && (
					<FrameworkTags tags={tags} value={tag} onValueChange={setTag} />
				)}
				<SearchDialogList defaultItems={defaultItems} />
			</SearchDialogContent>
			{footer && <SearchDialogFooter>{footer}</SearchDialogFooter>}
		</SearchDialog>
	);
}

/** Keys the results list reads from `window`: kept inside the tags while they have focus. */
const LIST_KEYS = new Set(["Enter", "ArrowUp", "ArrowDown"]);

function FrameworkTags({
	tags,
	value,
	onValueChange,
}: {
	tags: NonNullable<DefaultSearchDialogProps["tags"]>;
	value: string | undefined;
	onValueChange: (value: string) => void;
}) {
	return (
		<div className="flex items-center gap-2 py-2 ps-3">
			<span
				id="search-framework-label"
				className="shrink-0 text-xs text-fd-muted-foreground max-sm:sr-only"
			>
				Framework first
			</span>
			<ToggleGroup
				aria-labelledby="search-framework-label"
				value={value ? [value] : []}
				onValueChange={(next) => {
					// Pressing the chosen one again would leave none: keep it.
					if (next[0]) onValueChange(next[0]);
				}}
				spacing={1}
				size="sm"
				// The results list answers Enter and the vertical arrows from `window`:
				// pressing a framework must not also open the highlighted result.
				onKeyDown={(event: KeyboardEvent) => {
					if (LIST_KEYS.has(event.key)) event.stopPropagation();
				}}
				className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain py-1 pe-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
			>
				{tags.map((item) => (
					<ToggleGroupItem
						key={item.value}
						value={item.value}
						className="gap-1.5 rounded-full border border-transparent px-2.5 text-xs transition-colors font-normal text-fd-muted-foreground pointer-coarse:h-9 hover:bg-fd-accent/60 hover:text-fd-foreground aria-pressed:border-fd-border aria-pressed:bg-fd-accent aria-pressed:font-medium aria-pressed:text-fd-accent-foreground"
					>
						<FrameworkIcon
							id={item.value.split("/")[1] ?? ""}
							className="size-3.5"
						/>
						{item.name}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	);
}
