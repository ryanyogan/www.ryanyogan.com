import { projectStatusLabels } from "@repo/shared";
import type { ProjectStatus } from "@repo/shared";

/** Project status as text in a pill. `label` overrides the default word for the status. */
export function StatusPill({ status, label }: { status: ProjectStatus; label?: string }) {
  return <span className={`st st-${status}`}>{label ?? projectStatusLabels[status]}</span>;
}
