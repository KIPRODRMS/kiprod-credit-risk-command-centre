import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function findProjectRoot() {
  const candidates = [
    process.cwd(),
    path.resolve(scriptDir, ".."),
    path.resolve(scriptDir, "../.."),
  ];

  for (const candidate of candidates) {
    const packagePath = path.join(candidate, "package.json");
    if (!fs.existsSync(packagePath)) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
      if (pkg.name === "kiprod-credit-risk-command-centre") return candidate;
    } catch {}
  }

  throw new Error(
    "Could not find the KIPROD Command Centre project root. Keep this folder inside the project root and run from the project root."
  );
}

const root = findProjectRoot();
console.log(`KIPROD project: ${root}`);

function abs(rel) {
  return path.join(root, rel);
}

function read(rel) {
  const file = abs(rel);
  if (!fs.existsSync(file)) throw new Error(`Required file not found: ${rel}`);
  return fs.readFileSync(file, "utf8");
}

function write(rel, content) {
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
  fs.writeFileSync(abs(rel), content, "utf8");
}

function replaceOnce(rel, oldText, newText, label) {
  let text = read(rel);
  if (text.includes(newText)) {
    console.log(`SKIP: ${label} already applied.`);
    return;
  }
  const count = text.split(oldText).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected 1 old match in ${rel}, found ${count}.`);
  }
  text = text.replace(oldText, newText);
  write(rel, text);
  console.log(`DONE: ${label}`);
}

function replaceRegexOnce(rel, regex, newText, alreadyAppliedNeedle, label) {
  let text = read(rel);
  if (alreadyAppliedNeedle && text.includes(alreadyAppliedNeedle)) {
    console.log(`SKIP: ${label} already applied.`);
    return;
  }
  const matches = [...text.matchAll(new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g"))];
  if (matches.length !== 1) {
    throw new Error(`${label}: expected 1 regex match in ${rel}, found ${matches.length}.`);
  }
  text = text.replace(regex, newText);
  write(rel, text);
  console.log(`DONE: ${label}`);
}

// -----------------------------------------------------------------------------
// A. Move installer backups OUTSIDE the Next.js project so TypeScript cannot scan
//    them as app source.
// -----------------------------------------------------------------------------
const parent = path.dirname(root);
const outsideBackupRoot = path.join(parent, "KIPROD Command Centre Backups");
fs.mkdirSync(outsideBackupRoot, { recursive: true });

const rootEntries = fs.readdirSync(root, { withFileTypes: true });
const backupDirs = rootEntries.filter(
  (entry) => entry.isDirectory() && entry.name.startsWith("kiprod-system-fix-backup-")
);

for (const entry of backupDirs) {
  const source = path.join(root, entry.name);
  let target = path.join(outsideBackupRoot, entry.name);
  if (fs.existsSync(target)) {
    target = path.join(outsideBackupRoot, `${entry.name}-${Date.now()}`);
  }
  fs.renameSync(source, target);
  console.log(`MOVED BACKUP OUTSIDE PROJECT: ${target}`);
}

// -----------------------------------------------------------------------------
// B. Confirm we are resuming the expected partial install, not guessing.
// -----------------------------------------------------------------------------
const requiredPartialMarkers = [
  ["lib/riskPolicy.ts", 'export const PAR30_THRESHOLD_DAYS = 30;', "shared risk policy"],
  ["app/portfolio-upload/page.tsx", 'from "@/lib/riskPolicy";', "Portfolio Upload shared policy"],
  ["app/executive-dashboard/page.tsx", "PAR30_SHORTHAND", "Executive Cockpit shared PAR labels"],
  ["app/dashboard/page.tsx", 'import { isPar30, isPar90 } from "@/lib/riskPolicy";', "Portfolio Health shared PAR"],
  ["app/early-warning/page.tsx", "isWatchlistStatus", "Early Warning shared watchlist"],
  ["app/watchlist/page.tsx", ".filter((record) => isWatchlistStatus(record.risk_status))", "Watchlist frozen membership"],
  ["app/action-tracker/page.tsx", "Sync New Risk Accounts", "Execution Tracker non-destructive sync"],
  ["app/board-pack/page.tsx", "PAR30_DESCRIPTION", "Board Report shared PAR wording"],
  ["app/board-pack/page.tsx", "Arrears to Outstanding Ratio", "Board Report arrears terminology"],
];

const missing = [];
for (const [rel, marker, label] of requiredPartialMarkers) {
  if (!fs.existsSync(abs(rel)) || !read(rel).includes(marker)) {
    missing.push(`${label} (${rel})`);
  }
}

if (missing.length) {
  throw new Error(
    "This project is not in the expected partial-install state. Missing: " +
      missing.join(", ") +
      ". Stop here rather than applying guesses."
  );
}

console.log("Partial-install state verified.");

// -----------------------------------------------------------------------------
// C. Finish the Board Report screen explanation that caused the first installer
//    to stop. Use a tolerant regex because the live file has different whitespace.
// -----------------------------------------------------------------------------
const board = "app/board-pack/page.tsx";

replaceRegexOnce(
  board,
  /<p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-700">\s*<strong>Overdue definition:<\/strong>\s*due date is before today and\s*status is not Closed\. Open actions are not overdue by default\.\s*<\/p>/,
  `<p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-700">
                <strong>Action status interpretation:</strong>{" "}
                {report.openActions.length} actions are currently open;{" "}
                {report.overdueActions.length} of them are past their due date.
                Overdue is derived from due date and closure status. An open
                action is not automatically overdue.
              </p>`,
  "Action status interpretation:",
  "Board Report open/overdue screen explanation"
);

// -----------------------------------------------------------------------------
// D. Board Oversight: shared rules, fresh clarifications, clearer metrics.
// -----------------------------------------------------------------------------
const oversight = "app/board-oversight/page.tsx";

replaceOnce(
  oversight,
  'import { supabase } from "@/lib/supabaseClient";\n',
  `import { supabase } from "@/lib/supabaseClient";
import {
  getHighExposureLoanAccounts,
  isActionOverdue,
  isClosedActionStatus,
  isWatchlistStatus,
} from "@/lib/riskPolicy";
`,
  "Board Oversight shared risk-policy import"
);

replaceOnce(
  oversight,
  `function isClosed(action: ActionItem) {
  return CLOSED_STATUSES.includes(String(action.status || "").toLowerCase());
}`,
  `function isClosed(action: ActionItem) {
  return isClosedActionStatus(action.status);
}`,
  "Board Oversight closed-action rule"
);

replaceOnce(
  oversight,
  `function isOverdue(action: ActionItem) {
  if (!action.due_date || isClosed(action)) return false;
  const due = new Date(\`\${action.due_date}T23:59:59\`);
  return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
}`,
  `function isOverdue(action: ActionItem) {
  return isActionOverdue(action);
}`,
  "Board Oversight overdue rule"
);

replaceOnce(
  oversight,
  `    const watchlist = records.filter((record) =>
      ["Amber", "Red", "NPL"].includes(record.risk_status)
    );`,
  `    const watchlist = records.filter((record) =>
      isWatchlistStatus(record.risk_status)
    );`,
  "Board Oversight watchlist definition"
);

replaceOnce(
  oversight,
  `    const highExposureRecords = [...watchlist]
      .sort(
        (a, b) =>
          Number(b.outstanding_balance || 0) -
          Number(a.outstanding_balance || 0)
      )
      .slice(0, Math.min(10, watchlist.length));
    const highExposureLoans = new Set(
      highExposureRecords.map((record) => record.loan_account)
    );`,
  `    const highExposureLoans = getHighExposureLoanAccounts(watchlist);
    const highExposureRecords = [...watchlist]
      .filter((record) => highExposureLoans.has(record.loan_account))
      .sort(
        (a, b) =>
          Number(b.outstanding_balance || 0) -
          Number(a.outstanding_balance || 0)
      );`,
  "Board Oversight high-exposure definition"
);

replaceOnce(
  oversight,
  `    const storedClarifications = readStored<ClarificationRequest[]>(
      "kiprodClarificationRequests",
      []
    );
    if (storedClarifications.length > 0) {
      return;
    }

    const institutionId =
      process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID || "";
    if (institutionId) {`,
  `    const storedClarifications = readStored<ClarificationRequest[]>(
      "kiprodClarificationRequests",
      []
    );

    if (storedClarifications.length > 0) {
      setClarifications(storedClarifications);
    }

    const institutionId =
      process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID || "";
    if (institutionId) {`,
  "Board Oversight clarification refresh"
);

replaceOnce(
  oversight,
  `Metric label="Last Report Generated" value={lastReport} note="Formal Board Report reference"`,
  `Metric label="Reporting Period" value={lastReport} note="Current Board Report period"`,
  "Board Oversight reporting-period label"
);

replaceOnce(
  oversight,
  `        <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950">
          Summary figures use the same complete Command Centre action,
          portfolio, and clarification records as the Board Report. The
          detailed register below is the Board-visible governance subset.
        </p>`,
  `        <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950">
          Summary figures use the same complete Command Centre action,
          portfolio, and clarification records as the Board Report. The
          detailed register below is the Board-visible governance subset.
          Board-visible risks are unique matters; trigger counters such as NPL,
          overdue, high exposure and clarification can overlap and must not be
          added together.
        </p>`,
  "Board Oversight unique-matter explanation"
);

// Remove the now-unused local closed-status constant if still present.
let oversightText = read(oversight);
if (oversightText.includes('const CLOSED_STATUSES = ["closed", "completed", "done"];\n\n')) {
  oversightText = oversightText.replace(
    'const CLOSED_STATUSES = ["closed", "completed", "done"];\n\n',
    ""
  );
  write(oversight, oversightText);
  console.log("DONE: removed obsolete Board Oversight closed-status constant.");
}

// -----------------------------------------------------------------------------
// E. Finish repository policy safeguards.
// -----------------------------------------------------------------------------
const agents = "AGENTS.md";
let agentsText = read(agents);
if (!agentsText.includes("## Locked Interpretation Rules")) {
  agentsText = agentsText.trimEnd() + `

## Locked Interpretation Rules

- User-facing PAR30 wording must say **more than 30 days past due (31+ DPD)**.
- User-facing PAR90 wording must say **more than 90 days past due (91+ DPD)**.
- Never describe the locked PAR thresholds as "30 days or more", "30+ DPD", "90 days or more", or "90+ DPD".
- **Overdue is a derived condition**, calculated from due date plus closure status. It is not a manually selectable action status.
- **Open and overdue are different measures.** An open action is unresolved; it becomes overdue only after its due date passes.
- **Board-visible risks are unique governance matters**, not the arithmetic sum of trigger counters. NPL, overdue, high exposure, clarification, deterioration and ownership triggers can overlap on the same account.
- Restructured and High Exposure are **risk overlays inside the Watchlist**. They must not add Green accounts to the Watchlist.
- High Exposure means the top 10 outstanding exposures **within the current Watchlist**, unless KIPROD explicitly approves a different policy.
- A destructive "regenerate actions" operation is prohibited. Portfolio/action synchronization may add genuinely new risk actions but must preserve existing accountability records.
- "Portfolio at Risk" must not be used as a label for raw arrears. Use **Total Arrears** and **Arrears to Outstanding Ratio** for arrears measures; reserve PAR terminology for the approved DPD exposure thresholds.
`;
  write(agents, agentsText);
  console.log("DONE: AGENTS.md interpretation safeguards.");
} else {
  console.log("SKIP: AGENTS.md interpretation safeguards already present.");
}

// -----------------------------------------------------------------------------
// F. Install static regression verifier.
// -----------------------------------------------------------------------------
const verifier = `import fs from "node:fs";
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
  else failures.push(\`\${label} — missing in \${rel}\`);
}

function forbidText(rel, text, label) {
  if (!read(rel).includes(text)) passes.push(label);
  else failures.push(\`\${label} — forbidden text still present in \${rel}\`);
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
    failures.push(\`DPD boundary regression failed at \${days} days\`);
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
  tracker.match(/const statuses: ActionStatus\\[\\] = \\[([\\s\\S]*?)\\];/)?.[1] || "";

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

console.log("\\nKIPROD RISK POLICY VERIFICATION");
console.log("================================");
for (const item of passes) console.log(\`PASS  \${item}\`);

if (failures.length) {
  console.error("\\nFAILED CHECKS");
  for (const item of failures) console.error(\`FAIL  \${item}\`);
  process.exit(1);
}

console.log("\\nAll locked risk-policy checks passed.");
`;

write("scripts/verify-risk-policy.mjs", verifier);
console.log("DONE: risk-policy verifier installed.");

const packageRel = "package.json";
const pkg = JSON.parse(read(packageRel));
pkg.scripts = pkg.scripts || {};
pkg.scripts["verify:risk"] = "node scripts/verify-risk-policy.mjs";
write(packageRel, JSON.stringify(pkg, null, 2) + "\n");
console.log("DONE: npm run verify:risk installed.");

console.log("\\nRESUME PATCH COMPLETE.");
console.log("Next commands:");
console.log("  npm run verify:risk");
console.log("  npm run build");
