import type { ComponentType } from "react";
import { AiWorkflowBlock } from "@/components/blocks/ai-workflow";
import { AppointmentBlock } from "@/components/blocks/appointment";
import { ApprovalFlowBlock } from "@/components/blocks/approval-flow";
import { ApprovalTimelineBlock } from "@/components/blocks/approval-timeline";
import { AsyncProvisioningBlock } from "@/components/blocks/async-provisioning";
import { BreadcrumbBlock } from "@/components/blocks/breadcrumb";
import { CicdPipelineBlock } from "@/components/blocks/cicd-pipeline";
import { CircularBlock } from "@/components/blocks/circular";
import { ConditionalOnboardingBlock } from "@/components/blocks/conditional-onboarding";
import { CoursePlayerBlock } from "@/components/blocks/course-player";
import { DashboardWizardBlock } from "@/components/blocks/dashboard-wizard";
import { DecisionTreeBlock } from "@/components/blocks/decision-tree";
import { DevicePairingBlock } from "@/components/blocks/device-pairing";
import { KycVerificationBlock } from "@/components/blocks/kyc-verification";
import { OrderTrackingBlock } from "@/components/blocks/order-tracking";
import { OrgSetupBlock } from "@/components/blocks/org-setup";
import { PlanPickerBlock } from "@/components/blocks/plan-picker";
import { ProductTourBlock } from "@/components/blocks/product-tour";
import { ProgressBarBlock } from "@/components/blocks/progress-bar";
import { ProgressOverviewBlock } from "@/components/blocks/progress-overview";
import { SaveResumeBlock } from "@/components/blocks/save-resume";
import { SegmentedBlock } from "@/components/blocks/segmented";
import { TeamInvitesBlock } from "@/components/blocks/team-invites";
import { TwoFactorBlock } from "@/components/blocks/two-factor";
import { TypedWizardBlock } from "@/components/blocks/typed-wizard";
import { UserOnboardingBlock } from "@/components/blocks/user-onboarding";
import { ValidatedCheckoutBlock } from "@/components/blocks/validated-checkout";
import { VerticalStepperBlock } from "@/components/blocks/vertical-stepper";

/**
 * id → live preview component. Mirrors the registry catalog (catalog.mjs); the
 * catalog.test.ts guard asserts the two never drift apart.
 */
export const BLOCK_COMPONENTS: Record<string, ComponentType> = {
	"progress-bar": ProgressBarBlock,
	segmented: SegmentedBlock,
	circular: CircularBlock,
	breadcrumb: BreadcrumbBlock,
	"vertical-stepper": VerticalStepperBlock,
	"user-onboarding": UserOnboardingBlock,
	"org-setup": OrgSetupBlock,
	"team-invites": TeamInvitesBlock,
	"conditional-onboarding": ConditionalOnboardingBlock,
	"product-tour": ProductTourBlock,
	"course-player": CoursePlayerBlock,
	"validated-checkout": ValidatedCheckoutBlock,
	"plan-picker": PlanPickerBlock,
	appointment: AppointmentBlock,
	"two-factor": TwoFactorBlock,
	"kyc-verification": KycVerificationBlock,
	"device-pairing": DevicePairingBlock,
	"async-provisioning": AsyncProvisioningBlock,
	"order-tracking": OrderTrackingBlock,
	"cicd-pipeline": CicdPipelineBlock,
	"approval-flow": ApprovalFlowBlock,
	"approval-timeline": ApprovalTimelineBlock,
	"decision-tree": DecisionTreeBlock,
	"save-resume": SaveResumeBlock,
	"ai-workflow": AiWorkflowBlock,
	"typed-wizard": TypedWizardBlock,
	"dashboard-wizard": DashboardWizardBlock,
	"progress-overview": ProgressOverviewBlock,
};
