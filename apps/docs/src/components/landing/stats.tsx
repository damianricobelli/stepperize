"use client";

import { useEffect, useState } from "react";

/**
 * Live social-proof numbers (GitHub stars, npm downloads, gzip bundle size).
 *
 * These are fetched on the client from public, unauthenticated endpoints and
 * cached in localStorage so repeat visits don't re-hit the APIs. Every value
 * has a sensible static fallback, so the bar always renders something
 * trustworthy even if a request is rate-limited, blocked, or offline — the
 * page never shows a broken or empty stat.
 */

const REPO = "damianricobelli/stepperize";
const PKG = "@stepperize/react";
const ENCODED_PKG = encodeURIComponent(PKG);
const CACHE_KEY = "stepperize:stats:v1";
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

export type Stats = {
	/** GitHub stargazers. */
	stars: number | null;
	/** npm downloads in the last 30 days. */
	downloads: number | null;
	/** Minified + gzipped size in bytes. */
	gzip: number | null;
};

const EMPTY: Stats = { stars: null, downloads: null, gzip: null };

type Cached = { at: number; data: Stats };

function readCache(): Cached | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(CACHE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Cached;
		if (Date.now() - parsed.at > CACHE_TTL) return null;
		return parsed;
	} catch {
		return null;
	}
}

function writeCache(data: Stats) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(
			CACHE_KEY,
			JSON.stringify({ at: Date.now(), data } satisfies Cached),
		);
	} catch {
		/* storage unavailable — fine, we just refetch next time */
	}
}

async function fetchJson(url: string): Promise<unknown | null> {
	try {
		const res = await fetch(url, { headers: { Accept: "application/json" } });
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}

async function fetchStats(): Promise<Stats> {
	const [repo, npm, size] = await Promise.all([
		fetchJson(`https://api.github.com/repos/${REPO}`),
		fetchJson(
			`https://api.npmjs.org/downloads/point/last-month/${ENCODED_PKG}`,
		),
		fetchJson(
			`https://bundlephobia.com/api/size?package=${ENCODED_PKG}@latest`,
		),
	]);

	const stars =
		repo &&
		typeof (repo as { stargazers_count?: unknown }).stargazers_count ===
			"number"
			? (repo as { stargazers_count: number }).stargazers_count
			: null;
	const downloads =
		npm && typeof (npm as { downloads?: unknown }).downloads === "number"
			? (npm as { downloads: number }).downloads
			: null;
	const gzip =
		size && typeof (size as { gzip?: unknown }).gzip === "number"
			? (size as { gzip: number }).gzip
			: null;

	return { stars, downloads, gzip };
}

/**
 * Returns live stats, hydrating from cache first and refreshing in the
 * background. Values are `null` until known, so callers fall back to static
 * copy and never render a misleading zero.
 */
export function useStepperizeStats(): Stats {
	const [stats, setStats] = useState<Stats>(EMPTY);

	useEffect(() => {
		const cached = readCache();
		if (cached) {
			setStats(cached.data);
			const isComplete = Object.values(cached.data).every(
				(value) => value != null,
			);
			if (isComplete) return;
		}
		let active = true;
		fetchStats().then((data) => {
			if (!active) return;
			setStats(data);
			writeCache(data);
		});
		return () => {
			active = false;
		};
	}, []);

	return stats;
}

/** `1234` → `1.2k`, `1500000` → `1.5M`. */
export function formatCompact(n: number): string {
	if (n < 1000) return String(n);
	if (n < 1_000_000) {
		const k = n / 1000;
		return `${k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}k`;
	}
	const m = n / 1_000_000;
	return `${m.toFixed(1).replace(/\.0$/, "")}M`;
}

/** Bytes → `1.6 kB`. */
export function formatKb(bytes: number): string {
	return `${(bytes / 1024).toFixed(1).replace(/\.0$/, "")} kB`;
}
