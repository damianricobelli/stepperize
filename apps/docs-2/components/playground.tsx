"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { LiveEditor, LiveError, LivePreview, LiveProvider } from "react-live";

interface PlaygroundProps {
	code: string;
}

export function Playground({ code = DEFAULT_CODE }: PlaygroundProps) {
	return (
		<Card className="border-none shadow-none">
			<CardContent className="p-0">
				<LiveProvider code={code} noInline>
					<Tabs defaultValue="editor">
						<TabsList className="w-fit">
							<TabsTrigger value="editor">Editor</TabsTrigger>
							<TabsTrigger value="preview">Preview</TabsTrigger>
						</TabsList>
						<TabsContent value="editor">
							<LiveEditor className="font-mono text-sm bg-muted rounded-md [&_pre]:min-h-[300px] [&_pre]:max-h-[300px] [&_pre]:overflow-auto" />
						</TabsContent>
						<TabsContent
							value="preview"
							className="border rounded-md min-h-[300px] max-h-[300px] overflow-auto bg-background"
						>
							<LivePreview />
						</TabsContent>
					</Tabs>
					<LiveError className="mt-4 p-4 text-sm text-destructive bg-destructive/10 rounded-md" />
				</LiveProvider>
			</CardContent>
		</Card>
	);
}

const DEFAULT_CODE = `type Props = {
  label: string;
}
const Counter = (props: Props) => {
  const [count, setCount] =
    React.useState<number>(0)
  return (
    <div>
      <h3 style={{
        background: 'darkslateblue',
        color: 'white',
        padding: 8,
        borderRadius: 4
      }}>
        {props.label}: {count} 🧮
      </h3>
      <button
        onClick={() =>
          setCount(c => c + 1)
        }>
        Increment
      </button>
    </div>
  )
}
render(<Counter label="Counter" />)`;
