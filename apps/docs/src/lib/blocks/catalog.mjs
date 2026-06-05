// Shared block catalog — the SINGLE source of truth for both the registry build
// (scripts/build-registry.mjs, Node) and the React Blocks gallery (src app, Vite).
//
// Authored as plain ESM (+ JSDoc, typed via catalog.d.mts) so the Node build
// script can `import` it natively while the TypeScript app still gets full types.
//
// Each block id == its source file stem (src/components/blocks/<id>.tsx) == its
// registry name. Categories are data, so adding a category is a one-line change.

/**
 * Use-case driven categories (not implementation driven) so a developer can find
 * "an onboarding" or "a checkout" without knowing how it is built. `icon` is a
 * lucide icon *name*; the TS side maps it to a component (this file stays React-free).
 *
 * @type {import("./catalog.d.mts").BlockCategory[]}
 */
export const CATEGORIES = [
	{
		id: "layouts",
		name: "Layouts & Navigation",
		description: "How the stepper is rendered — bars, tabs, rings, rails.",
		icon: "LayoutPanelLeft",
	},
	{
		id: "onboarding",
		name: "Onboarding",
		description: "Account, workspace, and product onboarding flows.",
		icon: "UserPlus",
	},
	{
		id: "commerce",
		name: "Commerce",
		description: "Checkout, billing, and booking flows that convert.",
		icon: "ShoppingCart",
	},
	{
		id: "auth",
		name: "Auth & Verification",
		description: "Identity, 2FA, and device verification steps.",
		icon: "ShieldCheck",
	},
	{
		id: "async",
		name: "Async & Status",
		description: "Pipelines, tracking, and approvals driven by live status.",
		icon: "Loader",
	},
	{
		id: "flow-control",
		name: "Flow Logic",
		description: "Guards, branching, persistence — the engine, made visible.",
		icon: "Workflow",
	},
];

/**
 * The block catalog. Seeded from the original registry tuples and enriched with
 * `tags`, `difficulty`, `useCase`, `accessibility`, `customization`, `related`,
 * and `featured` for the gallery + detail pages.
 *
 * @type {import("./catalog.d.mts").BlockMeta[]}
 */
