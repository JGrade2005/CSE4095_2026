// Reads TODO.md checkboxes and writes PROGRESS.md with a text progress bar per phase.
// Usage: node progress.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const todoPath = join(root, "TODO.md");
const progressPath = join(root, "PROGRESS.md");
const planPath = join(root, "IMPLEMENTATION_PLAN.md");
const BAR_WIDTH = 20;

function bar(done, total) {
  const ratio = total === 0 ? 0 : done / total;
  const filled = Math.round(ratio * BAR_WIDTH);
  const percent = Math.round(ratio * 100);
  return `[${"#".repeat(filled)}${"-".repeat(BAR_WIDTH - filled)}] ${String(percent).padStart(3)}%`;
}

function parsePhases(markdown) {
  const phases = [];
  let current = null;
  for (const line of markdown.split("\n")) {
    const phaseMatch = line.match(/^## (Phase (\d+): .+)$/);
    if (phaseMatch) {
      current = { title: phaseMatch[1].trim(), number: Number(phaseMatch[2]), done: 0, total: 0 };
      phases.push(current);
      continue;
    }
    // Milestones and the suggested sequence repeat earlier tasks, so stop counting there.
    if (line.startsWith("# ")) current = null;
    const box = line.match(/^\s*-\s+\[([ xX])\]/);
    if (current && box) {
      current.total += 1;
      if (box[1] !== " ") current.done += 1;
    }
  }
  return phases;
}

// Group membership lives only in the plan's "**Phases:**" lines so the two files cannot drift.
function parseGroups(markdown) {
  const groups = [];
  for (const line of markdown.split("\n")) {
    const heading = line.match(/^## (G\d+\. .+)$/);
    if (heading) groups.push({ title: heading[1].trim(), phaseNumbers: [] });
    const members = line.match(/^\*\*Phases:\*\* (.+)$/);
    if (members && groups.length > 0) {
      groups.at(-1).phaseNumbers = members[1].split(",").map((n) => Number(n.trim()));
    }
  }
  return groups;
}

const phases = parsePhases(readFileSync(todoPath, "utf8"));
const groups = existsSync(planPath) ? parseGroups(readFileSync(planPath, "utf8")) : [];
const done = phases.reduce((sum, phase) => sum + phase.done, 0);
const total = phases.reduce((sum, phase) => sum + phase.total, 0);
const groupRows = groups.map((group) => {
  const members = phases.filter((phase) => group.phaseNumbers.includes(phase.number));
  const groupDone = members.reduce((sum, phase) => sum + phase.done, 0);
  const groupTotal = members.reduce((sum, phase) => sum + phase.total, 0);
  return { title: `${group.title} [P${group.phaseNumbers.join(", P")}]`, done: groupDone, total: groupTotal };
});
const titleWidth = Math.max(...[...phases, ...groupRows].map((row) => row.title.length));
const formatRow = (row) =>
  `${row.title.padEnd(titleWidth)}  ${bar(row.done, row.total)}  ${row.done}/${row.total}`;

const rows = phases.map(formatRow);
const phasesDone = phases.filter((phase) => phase.total > 0 && phase.done === phase.total).length;
const overall = `${"Overall".padEnd(titleWidth)}  ${bar(done, total)}  ${done}/${total}`;
const phaseSummary = `${"Phases complete".padEnd(titleWidth)}  ${bar(phasesDone, phases.length)}  ${phasesDone}/${phases.length}`;

const output = [
  "# Math Practice App: Progress",
  "",
  "Generated from TODO.md by `node progress.mjs`. Do not edit by hand.",
  "",
  "```text",
  phaseSummary,
  overall,
  "```",
  ...(groupRows.length > 0
    ? ["", "## Groups (IMPLEMENTATION_PLAN.md)", "", "```text", ...groupRows.map(formatRow), "```"]
    : []),
  "",
  "## Phases",
  "",
  "```text",
  ...rows,
  "```",
  "",
].join("\n");

writeFileSync(progressPath, output);
console.log(phaseSummary);
console.log(overall);
