import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { AiWorkflowBlock } from "./blocks/ai-workflow";
import { AppointmentBlock } from "./blocks/appointment";
import { ApprovalFlowBlock } from "./blocks/approval-flow";
import { ApprovalTimelineBlock } from "./blocks/approval-timeline";
import { AsyncProvisioningBlock } from "./blocks/async-provisioning";
import { BlockActions } from "./blocks/block-actions";
import { BreadcrumbBlock } from "./blocks/breadcrumb";
import { CicdPipelineBlock } from "./blocks/cicd-pipeline";
import { CircularBlock } from "./blocks/circular";
import { ConditionalOnboardingBlock } from "./blocks/conditional-onboarding";
import { CoursePlayerBlock } from "./blocks/course-player";
import { DashboardWizardBlock } from "./blocks/dashboard-wizard";
import { DecisionTreeBlock } from "./blocks/decision-tree";
import { DevicePairingBlock } from "./blocks/device-pairing";
import { KycVerificationBlock } from "./blocks/kyc-verification";
import { OrderTrackingBlock } from "./blocks/order-tracking";
import { OrgSetupBlock } from "./blocks/org-setup";
import { PlanPickerBlock } from "./blocks/plan-picker";
import { Preview } from "./blocks/preview";
import { ProductTourBlock } from "./blocks/product-tour";
import { ProgressBarBlock } from "./blocks/progress-bar";
import { ProgressOverviewBlock } from "./blocks/progress-overview";
import { SaveResumeBlock } from "./blocks/save-resume";
import {
	SchemaArktypeBlock,
	SchemaValibotBlock,
	SchemaZodBlock,
} from "./blocks/schema-playground";
import { SegmentedBlock } from "./blocks/segmented";
import { TeamInvitesBlock } from "./blocks/team-invites";
import { TwoFactorBlock } from "./blocks/two-factor";
import { TypedWizardBlock } from "./blocks/typed-wizard";
import { UserOnboardingBlock } from "./blocks/user-onboarding";
import { ValidatedCheckoutBlock } from "./blocks/validated-checkout";
import { VerticalStepperBlock } from "./blocks/vertical-stepper";
import { LifecycleViz } from "./interactive/lifecycle-viz";
import { ReactActivityDemo } from "./interactive/react-activity-demo";
import { StatusCompletionViz } from "./interactive/status-completion-viz";
import { StepperInspector } from "./interactive/stepper-inspector";

export function getMDXComponents(components?: MDXComponents) {
	return {
		...defaultMdxComponents,
		CodeBlock,
		Popup,
		PopupContent,
		PopupTrigger,
		Pre,
		Step,
		Steps,
		Tab,
		Tabs,
		Preview,
		BlockActions,
		StepperInspector,
		ReactActivityDemo,
		StatusCompletionViz,
		LifecycleViz,
		UserOnboardingBlock,
		KycVerificationBlock,
		ProductTourBlock,
		OrderTrackingBlock,
		CicdPipelineBlock,
		ProgressBarBlock,
		ProgressOverviewBlock,
		SegmentedBlock,
		CircularBlock,
		BreadcrumbBlock,
		VerticalStepperBlock,
		AppointmentBlock,
		OrgSetupBlock,
		ApprovalFlowBlock,
		ApprovalTimelineBlock,
		CoursePlayerBlock,
		PlanPickerBlock,
		TwoFactorBlock,
		DevicePairingBlock,
		TeamInvitesBlock,
		ValidatedCheckoutBlock,
		ConditionalOnboardingBlock,
		SaveResumeBlock,
		DecisionTreeBlock,
		DashboardWizardBlock,
		TypedWizardBlock,
		AsyncProvisioningBlock,
		AiWorkflowBlock,
		SchemaZodBlock,
		SchemaValibotBlock,
		SchemaArktypeBlock,
		...components,
	} satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
	type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
