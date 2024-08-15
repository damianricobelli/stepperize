import { type VariantProps, cva } from "class-variance-authority";

export function Code({
	children,
	variant,
	...props
}: JSX.IntrinsicElements["code"] & VariantProps<typeof classForCode>) {
	return (
		<code className={classForCode({ variant })} {...props}>
			{children}
		</code>
	);
}

const classForCode = cva("rounded-sm px-1 py-0.5 text-xs", {
	variants: {
		variant: {
			default: "bg-gray-3",
			info: "bg-info-3",
			unstyled: "text-gray-11",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});
