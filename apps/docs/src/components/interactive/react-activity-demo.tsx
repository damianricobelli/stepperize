import { defineStepper } from "@stepperize/react";
import { Activity, useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const activityStepper = defineStepper([
  { id: "account", title: "Account" },
  { id: "profile", title: "Profile" },
  { id: "preferences", title: "Preferences" },
  { id: "review", title: "Review" },
] as const);

type StepId = (typeof activityStepper.steps)[number]["id"];

export function ReactActivityDemo() {
  const stepper = activityStepper.useStepper();

  return (
    <div className="w-full max-w-3xl rounded-xl border bg-background p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {stepper.steps.map((step, index) => {
          const active = stepper.is(step.id);

          return (
            <Button
              key={step.id}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => stepper.goTo(step.id)}
              aria-current={active ? "step" : undefined}
            >
              <span className="text-xs opacity-70">{index + 1}</span>
              {step.title}
            </Button>
          );
        })}
      </div>

      <div className="mb-4 rounded-lg border bg-muted/30 p-3 text-sm">
        <p className="font-medium">Try this</p>
        <ol className="mt-1 list-inside list-decimal text-muted-foreground">
          <li>Fill the form.</li>
          <li>Move to another step.</li>
          <li>Come back and notice that local state is still there.</li>
        </ol>
      </div>

      <div className="min-h-96 rounded-lg border bg-card p-4">
        {stepper.steps.map((step) => (
          <Activity
            key={step.id}
            mode={stepper.is(step.id) ? "visible" : "hidden"}
          >
            <StepPanel stepId={step.id} />
          </Activity>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={!stepper.canPrev}
          onClick={() => stepper.prev()}
        >
          Back
        </Button>
        <div className="text-sm text-muted-foreground">
          Step {stepper.index + 1} of {stepper.count}
        </div>
        <Button
          type="button"
          disabled={!stepper.canNext}
          onClick={() => stepper.next()}
        >
          {stepper.isLast ? "Done" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

function StepPanel({ stepId }: { stepId: StepId }) {
  switch (stepId) {
    case "account":
      return <AccountStep />;
    case "profile":
      return <ProfileStep />;
    case "preferences":
      return <PreferencesStep />;
    case "review":
      return <ReviewStep />;
    default:
      return null;
  }
}

function AccountStep() {
  const instanceId = useStableInstanceId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <section className="space-y-4">
      <PanelHeader
        title="Account"
        description="This step owns its input state locally."
        instanceId={instanceId}
      />
      <label
        htmlFor="activity-account-name"
        className="grid gap-1.5 text-sm font-medium"
      >
        Name
        <Input
          id="activity-account-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ada Lovelace"
        />
      </label>
      <label
        htmlFor="activity-account-email"
        className="grid gap-1.5 text-sm font-medium"
      >
        Email
        <Input
          id="activity-account-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ada@example.com"
        />
      </label>
      <StatePreview
        rows={[
          ["name", name || "empty"],
          ["email", email || "empty"],
        ]}
      />
    </section>
  );
}

function ProfileStep() {
  const instanceId = useStableInstanceId();
  const [bio, setBio] = useState("");

  return (
    <section className="space-y-4">
      <PanelHeader
        title="Profile"
        description="The textarea value and counter stay intact."
        instanceId={instanceId}
      />
      <label
        htmlFor="activity-profile-bio"
        className="grid gap-1.5 text-sm font-medium"
      >
        Bio
        <Textarea
          id="activity-profile-bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="Write a short profile..."
          className="min-h-28"
        />
      </label>
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Character count</span>
        <span className="font-mono font-medium">{bio.length}</span>
      </div>
    </section>
  );
}

function PreferencesStep() {
  const instanceId = useStableInstanceId();
  const [newsletter, setNewsletter] = useState(true);
  const [alerts, setAlerts] = useState(false);
  const [theme, setTheme] = useState("system");

  return (
    <section className="space-y-4">
      <PanelHeader
        title="Preferences"
        description="Switches and selects preserve their local state."
        instanceId={instanceId}
      />
      <PreferenceRow
        label="Product newsletter"
        checked={newsletter}
        onCheckedChange={setNewsletter}
      />
      <PreferenceRow
        label="Security alerts"
        checked={alerts}
        onCheckedChange={setAlerts}
      />
      <label
        htmlFor="activity-preferences-theme"
        className="grid gap-1.5 text-sm font-medium"
      >
        Theme
        <NativeSelect
          id="activity-preferences-theme"
          value={theme}
          onChange={(event) => setTheme(event.target.value)}
        >
          <NativeSelectOption value="system">System</NativeSelectOption>
          <NativeSelectOption value="light">Light</NativeSelectOption>
          <NativeSelectOption value="dark">Dark</NativeSelectOption>
        </NativeSelect>
      </label>
      <StatePreview
        rows={[
          ["newsletter", newsletter ? "on" : "off"],
          ["security alerts", alerts ? "on" : "off"],
          ["theme", theme],
        ]}
      />
    </section>
  );
}

function ReviewStep() {
  const instanceId = useStableInstanceId();
  const [notes, setNotes] = useState("");

  return (
    <section className="space-y-4">
      <PanelHeader
        title="Review"
        description="Even the final step can keep its own draft notes."
        instanceId={instanceId}
      />
      <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        Return to Account, Profile, or Preferences. The values you typed are
        still in those components because React Activity hid them instead of
        unmounting them.
      </div>
      <label
        htmlFor="activity-review-notes"
        className="grid gap-1.5 text-sm font-medium"
      >
        Internal review notes
        <Textarea
          id="activity-review-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="This step has preserved local state too..."
          className="min-h-24"
        />
      </label>
    </section>
  );
}

function PreferenceRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function PanelHeader({
  title,
  description,
  instanceId,
}: {
  title: string;
  description: string;
  instanceId: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Badge variant="outline" className="font-mono">
        instance {instanceId}
      </Badge>
    </div>
  );
}

function StatePreview({ rows }: { rows: [string, string][] }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
        Local state
      </p>
      <dl className="grid gap-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function useStableInstanceId() {
  return useId();
}
