import { projectStatusLabels } from "@repo/shared";
import type { ProjectStatus } from "@repo/shared";

/**
 * Project status as small plain text (the name is from when it was a pill). `label`
 * overrides the default word for the status.
 */
export function StatusPill({ status, label }: { status: ProjectStatus; label?: string }) {
  return (
    <span className="st" data-status={status}>
      {label ?? projectStatusLabels[status]}
    </span>
  );
}
