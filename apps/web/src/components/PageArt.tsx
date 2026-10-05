import { projectGroups } from "@repo/shared";
import type { Project, ProjectStatus } from "@repo/shared";

/** Line drawings for Work, Projects and Now, in the same hand as components/home/HomeArt.tsx. */

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

/**
 * Plan of a drum kit, from above, the player's seat at the bottom. The sticks are the accent.
 * Each piece is an element of its own, with a class, so a later change can move one.
 */
export function DrumKit() {
  return (
    <figure className="now-art">
      <svg
        className="art kit"
        viewBox="16 10 212 182"
        width="212"
        height="182"
        role="img"
        aria-label="Plan drawing of a drum kit from above: a kick, a snare, three toms, a hi-hat, two cymbals and a seat, with a pair of sticks resting on the snare"
      >
        <g fill="var(--paper)" stroke="currentColor" strokeWidth="1">
          <rect className="kit-kick" x="100" y="30" width="40" height="50" rx="3" />
          <circle className="kit-tom" cx="98" cy="74" r="17" />
          <circle className="kit-tom" cx="142" cy="74" r="17" />
          <circle className="kit-snare" cx="84" cy="122" r="20" />
          <circle className="kit-floor" cx="166" cy="122" r="22" />
          <circle className="kit-seat" cx="124" cy="166" r="15" opacity=".5" />
          <g className="kit-hat">
            <circle cx="46" cy="104" r="19" />
            <circle cx="46" cy="104" r="3" />
          </g>
          <g className="kit-crash">
            <circle cx="60" cy="44" r="24" />
            <circle cx="60" cy="44" r="4" />
          </g>
          <g className="kit-ride">
            <circle cx="188" cy="58" r="28" />
            <circle cx="188" cy="58" r="7" />
          </g>
        </g>
        <g fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
          <line className="kit-stick" x1="64" y1="136" x2="104" y2="112" />
          <line className="kit-stick" x1="70" y1="106" x2="100" y2="140" />
        </g>
      </svg>
      <figcaption>A kit from above. The seat is mine.</figcaption>
    </figure>
  );
}

/** A motorhome from the side, a hockey stick leaning on the back. The stick and puck are the accent. */
export function Camper() {
  return (
    <figure className="now-art">
      <svg
        className="art camper"
        viewBox="-4 30 248 106"
        width="248"
        height="106"
        role="img"
        aria-label="Side drawing of a motorhome, with a hockey stick leaning against the back of it and a puck on the ground"
      >
        <path d="M-2 128h244" fill="none" stroke="currentColor" strokeWidth="1" opacity=".35" />
        <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
          <path
            className="rv-body"
            d="M46 44h166a6 6 0 0 1 6 6v16h-18l12 22h16a6 6 0 0 1 6 6v18h-194v-62a6 6 0 0 1 6-6z"
          />
          <rect x="96" y="38" width="26" height="6" />
          <rect x="56" y="58" width="34" height="18" />
          <rect x="102" y="58" width="34" height="18" />
          <rect x="150" y="58" width="22" height="54" />
          <path d="M150 84h22M190 88v24M194 70l8 14" />
        </g>
        <g fill="var(--paper)" stroke="currentColor" strokeWidth="1">
          <g className="rv-wheel">
            <circle cx="76" cy="114" r="13" />
            <circle cx="76" cy="114" r="4" />
          </g>
          <g className="rv-wheel">
            <circle cx="204" cy="114" r="13" />
            <circle cx="204" cy="114" r="4" />
          </g>
        </g>
        <path
          className="rv-stick"
          d="M33 58l-9 67l-13 3"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect className="rv-puck" x="0" y="124.5" width="8" height="3.5" fill="var(--accent)" />
      </svg>
      <figcaption>Still choosing the one for hockey trips.</figcaption>
    </figure>
  );
}
