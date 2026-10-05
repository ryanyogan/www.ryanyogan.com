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

/**
 * An org chart for the Work header: one node, three under it, eleven under those (the eleven
 * squads). Drawn at its own size, one unit to the pixel. The node at the top is the accent.
 */
export function OrgTree() {
  const leaves = Array.from({ length: 11 }, (_, i) => 15.5 + i * 16);
  return (
    <svg
      className="art org"
      viewBox="0 0 190 88"
      width="190"
      height="88"
      role="img"
      aria-label="A small org chart: one node at the top, three under it, and eleven along the bottom"
    >
      <path
        d="M95.5 12.5v28M39.5 40.5v-12h112v12M39.5 48.5v16M15.5 76.5v-12h48v12M31.5 64.5v12M47.5 64.5v12M95.5 48.5v28M79.5 76.5v-12h32v12M151.5 48.5v16M127.5 76.5v-12h48v12M143.5 64.5v12M159.5 64.5v12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity=".7"
      />
      <g fill="var(--paper)" stroke="currentColor" strokeWidth="1">
        <circle cx="39.5" cy="44.5" r="4" />
        <circle cx="95.5" cy="44.5" r="4" />
        <circle cx="151.5" cy="44.5" r="4" />
        {leaves.map((x) => (
          <circle key={x} cx={x} cy="80.5" r="4" />
        ))}
      </g>
      <circle className="me" cx="95.5" cy="8.5" r="4.5" fill="var(--accent)" />
    </svg>
  );
}

/**
 * A written sheet on another, for the Writing header: a title, two paragraphs of ruled lines,
 * and a cursor where the last line stops. The cursor is the accent.
 */
export function Sheet() {
  return (
    <svg
      className="art sheet"
      viewBox="0 0 121 151"
      width="121"
      height="151"
      role="img"
      aria-label="A sheet of paper with a title and two paragraphs drawn as lines, a cursor after the last one, and a second sheet behind it"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
        <path d="M8.5 10.5v-8h98l14 14v126h-8" opacity=".5" />
        <path d="M.5 10.5h98l14 14v126h-112zM98.5 10.5v14h14" />
        <path
          d="M12.5 48.5h78M12.5 57.5h70M12.5 66.5h80M12.5 75.5h38M12.5 92.5h74M12.5 101.5h80M12.5 110.5h66M12.5 119.5h76M12.5 128.5h24"
          opacity=".55"
        />
        <path d="M12.5 32.5h46" stroke="var(--ink)" />
      </g>
      <path className="cur" d="M40.5 123v11" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
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
        viewBox="18 16 210 184"
        width="210"
        height="184"
        role="img"
        aria-label="Plan drawing of a drum kit from above: a kick, a snare, three toms, a hi-hat, two cymbals and a seat, with a pair of sticks left on the snare"
      >
        <g fill="var(--paper)" stroke="currentColor" strokeWidth="1">
          <g className="kit-kick">
            <rect x="98" y="24" width="48" height="42" rx="3" />
            <path d="M98 30h48M98 60h48" />
          </g>
          <g className="kit-tom">
            <circle cx="100" cy="86" r="16" />
            <circle cx="100" cy="86" r="13" />
          </g>
          <g className="kit-tom">
            <circle cx="144" cy="86" r="16" />
            <circle cx="144" cy="86" r="13" />
          </g>
          <g className="kit-snare">
            <circle cx="82" cy="132" r="20" />
            <circle cx="82" cy="132" r="17" />
          </g>
          <g className="kit-floor">
            <circle cx="168" cy="134" r="22" />
            <circle cx="168" cy="134" r="19" />
          </g>
          <circle className="kit-seat" cx="124" cy="176" r="15" opacity=".5" />
          <g className="kit-hat">
            <circle cx="44" cy="112" r="19" />
            <circle cx="44" cy="112" r="3" />
          </g>
          <g className="kit-crash">
            <circle cx="58" cy="50" r="25" />
            <circle cx="58" cy="50" r="4" />
          </g>
          <g className="kit-ride">
            <circle cx="192" cy="66" r="28" />
            <circle cx="192" cy="66" r="7" />
          </g>
        </g>
        <g fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
          <line className="kit-stick" x1="60" y1="148" x2="104" y2="114" />
          <line className="kit-stick" x1="72" y1="158" x2="106" y2="126" />
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
