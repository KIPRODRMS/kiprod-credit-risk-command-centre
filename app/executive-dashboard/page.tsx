"use client";

import { useEffect, useMemo, useState } from "react";
import {
  isActionOverdue,
  isPar30,
  isPar90,
  PAR30_SHORTHAND,
  PAR90_SHORTHAND,
} from "@/lib/riskPolicy";

type RiskStatus = "Green" | "Amber" | "Red" | "NPL";

type LoanRecord = {
  loan_amount: number;
  outstanding_balance: number;
  arrears_amount: number;
  days_in_arrears: number;
  risk_status: RiskStatus;
};

type ActionItem = {
  due_date: string;
  status: string;
};

type PortfolioSource = {
  sourceName: string;
  uploadedAt: string;
  recordCount: number;
};

const activeModules = [
  { title: "Portfolio Health", eyebrow: "Exposure intelligence", href: "/dashboard", description: "Read portfolio quality, arrears and PAR movement." },
  { title: "Early Warning", eyebrow: "Deterioration signals", href: "/early-warning", description: "Identify stress before risk deepens." },
  { title: "Watchlist", eyebrow: "Priority accounts", href: "/watchlist", description: "Focus management intervention and recovery." },
  { title: "Board Intelligence", eyebrow: "Governance visibility", href: "/board-pack", description: "Turn risk position into Board-ready oversight." },
  { title: "Execution Tracker", eyebrow: "Action accountability", href: "/action-tracker", description: "Track owners, deadlines and escalation." },
];

