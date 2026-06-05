import { defineStepper } from "@stepperize/react";
import { Check, Plus, Send, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type Invite = { email: string; role: "Member" | "Admin" };

const team = defineStepper([
	{ id: "invite", title: "Invite your team" },
	{ id: "review", title: "Review invites" },
	{ id: "sent", title: "Invites sent" },
]);

const { Stepper } = team;

/**
 * Draft values and review: invites are stored in `stepper.data` as they're
 * added, then the review step reads them back before sending. Inner components
 * call `team.useStepper()` to read the same instance the Root provides.
 */
export function TeamInvitesBlock() {
	return (
		<Stepper.Root
			linear
			className="w-full max-w-sm rounded-xl border bg-background p-5 shadow-sm"
		>
			{() => (
				<>
					<Header />
					<InviteStep />
					<ReviewStep />
					<SentStep />
				</>
			)}
		</Stepper.Root>
	);
}

function useInvites() {
	const stepper = team.useStepper();
	const invites = (stepper.data.get("invite") as Invite[] | undefined) ?? [];
	return { stepper, invites };
}

function Header() {
	const { stepper, invites } = useInvites();
	return (
		<div className="mb-4 flex items-center gap-2.5">
			<span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
				<Users className="size-4" />
			</span>
			<div>
				<p className="text-sm font-semibold">{stepper.current.title}</p>
				<p className="text-xs text-muted-foreground">
					{invites.length} {invites.length === 1 ? "invite" : "invites"} so far
				</p>
			</div>
		</div>
	);
}

function InviteStep() {
	const { stepper, invites } = useInvites();
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<Invite["role"]>("Member");

	const add = () => {
		if (!email.includes("@")) return;
		stepper.data.set("invite", [...invites, { email, role }]);
		setEmail("");
	};
	const remove = (index: number) =>
		stepper.data.set(
			"invite",
			invites.filter((_, i) => i !== index),
		);

	return (
		<Stepper.Content step="invite" className="space-y-3">
			<div className="flex gap-2">
				<Input
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && add()}
					placeholder="name@company.com"
					className="min-w-0 flex-1"
				/>
				<Select
					value={role}
					onValueChange={(value) => setRole(value as Invite["role"])}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="Member">Member</SelectItem>
						<SelectItem value="Admin">Admin</SelectItem>
					</SelectContent>
				</Select>
				<Button size="icon" onClick={add} aria-label="Add invite">
					<Plus />
				</Button>
			</div>

			<ul className="space-y-1.5">
				{invites.map((invite, i) => (
					<li
						key={invite.email}
						className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm"
					>
						<span className="flex-1 truncate">{invite.email}</span>
						<Badge variant="secondary">{invite.role}</Badge>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => remove(i)}
							aria-label={`Remove ${invite.email}`}
							className="text-muted-foreground hover:text-destructive"
						>
							<Trash2 />
						</Button>
					</li>
				))}
			</ul>

			<Button
				className="w-full"
				disabled={invites.length === 0}
				onClick={() => stepper.next()}
			>
				Review {invites.length > 0 ? `${invites.length} ` : ""}invites
			</Button>
		</Stepper.Content>
	);
}

function ReviewStep() {
	const { stepper, invites } = useInvites();
	return (
		<Stepper.Content step="review" className="space-y-3">
			<p className="text-sm text-muted-foreground">
				You're inviting <b className="text-foreground">{invites.length}</b>{" "}
				{invites.length === 1 ? "person" : "people"}.
			</p>
			<ul className="space-y-1.5">
				{invites.map((invite) => (
					<li
						key={invite.email}
						className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm"
					>
						<span className="truncate">{invite.email}</span>
						<Badge variant="secondary">{invite.role}</Badge>
					</li>
				))}
			</ul>
			<div className="flex items-center justify-between gap-3">
				<Button variant="ghost" size="sm" onClick={() => stepper.prev()}>
					Edit
				</Button>
				<Button
					onClick={() => {
						stepper.setComplete("review");
						stepper.next();
					}}
				>
					<Send /> Send invites
				</Button>
			</div>
		</Stepper.Content>
	);
}

function SentStep() {
	const { stepper, invites } = useInvites();
	return (
		<Stepper.Content
			step="sent"
			className="grid place-items-center gap-2 py-4 text-center"
		>
			<span className="grid size-12 place-items-center rounded-full bg-chart-2/15 text-chart-2">
				<Check className="size-6" />
			</span>
			<p className="text-sm font-medium">{invites.length} invites sent</p>
			<p className="text-xs text-muted-foreground">
				Your teammates will get an email to join.
			</p>
			<Button
				variant="link"
				size="sm"
				onClick={() => {
					stepper.data.reset();
					stepper.reset();
				}}
			>
				Invite more
			</Button>
		</Stepper.Content>
	);
}
