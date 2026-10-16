import { cva, type VariantProps } from "class-variance-authority";

/**
 * Call-to-action styling for the marketing surfaces (landing, blocks, footer).
 * Applied as a className so the same look works on a router `Link`, an `<a>`,
 * or a `<button>` without wrapper components or `asChild` plumbing.
 */
export const cta = cva(
	"pressable inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				primary:
					"bg-foreground text-background shadow-sm hover:bg-foreground/85",
				brand:
					"bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90",
				secondary:
					"border bg-card text-foreground shadow-xs hover:border-foreground/20 hover:bg-muted",
				ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
			},
			size: {
				sm: "h-8 px-3 text-[13px] [&_svg]:size-3.5",
				md: "h-10 px-4 text-sm [&_svg]:size-4",
				lg: "h-11 px-5 text-[15px] [&_svg]:size-4",
			},
		},
		defaultVariants: { variant: "primary", size: "md" },
	},
);

export type CtaProps = VariantProps<typeof cta>;
