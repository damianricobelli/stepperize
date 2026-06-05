import { defineStepper } from "@stepperize/react";
import { ShieldCheck, Smartphone } from "lucide-react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const { Stepper } = defineStepper([
  { id: "method", title: "Choose a method" },
  { id: "verify", title: "Enter the code" },
  { id: "backup", title: "Save backup codes" },
]);

export function TwoFactorBlock() {
  const [enabled, setEnabled] = useState(false);

  return (
    <Stepper.Root
      linear
      className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm"
    >
      {({ stepper }) => (
        <>
          <div className="mb-4 flex items-center justify-between">
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <Stepper.List className="flex gap-1.5">
              <Stepper.Items>
                {(step) => (
                  <Stepper.Item key={step.id} step={step.id}>
                    <Stepper.Indicator className="block h-1.5 w-6 rounded-full transition-colors data-[status=active]:bg-primary data-[status=previous]:bg-primary data-[status=upcoming]:bg-muted" />
                  </Stepper.Item>
                )}
              </Stepper.Items>
            </Stepper.List>
          </div>

          <h3 className="text-base font-semibold">{stepper.current.title}</h3>

          <div className="mt-4 min-h-32">
            <Stepper.Content step="method">
              <RadioGroup defaultValue="app">
                <Method
                  value="app"
                  icon={Smartphone}
                  label="Authenticator app"
                  hint="Recommended"
                />
                <Method
                  value="sms"
                  icon={ShieldCheck}
                  label="Text message"
                  hint="SMS code"
                />
              </RadioGroup>
            </Stepper.Content>

            <Stepper.Content step="verify" className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your app.
              </p>
              <InputOTP maxLength={6}>
                <InputOTPGroup className="w-full justify-between">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="size-11 text-lg"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </Stepper.Content>

            <Stepper.Content step="backup" className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {enabled
                  ? "Two-factor authentication is enabled."
                  : "Store these somewhere safe."}
              </p>
              <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-3 font-mono text-sm">
                {["9F2A-7C1B", "4E8D-22A9", "B0C3-9911", "77AF-DE02"].map(
                  (code) => (
                    <span key={code}>{code}</span>
                  ),
                )}
              </div>
            </Stepper.Content>
          </div>

          <Stepper.Actions className="mt-6 flex justify-between">
            <Stepper.Prev className={buttonVariants({ variant: "outline" })}>
              Back
            </Stepper.Prev>
            {enabled ? (
              <button
                type="button"
                onClick={() => {
                  setEnabled(false);
                  stepper.reset();
                }}
                className={buttonVariants()}
              >
                Start over
              </button>
            ) : stepper.isLast ? (
              <button
                type="button"
                onClick={() => setEnabled(true)}
                className={buttonVariants()}
              >
                Enable 2FA
              </button>
            ) : (
              <Stepper.Next className={buttonVariants()}>Continue</Stepper.Next>
            )}
          </Stepper.Actions>
        </>
      )}
    </Stepper.Root>
  );
}

function Method({
  value,
  icon: Icon,
  label,
  hint,
}: {
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
}) {
  return (
    <Label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-normal transition-colors has-data-checked:border-primary has-data-checked:bg-primary/5">
      <RadioGroupItem value={value} />
      <Icon className="size-5 text-muted-foreground" />
      <span className="font-medium">{label}</span>
      <span className="ml-auto text-xs text-muted-foreground">{hint}</span>
    </Label>
  );
}