export const BLOCKS = [
	// ── Layouts & Navigation ────────────────────────────────────────────────
	{
		id: "progress-bar",
		title: "Progress Bar Stepper",
		description: "A single progress bar that fills as the user advances.",
		category: "layouts",
		capabilities: ["navigation"],
		difficulty: "beginner",
		tags: ["progress bar", "linear", "minimal", "header"],
		useCase:
			"Reach for this when you want a calm, minimal sense of progress without listing every step — great at the top of a multi-step form.",
		accessibility:
			"The bar is decorative; progress is also announced through the step heading. Keep a visible step label so screen-reader users aren't relying on the bar alone.",
		customization:
			"Swap the fill color via the primary token and adjust height/rounding on the bar element. Drive width from `stepper.progress`.",
		related: ["segmented", "circular", "vertical-stepper"],
	},
	{
		id: "segmented",
		title: "Segmented Tabs Stepper",
		description: "Segmented control where each step is a selectable tab.",
		category: "layouts",
		capabilities: ["navigation"],
		difficulty: "beginner",
		tags: ["tabs", "segmented control", "compact"],
		useCase:
			"Use for short flows (3–4 steps) where users benefit from seeing and jumping between all steps at once.",
		accessibility:
			"Each segment is a real `Stepper.Trigger` button with `data-status`; active state is conveyed by both color and weight, not color alone.",
		customization:
			"Style the active tab via `data-[status=active]`. Replace the pill background with an underline by removing the `bg-background` and adding a bottom border.",
		related: ["breadcrumb", "progress-bar", "circular"],
	},
	{
		id: "circular",
		title: "Circular Stepper",
		description: "An SVG progress ring around the current step number.",
		category: "layouts",
		capabilities: ["navigation"],
		difficulty: "beginner",
		tags: ["ring", "svg", "circular", "percentage"],
		useCase:
			"Good for dashboards or compact panels where a circular progress indicator reads better than a full-width bar.",
		accessibility:
			"The SVG ring is `aria-hidden`; the numeric step count beside it carries the meaning for assistive tech.",
		customization:
			"Tune the ring radius/stroke and derive `strokeDashoffset` from `stepper.progress`. Recolor with the primary token.",
		related: ["progress-bar", "segmented", "progress-overview"],
	},
	{
		id: "breadcrumb",
		title: "Breadcrumb Stepper",
		description: "A breadcrumb-style trail of steps with chevrons.",
		category: "layouts",
		capabilities: ["navigation"],
		difficulty: "beginner",
		tags: ["breadcrumb", "trail", "chevron", "horizontal"],
		useCase:
			"Fits wizards embedded in app shells where a breadcrumb visually matches the surrounding navigation.",
		accessibility:
			"Renders as an ordered trail; the current step uses `aria-current` via `data-status=active`. Chevrons are `aria-hidden`.",
		customization:
			"Replace chevrons with slashes or arrows, and truncate long labels with `max-w` + `truncate` on the title.",
		related: ["segmented", "vertical-stepper", "progress-bar"],
	},
	{
		id: "vertical-stepper",
		title: "Vertical Stepper",
		description:
			"A sidebar-style vertical layout: step rail on the left, long-form content on the right, collapsing to a compact nav on mobile.",
		category: "layouts",
		capabilities: ["navigation"],
		difficulty: "beginner",
		tags: ["vertical", "sidebar", "rail", "responsive"],
		useCase:
			"Best for content-heavy wizards (settings, long forms) where each step needs room and a persistent overview rail helps orientation.",
		accessibility:
			"The rail items are real triggers with status; on mobile it collapses to a compact nav so focus order stays linear.",
		customization:
			"Adjust the rail width and connector line; the right pane is just `Stepper.Content`, so drop any layout inside.",
		related: ["breadcrumb", "dashboard-wizard", "progress-bar"],
	},

	// ── Onboarding ──────────────────────────────────────────────────────────
	{
		id: "user-onboarding",
		title: "User Onboarding",
		description:
			"A three-step account onboarding flow with per-step validation.",
		category: "onboarding",
		capabilities: ["validation"],
		difficulty: "beginner",
		tags: ["onboarding", "signup", "account", "validation"],
		useCase:
			"The canonical 'create your account' flow — collect a few fields per step and validate before advancing.",
		accessibility:
			"Inputs are labelled and validation messages are associated with their fields; the Next button reflects `canNext`.",
		customization:
			"Add or remove steps in the definition; per-step validation lives in a `beforeStepChange` guard you can extend.",
		related: ["org-setup", "team-invites", "conditional-onboarding"],
	},
	{
		id: "org-setup",
		title: "Organization Setup",
		description:
			"Workspace, branding, and members setup for a new SaaS tenant.",
		category: "onboarding",
		capabilities: ["navigation"],
		difficulty: "intermediate",
		tags: ["saas", "workspace", "tenant", "branding"],
		useCase:
			"Use right after signup for B2B SaaS — set up the workspace, brand it, and invite the first members.",
		accessibility:
			"Each step is a labelled form section; the step rail conveys position with text, not just color.",
		customization:
			"Reorder steps or merge branding into workspace; wire real uploads into the branding step's inputs.",
		related: ["user-onboarding", "team-invites", "dashboard-wizard"],
	},
	{
		id: "team-invites",
		title: "Team Invitations",
		description:
			"Collect invites into draft flow data, then review and send them.",
		category: "onboarding",
		capabilities: ["persistence"],
		difficulty: "intermediate",
		tags: ["invites", "team", "draft data", "review"],
		useCase:
			"When you need to gather a list across steps and confirm it before committing — invites, recipients, line items.",
		accessibility:
			"The running list is announced as it grows; remove buttons are labelled per row.",
		customization:
			"Invites are stored in `stepper.data`; swap the email rows for any repeatable input and submit on `complete`.",
		related: ["org-setup", "user-onboarding", "ai-workflow"],
	},
	{
		id: "conditional-onboarding",
		title: "Conditional Onboarding",
		description:
			"Onboarding whose path is computed from an earlier answer: team accounts visit the invite step, personal accounts skip it.",
		category: "onboarding",
		capabilities: ["branching"],
		difficulty: "intermediate",
		tags: ["branching", "conditional", "dynamic path", "skip step"],
		useCase:
			"Reach for this whenever the right next step depends on an earlier choice — skip irrelevant steps instead of disabling them.",
		accessibility:
			"Skipped steps are removed from the flow, so the step count and focus order always match what's shown.",
		customization:
			"The path is derived from `stepper.data`; change the branch predicate to fork on any earlier answer.",
		related: ["decision-tree", "plan-picker", "user-onboarding"],
		featured: true,
	},
	{
		id: "product-tour",
		title: "Product Tour",
		description:
			"A card-style onboarding walkthrough with dot indicators and free navigation.",
		category: "onboarding",
		capabilities: ["non-linear"],
		difficulty: "beginner",
		tags: ["tour", "walkthrough", "carousel", "dots", "non-linear"],
		useCase:
			"A lightweight feature tour or welcome carousel where users can move freely between slides.",
		accessibility:
			"Dots are labelled with their step name; navigation is operable by keyboard and not trapped.",
		customization:
			"Swap dots for thumbnails; because navigation is non-linear, any step can be reached via `goTo`.",
		related: ["course-player", "user-onboarding", "segmented"],
	},
	{
		id: "course-player",
		title: "Course Player",
		description:
			"A lesson playlist with typed per-lesson metadata and a final quiz.",
		category: "onboarding",
		capabilities: ["metadata", "non-linear"],
		difficulty: "beginner",
		tags: ["course", "lessons", "playlist", "learning", "metadata"],
		useCase:
			"E-learning or guided checklists where each step carries typed metadata (duration, type) and learners jump around.",
		accessibility:
			"The playlist is a list of labelled triggers; the active lesson uses `aria-current`.",
		customization:
			"Per-lesson metadata is read straight off `step` with full inference — add fields to the step definition and the UI types update.",
		related: ["product-tour", "progress-overview", "order-tracking"],
	},

	// ── Commerce ────────────────────────────────────────────────────────────
	{
		id: "validated-checkout",
		title: "Validated Checkout",
		description:
			"A checkout where each step has a Zod schema; validate() inside a beforeStepChange guard blocks invalid input before the review step.",
		category: "commerce",
		capabilities: ["validation"],
		difficulty: "advanced",
		tags: ["checkout", "zod", "validation", "guard", "payment"],
		useCase:
			"The headline checkout pattern — per-step schemas with a guard that refuses to advance until the current step is valid.",
		accessibility:
			"Field errors are tied to inputs and surfaced before navigation; the guard prevents skipping past invalid data.",
		customization:
			"Each step owns a Zod schema validated via `wizard.validate(id, value)`; swap Zod for any Standard Schema library.",
		related: ["plan-picker", "user-onboarding", "dashboard-wizard"],
		featured: true,
	},
	{
		id: "plan-picker",
		title: "Plan Picker",
		description:
			"Choose a plan, set billing, then pay — billing path branches on the plan.",
		category: "commerce",
		capabilities: ["branching"],
		difficulty: "intermediate",
		tags: ["pricing", "plans", "billing", "subscription", "branching"],
		useCase:
			"Subscription sign-up where the billing step depends on the selected plan (free skips payment, paid doesn't).",
		accessibility:
			"Plan options are radio-style and labelled; the branch keeps the step count truthful.",
		customization:
			"The billing branch reads the chosen plan from `stepper.data`; extend with usage tiers or add-ons.",
		related: ["validated-checkout", "conditional-onboarding", "appointment"],
	},
	{
		id: "appointment",
		title: "Appointment Booking",
		description: "Service, professional, time slot, and confirmation.",
		category: "commerce",
		capabilities: ["navigation"],
		difficulty: "beginner",
		tags: ["booking", "appointment", "calendar", "scheduling"],
		useCase:
			"Scheduling flows — pick a service, a person, a time, then confirm.",
		accessibility:
			"Selectable slots are labelled buttons with clear pressed state; confirmation summarizes choices in text.",
		customization:
			"Replace the static slots with a calendar; the summary reads selections from `stepper.data`.",
		related: ["plan-picker", "kyc-verification", "two-factor"],
	},

	// ── Auth & Verification ─────────────────────────────────────────────────
	{
		id: "two-factor",
		title: "Two-Factor Setup",
		description: "Pick a method, verify a code, save backup codes.",
		category: "auth",
		capabilities: ["validation"],
		difficulty: "intermediate",
		tags: ["2fa", "mfa", "otp", "security", "verification"],
		useCase:
			"Enabling 2FA — choose a method, verify a one-time code, then store backup codes.",
		accessibility:
			"The OTP input is labelled and announces remaining digits; success/error states are textual, not color-only.",
		customization:
			"Swap the method list and wire the verify step to your API; backup codes render from generated data.",
		related: ["kyc-verification", "device-pairing", "user-onboarding"],
	},
	{
		id: "kyc-verification",
		title: "KYC Verification",
		description: "Identity, document, and selfie verification steps.",
		category: "auth",
		capabilities: ["navigation"],
		difficulty: "intermediate",
		tags: ["kyc", "identity", "verification", "documents", "compliance"],
		useCase:
			"Regulated onboarding (fintech, crypto) that walks users through identity, document, and selfie capture.",
		accessibility:
			"Upload zones are labelled and keyboard-operable; each step states what's required in text.",
		customization:
			"Drop real capture widgets into each step; the review summary reads from `stepper.data`.",
		related: ["two-factor", "device-pairing", "appointment"],
	},
	{
		id: "device-pairing",
		title: "Device Pairing",
		description:
			"Discover, pair, configure, and ready a device over an async transition.",
		category: "auth",
		capabilities: ["async"],
		difficulty: "intermediate",
		tags: ["device", "pairing", "iot", "async", "connection"],
		useCase:
			"Hardware/IoT setup where pairing is an async step with a pending state before configuration.",
		accessibility:
			"The pending state is announced; controls disable via `isPending` so users can't double-submit.",
		customization:
			"The pairing step awaits real work in `beforeStepChange`; surface progress with `stepper.isPending`.",
		related: ["async-provisioning", "two-factor", "cicd-pipeline"],
	},

	// ── Async & Status ──────────────────────────────────────────────────────
	{
		id: "async-provisioning",
		title: "Async Provisioning",
		description:
			"A deploy flow with an async guarded transition, pending UI, a failed first attempt, and a retry path.",
		category: "async",
		capabilities: ["async"],
		difficulty: "advanced",
		tags: ["async", "provisioning", "deploy", "retry", "pending"],
		useCase:
			"Any 'set things up for me' flow that must await server work, can fail, and needs a clean retry.",
		accessibility:
			"Loading and error states are textual and announced; the retry action is a clearly labelled button.",
		customization:
			"The async guard returns false on failure to cancel the transition; replace the fake work with your API call.",
		related: ["device-pairing", "cicd-pipeline", "validated-checkout"],
		featured: true,
	},
	{
		id: "order-tracking",
		title: "Order Tracking",
		description:
			"A shipment tracker driven by typed per-step metadata (carrier, location, ETA).",
		category: "async",
		capabilities: ["metadata"],
		difficulty: "beginner",
		tags: ["tracking", "shipping", "timeline", "order", "metadata"],
		useCase:
			"Read-only status timelines — order/shipment tracking where each stage carries typed metadata.",
		accessibility:
			"Each stage states its status in text; completed vs. upcoming is conveyed beyond color.",
		customization:
			"Per-stage metadata (carrier, ETA) is typed off the step definition; bind the active stage to live status.",
		related: ["cicd-pipeline", "approval-timeline", "course-player"],
	},
	{
		id: "cicd-pipeline",
		title: "CI/CD Pipeline",
		description:
			"Build, test, deploy, verify pipeline status with typed stage metadata.",
		category: "async",
		capabilities: ["metadata"],
		difficulty: "intermediate",
		tags: ["ci", "cd", "pipeline", "stages", "devops", "metadata"],
		useCase:
			"Pipeline/run dashboards where stages have typed metadata and a clear pass/fail per stage.",
		accessibility:
			"Stage status is textual with iconography that is `aria-hidden`; failures are announced.",
		customization:
			"Map your real pipeline stages to steps; drive each stage's status from your CI events.",
		related: ["async-provisioning", "order-tracking", "approval-flow"],
	},
	{
		id: "approval-flow",
		title: "Approval Flow",
		description: "A multi-stage submission and approval chain.",
		category: "async",
		capabilities: ["navigation"],
		difficulty: "intermediate",
		tags: ["approval", "workflow", "review", "chain"],
		useCase:
			"Submission → review → approve chains for documents, expenses, or requests.",
		accessibility:
			"Each stage's state and actor are stated in text; action buttons are labelled.",
		customization:
			"Extend the chain with more reviewers; gate transitions on role checks in a guard.",
		related: ["approval-timeline", "cicd-pipeline", "dashboard-wizard"],
	},
	{
		id: "approval-timeline",
		title: "Approval Timeline",
		description:
			"A vertical audit timeline where each step carries typed metadata (actor, role, SLA hours) read straight off `step` and `stepper.current` with full inference.",
		category: "async",
		capabilities: ["metadata", "type-safe"],
		difficulty: "advanced",
		tags: ["timeline", "audit", "approval", "metadata", "type-safe"],
		useCase:
			"Audit trails where each event has rich, typed metadata you render without casts or lookup tables.",
		accessibility:
			"A vertical list with textual timestamps and actors; connectors are decorative and `aria-hidden`.",
		customization:
			"Metadata (actor, role, SLA) is inferred from the step definition — add fields and the UI types follow.",
		related: ["order-tracking", "approval-flow", "typed-wizard"],
		featured: true,
	},

	// ── Flow Logic ──────────────────────────────────────────────────────────
	{
		id: "decision-tree",
		title: "Decision Tree",
		description:
			"A plan finder that branches to different follow-up questions and converges on a result computed from the answers.",
		category: "flow-control",
		capabilities: ["branching"],
		difficulty: "advanced",
		tags: ["decision tree", "quiz", "branching", "wizard", "recommendation"],
		useCase:
			"Recommendation quizzes and finders that fork on each answer and converge on a computed outcome.",
		accessibility:
			"Only the relevant branch is mounted, so focus order and step count match the visible path.",
		customization:
			"Branch with `goTo` (bypasses linear policy) and compute the result from accumulated `stepper.data`.",
		related: ["conditional-onboarding", "plan-picker", "ai-workflow"],
		featured: true,
	},
	{
		id: "save-resume",
		title: "Save & Resume",
		description:
			"A controlled wizard whose active step is synced to localStorage and the URL hash.",
		category: "flow-control",
		capabilities: ["persistence"],
		difficulty: "advanced",
		tags: ["persistence", "controlled", "localstorage", "url", "resume"],
		useCase:
			"Long flows users leave and return to — reload or share a URL and land back on the same step.",
		accessibility:
			"Restoring state doesn't move focus unexpectedly; the active step is announced on mount.",
		customization:
			"Driven controlled via `step` + `onStepChange`; persist to a backend instead of localStorage if you prefer.",
		related: ["dashboard-wizard", "validated-checkout", "ai-workflow"],
		featured: true,
	},
	{
		id: "ai-workflow",
		title: "AI Workflow",
		description:
			"An iterative generation flow where each run is appended to flow data and Refine loops back to the prompt.",
		category: "flow-control",
		capabilities: ["branching", "persistence"],
		difficulty: "advanced",
		tags: ["ai", "generation", "iteration", "loop", "refine"],
		useCase:
			"Generative/agentic UIs with a prompt → result → refine loop that accumulates history across runs.",
		accessibility:
			"Each generated result is announced; the refine action loops back without losing prior context.",
		customization:
			"History accumulates in `stepper.data`; Refine uses `goTo` to loop. Wire the generate step to your model.",
		related: ["decision-tree", "save-resume", "team-invites"],
	},
	{
		id: "typed-wizard",
		title: "Typed Wizard",
		description:
			"An exhaustive stepper.match() over every step id — add or remove a step and the match becomes a compile error until you handle it.",
		category: "flow-control",
		capabilities: ["type-safe"],
		difficulty: "advanced",
		tags: ["type-safe", "match", "exhaustive", "typescript"],
		useCase:
			"When you want the compiler to force you to handle every step — add a step and the build fails until you render it.",
		accessibility:
			"Rendering is centralized through `match`, keeping each step's markup consistent and labelled.",
		customization:
			"Replace the per-step bodies; the exhaustive `match` guarantees you can't forget one.",
		related: ["approval-timeline", "decision-tree", "validated-checkout"],
	},
	{
		id: "dashboard-wizard",
		title: "Dashboard Wizard",
		description:
			"A SaaS settings wizard with sticky step nav, per-step validation, and an unsaved-changes guard wired through beforeStepChange and beforeunload.",
		category: "flow-control",
		capabilities: ["validation", "persistence"],
		difficulty: "advanced",
		tags: ["settings", "dashboard", "unsaved changes", "guard", "validation"],
		useCase:
			"In-app settings/config wizards that validate per step and warn before discarding unsaved changes.",
		accessibility:
			"The unsaved-changes prompt is keyboard-dismissible; sticky nav keeps focus targets stable.",
		customization:
			"Combines a `beforeStepChange` guard with a `beforeunload` listener; swap the dirty-check for your form state.",
		related: ["save-resume", "validated-checkout", "org-setup"],
		featured: true,
	},
	{
		id: "progress-overview",
		title: "Progress Overview",
		description:
			"A progress panel that computes percent complete and an ETA from typed per-step metadata (estimated minutes).",
		category: "flow-control",
		capabilities: ["metadata"],
		difficulty: "intermediate",
		tags: ["progress", "eta", "overview", "metadata", "dashboard"],
		useCase:
			"Side panels that compute percent-complete and an ETA from per-step metadata.",
		accessibility:
			"Percent and ETA are textual; the bar is supplementary and `aria-hidden`.",
		customization:
			"ETA sums `estimatedMinutes` metadata across remaining steps — change the metadata to recompute.",
		related: ["circular", "course-player", "order-tracking"],
	},
];