function formatKes(value: number, compact = false) {
  if (compact && value >= 1_000_000_000) return `KES ${(value / 1_000_000_000).toFixed(1)}B`;
  if (compact && value >= 1_000_000) return `KES ${(value / 1_000_000).toFixed(1)}M`;
  return `KES ${value.toLocaleString("en-KE")}`;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function isOverdue(action: ActionItem) {
  return isActionOverdue(action);
}

export default function ExecutiveDashboardPage() {
  const [records, setRecords] = useState<LoanRecord[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [portfolioSource, setPortfolioSource] = useState<PortfolioSource | null>(null);

  useEffect(() => {
    const savedRecords = localStorage.getItem("kiprod_loan_records");
    const savedActions = localStorage.getItem("kiprod_action_items");
    const savedSource = localStorage.getItem("kiprod_portfolio_source");

    if (savedRecords) {
      try {
        const parsedRecords = JSON.parse(savedRecords);
        if (Array.isArray(parsedRecords)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setRecords(parsedRecords);
          setDataLoaded(true);
        }
      } catch { setRecords([]); }
    }

    if (savedActions) {
      try {
        const parsedActions = JSON.parse(savedActions);
        if (Array.isArray(parsedActions)) setActions(parsedActions);
      } catch { setActions([]); }
    }

    if (savedSource) {
      try { setPortfolioSource(JSON.parse(savedSource)); } catch { setPortfolioSource(null); }
    }
  }, []);

  const metrics = useMemo(() => {
    const totalPortfolio = records.reduce((sum, r) => sum + Number(r.loan_amount || 0), 0);
    const outstandingBalance = records.reduce((sum, r) => sum + Number(r.outstanding_balance || 0), 0);
    const totalArrears = records.reduce((sum, r) => sum + Number(r.arrears_amount || 0), 0);
    const count = (status: RiskStatus) => records.filter((r) => r.risk_status === status).length;
    const matchesPar = (record: LoanRecord, days: number) =>
      days === 30
        ? isPar30(record.days_in_arrears)
        : days === 90
          ? isPar90(record.days_in_arrears)
          : Number(record.days_in_arrears || 0) > days;
    const parBalance = (days: number) => records
      .filter((record) => matchesPar(record, days))
      .reduce(
        (sum, record) => sum + Number(record.outstanding_balance || 0),
        0
      );
    const parAccounts = (days: number) =>
      records.filter((record) => matchesPar(record, days)).length;
    const actionsDue = actions.filter(isOverdue).length;
    const risk = { Green: count("Green"), Amber: count("Amber"), Red: count("Red"), NPL: count("NPL") };
    const performingRate = records.length ? (risk.Green / records.length) * 100 : 0;
    const arrearsRate = outstandingBalance ? (totalArrears / outstandingBalance) * 100 : 0;

    return {
      totalPortfolio, outstandingBalance, totalArrears, actionsDue, risk,
      watchlist: risk.Amber + risk.Red + risk.NPL,
      par30: outstandingBalance ? (parBalance(30) / outstandingBalance) * 100 : 0,
      par90: outstandingBalance ? (parBalance(90) / outstandingBalance) * 100 : 0,
      par30Accounts: parAccounts(30), par90Accounts: parAccounts(90),
      performingRate, arrearsRate,
    };
  }, [actions, records]);

  const riskTotal = Math.max(records.length, 1);
  const riskRows = (["Green", "Amber", "Red", "NPL"] as RiskStatus[]).map((status) => ({
    status,
    value: metrics.risk[status],
    percent: (metrics.risk[status] / riskTotal) * 100,
  }));

  // Keep the headline signal transparent: it is the share of accounts that
  // are currently Green. Raw action counts must not collapse the meter to zero.
  const healthScore = dataLoaded
    ? Math.round(clamp(metrics.performingRate))
    : 0;
  const attentionCount = metrics.risk.Red + metrics.risk.NPL + metrics.actionsDue;

  return (
    <main className="cockpit-page">
      <section className="cockpit-shell">
        <header className="cockpit-hero">
          <div className="cockpit-hero-copy">
            <p className="cockpit-kicker"><i /> KIPROD Executive Intelligence</p>
            <h1>Executive Risk Cockpit</h1>
            <p>One institutional view of portfolio health, emerging risk, management response and Board accountability.</p>
            <div className="cockpit-hero-actions">
              <a href="/portfolio-upload" className="cockpit-primary-action">Refresh portfolio <span>↗</span></a>
              <a href="/board-pack" className="cockpit-secondary-action">Open Board Pack</a>
            </div>
          </div>
          <div className="cockpit-command-status">
            <span><i className={dataLoaded ? "is-live" : ""} /> Intelligence status</span>
            <strong>{dataLoaded ? "Portfolio live" : "Awaiting portfolio"}</strong>
            <small>{records.length} accounts under monitoring</small>
            {portfolioSource ? (
              <small title={portfolioSource.sourceName}>
                Source: {portfolioSource.sourceName} · uploaded {new Date(portfolioSource.uploadedAt).toLocaleString("en-KE")}
              </small>
            ) : null}
          </div>
        </header>

        {!dataLoaded ? (
          <section className="cockpit-empty-state">
            <div className="cockpit-empty-signal"><span /><span /><span /></div>
            <div>
              <p>Intelligence activation</p>
              <h2>Your executive view is ready for portfolio data.</h2>
              <span>Upload and validate an institutional portfolio to activate live exposure, risk distribution, PAR and action-accountability intelligence.</span>
            </div>
            <a href="/portfolio-upload">Activate cockpit <b>→</b></a>
          </section>
        ) : null}

        <section className="cockpit-command-grid" aria-label="Executive portfolio overview">
          <article className="cockpit-health-panel">
            <div className="cockpit-panel-heading">
              <div><span>Portfolio condition</span><h2>Health signal</h2></div>
              <em className={healthScore >= 70 ? "signal-good" : healthScore >= 45 ? "signal-watch" : "signal-high"}>
                {healthScore >= 70 ? "Performing" : healthScore >= 45 ? "Watch closely" : "Intervention"}
              </em>
            </div>
            <div className="cockpit-health-body">
              <div className="cockpit-health-ring" style={{ "--health": `${healthScore * 3.6}deg` } as React.CSSProperties}>
                <div><strong>{healthScore}</strong><span>/ 100</span><small>Health index</small></div>
              </div>
              <div className="cockpit-health-notes">
                <div><span>Current accounts</span><strong>{metrics.performingRate.toFixed(1)}%</strong></div>
                <div><span>PAR 30 exposure</span><strong className="risk-amber-text">{metrics.par30.toFixed(1)}%</strong></div>
                <div><span>PAR 90 exposure</span><strong className="risk-red-text">{metrics.par90.toFixed(1)}%</strong></div>
              </div>
            </div>
          </article>

          <article className="cockpit-exposure-panel">
            <div className="cockpit-panel-heading">
              <div><span>Live position</span><h2>Portfolio exposure</h2></div>
              <small>Current cycle</small>
            </div>
            <strong className="cockpit-exposure-value">{formatKes(metrics.outstandingBalance, true)}</strong>
            <p>Outstanding balance across {records.length} monitored accounts</p>
            <div className="cockpit-exposure-scale">
              <i style={{ width: `${clamp(metrics.performingRate)}%` }} />
              <span>Current accounts {metrics.performingRate.toFixed(1)}%</span>
            </div>
            <div className="cockpit-exposure-footer">
              <div><span>Total portfolio</span><strong>{formatKes(metrics.totalPortfolio, true)}</strong></div>
              <div><span>Total arrears</span><strong>{formatKes(metrics.totalArrears, true)}</strong></div>
            </div>
          </article>

          <article className="cockpit-attention-panel">
            <div className="cockpit-panel-heading cockpit-panel-heading-dark">
              <div><span>Governance priority</span><h2>Management attention</h2></div>
              <em>{attentionCount}</em>
            </div>
            <div className="cockpit-attention-list">
              <a href="/early-warning"><span className="attention-red" /><div><strong>{metrics.risk.Red} high-risk accounts</strong><small>Require management escalation</small></div><b>→</b></a>
              <a href="/watchlist"><span className="attention-npl" /><div><strong>{metrics.risk.NPL} NPL accounts</strong><small>Require recovery attention</small></div><b>→</b></a>
              <a href="/action-tracker"><span className="attention-gold" /><div><strong>{metrics.actionsDue} overdue actions</strong><small>Past due date and not closed</small></div><b>→</b></a>
            </div>
          </article>
        </section>

        <section className="cockpit-kpi-grid">
          <article><span>Outstanding balance</span><strong>{formatKes(metrics.outstandingBalance, true)}</strong><small>Live exposure</small></article>
          <article><span>Watchlist accounts</span><strong className="risk-amber-text">{metrics.watchlist}</strong><small>Amber, Red and NPL</small></article>
          <article><span>PAR 30</span><strong className="risk-red-text">{metrics.par30.toFixed(1)}%</strong><small>{metrics.par30Accounts} accounts · {PAR30_SHORTHAND}</small></article>
          <article><span>PAR 90</span><strong className="risk-npl-text">{metrics.par90.toFixed(1)}%</strong><small>{metrics.par90Accounts} accounts · {PAR90_SHORTHAND}</small></article>
          <article><span>Overdue actions</span><strong className="risk-amber-text">{metrics.actionsDue}</strong><small>Past due date and not closed</small></article>
        </section>

        <section className="cockpit-insight-grid">
          <article className="cockpit-risk-panel">
            <div className="cockpit-panel-heading">
              <div><span>Risk architecture</span><h2>Account distribution</h2></div>
              <small>{records.length} total</small>
            </div>
            <div className="cockpit-risk-list">
              {riskRows.map((row) => (
                <div key={row.status}>
                  <span className={`risk-dot risk-dot-${row.status.toLowerCase()}`} />
                  <strong>{row.status}</strong>
                  <div><i className={`risk-fill risk-fill-${row.status.toLowerCase()}`} style={{ width: `${row.percent}%` }} /></div>
                  <b>{row.value}</b><small>{row.percent.toFixed(0)}%</small>
                </div>
              ))}
            </div>
          </article>

          <article className="cockpit-interpretation">
            <p>Executive interpretation</p>
            <h2>{attentionCount > 0 ? "Risk signals require coordinated management action." : "Portfolio controls are positioned for active monitoring."}</h2>
            <span>
              {dataLoaded
                ? `Prioritise ${metrics.risk.Red + metrics.risk.NPL} Red and NPL accounts, maintain visibility over ${metrics.risk.Amber} early-warning accounts, and close ${metrics.actionsDue} overdue management actions.`
                : "Once data is uploaded, KIPROD will translate the portfolio position into a structured management and governance narrative."}
            </span>
            <a href="/action-tracker">Review management execution <b>→</b></a>
          </article>
        </section>

        <section className="cockpit-modules-section">
          <div className="cockpit-section-title"><div><p>Control room</p><h2>Move from signal to accountable action.</h2></div><span>Five connected intelligence modules</span></div>
          <div className="cockpit-module-grid">
            {activeModules.map((module, index) => (
              <a href={module.href} key={module.title} style={{ "--module-order": index } as React.CSSProperties}>
                <span>0{index + 1}</span><small>{module.eyebrow}</small><strong>{module.title}</strong><p>{module.description}</p><b>Open module ↗</b>
              </a>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
