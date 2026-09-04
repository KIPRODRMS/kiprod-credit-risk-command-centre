(() => {
  const records = JSON.parse(localStorage.getItem("kiprod_loan_records") || "[]");
  const actions = JSON.parse(localStorage.getItem("kiprod_action_items") || "[]");

  const counts = {
    total: records.length,
    amber: records.filter((r) => r.risk_status === "Amber").length,
    red: records.filter((r) => r.risk_status === "Red").length,
    npl: records.filter((r) => r.risk_status === "NPL").length,
  };

  if (
    counts.total !== 200 ||
    counts.amber !== 30 ||
    counts.red !== 20 ||
    counts.npl !== 10 ||
    actions.length !== 60
  ) {
    console.error("KIPROD restore stopped: current browser data does not match the controlled 200-account / 60-action test portfolio.", counts, { actions: actions.length });
    return;
  }

  const recordMap = new Map(records.map((record) => [record.loan_account, record]));
  const missing = actions.filter((action) => !recordMap.has(action.loan_account));
  if (missing.length > 0) {
    console.error("KIPROD restore stopped: some actions do not match the current portfolio.", missing.map((a) => a.loan_account));
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  localStorage.setItem(
    `kiprod_action_items_backup_before_restore_60_${stamp}`,
    JSON.stringify(actions)
  );

  // Original controlled-test action baseline: 5 August 2026.
  // SLA logic: NPL = same day; Red / High Exposure = +3 days; Amber = +7 days.
  const baseline = new Date("2026-08-05T00:00:00+03:00");

  const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next.toISOString().slice(0, 10);
  };

  const restored = actions.map((action) => {
    const record = recordMap.get(action.loan_account);
    const isHighExposure = Array.isArray(record.risk_flags) && record.risk_flags.includes("High Exposure");
    const dueInDays = record.risk_status === "NPL" ? 0 : record.risk_status === "Red" || isHighExposure ? 3 : 7;

    return {
      ...action,
      due_date: addDays(baseline, dueInDays),
    };
  });

  localStorage.setItem("kiprod_action_items", JSON.stringify(restored));

  let logs = [];
  try {
    const parsed = JSON.parse(localStorage.getItem("kiprodAuditLogs") || "[]");
    logs = Array.isArray(parsed) ? parsed : [];
  } catch {
    logs = [];
  }

  const role = localStorage.getItem("kiprodCurrentRole") || "MVP User";
  const audit = {
    id: `audit-${Date.now()}-restore60`,
    createdAt: new Date().toISOString(),
    module: "Execution Tracker",
    actionType: "EXECUTION_DUE_DATES_RESTORED",
    recordRef: "Controlled 200-account portfolio",
    oldValue: "Due dates reset by portfolio re-upload",
    newValue: "Original 60 action SLA dates restored",
    role,
    user: role,
    note: "Restored the controlled-test action due dates from the 5 August 2026 portfolio baseline without changing owners, statuses, notes, escalation or Board visibility."
  };
  localStorage.setItem("kiprodAuditLogs", JSON.stringify([audit, ...logs]));

  const closed = new Set(["closed", "completed", "done"]);
  const overdue = restored.filter((action) => {
    if (!action.due_date || closed.has(String(action.status || "").toLowerCase())) return false;
    return new Date(`${action.due_date}T23:59:59`).getTime() < Date.now();
  }).length;

  console.log("KIPROD controlled-test action dates restored.", {
    actions: restored.length,
    overdue,
    expectedOverdue: 60,
  });

  if (overdue !== 60) {
    console.warn("Restore completed, but the overdue count is not 60. Check whether any action has been closed since the accepted test baseline.");
    return;
  }

  window.location.reload();
})();
