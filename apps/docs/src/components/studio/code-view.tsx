"use client";

import { Fragment, useMemo } from "react";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import type { GeneratedFile } from "@/lib/studio/codegen/generate";
import { type TokenKind, tokenize } from "@/lib/studio/highlight";
import { CopyButton } from "./controls";
import { FileTree } from "./file-tree";
import { useStudio } from "./studio-provider";

const TOKEN_CLASS: Record<TokenKind, string | undefined> = {
	plain: undefined,
	keyword: "text-violet-600 dark:text-violet-300",
	string: "text-emerald-700 dark:text-emerald-300",
	tag: "text-sky-700 dark:text-sky-300",
	comment: "text-muted-foreground italic",
	number: "text-amber-700 dark:text-amber-300",
};

function Code({ source }: { source: string }) {
	const lines = useMemo(() => tokenize(source.replace(/\n$/, "")), [source]);
	return (
		<pre className="py-3 font-mono text-[12.5px] leading-[1.7] [tab-size:2]">
			<code>
				{lines.map((tokens, i) => (
					<span key={i} className="flex">
						<span className="w-11 shrink-0 pr-4 text-right text-muted-foreground/50 select-none tabular-nums">
							{i + 1}
						</span>
						<span className="pr-4 whitespace-pre">
							{tokens.length
								? tokens.map((token, j) => (
										<span key={j} className={TOKEN_CLASS[token.kind]}>
											{token.text}
										</span>
									))
								: " "}
						</span>
					</span>
				))}
			</code>
		</pre>
	);
}

/** The open file's path, with the file name standing out from its folders. */
function PathCrumbs({ path }: { path: string }) {
	const parts = path.split("/");
	const name = parts.pop();
	return (
		<p className="flex min-w-0 items-center gap-1 text-xs" title={path}>
			<span className="truncate text-muted-foreground">
				{parts.map((part) => (
					<Fragment key={part}>
						{part}
						<span className="px-0.5 text-muted-foreground/50">/</span>
					</Fragment>
				))}
			</span>
			<span className="shrink-0 font-medium text-foreground">{name}</span>
		</p>
	);
}

/** The open file with its path and a copy action. */
function FileContent({ file }: { file: GeneratedFile }) {
	return (
		<div className="h-full min-w-0 overflow-auto bg-card">
			<div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-card/95 px-4 py-2 backdrop-blur">
				<PathCrumbs path={file.path} />
				<CopyButton value={file.content} label={`Copy ${file.path}`} size="xs">
					Copy
				</CopyButton>
			</div>
			<Code source={file.content} />
		</div>
	);
}

export function CodeView() {
	const { state, actions, meta } = useStudio();
	const mobile = useIsMobile();
	const { files } = meta.project;
	const active = files.find((f) => f.path === state.file) ?? files[0];
	const tree = (
		<FileTree files={files} active={active} onSelect={actions.selectFile} />
	);

	// Phones stack the tree above the code; wider screens split them with a handle.
	if (mobile) {
		return (
			<div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]">
				<div className="max-h-56 overflow-y-auto border-b bg-sidebar/60 p-2">
					{tree}
				</div>
				<FileContent file={active} />
			</div>
		);
	}

	return (
		<ResizablePanelGroup orientation="horizontal" className="h-full min-h-0">
			<ResizablePanel
				defaultSize={256}
				minSize={180}
				maxSize="50"
				className="bg-sidebar/60"
			>
				<div className="h-full overflow-y-auto p-2">{tree}</div>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel minSize="40">
				<FileContent file={active} />
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
