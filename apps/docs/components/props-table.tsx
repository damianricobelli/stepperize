import type * as React from "react";

import { DividerHorizontalIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { Code } from "./ui/code";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./ui/table";

export type PropDef = {
	name: string;
	required?: boolean;
	default?: string | boolean;
	type?: string;
	typeSimple: string;
	description?: string | React.ReactNode;
};

export function PropsTable({
	data,
	propHeaderFixedWidth = true,
}: {
	data: PropDef[];
	propHeaderFixedWidth?: boolean;
}) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead style={{ width: propHeaderFixedWidth ? "37%" : "auto" }}>
						Prop
					</TableHead>
					<TableHead>Type</TableHead>
					<TableHead>Default</TableHead>
				</TableRow>
			</TableHeader>

			<TableBody>
				{data.map(
					(
						{
							name,
							type,
							typeSimple,
							required,
							default: defaultValue,
							description,
						},
						i,
					) => {
						return (
							// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
							<TableRow key={`${name}-${i}`} style={{ whiteSpace: "nowrap" }}>
								<TableCell>
									<div className="inline-flex items-center gap-2">
										<Code variant="info">
											{name}
											{required ? "*" : null}
										</Code>
										{description && (
											<Popover>
												<PopoverTrigger>
													<InfoCircledIcon />
												</PopoverTrigger>
												<PopoverContent
													side="top"
													align="center"
													style={{ maxWidth: 350 }}
													onOpenAutoFocus={(event) => {
														event.preventDefault();
														(event.currentTarget as HTMLElement)?.focus();
													}}
												>
													<p className="text-sm">{description}</p>
												</PopoverContent>
											</Popover>
										)}
									</div>
								</TableCell>
								<TableCell>
									<div className="inline-flex items-center gap-2">
										<Code>{typeSimple ? typeSimple : type}</Code>
										{Boolean(typeSimple) && Boolean(type) && (
											<Popover>
												<PopoverTrigger>
													<InfoCircledIcon />
												</PopoverTrigger>
												<PopoverContent
													side="top"
													align="center"
													className="max-w-[300px] w-full"
												>
													<ScrollArea type="hover">
														<Code>{type}</Code>
														<ScrollBar orientation="horizontal" />
													</ScrollArea>
												</PopoverContent>
											</Popover>
										)}
									</div>
								</TableCell>

								<TableCell>
									{defaultValue ? (
										<Code>{defaultValue}</Code>
									) : (
										<DividerHorizontalIcon style={{ color: "var(--gray-8)" }} />
									)}
								</TableCell>
							</TableRow>
						);
					},
				)}
			</TableBody>
		</Table>
	);
}
