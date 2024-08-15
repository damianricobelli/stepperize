import nextra from "nextra";

const withNextra = nextra({
	theme: "nextra-theme-docs",
	themeConfig: "./theme.config.tsx",
	latex: true,
	flexsearch: {
		codeblocks: false,
	},
	defaultShowCopyCode: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withNextra(nextConfig);
