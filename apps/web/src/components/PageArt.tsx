import { projectGroups } from "@repo/shared";
import type { Project, ProjectStatus } from "@repo/shared";

/** Line drawings for Work and Projects, in the same hand as components/home/HomeArt.tsx. */

export function AgentLoop() {
  return (
    <svg
      className="art loop"
      viewBox="0 0 300 250"
      width="300"
      height="250"
      role="img"
      aria-label="Schematic of an agent loop: model, tool call, result, context, and back to the model, with memory feeding the context"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <circle cx="140" cy="125" r="78" />
        <path d="M193.4 63.1L195.2 69.8L188.4 68.1M201.9 178.5L195.2 180.2L196.9 173.5M86.5 186.9L84.8 180.2L91.5 181.9M78.1 71.5L84.8 69.8L83.1 76.5" />
      </g>
      <g fill="var(--paper)" stroke="currentColor" strokeWidth="1">
        <rect x="135" y="42" width="10" height="10" />
        <rect x="213" y="120" width="10" height="10" />
        <rect x="135" y="198" width="10" height="10" />
        <rect x="57" y="120" width="10" height="10" />
      </g>
      {/* Memory feeding the context: the one use of the accent. */}
      <g fill="none" stroke="var(--accent)" strokeWidth="1.5">
        <path d="M124 113h32M124 120h32M124 127h32" />
        <path d="M70 125h46" strokeDasharray="4 4" />
      </g>
      <text x="140" y="32" textAnchor="middle">
        model
      </text>
      <text x="232" y="129">
        tool call
      </text>
      <text x="140" y="226" textAnchor="middle">
        result
      </text>
      <text x="48" y="129" textAnchor="end">
        context
      </text>
      <text x="140" y="148" textAnchor="middle">
        memory
      </text>
    </svg>
  );
}

type Mark = "filled" | "open" | "dashed";

const markOf: Record<ProjectStatus, Mark> = {
  live: "filled",
  running: "open",
  prototype: "open",
  retired: "dashed",
  private: "dashed",
};

const key: { mark: Mark; label: string }[] = [
  { mark: "filled", label: "live" },
  { mark: "open", label: "running or prototype" },
  { mark: "dashed", label: "private or retired" },
];

function Dot({ cx, cy, mark, accent }: { cx: number; cy: number; mark: Mark; accent?: boolean }) {
  if (mark === "filled")
    return (
      <circle
        cx={cx}
        cy={cy}
        r="5"
        fill={accent ? "var(--accent)" : "currentColor"}
        stroke="none"
      />
    );
  return (
    <circle
      cx={cx}
      cy={cy}
      r="5"
      fill="none"
      stroke="currentColor"
      strokeDasharray={mark === "dashed" ? "2 2.5" : undefined}
    />
  );
}

/** The status key: one mark per project, one line per group, drawn from the loader data. */
export function StatusMarks({ projects }: { projects: Project[] }) {
  const lines = projectGroups
    .map((group) => projects.filter((p) => p.group === group.id).map((p) => markOf[p.status]))
    .filter((line) => line.length > 0);
  if (lines.length === 0) return null;

  const count = (mark: Mark) => lines.flat().filter((m) => m === mark).length;
  const widest = Math.max(...lines.map((line) => line.length));
  const keyX = Math.max(112, 12 + widest * 22 + 20);
  const height = Math.max(lines.length, key.length + 1) * 26 + 6;
  let accentUsed = false;

  return (
    <svg
      className="art marks"
      viewBox={`0 0 ${keyX + 160} ${height}`}
      role="img"
      aria-label={`${lines.flat().length} marks in ${lines.length} groups, one per project: ${count("filled")} filled for live, ${count("open")} open for running or prototype, ${count("dashed")} dashed for private or retired`}
    >
      {lines.map((line, row) =>
        line.map((mark, i) => {
          const accent = mark === "filled" && !accentUsed;
          if (accent) accentUsed = true;
          return (
            <Dot
              key={`${row}-${i}`}
              cx={12 + i * 22}
              cy={14 + row * 26}
              mark={mark}
              accent={accent}
            />
          );
        }),
      )}
      {key.map((entry, i) => (
        <g key={entry.mark}>
          <Dot cx={keyX} cy={40 + i * 26} mark={entry.mark} />
          <text x={keyX + 14} y={44 + i * 26}>
            {entry.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
