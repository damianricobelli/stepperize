import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Frame used to showcase a live block inside the docs.
 *
 * `not-prose` keeps the typography styles from `DocsBody` out of the demo so
 * the block renders exactly like it would in a real app.
 */
export function Preview({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="not-prose overflow-hidden rounded-xl border bg-card">
      <div
        className={cn(
          "flex min-h-104 items-center justify-center bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[16px_16px] p-4 sm:p-8",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
