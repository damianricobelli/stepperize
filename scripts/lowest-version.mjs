import { execFileSync } from "node:child_process";

const parts = (version) => version.split(/[.+-]/).slice(0, 3).map(Number);

/** The lowest published version of `name` that `range` allows, as the registry resolves it. */
export function lowest(name, range) {
	const found = JSON.parse(
		execFileSync("npm", ["view", `${name}@${range}`, "version", "--json"], { encoding: "utf8" }) || "[]",
	);
	const versions = [found].flat().sort((a, b) => {
		const [x, y] = [parts(a), parts(b)];
		return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
	});
	if (versions.length === 0) throw new Error(`No published version of ${name} matches "${range}"`);
	return versions[0];
}
