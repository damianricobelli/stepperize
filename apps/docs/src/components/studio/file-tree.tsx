"use client";

import {
	ChevronRight,
	FileCode,
	FileType2,
	Folder,
	FolderOpen,
} from "lucide-react";
import { useState } from "react";
import type { GeneratedFile } from "@/lib/studio/codegen/generate";
import { cn } from "@/lib/utils";

/**
 * The generated files as a tree: nested folders with indent guides, single
 * folder chains compacted the way editors show them (`components/stepperize/x`),
 * collapsible folders, and an icon tint per file kind.
 */

type TreeNode = {
	name: string;
	path: string;
	folders: TreeNode[];
	files: GeneratedFile[];
};

function buildTree(files: GeneratedFile[]): TreeNode {
	const root: TreeNode = { name: "", path: "", folders: [], files: [] };
	for (const file of files) {
		const parts = file.path.split("/");
		let node = root;
		for (const part of parts.slice(0, -1)) {
			const path = node.path ? `${node.path}/${part}` : part;
			let next = node.folders.find((folder) => folder.path === path);
			if (!next) {
				next = { name: part, path, folders: [], files: [] };
				node.folders.push(next);
			}
			node = next;
		}
		node.files.push(file);
	}
	return root;
}

/** Merges folders that hold nothing but one other folder: `a` › `b` › `c` becomes `a/b/c`. */
function compact(node: TreeNode): TreeNode {
	let current = node;
	while (current.files.length === 0 && current.folders.length === 1) {
		const [only] = current.folders;
		current = { ...only, name: `${current.name}/${only.name}` };
	}
	return { ...current, folders: current.folders.map(compact) };
}

const fileName = (file: GeneratedFile) =>
	file.path.slice(file.path.lastIndexOf("/") + 1);

function FileIcon({ file }: { file: GeneratedFile }) {
	return file.path.endsWith(".tsx") ? (
		<FileCode
			aria-hidden
			className="size-4 shrink-0 text-sky-600 dark:text-sky-400"
		/>
	) : (
		<FileType2
			aria-hidden
			className="size-4 shrink-0 text-blue-600 dark:text-blue-400"
		/>
	);
}

const ROW =
	"flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[13px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring";

type TreeProps = {
	active: GeneratedFile;
	onSelect: (path: string) => void;
	collapsed: ReadonlySet<string>;
	onToggle: (path: string) => void;
};

/** A compacted folder name keeps its last segment whole; the leading path truncates. */
function FolderName({ name }: { name: string }) {
	const cut = name.lastIndexOf("/");
	if (cut === -1)
		return <span className="min-w-0 truncate font-medium">{name}</span>;
	return (
		<span className="flex min-w-0">
			<span className="min-w-0 truncate">{name.slice(0, cut + 1)}</span>
			<span className="shrink-0 font-medium text-foreground/90">
				{name.slice(cut + 1)}
			</span>
		</span>
	);
}

function FolderNode({ node, ...props }: TreeProps & { node: TreeNode }) {
	const open = !props.collapsed.has(node.path);
	const Icon = open ? FolderOpen : Folder;
	return (
		<li>
			<button
				type="button"
				aria-expanded={open}
				title={node.path}
				onClick={() => props.onToggle(node.path)}
				className={cn(
					ROW,
					"group text-muted-foreground pointer-fine:hover:bg-muted pointer-fine:hover:text-foreground",
				)}
			>
				<ChevronRight
					aria-hidden
					className="size-3.5 shrink-0 transition-transform duration-150 ease-out group-aria-expanded:rotate-90"
				/>
				<Icon
					aria-hidden
					className="size-4 shrink-0 text-amber-500 dark:text-amber-400/90"
				/>
				<FolderName name={node.name} />
			</button>
			{open ? <Branch node={node} {...props} /> : null}
		</li>
	);
}

/** A folder's children, indented under a guide line that starts at the chevron. */
function Branch({ node, ...props }: TreeProps & { node: TreeNode }) {
	return (
		<ul className="ml-[13px] grid gap-px border-l pl-1.5">
			{node.folders.map((folder) => (
				<FolderNode key={folder.path} node={folder} {...props} />
			))}
			{node.files.map((file) => {
				const current = file === props.active;
				return (
					<li key={file.path}>
						<button
							type="button"
							aria-current={current ? "page" : undefined}
							title={file.path}
							onClick={() => props.onSelect(file.path)}
							className={cn(
								ROW,
								current
									? "bg-primary/10 font-medium text-foreground dark:bg-primary/15"
									: "text-muted-foreground pointer-fine:hover:bg-muted pointer-fine:hover:text-foreground",
							)}
						>
							<FileIcon file={file} />
							<span className="min-w-0 truncate">{fileName(file)}</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}

export function FileTree({
	files,
	active,
	onSelect,
}: {
	files: GeneratedFile[];
	active: GeneratedFile;
	onSelect: (path: string) => void;
}) {
	const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
	const root = buildTree(files);
	const tops = root.folders.map(compact);
	const props: TreeProps = {
		active,
		onSelect,
		collapsed,
		onToggle: (path) =>
			setCollapsed((current) => {
				const next = new Set(current);
				if (!next.delete(path)) next.add(path);
				return next;
			}),
	};

	return (
		<nav aria-label="Generated files" className="grid content-start gap-2">
			<div className="flex items-center justify-between px-1.5 pt-1">
				<p className="text-xs font-medium text-muted-foreground">Files</p>
				<span className="text-[11px] text-muted-foreground tabular-nums">
					{files.length}
				</span>
			</div>
			<ul className="grid gap-px">
				{tops.map((folder) => (
					<FolderNode key={folder.path} node={folder} {...props} />
				))}
			</ul>
		</nav>
	);
}
