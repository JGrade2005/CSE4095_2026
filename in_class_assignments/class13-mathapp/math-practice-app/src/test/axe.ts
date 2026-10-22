import axe from "axe-core";
import type { Result } from "axe-core";

// jsdom has no layout or canvas, so axe cannot compute colors; contrast was checked by hand instead.
const DISABLED_RULES = { "color-contrast": { enabled: false } };

export async function findViolations(context: Element = document.body): Promise<Result[]> {
  const results = await axe.run(context, { rules: DISABLED_RULES });
  return results.violations;
}

export function describeViolations(violations: Result[]): string {
  return violations
    .map((violation) => {
      const targets = violation.nodes.map((node) => node.target.join(" ")).join("; ");
      return `${violation.id} (${violation.impact}): ${violation.help} -> ${targets}`;
    })
    .join("\n");
}

export async function expectNoViolations(context: Element = document.body): Promise<void> {
  const violations = await findViolations(context);
  expect(describeViolations(violations)).toBe("");
}
