"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BOARD_REPORT_OVERRIDE_FIELDS,
  defaultInstitutionProfile,
  loadBoardReportOverrides,
  loadMasterInstitutionProfile,
  removeBoardReportOverride,
  saveBoardReportOverride,
  type BoardReportOverride,
  type BoardReportOverrideField,
  type InstitutionProfile,
  type MasterProfileSource,
} from "@/lib/institutionMaster";
import { supabase } from "@/lib/supabaseClient";
import {
  isActionOverdue,
  isClosedActionStatus,
  isPar30,
  isPar90,
  isWatchlistStatus,
  PAR30_DESCRIPTION,
  PAR90_DESCRIPTION,
} from "@/lib/riskPolicy";

type RiskStatus = "Green" | "Amber" | "Red" | "NPL";
type LoanRecord = {
  member_name: string;
  member_number?: string;
  loan_account: string;
  loan_product?: string;
  branch?: string;
  employer?: string;
  sector?: string;
  loan_amount?: number;
  outstanding_balance: number;
  arrears_amount?: number;
  days_in_arrears?: number;
  responsible_officer?: string;
  restructured?: string;
  risk_status: RiskStatus;
  risk_flags?: string[];
};
type ActionItem = {
  action_id?: string;
  loan_account: string;
  member_name: string;
  action_required?: string;
  assigned_to?: string;
  due_date?: string;
  status?: string;
  escalation_level?: string;
  board_visible?: boolean;
  notes?: string;
};
type ClarificationRequest = { status?: string };

const RISK_REGISTER_PAGE_SIZE = 10;

function readStored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
}

function isClosed(action: ActionItem) {
  return isClosedActionStatus(action.status);
}

function isOverdue(action: ActionItem) {
  return isActionOverdue(action);
}

function formatMoney(value: number, currency: string) {
  return `${currency} ${value.toLocaleString("en-KE", {
    maximumFractionDigits: 0,
  })}`;
}

function groupExposure(records: LoanRecord[], key: keyof LoanRecord) {
  const groups = new Map<string, { accounts: number; exposure: number }>();
  records.forEach((record) => {
    const name = String(record[key] || "Not provided");
    const current = groups.get(name) || { accounts: 0, exposure: 0 };
    groups.set(name, {
      accounts: current.accounts + 1,
      exposure: current.exposure + Number(record.outstanding_balance || 0),
    });
  });
  return [...groups.entries()]
    .map(([name, values]) => ({ name, ...values }))
    .sort((a, b) => b.exposure - a.exposure)
    .slice(0, 5);
}

function badge(status: RiskStatus) {
  if (status === "Green") return "bg-emerald-100 text-emerald-800";
  if (status === "Amber") return "bg-amber-100 text-amber-900";
  if (status === "Red") return "bg-red-100 text-red-800";
  return "bg-red-700 text-white";
}

