"use client";

import { useEffect, useMemo, useState } from "react";

type RiskStatus = "Green" | "Amber" | "Red" | "NPL";

type LoanRecord = {
  member_name: string;
  member_number: string;
  loan_account: string;
  loan_product: string;
  branch: string;
  employer: string;
  sector: string;
  loan_amount: number;
  outstanding_balance: number;
  arrears_amount: number;
  days_in_arrears: number;
  repayment_status: string;
  risk_status: RiskStatus;
};

type ActionItem = {
  loan_account: string;
  member_name: string;
  risk_status: RiskStatus;
  action_required: string;
  assigned_to: string;
  due_date: string;
  status: "Open" | "In Progress" | "Completed" | "Escalated";
  notes: string;
};

function getDefaultAction(record: LoanRecord): string {
  if (record.risk_status === "Amber") {
    return "Contact member and confirm next repayment date.";
  }

  if (record.risk_status === "Red") {
    return "Escalate to credit manager and prepare recovery follow-up.";
  }

  if (record.risk_status === "NPL") {
    return "Assign recovery action and prepare board-level update.";
  }

  return "Monitor account.";
}

export default function ActionTrackerPage() {
  const [records, setRecords] = useState<LoanRecord[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedRecords = localStorage.getItem("kiprod_loan_records");
    const savedActions = localStorage.getItem("kiprod_action_items");

    if (savedRecords) {
      const parsedRecords: LoanRecord[] = JSON.parse(savedRecords);
      setRecords(parsedRecords);

      if (savedActions) {
        setActions(JSON.parse(savedActions));
      } else {
        const riskyRecords = parsedRecords.filter(
          (record) => record.risk_status !== "Green"
        );

        const starterActions: ActionItem[] = riskyRecords.map((record) => ({
          loan_account: record.loan_account,
          member_name: record.member_name,
          risk_status: record.risk_status,
          action_required: getDefaultAction(record),
          assigned_to: "",
          due_date: "",
          status: "Open",
          notes: "",
        }));

        setActions(starterActions);
        localStorage.setItem(
          "kiprod_action_items",
          JSON.stringify(starterActions)
        );
      }
    }
  }, []);

  const summary = useMemo(() => {
    return {
      total: actions.length,
      open: actions.filter((action) => action.status === "Open").length,
      inProgress: actions.filter((action) => action.status === "In Progress")
        .length,
      completed: actions.filter((action) => action.status === "Completed")
        .length,
      escalated: actions.filter((action) => action.status === "Escalated")
        .length,
    };
  }, [actions]);

  function updateAction(
    loanAccount: string,
    field: keyof ActionItem,
    value: string
  ) {
    const updatedActions = actions.map((action) =>
      action.loan_account === loanAccount
        ? { ...action, [field]: value }
        : action
    );

    setActions(updatedActions);
    localStorage.setItem("kiprod_action_items", JSON.stringify(updatedActions));
    setMessage("Action tracker updated.");
  }

  function resetActionsFromPortfolio() {
    const riskyRecords = records.filter((record) => record.risk_status !== "Green");

    const starterActions: ActionItem[] = riskyRecords.map((record) => ({
      loan_account: record.loan_account,
      member_name: record.member_name,
      risk_status: record.risk_status,
      action_required: getDefaultAction(record),
      assigned_to: "",
      due_date: "",
      status: "Open",
      notes: "",
    }));

    setActions(starterActions);
    localStorage.setItem("kiprod_action_items", JSON.stringify(starterActions));
    setMessage("Action tracker regenerated from the latest portfolio data.");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
              KIPROD Command Centre
            </p>
            <h1 className="text-3xl font-bold text-slate-950">
              Management Action Tracker
            </h1>
            <p className="mt-2 max-w-3xl text-slate-600">
              Convert early warning accounts into assigned management actions,
              due dates, follow-up notes, and escalation status.
            </p>
          </div>

          <button
            onClick={resetActionsFromPortfolio}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            Regenerate from Portfolio
          </button>
        </div>

        {records.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              No portfolio data available
            </h2>
            <p className="mt-2 text-slate-600">
              Upload portfolio data first, then return here to create action
              items.
            </p>
            <a
              href="/portfolio-upload"
              className="mt-6 inline-block rounded-full bg-amber-400 px-6 py-3 font-semibold text-slate-950"
            >
              Upload Portfolio
            </a>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Total Actions</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  {summary.total}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Open</p>
                <h2 className="mt-2 text-2xl font-bold text-amber-600">
                  {summary.open}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">In Progress</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  {summary.inProgress}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Completed</p>
                <h2 className="mt-2 text-2xl font-bold text-green-700">
                  {summary.completed}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Escalated</p>
                <h2 className="mt-2 text-2xl font-bold text-red-700">
                  {summary.escalated}
                </h2>
              </div>
            </div>

            {message && (
              <p className="mt-4 rounded-xl bg-white p-4 text-sm font-medium text-slate-700 shadow-sm">
                {message}
              </p>
            )}

            <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Action Register
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Generated from Amber, Red, and NPL accounts.
              </p>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="py-3">Member</th>
                      <th className="py-3">Risk</th>
                      <th className="py-3">Action Required</th>
                      <th className="py-3">Assigned To</th>
                      <th className="py-3">Due Date</th>
                      <th className="py-3">Status</th>
                      <th className="py-3">Notes</th>
                    </tr>
                  </thead>

                  <tbody>
                    {actions.map((action) => (
                      <tr key={action.loan_account} className="border-b">
                        <td className="py-3 font-medium text-slate-900">
                          {action.member_name}
                        </td>

                        <td className="py-3">
                          <span
  className={`rounded-full px-3 py-1 text-xs font-bold ${
    action.risk_status === "Amber"
      ? "bg-amber-200 text-amber-900"
      : action.risk_status === "Red"
      ? "bg-red-200 text-red-900"
      : action.risk_status === "NPL"
      ? "bg-red-700 text-white"
      : "bg-green-200 text-green-900"
  }`}
>
  {action.risk_status}
</span>
                        </td>

                        <td className="py-3">
                          <textarea
                            value={action.action_required}
                            onChange={(event) =>
                              updateAction(
                                action.loan_account,
                                "action_required",
                                event.target.value
                              )
                            }
                            rows={2}
                            className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                          />
                        </td>

                        <td className="py-3">
                          <input
                            value={action.assigned_to}
                            onChange={(event) =>
                              updateAction(
                                action.loan_account,
                                "assigned_to",
                                event.target.value
                              )
                            }
                            placeholder="Officer name"
                            className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                          />
                        </td>

                        <td className="py-3">
                          <input
                            type="date"
                            value={action.due_date}
                            onChange={(event) =>
                              updateAction(
                                action.loan_account,
                                "due_date",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                          />
                        </td>

                        <td className="py-3">
                          <select
                            value={action.status}
                            onChange={(event) =>
                              updateAction(
                                action.loan_account,
                                "status",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                          >
                            <option>Open</option>
                            <option>In Progress</option>
                            <option>Completed</option>
                            <option>Escalated</option>
                          </select>
                        </td>

                        <td className="py-3">
                          <textarea
                            value={action.notes}
                            onChange={(event) =>
                              updateAction(
                                action.loan_account,
                                "notes",
                                event.target.value
                              )
                            }
                            rows={2}
                            placeholder="Follow-up notes"
                            className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}