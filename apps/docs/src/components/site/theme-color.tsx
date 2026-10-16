"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

/** Page background per scheme; the browser chrome and status bar match it. */
export const THEME_COLORS = { light: "#fcfcfd", dark: "#0d0e11" } as const;

/**
 * The theme-color meta tags follow `prefers-color-scheme`, which is wrong as
 * soon as someone picks a theme with the toggle. Keep the status bar matched
 * to the theme actually on screen.
 */
export function ThemeColorSync() {
	const { resolvedTheme } = useTheme();

	useEffect(() => {
		if (resolvedTheme !== "light" && resolvedTheme !== "dark") return;
		for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
			meta.setAttribute("content", THEME_COLORS[resolvedTheme]);
		}
	}, [resolvedTheme]);

	return null;
}
