import { projectGroups } from "@repo/shared";
import type { Project } from "@repo/shared";

/** A few contour lines for the Chicago lakefront, one point marked on the shore. */
export function Lakefront() {
  return (
    <figure className="lake">
      <svg
        className="art"
        viewBox="0 0 250 192"
        role="img"
        aria-label="A few contour lines sketching the Chicago lakefront, with one point marked on the shore"
      >
        <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
          <path
            d="M96 4c6 22 20 34 26 54c5 17 2 30 12 46c9 15 24 22 30 40c5 15 4 30 10 46"
            stroke="var(--ink)"
          />
          <path d="M122 4c5 20 16 32 21 50c5 17 3 30 12 44c9 14 22 22 27 38c5 16 5 34 10 54" />
          <path
            d="M152 4c4 18 12 30 16 46c4 16 4 28 11 42c8 14 18 24 22 40c4 16 6 36 9 58"
            opacity=".75"
          />
          <path
            d="M186 4c3 18 8 30 11 46c3 16 4 28 9 42c6 14 12 26 15 42c3 16 5 36 7 56"
            opacity=".5"
          />
          <path d="M224 4c2 20 4 34 6 50c2 16 3 30 5 44c3 16 6 30 8 46" opacity=".3" />
          <path
            d="M8 40h88M8 76h106M8 112h124M8 148h146M8 184h160M30 22v164M66 22v164M102 62v124"
            opacity=".35"
          />
          <path d="M131 99c-16 3-30 0-44 6c-12 5-16 18-30 22" />
        </g>
        <circle fill="var(--accent)" cx="131" cy="99" r="3.5" />
      </svg>
      <figcaption>41.88 N, 87.63 W</figcaption>
    </figure>
  );
}

const centres = [
  [44, 36],
  [174, 38],
  [110, 74],
  [56, 118],
  [168, 114],
] as const;
const offsets = [
  [-16, 4],
  [14, -14],
  [20, 16],
  [-6, 24],
  [34, -2],
  [-30, -12],
] as const;

/** One node per project, clustered by group. The first project carries the accent. */
export function ProjectGraph({ projects }: { projects: Project[] }) {
  const clusters = projectGroups
    .map((group, g) => {
      const [cx, cy] = centres[g % centres.length]!;
      return projects
        .filter((p) => p.group === group.id)
        .map((_, i) => {
          const [dx, dy] = offsets[i % offsets.length]!;
          const ring = Math.floor(i / offsets.length) * 8;
          return [cx + dx + ring, cy + dy + ring] as const;
        });
    })
    .filter((nodes) => nodes.length > 0);
  const nodes = clusters.flat();
  if (nodes.length === 0) return null;

  const hub = clusters[Math.min(2, clusters.length - 1)]![0]!;
  const lines = clusters
    .map((c) => {
      const loop = c.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("");
      const join = c[0] === hub ? "" : `M${c[0]![0]} ${c[0]![1]}L${hub[0]} ${hub[1]}`;
      return loop + (c.length > 2 ? "Z" : "") + join;
    })
    .join("");

  return (
    <figure className="graph">
      <svg
        className="art"
        viewBox="0 0 220 150"
        role="img"
        aria-label={`${nodes.length} small nodes in ${clusters.length} loose clusters, joined by thin lines`}
      >
        <path d={lines} fill="none" stroke="currentColor" strokeWidth="1" opacity=".7" />
        {nodes.map(([x, y], i) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r="4"
            fill={i ? "var(--paper)" : "var(--accent)"}
            stroke={i ? "currentColor" : "none"}
            strokeWidth="1"
          />
        ))}
      </svg>
      <figcaption>One node per project, clustered by group.</figcaption>
    </figure>
  );
}

/** Plan of a rink, 200 by 85 feet, with a breakout sketched on it. The pass is the accent. */
export function RinkPlan() {
  return (
    <svg
      className="art rink"
      viewBox="-30 10 660 304"
      role="img"
      aria-label="Plan drawing of a hockey rink, 200 by 85 feet, with a breakout play sketched on it"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="20" y="20" width="600" height="255" rx="84" />
        <line x1="320" y1="20" x2="320" y2="275" />
        <line x1="245" y1="20" x2="245" y2="275" strokeWidth="2" />
        <line x1="395" y1="20" x2="395" y2="275" strokeWidth="2" />
        <line x1="53" y1="37.3" x2="53" y2="257.7" />
        <line x1="587" y1="37.3" x2="587" y2="257.7" />
        <circle cx="320" cy="147.5" r="45" />
        <circle cx="113" cy="81.5" r="45" />
        <circle cx="113" cy="213.5" r="45" />
        <circle cx="527" cy="81.5" r="45" />
        <circle cx="527" cy="213.5" r="45" />
        <path d="M53 129.5a18 18 0 0 1 0 36M587 129.5a18 18 0 0 0 0 36" />
        <rect x="41" y="138.5" width="12" height="18" />
        <rect x="587" y="138.5" width="12" height="18" />
        <path d="M107 34v6M119 34v6M107 123v6M119 123v6M107 166v6M119 166v6M107 255v6M119 255v6M521 34v6M533 34v6M521 123v6M533 123v6M521 166v6M533 166v6M521 255v6M533 255v6" />
        <circle cx="92" cy="186" r="6.5" />
        <circle cx="176" cy="240" r="6.5" />
        <circle cx="212" cy="92" r="6.5" />
        <path d="M139 141l11 11M150 141l-11 11M268 176l11 11M279 176l-11 11" />
        <path d="M183 236c30-14 62-22 96-58c20-22 46-40 84-44M354 129l10 5l-8 8" />
        <path d="M218 90c24-6 60-8 96-2M305 83l10 5l-9 7" />
      </g>
      <path
        fill="currentColor"
        d="M320 145a2.5 2.5 0 1 0 .01 0M113 79a2.5 2.5 0 1 0 .01 0M113 211a2.5 2.5 0 1 0 .01 0M527 79a2.5 2.5 0 1 0 .01 0M527 211a2.5 2.5 0 1 0 .01 0M260 79a2.5 2.5 0 1 0 .01 0M260 211a2.5 2.5 0 1 0 .01 0M380 79a2.5 2.5 0 1 0 .01 0M380 211a2.5 2.5 0 1 0 .01 0"
      />
      <path
        d="M101 191L166 235"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeDasharray="5 5"
      />
      <circle fill="var(--accent)" cx="166" cy="235" r="4" />
      <g className="dim">
        <path
          d="M20 292v10M620 292v10M20 297h268M352 297h268M-8 20h-10M-8 275h-10M-13 20v104M-13 171v104"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity=".55"
        />
        <text x="320" y="303" textAnchor="middle">
          200 ft
        </text>
        <text x="-13" y="153" textAnchor="middle" transform="rotate(-90 -13 147.5)">
          85 ft
        </text>
      </g>
    </svg>
  );
}
