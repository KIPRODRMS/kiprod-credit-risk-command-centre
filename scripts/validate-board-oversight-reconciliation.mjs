import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pagePath = fileURLToPath(
  new URL("../app/board-oversight/page.tsx", import.meta.url)
);
const pageSource = readFileSync(pagePath, "utf8");
const clarificationSource = readFileSync(
  fileURLToPath(
    new URL("../app/clarification-requests/page.tsx", import.meta.url)
  ),
  "utf8"
);

assert.match(
  pageSource,
  /overdue:\s*actions\.filter\(isOverdue\)\.length/,
  "Overdue summary must use the complete action register."
);
assert.match(
  clarificationSource,
  /localStorage\.setItem\(\s*"kiprodClarificationRequests"/,
  "Clarification Requests must maintain the shared Board reporting snapshot."
);
assert.match(
  pageSource,
  /highExposure:\s*highExposureRecords\.length/,
  "High-exposure summary must use the Board Report top-10 set."
);
assert.match(
  pageSource,
  /String\(request\.status \|\| ""\)\.toLowerCase\(\) !== "closed"/,
  "Only Closed clarification requests may be excluded."
);

const riskStatuses = [
  ...Array(140).fill("Green"),
  ...Array(30).fill("Amber"),
  ...Array(20).fill("Red"),
  ...Array(10).fill("NPL"),
];

const records = riskStatuses.map((risk_status, index) => ({
  loan_account: `LN-${String(index + 1).padStart(4, "0")}`,
  outstanding_balance: 1_000_000 - index * 1_000,
  risk_status,
}));
const watchlist = records.filter((record) =>
  ["Amber", "Red", "NPL"].includes(record.risk_status)
);
const highExposureRecords = [...watchlist]
  .sort((a, b) => b.outstanding_balance - a.outstanding_balance)
  .slice(0, Math.min(10, watchlist.length));

const actions = watchlist.map((record, index) => ({
  action_id: `ACT-${String(index + 1).padStart(4, "0")}`,
  due_date: "2026-08-14",
  status: "Assigned",
}));
const isClosed = (action) =>
  ["closed", "completed", "done"].includes(
    String(action.status || "").toLowerCase()
  );
const isOverdue = (action) => {
  if (!action.due_date || isClosed(action)) return false;
  return (
    new Date(`${action.due_date}T23:59:59`).getTime() <
    new Date("2026-08-16T12:00:00+03:00").getTime()
  );
};

const clarifications = [
  { status: "Pending Management Response" },
  { status: "Converted to Action" },
  { status: "Closed" },
];
const unresolvedClarifications = clarifications.filter(
  (request) => String(request.status || "").toLowerCase() !== "closed"
);

const result = {
  overdueActions: actions.filter(isOverdue).length,
  highExposureAccounts: highExposureRecords.length,
  unresolvedClarifications: unresolvedClarifications.length,
};

assert.deepEqual(result, {
  overdueActions: 60,
  highExposureAccounts: 10,
  unresolvedClarifications: 2,
});

console.log(JSON.stringify(result));
