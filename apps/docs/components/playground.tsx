"use client";

import { SandpackCodeEditor, SandpackPreview, SandpackProvider } from "@codesandbox/sandpack-react";
import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface PlaygroundProps {
	code: string;
}

export const Playground = ({ code = DEFAULT_CODE }: PlaygroundProps) => {
	return (
		<SandpackProvider
			template="vite-preact-ts"
			customSetup={{
				dependencies: {
					"@stepperize/react": "latest",
					"@conform-to/react": "latest",
					"@conform-to/zod": "latest",
					"@hookform/resolvers": "latest",
					"@radix-ui/colors": "latest",
					"@radix-ui/react-collapsible": "latest",
					"@radix-ui/react-dialog": "latest",
					"@radix-ui/react-icons": "latest",
					"@radix-ui/react-label": "latest",
					"@radix-ui/react-popover": "latest",
					"@radix-ui/react-radio-group": "latest",
					"@radix-ui/react-scroll-area": "latest",
					"@radix-ui/react-separator": "latest",
					"@radix-ui/react-slot": "latest",
					"@radix-ui/react-switch": "latest",
					"@radix-ui/react-tabs": "latest",
					"class-variance-authority": "latest",
				},
			}}
			files={{
				"/App.tsx": code,
				"/tsconfig.json": {
					code: TSCONFIG_FILE,
					hidden: true,
				},
			}}
		>
			<Tabs defaultValue="preview" className="w-full">
				<TabsList>
					<TabsTrigger value="preview">Preview</TabsTrigger>
					<TabsTrigger value="code">Code</TabsTrigger>
				</TabsList>
				<TabsContent value="preview" className="border-none p-0">
					<Card className="overflow-hidden">
						<SandpackPreview showRefreshButton={true} className="h-[400px] min-h-[400px]" />
					</Card>
				</TabsContent>
				<TabsContent value="code" className="border-none p-0">
					<Card className="overflow-hidden">
						<SandpackCodeEditor
							showTabs={false}
							showLineNumbers={true}
							showInlineErrors={true}
							wrapContent={true}
							className="h-[400px] min-h-[400px]"
						/>
					</Card>
				</TabsContent>
			</Tabs>
		</SandpackProvider>
	);
};

const DEFAULT_CODE = `export default function App(): JSX.Element {
	return <h1>Hello world</h1>
}`;

const TSCONFIG_FILE = `{
	"compilerOptions": {
		"baseUrl": ".",
		"target": "ESNext",
		"lib": ["dom", "dom.iterable", "esnext"],
		"allowJs": true,
		"skipLibCheck": true,
		"strict": true,
		"forceConsistentCasingInFileNames": true,
		"noEmit": true,
		"esModuleInterop": true,
		"module": "esnext",
		"moduleResolution": "node",
		"resolveJsonModule": true,
		"isolatedModules": true,
		"jsx": "preserve",
		"incremental": true,
		"paths": {
			"@/*": ["./*"]
		},
		"plugins": [
			{
				"name": "next"
			}
		]
	},
	"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
	"exclude": ["node_modules"]
}`;