export default function BoardPackPage() {
  const [records, setRecords] = useState<LoanRecord[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [masterProfile, setMasterProfile] =
    useState<InstitutionProfile>(defaultInstitutionProfile);
  const [profileSource, setProfileSource] = useState<MasterProfileSource>("default");
  const [profileMessage, setProfileMessage] = useState("Loading master record...");
  const [overrides, setOverrides] = useState<BoardReportOverride[]>([]);
  const [showOverridePanel, setShowOverridePanel] = useState(false);
  const [overrideField, setOverrideField] =
    useState<BoardReportOverrideField>("institutionName");
  const [overrideValue, setOverrideValue] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideMessage, setOverrideMessage] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);
  const [clarifications, setClarifications] = useState<ClarificationRequest[]>([]);
  const [riskSearchInput, setRiskSearchInput] = useState("");
  const [riskSearch, setRiskSearch] = useState("");
  const [riskPage, setRiskPage] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const storedRecords = readStored<LoanRecord[]>("kiprod_loan_records", []);
    const storedActions = readStored<ActionItem[]>("kiprod_action_items", []);
    const storedClarifications = readStored<ClarificationRequest[]>(
      "kiprodClarificationRequests",
      []
    );
    queueMicrotask(() => {
      if (cancelled) return;
      setRecords(storedRecords);
      setActions(storedActions);
      setClarifications(storedClarifications);
    });

    const institutionId =
      process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID || "";

    if (institutionId) {
      supabase
        .from("clarification_requests")
        .select("status")
        .eq("institution_id", institutionId)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (cancelled || error) return;
          const latest = (data || []) as ClarificationRequest[];
          setClarifications(latest);
          localStorage.setItem(
            "kiprodClarificationRequests",
            JSON.stringify(latest)
          );
        });
    }

    loadMasterInstitutionProfile().then(async (result) => {
      if (cancelled) return;
      setMasterProfile(result.profile);
      setProfileSource(result.source);
      setProfileMessage(result.message);
      try {
        const loaded = await loadBoardReportOverrides(
          result.profile.reportingMonth || "Unspecified period"
        );
        if (!cancelled) setOverrides(loaded);
      } catch (error) {
        if (!cancelled) {
          setOverrideMessage(
            `Report overrides unavailable: ${error instanceof Error ? error.message : "Unknown database error"}`
          );
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const overridesByField = useMemo(
    () => new Map(overrides.map((item) => [item.fieldKey, item])),
    [overrides]
  );
  const profile = useMemo(() => {
    const effective = { ...masterProfile };
    overrides.forEach((item) => {
      effective[item.fieldKey] = item.overrideValue;
    });
    return effective;
  }, [masterProfile, overrides]);
  const reportingPeriod = masterProfile.reportingMonth || "Unspecified period";

  const report = useMemo(() => {
    const totalPortfolio = records.reduce(
      (sum, row) => sum + Number(row.loan_amount || 0),
      0
    );
    const outstanding = records.reduce(
      (sum, row) => sum + Number(row.outstanding_balance || 0),
      0
    );
    const arrears = records.reduce(
      (sum, row) => sum + Number(row.arrears_amount || 0),
      0
    );
    const byRisk = (risk: RiskStatus) =>
      records.filter((row) => row.risk_status === risk);
    const npl = byRisk("NPL");
    const par30 = records.filter((row) => isPar30(row.days_in_arrears));
    const par90 = records.filter((row) => isPar90(row.days_in_arrears));
    // Official Command Centre definition: Watchlist = Amber + Red + NPL.
    const watchlist = records.filter((row) =>
      isWatchlistStatus(row.risk_status)
    );
    const openActions = actions.filter((action) => !isClosed(action));
    const overdueActions = actions.filter(isOverdue);
    const escalatedActions = actions.filter(
      (action) =>
        String(action.status).toLowerCase() === "escalated" ||
        String(action.escalation_level).includes("Level 3") ||
        String(action.escalation_level).includes("Level 4")
    );
    const highExposure = [...watchlist]
      .sort((a, b) => b.outstanding_balance - a.outstanding_balance)
      .slice(0, Math.min(10, watchlist.length));
    const openClarifications = clarifications.filter(
      (item) => String(item.status).toLowerCase() !== "closed"
    );

    return {
      totalPortfolio,
      outstanding,
      arrears,
      green: byRisk("Green"),
      amber: byRisk("Amber"),
      red: byRisk("Red"),
      npl,
      nplValue: npl.reduce((sum, row) => sum + row.outstanding_balance, 0),
      nplRatio: outstanding
        ? (npl.reduce((sum, row) => sum + row.outstanding_balance, 0) /
            outstanding) *
          100
        : 0,
      par30,
      par90,
      par30Value: par30.reduce((sum, row) => sum + row.outstanding_balance, 0),
      par90Value: par90.reduce((sum, row) => sum + row.outstanding_balance, 0),
      watchlist,
      openActions,
      overdueActions,
      escalatedActions,
      closedActions: actions.filter(isClosed),
      dueThisWeek: openActions.filter((action) => {
        if (!action.due_date) return false;
        const due = new Date(`${action.due_date}T23:59:59`);
        const week = new Date();
        week.setDate(week.getDate() + 7);
        return due >= new Date() && due <= week;
      }),
      highExposure,
      openClarifications,
      branches: groupExposure(watchlist, "branch"),
      employers: groupExposure(watchlist, "employer"),
      sectors: groupExposure(watchlist, "sector"),
      products: groupExposure(watchlist, "loan_product"),
    };
  }, [records, actions, clarifications]);

  const currency = profile.reportingCurrency || "KES";
  const restructuredAccounts = records.filter(
    (record) => record.restructured?.toLowerCase() === "yes"
  ).length;
  const executiveInterpretation =
    `The institution's portfolio remains largely performing, with ${report.green.length} accounts classified as Green. ` +
    `However, ${report.watchlist.length} accounts require management follow-up, including ${report.red.length} Red accounts and ${report.npl.length} NPL accounts. ` +
    `The Board should pay particular attention to overdue management actions, material NPL exposure, and high-exposure accounts requiring senior visibility.`;
  const boardDecisions = [
    "Seek management clarification on overdue high-risk actions.",
    "Request a recovery update on material NPL accounts.",
    "Require management to present a 30-day corrective action plan for deteriorating portfolio areas.",
  ];
  const appendixGovernanceNote =
    "This appendix provides account-level detail supporting the Board summary. Operational follow-up remains the responsibility of management.";
  const appendixGroups: Array<{
    title: string;
    status: Exclude<RiskStatus, "Green">;
    rows: LoanRecord[];
  }> = [
    { title: "Amber Accounts", status: "Amber", rows: report.amber },
    { title: "Red Accounts", status: "Red", rows: report.red },
    { title: "NPL Accounts", status: "NPL", rows: report.npl },
  ];
  const filteredRiskRegister = useMemo(() => {
    const query = riskSearch.trim().toLowerCase();
    if (!query) return report.watchlist;
    const terms = query.split(/\s+/).filter(Boolean);
    return report.watchlist.filter((row) => {
      const values = [
        row.member_name,
        row.member_number,
        row.loan_account,
        row.branch,
        row.loan_product,
        row.risk_status,
        row.responsible_officer,
      ].map((value) => String(value || "").toLowerCase());

      return terms.every((term) =>
        values.some((value) => {
          if (term.length > 1) return value.includes(term);
          return value
            .split(/[^a-z0-9]+/)
            .some((word) => word.startsWith(term));
        })
      );
    });
  }, [report.watchlist, riskSearch]);
  const riskPageCount = Math.max(
    1,
    Math.ceil(filteredRiskRegister.length / RISK_REGISTER_PAGE_SIZE)
  );
  const currentRiskPage = Math.min(riskPage, riskPageCount);
  const paginatedRiskRegister = filteredRiskRegister.slice(
    (currentRiskPage - 1) * RISK_REGISTER_PAGE_SIZE,
    currentRiskPage * RISK_REGISTER_PAGE_SIZE
  );
  const firstRiskRow = filteredRiskRegister.length
    ? (currentRiskPage - 1) * RISK_REGISTER_PAGE_SIZE + 1
    : 0;
  const lastRiskRow = Math.min(
    currentRiskPage * RISK_REGISTER_PAGE_SIZE,
    filteredRiskRegister.length
  );
  const metric = (label: string, value: string | number, tone = "text-slate-950") => (
    <div className="board-report-metric rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
        {label}
      </p>
      <p className={`mt-2 text-xl font-bold ${tone}`}>{value}</p>
    </div>
  );

  const concentration = (
    title: string,
    rows: ReturnType<typeof groupExposure>
  ) => (
    <div className="board-report-concentration-card">
      <h3>{title}</h3>
      <div className="board-report-concentration-columns">
        <span>Rank</span>
        <span>Concentration</span>
        <span className="board-report-concentration-count-label">Accounts</span>
        <span className="board-report-concentration-value-label">
          Outstanding Exposure
        </span>
      </div>
      <div className="board-report-concentration-list">
        {rows.map((row, index) => (
          <div key={row.name} className="board-report-concentration-row">
            <span className="board-report-rank">{index + 1}</span>
            <span className="board-report-concentration-name" title={row.name}>{row.name}</span>
            <span
              className="board-report-concentration-count"
              aria-label={`${row.accounts} accounts`}
              title={`${row.accounts} accounts`}
            >
              {row.accounts}
            </span>
            <span
              className="board-report-concentration-value"
              data-label="Outstanding Exposure"
            >
              {formatMoney(row.exposure, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const riskTable = (rows: LoanRecord[], emptySearch = "") => (
    <div className="board-report-table-wrap overflow-x-auto">
      <table className="board-report-table w-full text-left text-xs">
        <thead>
          <tr>
            {["Member", "Loan Account", "Branch", "Product", "Outstanding", "Arrears", "Days", "Risk", "Officer"].map((head) => (
              <th key={head}>{head}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white text-slate-700">
          {rows.map((row) => (
            <tr key={row.loan_account} className="border-b border-slate-200">
              <td className="font-semibold">{row.member_name}</td>
              <td>{row.loan_account}</td>
              <td>{row.branch || "—"}</td>
              <td>{row.loan_product || "—"}</td>
              <td>{formatMoney(row.outstanding_balance, currency)}</td>
              <td>{formatMoney(Number(row.arrears_amount || 0), currency)}</td>
              <td>{row.days_in_arrears || 0}</td>
              <td><span className={`board-report-risk-badge ${badge(row.risk_status)}`}>{row.risk_status}</span></td>
              <td>{row.responsible_officer || "Unassigned"}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="py-8 text-center font-semibold text-slate-500">
                No risk accounts match “{emptySearch}”.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const contextItems: Array<{
    key: keyof InstitutionProfile;
    label: string;
    value: string;
  }> = [
    { key: "institutionName", label: "Institution", value: profile.institutionName || "Profile pending" },
    { key: "institutionType", label: "Institution Type", value: profile.institutionType || "Profile pending" },
    { key: "reportingMonth", label: "Reporting Month", value: profile.reportingMonth || "Profile pending" },
    { key: "reportingCurrency", label: "Reporting Currency", value: profile.reportingCurrency || "KES" },
    { key: "countyRegion", label: "County / Region", value: profile.countyRegion || "Profile pending" },
    { key: "boardReportingFrequency", label: "Reporting Frequency", value: profile.boardReportingFrequency || "Profile pending" },
    { key: "riskLead", label: "Risk Lead", value: profile.riskLead || "Profile pending" },
    { key: "creditManager", label: "Credit Manager", value: profile.creditManager || "Profile pending" },
    { key: "recoveryLead", label: "Recovery Lead", value: profile.recoveryLead || "Profile pending" },
    { key: "boardChair", label: "Board Chair / Risk Lead", value: profile.boardChair || "Profile pending" },
  ];

  async function refreshOverrides() {
    const loaded = await loadBoardReportOverrides(reportingPeriod);
    setOverrides(loaded);
    return loaded;
  }

  function chooseOverrideField(field: BoardReportOverrideField) {
    setOverrideField(field);
    const existing = overridesByField.get(field);
    setOverrideValue(existing?.overrideValue || masterProfile[field] || "");
    setOverrideReason(existing?.reason || "");
    setOverrideMessage("");
  }

  async function submitOverride(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextValue = overrideValue.trim();
    const reason = overrideReason.trim();
    if (!nextValue) {
      setOverrideMessage("Enter the report-specific value.");
      return;
    }
    if (reason.length < 5) {
      setOverrideMessage("Give a clear reason of at least five characters.");
      return;
    }
    if (nextValue === masterProfile[overrideField]) {
      setOverrideMessage("This matches the master record; no override is needed.");
      return;
    }

    setSavingOverride(true);
    setOverrideMessage("");
    try {
      await saveBoardReportOverride({
        fieldKey: overrideField,
        reportingPeriod,
        masterValue: masterProfile[overrideField],
        previousReportValue: profile[overrideField],
        overrideValue: nextValue,
        reason,
      });
      await refreshOverrides();
      setOverrideMessage("Report override saved and recorded in Audit History.");
      setOverrideValue("");
      setOverrideReason("");
    } catch (error) {
      setOverrideMessage(
        `Override could not be saved: ${error instanceof Error ? error.message : "Unknown database error"}`
      );
    } finally {
      setSavingOverride(false);
    }
  }

  async function restoreMasterValue(override: BoardReportOverride) {
    const reason = window.prompt(
      "Why is this report field being restored to the Institution Profile master value?"
    );
    if (!reason) return;
    if (reason.trim().length < 5) {
      window.alert("Please give a clear reason of at least five characters.");
      return;
    }
    setSavingOverride(true);
    setOverrideMessage("");
    try {
      await removeBoardReportOverride({
        override,
        masterValue: masterProfile[override.fieldKey],
        reason,
      });
      await refreshOverrides();
      setOverrideMessage("Master value restored and recorded in Audit History.");
    } catch (error) {
      setOverrideMessage(
        `Master value could not be restored: ${error instanceof Error ? error.message : "Unknown database error"}`
      );
    } finally {
      setSavingOverride(false);
    }
  }

  const printReport = () => window.print();

  const downloadBoardPackPdf = async () => {
    if (isDownloading || records.length === 0) return;

    setIsDownloading(true);
    try {
      const [{ jsPDF }, { autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const navy: [number, number, number] = [7, 20, 38];
      const gold: [number, number, number] = [214, 168, 79];
      const muted: [number, number, number] = [71, 85, 105];
      const margin = 14;
      let y = 30;

      const drawCoverHeader = () => {
        const width = doc.internal.pageSize.getWidth();
        doc.setFillColor(...navy);
        doc.rect(0, 0, width, 22, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("KIPROD RISK MANAGEMENT SERVICES", margin, 9);
        doc.setTextColor(...gold);
        doc.setFontSize(8);
        doc.text("EXECUTIVE RISK INTELLIGENCE PLATFORM", margin, 15);
        doc.setTextColor(255, 255, 255);
        doc.text("CONFIDENTIAL BOARD PAPER", width - margin, 12, { align: "right" });
      };

      const ensureSpace = (height: number) => {
        if (y + height <= doc.internal.pageSize.getHeight() - 18) return;
        doc.addPage();
        y = 20;
      };

      const sectionTitle = (title: string) => {
        ensureSpace(12);
        doc.setDrawColor(...gold);
        doc.setLineWidth(0.7);
        doc.line(margin, y - 2, margin + 5, y - 2);
        doc.setTextColor(...navy);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(title, margin + 8, y);
        y += 6;
      };

      const paragraph = (text: string) => {
        doc.setTextColor(...muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(text, 182) as string[];
        ensureSpace(lines.length * 4.2 + 3);
        doc.text(lines, margin, y);
        y += lines.length * 4.2 + 4;
      };

      const callout = (title: string, text: string) => {
        const contentWidth = doc.internal.pageSize.getWidth() - margin * 2;
        const lines = doc.splitTextToSize(text, contentWidth - 8) as string[];
        const height = 13 + lines.length * 4.1;
        ensureSpace(height + 4);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(...gold);
        doc.setLineWidth(0.45);
        doc.roundedRect(margin, y, contentWidth, height, 2, 2, "FD");
        doc.setTextColor(...navy);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(title.toUpperCase(), margin + 4, y + 5);
        doc.setTextColor(...muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(lines, margin + 4, y + 11);
        y += height + 5;
      };

      const numberedList = (items: string[]) => {
        items.forEach((item, index) => {
          const lines = doc.splitTextToSize(item, 172) as string[];
          ensureSpace(lines.length * 4.2 + 5);
          doc.setFillColor(...gold);
          doc.circle(margin + 2.4, y - 1.2, 2.35, "F");
          doc.setTextColor(...navy);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.text(String(index + 1), margin + 2.4, y - 0.25, {
            align: "center",
          });
          doc.setTextColor(...muted);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.text(lines, margin + 8, y);
          y += lines.length * 4.2 + 3.2;
        });
        y += 1;
      };

      const table = (options: Parameters<typeof autoTable>[1]) => {
        autoTable(doc, {
          theme: "grid",
          startY: y,
          margin: { left: margin, right: margin, top: 16, bottom: 18 },
          styles: {
            font: "helvetica",
            fontSize: 8,
            cellPadding: 2.1,
            lineColor: [226, 232, 240],
            lineWidth: 0.2,
            textColor: muted,
          },
          headStyles: {
            fillColor: navy,
            textColor: [255, 255, 255],
            fontStyle: "bold",
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          ...options,
        });
        y =
          (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable
            ?.finalY || y;
        y += 6;
      };

      const pairMetrics = (items: Array<[string, string | number]>) => {
        const rows: Array<Array<string | number>> = [];
        for (let index = 0; index < items.length; index += 2) {
          const left = items[index];
          const right = items[index + 1] || ["", ""];
          rows.push([left[0], left[1], right[0], right[1]]);
        }
        return rows;
      };

      drawCoverHeader();
      doc.setTextColor(...navy);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.text("Monthly Credit Risk Board Summary", margin, y);
      y += 6;
      doc.setTextColor(...muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Generated from the Institution Profile and current Command Centre records.", margin, y);
      y += 9;

      table({
        body: [
          ["Prepared For", "Board / Board Risk Committee", "Prepared By", "Management / Credit Risk Function"],
          ["Generated By", "KIPROD Command Centre", "Reporting Period", profile.reportingMonth || "Profile pending"],
          ["Confidentiality", "Board Use Only", "Document Status", "Board Credit Risk Pack"],
        ],
        styles: { fontSize: 8.2, cellPadding: 2.3 },
        columnStyles: {
          0: { fontStyle: "bold", fillColor: [241, 245, 249], cellWidth: 29 },
          1: { cellWidth: 61 },
          2: { fontStyle: "bold", fillColor: [241, 245, 249], cellWidth: 31 },
          3: { cellWidth: 59 },
        },
      });

      sectionTitle("1. Institution and Reporting Context");
      table({
        body: [
          ["Institution", profile.institutionName || "Profile pending", "Institution Type", profile.institutionType || "Profile pending"],
          ["Reporting Month", profile.reportingMonth || "Profile pending", "Currency", currency],
          ["County / Region", profile.countyRegion || "Profile pending", "Reporting Frequency", profile.boardReportingFrequency || "Profile pending"],
          ["Risk Lead", profile.riskLead || "Profile pending", "Credit Manager", profile.creditManager || "Profile pending"],
          ["Recovery Lead", profile.recoveryLead || "Profile pending", "Board Chair / Risk Lead", profile.boardChair || "Profile pending"],
        ],
        columnStyles: {
          0: { fontStyle: "bold", fillColor: [241, 245, 249], cellWidth: 34 },
          1: { cellWidth: 56 },
          2: { fontStyle: "bold", fillColor: [241, 245, 249], cellWidth: 36 },
          3: { cellWidth: 46 },
        },
      });
      if (overrides.length > 0) {
        table({
          head: [["Controlled Report Override", "Report Value", "Reason"]],
          body: overrides.map((item) => [
            BOARD_REPORT_OVERRIDE_FIELDS.find((field) => field.key === item.fieldKey)?.label || item.fieldKey,
            item.overrideValue,
            item.reason,
          ]),
          columnStyles: {
            0: { fontStyle: "bold", cellWidth: 48 },
            1: { cellWidth: 52 },
            2: { cellWidth: 80 },
          },
        });
        paragraph(
          "The values above are report-specific overrides. The Institution Profile remains unchanged, and each override is retained in Audit History."
        );
      }

      sectionTitle("2. Executive Credit Risk Summary");
      table({
        head: [["Metric", "Position", "Metric", "Position"]],
        body: pairMetrics([
          ["Total Portfolio", formatMoney(report.totalPortfolio, currency)],
          ["Outstanding Balance", formatMoney(report.outstanding, currency)],
          ["Total Arrears", formatMoney(report.arrears, currency)],
          ["NPL Value", formatMoney(report.nplValue, currency)],
          ["NPL Accounts", report.npl.length],
          ["PAR 30 Accounts", report.par30.length],
          ["PAR 90 Accounts", report.par90.length],
          ["Watchlist Accounts", report.watchlist.length],
          ["Open Actions", report.openActions.length],
          ["Overdue Actions", report.overdueActions.length],
        ]),
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 42 },
          1: { cellWidth: 48 },
          2: { fontStyle: "bold", cellWidth: 42 },
          3: { cellWidth: 48 },
        },
      });
      callout("Executive Interpretation", executiveInterpretation);

      sectionTitle("3. Portfolio Health Overview");
      table({
        head: [["Position", "Accounts / Value", "Position", "Accounts / Value"]],
        body: pairMetrics([
          ["Green Accounts", report.green.length],
          ["Amber Accounts", report.amber.length],
          ["Red Accounts", report.red.length],
          ["NPL Accounts", report.npl.length],
          ["Total Arrears", formatMoney(report.arrears, currency)],
          ["Arrears to Outstanding Ratio", `${report.outstanding ? ((report.arrears / report.outstanding) * 100).toFixed(1) : "0.0"}%`],
        ]),
      });

      sectionTitle("4. Early Warning and Watchlist Summary");
      table({
        head: [["Risk Position", "Accounts", "Required Management Response"]],
        body: [
          ["Amber", report.amber.length, "Immediate monitoring and borrower follow-up"],
          ["Red", report.red.length, "Escalation and structured intervention"],
          ["NPL", report.npl.length, "Recovery attention and material-account visibility"],
          ["Restructured", restructuredAccounts, "Review performance against revised terms"],
          ["High Exposure", report.highExposure.length, "Maintain senior management visibility"],
        ],
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 40 },
          1: { halign: "center", cellWidth: 24 },
          2: { cellWidth: 116 },
        },
      });

      sectionTitle("5. NPL and PAR Position");
      table({
        head: [["NPL Value", "NPL Ratio", "PAR 30 Position", "PAR 90 Position"]],
        body: [[
          formatMoney(report.nplValue, currency),
          `${report.nplRatio.toFixed(1)}%`,
          formatMoney(report.par30Value, currency),
          formatMoney(report.par90Value, currency),
        ]],
      });
      paragraph(`PAR 30 includes outstanding exposures ${PAR30_DESCRIPTION}. PAR 90 includes outstanding exposures ${PAR90_DESCRIPTION}.`);

      sectionTitle("6. Key Risk Concentrations");
      table({
        head: [["Category", "Rank", "Concentration", "Accounts", "Outstanding Exposure"]],
        body: [
          ...report.branches.map((row, index) => ["Branch", index + 1, row.name, row.accounts, formatMoney(row.exposure, currency)]),
          ...report.employers.map((row, index) => ["Employer", index + 1, row.name, row.accounts, formatMoney(row.exposure, currency)]),
          ...report.sectors.map((row, index) => ["Sector", index + 1, row.name, row.accounts, formatMoney(row.exposure, currency)]),
          ...report.products.map((row, index) => ["Loan Product", index + 1, row.name, row.accounts, formatMoney(row.exposure, currency)]),
        ],
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 25 },
          1: { halign: "center", cellWidth: 13 },
          3: { halign: "center", cellWidth: 20 },
          4: { halign: "right", cellWidth: 44 },
        },
      });

      sectionTitle("7. Management Actions and Accountability");
      table({
        head: [["Total", "Open", "Overdue", "Escalated", "Closed", "Due This Week"]],
        body: [[
          actions.length,
          report.openActions.length,
          report.overdueActions.length,
          report.escalatedActions.length,
          report.closedActions.length,
          report.dueThisWeek.length,
        ]],
        styles: { halign: "center", fontSize: 8, cellPadding: 2.2 },
      });
      paragraph(
        `${report.openActions.length} actions are currently open. ${report.overdueActions.length} of those open actions are past their due date. Overdue is derived from due date and closure status; an open action is not automatically overdue.`
      );

      sectionTitle("8. Matters Requiring Board Attention");
      paragraph(
        [
          report.nplValue > 0 ? `Material NPL exposure of ${formatMoney(report.nplValue, currency)} requires recovery oversight.` : "",
          report.overdueActions.length > 0 ? `${report.overdueActions.length} management actions are overdue and unresolved.` : "",
          report.highExposure.length > 0 ? `${report.highExposure.length} high-exposure accounts require senior visibility.` : "",
          report.openClarifications.length > 0 ? `${report.openClarifications.length} clarification requests remain unresolved.` : "",
        ].filter(Boolean).join(" ") || "No material matters currently meet the Board-attention triggers."
      );

      sectionTitle("9. Recommended Board Decisions / Guidance");
      numberedList(boardDecisions);

      const appendixSideMargin = 10;
      appendixGroups.forEach((group, groupIndex) => {
        doc.addPage("a4", "landscape");
        const appendixWidth = doc.internal.pageSize.getWidth();
        const appendixContentWidth = appendixWidth - appendixSideMargin * 2;

        doc.setTextColor(...navy);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("10. Appendix: Detailed Risk Register", appendixSideMargin, 20);
        doc.setTextColor(...gold);
        doc.setFontSize(9);
        doc.text(`${group.title} · ${group.rows.length} accounts`, appendixSideMargin, 27);

        let appendixStartY = 33;
        if (groupIndex === 0) {
          doc.setTextColor(...muted);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          const noteLines = doc.splitTextToSize(
            appendixGovernanceNote,
            appendixContentWidth
          ) as string[];
          doc.text(noteLines, appendixSideMargin, appendixStartY);
          appendixStartY += noteLines.length * 3.8 + 3;
        }

        autoTable(doc, {
          startY: appendixStartY,
          margin: {
            left: appendixSideMargin,
            right: appendixSideMargin,
            top: 24,
            bottom: 16,
          },
          tableWidth: appendixContentWidth,
          theme: "grid",
          head: [["Member", "Loan Account", "Branch", "Product", "Outstanding", "Arrears", "Days", "Risk", "Officer"]],
          body: group.rows.length
            ? group.rows.map((row) => [
                row.member_name,
                row.loan_account,
                row.branch || "-",
                row.loan_product || "-",
                formatMoney(row.outstanding_balance, currency),
                formatMoney(Number(row.arrears_amount || 0), currency),
                row.days_in_arrears || 0,
                row.risk_status,
                row.responsible_officer || "Unassigned",
              ])
            : [[`No ${group.status} accounts recorded`, "-", "-", "-", "-", "-", "-", group.status, "-"]],
          styles: {
            font: "helvetica",
            fontSize: 7.2,
            cellPadding: 1.65,
            lineColor: [226, 232, 240],
            lineWidth: 0.2,
            valign: "middle",
          },
          headStyles: {
            fillColor: navy,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            valign: "middle",
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          rowPageBreak: "avoid",
          showHead: "everyPage",
          columnStyles: {
            0: { cellWidth: 42, fontStyle: "bold" },
            1: { cellWidth: 31 },
            2: { cellWidth: 28 },
            3: { cellWidth: 34 },
            4: { cellWidth: 35, halign: "right" },
            5: { cellWidth: 32, halign: "right" },
            6: { cellWidth: 15, halign: "center" },
            7: { cellWidth: 19, halign: "center" },
            8: { cellWidth: 41 },
          },
        });
      });

      const pages = doc.getNumberOfPages();
      for (let page = 1; page <= pages; page += 1) {
        doc.setPage(page);
        const width = doc.internal.pageSize.getWidth();
        const height = doc.internal.pageSize.getHeight();
        if (page > 1) {
          doc.setFillColor(...navy);
          doc.rect(0, 0, width, 12, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text("KIPROD RISK MANAGEMENT SERVICES", margin, 7.5);
          doc.setTextColor(...gold);
          doc.setFontSize(6.5);
          doc.text("CONFIDENTIAL BOARD PAPER", width - margin, 7.5, {
            align: "right",
          });
        }
        doc.setDrawColor(...gold);
        doc.setLineWidth(0.35);
        doc.line(margin, height - 11, width - margin, height - 11);
        doc.setTextColor(...muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text("KIPROD Risk Management Services - Confidential", margin, height - 6);
        doc.text(`Page ${page} of ${pages}`, width - margin, height - 6, { align: "right" });
      }

      const institution = (profile.institutionName || "institution")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50);
      const period = (profile.reportingMonth || "current-period")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      doc.save(`${institution || "institution"}-${period || "current-period"}-board-credit-risk-pack.pdf`);
    } catch (error) {
      console.error("Failed to download Board Pack PDF", error);
      window.alert("The PDF could not be generated. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="board-report min-h-screen bg-[#eef2f5] p-4 md:p-6">
      <section className="mx-auto max-w-6xl">
        <div className="board-report-paper rounded-2xl bg-white px-5 py-6 shadow-xl md:px-10 md:py-9">
        <div className="board-report-masthead mb-7 px-1 pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e1b85f]">KIPROD Risk Management Services</p>
            <p className="mt-1 text-sm font-semibold text-slate-200">Executive Risk Intelligence Platform</p>
          </div>
          <p className="board-report-mark">Confidential Board Paper</p>
        </div>
        <header className="mb-6 flex flex-col justify-between gap-4 print:mb-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#9a6b12]">
              Board Credit Risk Pack
            </p>
            <h1 className="mt-1 text-3xl font-black text-[#071426]">
              Monthly Credit Risk Board Summary
            </h1>
            <p className="mt-2 text-slate-600">
              Auto-generated governance summary from institution, portfolio,
              watchlist and management-action data.
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-3 print:hidden sm:w-auto md:justify-end">
            <button
              type="button"
              onClick={printReport}
              className="board-report-print-button inline-flex min-h-12 min-w-40 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[#071426] bg-[#071426] px-5 py-3 text-sm font-black text-white shadow-md transition-colors hover:bg-[#102b48]"
              style={{ backgroundColor: "#071426", color: "#ffffff" }}
            >
              Print Report
            </button>
            <button
              type="button"
              onClick={downloadBoardPackPdf}
              disabled={isDownloading}
              className="inline-flex min-h-12 min-w-44 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 border-[#b78322] bg-[#d6a84f] px-5 py-3 text-sm font-black text-[#071426] shadow-md transition-colors hover:bg-[#e1b85f] disabled:cursor-wait disabled:opacity-70"
              style={{ backgroundColor: "#d6a84f", color: "#071426" }}
              aria-label="Download Board Credit Risk Pack as PDF"
            >
              <span aria-hidden="true">↓</span>
              {isDownloading ? "Preparing PDF..." : "Download PDF"}
            </button>
          </div>
        </header>

        {records.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              No portfolio data available
            </h2>
            <p className="mt-2 text-slate-600">
              Upload portfolio data first, then return here to generate the
              board pack.
            </p>
            <p className="mt-2 text-sm font-medium text-slate-500">
              The Board Report is generated only after institution profile and
              portfolio data have been completed.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link className="rounded-full border px-5 py-3 font-semibold" href="/institution-profile">
                Complete Institution Profile
              </Link>
              <Link className="rounded-full bg-amber-400 px-5 py-3 font-semibold text-slate-950" href="/portfolio-upload">
                Upload Portfolio
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="board-report-prepared" aria-label="Board paper preparation details">
              <div><span>Prepared For</span><strong>Board / Board Risk Committee</strong></div>
              <div><span>Prepared By</span><strong>Management / Credit Risk Function</strong></div>
              <div><span>Generated By</span><strong>KIPROD Command Centre</strong></div>
              <div><span>Reporting Period</span><strong>{profile.reportingMonth || "Profile pending"}</strong></div>
              <div><span>Confidentiality</span><strong>Board Use Only</strong></div>
            </section>

            <section className="board-report-section board-report-context">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="board-report-heading">1. Institution and Reporting Context</h2>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Source: Institution Profile master record · {profileSource === "supabase" ? "Supabase synced" : "Local fallback"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 print:hidden">{profileMessage}</p>
                </div>
                <Link href="/institution-profile" className="board-report-profile-link print:hidden">
                  Edit Institution Profile
                </Link>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {contextItems.map((item) => {
                  const reportOverride = overridesByField.get(item.key as BoardReportOverrideField);
                  return (
                    <div key={item.label} className="board-report-context-item">
                      <p>{item.label}</p>
                      <strong>{item.value}</strong>
                      {reportOverride && (
                        <span className="mt-2 inline-flex w-fit rounded-full bg-[#fff2cf] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#7a5310]">
                          Report override
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 print:hidden">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-sm font-black text-[#071426]">Controlled report-specific overrides</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Master data stays unchanged. Every override requires a reason and is written to Audit History.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOverridePanel((value) => !value);
                      chooseOverrideField(overrideField);
                    }}
                    className="rounded-lg bg-[#071426] px-4 py-2.5 text-xs font-black text-white"
                    style={{ backgroundColor: "#071426", color: "#ffffff" }}
                  >
                    {showOverridePanel ? "Close Override Form" : "Add / Edit Override"}
                  </button>
                </div>

                {overrides.length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {overrides.map((item) => (
                      <div key={item.id} className="rounded-lg border border-amber-200 bg-white p-3">
                        <p className="text-xs font-black uppercase tracking-wide text-amber-800">
                          {BOARD_REPORT_OVERRIDE_FIELDS.find((field) => field.key === item.fieldKey)?.label}
                        </p>
                        <p className="mt-1 font-bold text-slate-950">{item.overrideValue}</p>
                        <p className="mt-1 text-xs text-slate-600">Reason: {item.reason}</p>
                        <button
                          type="button"
                          disabled={savingOverride}
                          onClick={() => restoreMasterValue(item)}
                          className="mt-3 text-xs font-black text-[#8a260f] underline disabled:opacity-50"
                        >
                          Restore master value
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {showOverridePanel && (
                  <form onSubmit={submitOverride} className="mt-4 grid gap-4 rounded-xl border border-slate-200 bg-white p-4">
                    <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-slate-700">
                      Report field
                      <select
                        value={overrideField}
                        onChange={(event) => chooseOverrideField(event.target.value as BoardReportOverrideField)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-slate-950"
                      >
                        {BOARD_REPORT_OVERRIDE_FIELDS.map((field) => (
                          <option key={field.key} value={field.key}>{field.label}</option>
                        ))}
                      </select>
                    </label>
                    <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
                      Master value: <strong className="text-slate-950">{masterProfile[overrideField] || "Not set"}</strong>
                    </div>
                    <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-slate-700">
                      Report-specific value
                      <input
                        value={overrideValue}
                        onChange={(event) => setOverrideValue(event.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-slate-950"
                        placeholder="Value to use in this Board Pack"
                      />
                    </label>
                    <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-slate-700">
                      Reason for override
                      <textarea
                        value={overrideReason}
                        onChange={(event) => setOverrideReason(event.target.value)}
                        className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-slate-950"
                        placeholder="Explain why this reporting period needs a different value"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={savingOverride}
                      className="w-fit rounded-lg bg-[#d6a84f] px-5 py-3 text-sm font-black text-[#071426] disabled:opacity-60"
                      style={{ backgroundColor: "#d6a84f", color: "#071426" }}
                    >
                      {savingOverride ? "Saving..." : "Save Override & Audit"}
                    </button>
                  </form>
                )}
                {overrideMessage && (
                  <p className="mt-3 text-xs font-bold text-slate-700" role="status">{overrideMessage}</p>
                )}
              </div>
            </section>

            <section className="board-report-section">
              <h2 className="board-report-heading">2. Executive Credit Risk Summary</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {metric("Total Portfolio", formatMoney(report.totalPortfolio, currency))}
                {metric("Outstanding Balance", formatMoney(report.outstanding, currency))}
                {metric("Total Arrears", formatMoney(report.arrears, currency), "text-red-600")}
                {metric("NPL Value", formatMoney(report.nplValue, currency), "text-red-700")}
                {metric("NPL Accounts", report.npl.length, "text-red-700")}
                {metric("PAR 30", `${report.par30.length} accounts`, "text-red-600")}
                {metric("PAR 90", `${report.par90.length} accounts`, "text-red-700")}
                {metric("Watchlist Accounts", report.watchlist.length, "text-amber-700")}
                {metric("Open Actions", report.openActions.length)}
                {metric("Overdue Actions", report.overdueActions.length, "text-red-700")}
              </div>
              <div className="board-report-executive-interpretation mt-5">
                <p>Executive Interpretation</p>
                <div>{executiveInterpretation}</div>
              </div>
            </section>

            <section className="board-report-pair grid gap-6 lg:grid-cols-2">
              <div className="board-report-section">
                <h2 className="board-report-heading">3. Portfolio Health Overview</h2>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {metric("Green Accounts", report.green.length, "text-emerald-700")}
                  {metric("Amber Accounts", report.amber.length, "text-amber-700")}
                  {metric("Red Accounts", report.red.length, "text-red-600")}
                  {metric("NPL Accounts", report.npl.length, "text-red-700")}
                  {metric("Total Arrears", formatMoney(report.arrears, currency))}
                  {metric(
                    "Arrears to Outstanding Ratio",
                    `${report.outstanding ? ((report.arrears / report.outstanding) * 100).toFixed(1) : "0.0"}%`
                  )}
                </div>
              </div>
              <div className="board-report-section">
                <h2 className="board-report-heading">4. Early Warning and Watchlist Summary</h2>
                <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
                  <li><strong>{report.amber.length} Amber:</strong> immediate monitoring and borrower follow-up.</li>
                  <li><strong>{report.red.length} Red:</strong> escalation and structured intervention.</li>
                  <li><strong>{report.npl.length} NPL:</strong> recovery attention and material-account visibility.</li>
                  <li><strong>{restructuredAccounts} restructured:</strong> performance against revised terms requires review.</li>
                  <li><strong>{report.highExposure.length} high exposure:</strong> senior management visibility required.</li>
                </ul>
              </div>
            </section>

            <section className="board-report-section">
              <h2 className="board-report-heading">5. NPL and PAR Position</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {metric("NPL Value", formatMoney(report.nplValue, currency), "text-red-700")}
                {metric("NPL Ratio", `${report.nplRatio.toFixed(1)}%`, "text-red-700")}
                {metric("PAR 30 Position", formatMoney(report.par30Value, currency))}
                {metric("PAR 90 Position", formatMoney(report.par90Value, currency))}
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-600">
                PAR 30 includes outstanding exposures {PAR30_DESCRIPTION}. PAR 90 includes outstanding exposures {PAR90_DESCRIPTION}.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Month-on-month NPL movement will activate once historical reporting-period data is available.
              </p>
            </section>

            <section className="board-report-section">
              <h2 className="board-report-heading">6. Key Risk Concentrations</h2>
              <div className="board-report-concentration-grid mt-5">
                {concentration("Branches", report.branches)}
                {concentration("Employers", report.employers)}
                {concentration("Sectors", report.sectors)}
                {concentration("Loan Products", report.products)}
              </div>
              {report.highExposure.length > 0 && (
                <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
                  <strong>High Exposure:</strong> {report.highExposure.length}{" "}
                  accounts are flagged among the highest outstanding balances and require senior visibility.
                </p>
              )}
            </section>

            <section className="board-report-section">
              <h2 className="board-report-heading">7. Management Actions and Accountability</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {metric("Total Actions", actions.length)}
                {metric("Open", report.openActions.length)}
                {metric("Overdue", report.overdueActions.length, "text-red-700")}
                {metric("Escalated", report.escalatedActions.length, "text-amber-700")}
                {metric("Closed", report.closedActions.length, "text-emerald-700")}
                {metric("Due This Week", report.dueThisWeek.length)}
              </div>
              <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-700">
                <strong>Action status interpretation:</strong>{" "}
                {report.openActions.length} actions are currently open;{" "}
                {report.overdueActions.length} of them are past their due date.
                Overdue is derived from due date and closure status. An open
                action is not automatically overdue.
              </p>
            </section>

            <section className="board-report-pair grid gap-6 lg:grid-cols-2">
              <div className="board-report-section border-l-4 border-red-600">
                <h2 className="board-report-heading">8. Matters Requiring Board Attention</h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                  {report.nplValue > 0 && <li>Material NPL exposure of <strong>{formatMoney(report.nplValue, currency)}</strong> requires recovery oversight.</li>}
                  {report.overdueActions.length > 0 && <li><strong>{report.overdueActions.length}</strong> management actions are overdue and remain unresolved.</li>}
                  {report.highExposure.length > 0 && <li><strong>{report.highExposure.length}</strong> high-exposure accounts require senior visibility.</li>}
                  {report.openClarifications.length > 0 && <li><strong>{report.openClarifications.length}</strong> clarification requests remain unresolved.</li>}
                  {report.nplValue === 0 && report.overdueActions.length === 0 && report.highExposure.length === 0 && report.openClarifications.length === 0 && <li>No material matters currently meet the Board-attention triggers.</li>}
                </ul>
              </div>
              <div className="board-report-section border-l-4 border-[#d6a84f]">
                <h2 className="board-report-heading">9. Recommended Board Decisions / Guidance</h2>
                <ol className="board-report-decisions mt-4 space-y-3 text-sm leading-6 text-slate-700">
                  {boardDecisions.map((decision) => (
                    <li key={decision}>{decision}</li>
                  ))}
                </ol>
              </div>
            </section>

            <section className="board-report-section board-report-appendix">
              <h2 className="board-report-heading">10. Appendix: Detailed Risk Register</h2>
              <p className="board-report-appendix-note mt-4">{appendixGovernanceNote}</p>
              <form
                className="board-report-register-search mt-4 print:hidden"
                onSubmit={(event) => {
                  event.preventDefault();
                  setRiskSearch(riskSearchInput.trim());
                  setRiskPage(1);
                }}
              >
                <label htmlFor="board-risk-search">Search risk register</label>
                <div className="board-report-search-controls">
                  <input
                    id="board-risk-search"
                    type="search"
                    value={riskSearchInput}
                    onChange={(event) => setRiskSearchInput(event.target.value)}
                    placeholder="Search member, account, branch, product, risk or officer"
                  />
                  <button type="submit">Search</button>
                  {(riskSearch || riskSearchInput) && (
                    <button
                      type="button"
                      className="board-report-search-clear"
                      onClick={() => {
                        setRiskSearchInput("");
                        setRiskSearch("");
                        setRiskPage(1);
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p>{filteredRiskRegister.length} of {report.watchlist.length} risk accounts shown</p>
              </form>
              <div className="board-report-screen-register mt-4 print:hidden">
                {riskTable(paginatedRiskRegister, riskSearch)}
                {filteredRiskRegister.length > 0 && (
                  <nav
                    className="board-report-pagination mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 text-xs font-extrabold text-slate-600 sm:flex-row sm:items-center sm:justify-between"
                    aria-label="Risk register pagination"
                  >
                    <p className="m-0">Showing {firstRiskRow}–{lastRiskRow} of {filteredRiskRegister.length}</p>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <button
                        type="button"
                        disabled={currentRiskPage === 1}
                        onClick={() => setRiskPage((page) => Math.max(1, page - 1))}
                        className="min-h-11 min-w-24 rounded-lg border px-4 py-2.5 font-black shadow-sm transition-colors disabled:cursor-not-allowed disabled:shadow-none"
                        style={{
                          backgroundColor: currentRiskPage === 1 ? "#e2e8f0" : "#071426",
                          borderColor: currentRiskPage === 1 ? "#cbd5e1" : "#071426",
                          color: currentRiskPage === 1 ? "#64748b" : "#ffffff",
                        }}
                      >
                        Previous
                      </button>
                      <span className="min-w-24 text-center font-black text-[#071426]">Page {currentRiskPage} of {riskPageCount}</span>
                      <button
                        type="button"
                        disabled={currentRiskPage === riskPageCount}
                        onClick={() => setRiskPage((page) => Math.min(riskPageCount, page + 1))}
                        className="min-h-11 min-w-24 rounded-lg border px-4 py-2.5 font-black shadow-sm transition-colors disabled:cursor-not-allowed disabled:shadow-none"
                        style={{
                          backgroundColor: currentRiskPage === riskPageCount ? "#e2e8f0" : "#071426",
                          borderColor: currentRiskPage === riskPageCount ? "#cbd5e1" : "#071426",
                          color: currentRiskPage === riskPageCount ? "#64748b" : "#ffffff",
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </nav>
                )}
              </div>
              <div className="board-report-print-register hidden print:block">
                {appendixGroups.map((group) => (
                  <div key={group.status} className="board-report-risk-group">
                    <h3 className="board-report-risk-group-title">{group.title} · {group.rows.length} accounts</h3>
                    {riskTable(group.rows)}
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <Link href="/executive-dashboard" className="inline-flex min-h-12 min-w-48 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[#071426] bg-[#071426] px-6 py-3 font-black text-white shadow-md transition-colors hover:bg-[#102b48]" style={{ backgroundColor: "#071426", color: "#ffffff" }}>
                Executive Cockpit
              </Link>
              <Link href="/action-tracker" className="inline-flex min-h-12 min-w-48 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[#b78322] bg-[#d6a84f] px-6 py-3 font-black text-[#071426] shadow-md transition-colors hover:bg-[#e1b85f]" style={{ backgroundColor: "#d6a84f", color: "#071426" }}>
                Execution Tracker
              </Link>
              <Link href="/board-oversight" className="inline-flex min-h-12 min-w-44 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-slate-950 bg-slate-950 px-5 py-3 font-black text-white shadow-md transition-colors hover:bg-slate-800">
                Board Oversight
              </Link>
              <button type="button" onClick={printReport} className="inline-flex min-h-12 min-w-40 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[#071426] bg-[#071426] px-5 py-3 text-sm font-black text-white shadow-md transition-colors hover:bg-[#102b48]" style={{ backgroundColor: "#071426", color: "#ffffff" }}>
                Print Report
              </button>
              <button type="button" onClick={downloadBoardPackPdf} disabled={isDownloading} className="inline-flex min-h-12 min-w-44 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 border-[#b78322] bg-[#d6a84f] px-5 py-3 text-sm font-black text-[#071426] shadow-md transition-colors hover:bg-[#e1b85f] disabled:cursor-wait disabled:opacity-70" style={{ backgroundColor: "#d6a84f", color: "#071426" }} aria-label="Download Board Credit Risk Pack as PDF">
                <span aria-hidden="true">↓</span>
                {isDownloading ? "Preparing PDF..." : "Download PDF"}
              </button>
            </div>
            <footer className="board-report-footer">
              <span>KIPROD Risk Management Services</span>
              <span>Confidential • Board Use Only • Board Credit Risk Pack</span>
            </footer>
          </div>
        )}
        </div>
      </section>
    </main>
  );
}
