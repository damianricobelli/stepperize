"use client";

import { FileCode2, FolderOpen } from "lucide-react";
import { useMemo } from "react";
import { CopyButton } from "@/components/blocks-gallery/copy-button";
import type { GeneratedFile } from "@/lib/studio/codegen/generate";
import { type TokenKind, tokenize } from "@/lib/studio/highlight";
import { cn } from "@/lib/utils";
import { useStudio } from "./studio-provider";

const TOKEN_CLASS: Record<TokenKind, string | undefined> = {
	plain: undefined,
	keyword: "text-violet-600 dark:text-violet-300",
	string: "text-emerald-700 dark:text-emerald-300",
	tag: "text-sky-700 dark:text-sky-300",
	comment: "text-muted-foreground italic",
	number: "text-amber-700 dark:text-amber-300",
};

/** Groups files by folder so route files read apart from the component folder. */
function groupFiles(
	files: GeneratedFile[],
): { dir: string; files: GeneratedFile[] }[] {
	const groups = new Map<string, GeneratedFile[]>();
	for (const file of files) {
		const dir = file.path.slice(0, file.path.lastIndexOf("/"));
		groups.set(dir, [...(groups.get(dir) ?? []), file]);
	}
	return [...groups].map(([dir, files]) => ({ dir, files }));
}

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

export function CodeView() {
	const { state, actions, meta } = useStudio();
	const { files } = meta.project;
	const active = files.find((f) => f.path === state.file) ?? files[0];
	const groups = groupFiles(files);

	return (
		<div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[15rem_minmax(0,1fr)] md:grid-rows-1">
			<nav
				aria-label="Generated files"
				className="flex gap-0.5 overflow-x-auto border-b bg-muted/30 p-2 md:flex-col md:overflow-y-auto md:border-r md:border-b-0"
			>
				{groups.map((group) => (
					<div key={group.dir} className="contents md:grid md:gap-0.5 md:pb-2">
						<p className="hidden items-center gap-1.5 px-2 pt-1 pb-0.5 font-mono text-[11px] break-all text-muted-foreground md:flex">
							<FolderOpen aria-hidden className="size-3 shrink-0" />
							{group.dir}/
						</p>
						{group.files.map((file) => (
							<button
								key={file.path}
								type="button"
								aria-current={file === active ? "true" : undefined}
								title={file.path}
								onClick={() => actions.selectFile(file.path)}
								className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-left font-mono text-xs whitespace-nowrap text-muted-foreground outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring aria-[current]:bg-accent aria-[current]:text-accent-foreground pointer-fine:hover:not-aria-[current]:bg-muted pointer-fine:hover:not-aria-[current]:text-foreground"
							>
								<FileCode2 aria-hidden className="size-3.5 shrink-0" />
								<span className="truncate">
									{file.path.slice(group.dir.length + 1)}
								</span>
							</button>
						))}
					</div>
				))}
			</nav>
			<div className="min-w-0 overflow-auto bg-card">
				<div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-card/95 px-4 py-2 backdrop-blur">
					<span className="truncate font-mono text-xs text-muted-foreground">
						{active.path}
					</span>
					<CopyButton
						value={active.content}
						label={`Copy ${active.path}`}
						className={cn(
							"shrink-0 rounded-md border px-2 py-1 text-xs font-medium",
						)}
					>
						Copy
					</CopyButton>
				</div>
				<Code source={active.content} />
			</div>
		</div>
	);
}
