"use client";

import { useSyncExternalStore } from "react";
import { CURRENT_DOCS_VERSION } from "@/lib/docs-tree";
import {
	BINDINGS,
	CORE_FRAMEWORK,
	DEFAULT_FRAMEWORK,
	type DocsFramework,
	FRAMEWORKS,
	isDocsFramework,
} from "@/lib/frameworks";

/**
 * The framework a visitor reads the landing page in. Picked once (in the hero,
 * the playground, the install command or the frameworks section) and followed
 * everywhere it matters.
 *
 * The server always renders the main binding. The stored choice is read after
 * hydration through `useSyncExternalStore`, whose server snapshot is the
 * default: React hydrates with what the server sent, then re-renders with the
 * visitor's choice, so there is never a hydration mismatch. Storage is only a
 * convenience: when it is blocked or empty, the page is simply React.
 */

const STORAGE_KEY = "stepperize:framework";

/** Every binding, the main one first, then the core. */
export const CHOICES = [
	...BINDINGS,
	...FRAMEWORKS.filter((entry) => entry.id === CORE_FRAMEWORK),
];

export type Choice = (typeof CHOICES)[number];

export const choiceOf = (id: DocsFramework): Choice =>
	CHOICES.find((entry) => entry.id === id) ?? CHOICES[0];

/** What the closed selects show for each value. */
export const CHOICE_LABELS: Record<string, string> = Object.fromEntries(
	CHOICES.map((entry) => [entry.id, entry.title]),
);

let current: DocsFramework | null = null;
const listeners = new Set<() => void>();

function read(): DocsFramework {
	try {
		const stored = window.localStorage.getItem(STORAGE_KEY) ?? undefined;
		return isDocsFramework(stored) ? stored : DEFAULT_FRAMEWORK;
	} catch {
		return DEFAULT_FRAMEWORK;
	}
}

function getSnapshot(): DocsFramework {
	current ??= read();
	return current;
}

const getServerSnapshot = (): DocsFramework => DEFAULT_FRAMEWORK;

function subscribe(listener: () => void) {
	listeners.add(listener);
	// Another tab picked a framework: follow it.
	const onStorage = (event: StorageEvent) => {
		if (event.key !== STORAGE_KEY) return;
		current = read();
		listener();
	};
	window.addEventListener("storage", onStorage);
	return () => {
		listeners.delete(listener);
		window.removeEventListener("storage", onStorage);
	};
}

export function setFramework(id: string) {
	if (!isDocsFramework(id) || id === current) return;
	current = id;
	try {
		window.localStorage.setItem(STORAGE_KEY, id);
	} catch {
		/* storage unavailable: the choice lasts for this page view */
	}
	for (const listener of listeners) listener();
}

/** The visitor's framework: the main binding on the server and until hydration. */
export function useFramework(): DocsFramework {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ─────────────────────────────── doc links ──────────────────────────── */

type DocPage =
	| "intro"
	| "install"
	| "start"
	| "forms"
	| "primitives"
	| "shared-state"
	| "url"
	| "api";

/**
 * Where each kind of page lives for each framework, as the splat after
 * `/docs/`. The bindings share one layout; React has more guides, the HTML
 * entry and the core have pages of their own.
 */
const PAGES: Record<DocPage, (id: DocsFramework) => string> = {
	intro: (id) => id,
	install: (id) =>
		id === "html" || id === CORE_FRAMEWORK ? id : `${id}/installation`,
	start: (id) =>
		id === "html"
			? id
			: id === CORE_FRAMEWORK
				? "core/create-stepper"
				: `${id}/first-stepper`,
	forms: (id) =>
		id === "react"
			? "react/forms"
			: id === "html"
				? "html/guides/htmx"
				: id === CORE_FRAMEWORK
					? "react/guides/validation"
					: `${id}/guides/forms`,
	primitives: (id) =>
		id === "html" || id === CORE_FRAMEWORK
			? "html/markup"
			: `${id}/guides/primitives`,
	"shared-state": (id) =>
		id === "html" || id === CORE_FRAMEWORK
			? "core/create-stepper"
			: `${id}/guides/shared-state`,
	url: (id) =>
		id === "html"
			? "html/guides/server-rendered"
			: id === CORE_FRAMEWORK
				? "core/errors"
				: `${id}/guides/url`,
	api: (id) =>
		id === "react"
			? "react/api/stepper"
			: id === "html"
				? "html/markup"
				: id === CORE_FRAMEWORK
					? "core/create-stepper"
					: `${id}/api/define-stepper`,
};

export const docPath = (id: DocsFramework, page: DocPage) =>
	`${CURRENT_DOCS_VERSION}/${PAGES[page](id)}`;
