import { readFileSync } from "node:fs";

export function fileToString(filePath: string): string {
	try {
		return readFileSync(filePath, "utf-8");
	} catch (error) {
		console.error(`Error reading file: ${filePath}`, error);
		return "";
	}
}
