"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";

export function ThemeSwitcher() {
	const { theme, setTheme } = useTheme();
	return (
		<Button
			onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
			variant="ghost"
			className="px-3"
		>
			{theme === "dark" ? (
				<Moon className="size-4" />
			) : (
				<Sun className="size-4" />
			)}
		</Button>
	);
}
