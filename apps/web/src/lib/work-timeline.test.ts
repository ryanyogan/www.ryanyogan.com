import { workSections } from "@repo/shared";
import { describe, expect, it } from "vitest";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Jun 2026", "2010" or "Present" as a month count; a bare year counts as its last month. */
function month(text: string): number {
  if (text === "Present") return Infinity;
  const [, name, year] = /^(?:([A-Z][a-z]{2}) )?(\d{4})$/.exec(text) ?? [];
  if (!year) throw new Error(`Unreadable date: ${text}`);
  return Number(year) * 12 + (name ? MONTHS.indexOf(name) : 11);
}

const roles = workSections.flatMap((section) => section.roles);
const spans = roles.map((role) => {
  const [start = "", end = ""] = role.dates.split(" — ");
  return { role, start: month(start), end: month(end) };
});

describe("work timeline", () => {
  it("starts with the current role, and there is only one", () => {
    expect(roles[0]).toMatchObject({
      company: "Chromatic",
      title: "Senior Staff Engineer",
      dates: "Jun 2026 — Present",
    });
    expect(roles.filter((role) => role.dates.endsWith("Present"))).toHaveLength(1);
  });

  it("lists the roles newest first by end date", () => {
    for (const [index, span] of spans.entries()) {
      expect(span.start, span.role.company).toBeLessThanOrEqual(span.end);
      const next = spans[index + 1];
      if (next)
        expect(next.end, `${next.role.company} after ${span.role.company}`).toBeLessThanOrEqual(
          span.end,
        );
    }
  });

  it("has every role on LinkedIn, in LinkedIn's order", () => {
    // Montway is on the site and not on LinkedIn; everything else is LinkedIn's list.
    const listed = roles
      .filter((role) => role.company !== "Montway Auto Transport")
      .map((role) => `${role.company} | ${role.title} | ${role.dates}`);
    expect(listed).toEqual([
      "Chromatic | Senior Staff Engineer | Jun 2026 — Present",
      "Yogan Dot Dev | Founder & Lead Engineer | Mar 2022 — Jun 2026",
      "Avant | Engineering Lead | Jun 2025 — Jan 2026",
      "Stealth AI Startup | Co-Founder / CTO | Jan 2024 — Jun 2025",
      "HG Insights | Senior Software Engineering Manager | Aug 2021 — Sep 2022",
      "Procore Technologies | Senior Engineering Manager | Oct 2016 — Jul 2021",
      "Sonian (acquired by Barracuda) | VP of Research and Development | Apr 2014 — Aug 2016",
      "Sonian (acquired by Barracuda) | Operations Engineer | Dec 2013 — May 2014",
      "BradsDeals.com | Sr. Software Engineer | Feb 2012 — Mar 2013",
      "PEAK6 Investments LP | Sr. Software Engineer | Nov 2009 — Sep 2011",
      "linkedFA | Software Engineer | 2008 — 2010",
      "Broward Center for the Performing Arts | Sr. Systems Analyst | May 2006 — Oct 2009",
    ]);
  });

  it("says nothing about the current role beyond what the site already says", () => {
    expect(roles[0]).toMatchObject({
      summary: "That work stays off this site.",
      description: "",
      highlights: [],
    });
  });
});
