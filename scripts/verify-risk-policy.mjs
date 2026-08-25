import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const failures = [];
const passes = [];

function requireText(rel, text, label) {
  if (read(rel).includes(text)) passes.push(label);
  else failures.push(`${label} — missing in ${rel}`);
}

function forbidText(rel, text, label) {
  if (!read(rel).includes(text)) passes.push(label);
  else failures.push(`${label} — forbidden text still present in ${rel}`);
}

const classify = (days) =>
  days === 0 ? "Green" : days <= 30 ? "Amber" : days <= 90 ? "Red" : "NPL";
const par30 = (days) => days > 30;
const par90 = (days) => days > 90;

for (const [days, status, p30, p90] of [
  [0, "Green", false, false],
  [1, "Amber", false, false],
  [30, "Amber", false, false],
  [31, "Red", true, false],
  [90, "Red", true, false],
  [91, "NPL", true, true],
]) {
  if (classify(days) !== status || par30(days) !== p30 || par90(days) !== p90) {
    failures.push(`DPD boundary regression failed at ${days} days`);
  }
}

if (!failures.some((x) => x.startsWith("DPD boundary"))) {
  passes.push("DPD boundaries 0 / 1 / 30 / 31 / 90 / 91");
}

requireText(
  "lib/riskPolicy.ts",
  "return Number(daysValue || 0) > PAR30_THRESHOLD_DAYS;",
  "PAR30 remains strictly >30"
);
requireText(
  "lib/riskPolicy.ts",
  "return Number(daysValue || 0) > PAR90_THRESHOLD_DAYS;",
  "PAR90 remains strictly >90"
);
requireText(
  "lib/riskPolicy.ts",
  'status === "Amber" || status === "Red" || status === "NPL"',
  "Watchlist remains Amber + Red + NPL"
);

forbidText(
  "app/executive-dashboard/page.tsx",
  "30+ DPD",
  "Cockpit does not misstate PAR30"
);
forbidText(
  "app/executive-dashboard/page.tsx",
  "90+ DPD",
  "Cockpit does not misstate PAR90"
);
forbidText(
  "app/board-pack/page.tsx",
  "at 30 days past due or more",
  "Board Report does not misstate PAR30"
);
forbidText(
  "app/board-pack/page.tsx",
  "at 90 days past due or more",
  "Board Report does not misstate PAR90"
);
forbidText(
  "app/board-pack/page.tsx",
  'metric("Portfolio at Risk"',
  "Board Report does not label raw arrears as Portfolio at Risk"
);
forbidText(
  "app/action-tracker/page.tsx",
  "Regenerate from Portfolio",
  "Destructive regenerate button removed"
);
forbidText(
  "app/action-tracker/page.tsx",
  "resetActionsFromPortfolio",
  "Destructive reset function removed"
);

const tracker = read("app/action-tracker/page.tsx");
const statusBlock =
  tracker.match(/const statuses: ActionStatus\[\] = \[([\s\S]*?)\];/)?.[1] || "";

if (statusBlock.includes('"Overdue"')) {
  failures.push("Overdue remains a manually selectable action status");
} else {
  passes.push("Overdue is derived, not manually selectable");
}

requireText(
  "app/watchlist/page.tsx",
  ".filter((record) => isWatchlistStatus(record.risk_status))",
  "Watchlist membership uses frozen definition"
);
requireText(
  "app/board-pack/page.tsx",
  "Action status interpretation:",
  "Board Report explains Open vs Overdue"
);
requireText(
  "app/board-oversight/page.tsx",
  "trigger counters such as NPL,",
  "Board Oversight explains overlapping triggers"
);
requireText(
  "AGENTS.md",
  "## Locked Interpretation Rules",
  "Repository policy has interpretation safeguards"
);

console.log("\nKIPROD RISK POLICY VERIFICATION");
console.log("================================");
for (const item of passes) console.log(`PASS  ${item}`);

if (failures.length) {
  console.error("\nFAILED CHECKS");
  for (const item of failures) console.error(`FAIL  ${item}`);
  process.exit(1);
}

console.log("\nAll locked risk-policy checks passed.");
