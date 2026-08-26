import Link from "next/link";

type IconName =
  | "institution"
  | "upload"
  | "cockpit"
  | "signal"
  | "watch"
  | "action"
  | "board"
  | "oversight"
  | "audit";

const intelligence = [
  { label: "Portfolio health", value: "Visible", tone: "green" },
  { label: "Early warning", value: "Tracked", tone: "amber" },
  { label: "High-risk exposure", value: "Escalated", tone: "red" },
  { label: "Board matters", value: "Governed", tone: "gold" },
];

const pathway = [
  ["01", "Portfolio data", "Validated institutional information"],
  ["02", "Risk intelligence", "Signals, trends and exposure visibility"],
  ["03", "Management action", "Ownership, deadlines and escalation"],
  ["04", "Board oversight", "Clear governance and accountability"],
  ["05", "Audit evidence", "A preserved institutional trail"],
];

const workspaces = [
  {
    icon: "oversight" as IconName,
    eyebrow: "Governance workspace",
    title: "Board Portal",
    text: "Board oversight, reports, clarifications, management responses and Board decisions.",
    href: "/board-portal",
  },
  {
    icon: "cockpit" as IconName,
    eyebrow: "Leadership workspace",
    title: "CEO Portal",
    text: "Institution-wide performance, accountability, escalation and direct Executive Cockpit access.",
    href: "/ceo-portal",
  },
  {
    icon: "action" as IconName,
    eyebrow: "Operational workspace",
    title: "Management Portal",
    text: "Role-routed actions, Watchlist matters and Board clarification tasks for accountable managers.",
    href: "/management-portal",
  },
  {
    icon: "institution" as IconName,
    eyebrow: "Controlled administration",
    title: "System Administration",
    text: "Institution setup, user roles, portal routing, access governance and system evidence.",
    href: "/admin-portal",
  },
];

const modules: Array<{
  icon: IconName;
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  featured?: boolean;
}> = [
  {
    icon: "cockpit",
    eyebrow: "Executive intelligence",
    title: "Executive Cockpit",
    text: "A consolidated view of portfolio health, emerging risk and matters requiring leadership attention.",
    href: "/executive-dashboard",
    featured: true,
  },
  {
    icon: "signal",
    eyebrow: "Detect earlier",
    title: "Early Warning",
    text: "Identify Amber, Red and NPL accounts before risk becomes institutional loss.",
    href: "/early-warning",
  },
  {
    icon: "watch",
    eyebrow: "Monitor exposure",
    title: "Watchlist",
    text: "Focus intervention on accounts that require closer monitoring and follow-through.",
    href: "/watchlist",
  },
  {
    icon: "action",
    eyebrow: "Drive accountability",
    title: "Execution Tracker",
    text: "Connect every material risk to an owner, action, deadline and escalation path.",
    href: "/action-tracker",
  },
  {
    icon: "board",
    eyebrow: "Report formally",
    title: "Board Intelligence",
    text: "Convert live risk information into a concise, credible and Board-ready pack.",
    href: "/board-pack",
  },
  {
    icon: "oversight",
    eyebrow: "Govern clearly",
    title: "Board Oversight",
    text: "Give the Board a clear lens on overdue actions, escalations and management accountability.",
    href: "/board-oversight",
  },
  {
    icon: "audit",
    eyebrow: "Preserve evidence",
    title: "Governance Trail",
    text: "Maintain a defensible history of decisions, updates and clarification requests.",
    href: "/audit-history",
  },
];

function ModuleIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    institution: <><path d="M4 21h16M6 18h12M7 18V9m5 9V9m5 9V9M5 9h14L12 3 5 9Z" /></>,
    upload: <><path d="M12 16V4m0 0L7 9m5-5 5 5" /><path d="M5 14v6h14v-6" /></>,
    cockpit: <><path d="M4 19a8 8 0 1 1 16 0" /><path d="m12 15 4-4M7 19h10" /></>,
    signal: <><path d="M4 18V9m5 9V5m5 13v-7m5 7V3" /></>,
    watch: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
    action: <><path d="M9 5h10v14H5V9" /><path d="m5 5 3 3 5-5" /><path d="M9 13h6m-6 3h5" /></>,
    board: <><path d="M4 5h16v12H4zM8 21h8m-4-4v4" /><path d="m8 13 2-2 2 1 4-4" /></>,
    oversight: <><path d="M12 3 4 7v5c0 5 3.4 8 8 9 4.6-1 8-4 8-9V7l-8-4Z" /><path d="m9 12 2 2 4-5" /></>,
    audit: <><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v5h5M10 12h6m-6 4h6" /></>,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export default function Home() {
  return (
    <main className="premium-home">
      <section className="premium-hero">
        <div className="premium-hero-grid">
          <div className="premium-hero-copy">
            <div className="premium-overline">
              <span className="premium-overline-mark" />
              KIPROD Executive Risk Intelligence
            </div>
            <h1>See risk earlier.<br /><span>Govern action better.</span></h1>
            <p className="premium-lead">
              Convert portfolio data into early-warning intelligence, accountable management action and Board-ready oversight.
            </p>
            <div className="premium-actions">
              <Link className="premium-button premium-button-primary" href="/executive-dashboard">
                Open Executive Cockpit <span aria-hidden="true">↗</span>
              </Link>
              <Link className="premium-button premium-button-secondary" href="/portfolio-upload">
                Upload portfolio data <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="premium-trust-line">
              <span>Built for financial institutions</span>
              <span>Governance-led</span>
              <span>Board-ready</span>
            </div>
          </div>

          <div className="premium-intelligence-visual" aria-label="Risk intelligence overview">
            <div className="premium-visual-glow" />
            <div className="premium-visual-topline">
              <div>
                <span>Executive view</span>
                <strong>Portfolio Intelligence</strong>
              </div>
              <span className="premium-live"><i /> Live framework</span>
            </div>
            <div className="premium-orbit">
              <div className="premium-orbit-ring premium-orbit-ring-one" />
              <div className="premium-orbit-ring premium-orbit-ring-two" />
              <div className="premium-orbit-core">
                <small>Risk visibility</small>
                <strong>360°</strong>
                <span>Portfolio to Board</span>
              </div>
              <span className="premium-orbit-point point-green" />
              <span className="premium-orbit-point point-amber" />
              <span className="premium-orbit-point point-red" />
            </div>
            <div className="premium-signal-bars" aria-hidden="true">
              {[28, 42, 36, 58, 51, 72, 64, 86, 78, 92, 84, 100].map((height, index) => (
                <i key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
            <div className="premium-visual-footer">
              <span>Detection</span><i />
              <span>Action</span><i />
              <span>Oversight</span>
            </div>
          </div>
        </div>

        <div className="premium-intelligence-strip">
          <div className="premium-strip-label"><span>Intelligence framework</span><strong>From visibility to accountability</strong></div>
          {intelligence.map((item) => (
            <div className="premium-strip-item" key={item.label}>
              <i className={`tone-${item.tone}`} />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="premium-light-section premium-pathway-section">
        <div className="premium-section-heading">
          <div>
            <p className="premium-section-kicker">Official Command Centre home</p>
            <h2>One platform. The right workspace for every role.</h2>
          </div>
          <p>This is the institutional landing page. After secure login, each user will be routed directly to the workspace approved for their role.</p>
        </div>
        <div className="relative z-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {workspaces.map((workspace) => (
            <Link
              key={workspace.title}
              href={workspace.href}
              className="group flex min-h-64 flex-col rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-sm transition hover:-translate-y-1 hover:border-[#d6a84f] hover:shadow-xl"
            >
              <span className="premium-module-icon"><ModuleIcon name={workspace.icon} /></span>
              <small className="mt-auto text-[10px] font-black uppercase tracking-[0.16em] text-[#9b712d]">{workspace.eyebrow}</small>
              <strong className="mt-2 text-xl text-slate-950">{workspace.title}</strong>
              <span className="mt-3 text-sm leading-6 text-slate-600">{workspace.text}</span>
              <span className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-[#9b712d]">Enter workspace →</span>
            </Link>
          ))}
        </div>
        <div className="relative z-10 mb-8 mt-16 max-w-2xl">
          <p className="premium-section-kicker">The institutional journey</p>
          <h3 className="mt-3 text-3xl font-black text-[#071426]">Risk intelligence that leads to action.</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">Every workspace remains connected to one governance pathway from portfolio information to executive decisions, Board oversight and reliable audit evidence.</p>
        </div>
        <div className="premium-pathway">
          {pathway.map(([number, title, text]) => (
            <div className="premium-pathway-step" key={number}>
              <span>{number}</span>
              <div><strong>{title}</strong><p>{text}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="premium-modules-section">
        <div className="premium-section-heading premium-section-heading-dark">
          <div>
            <p className="premium-section-kicker">Command Centre capabilities</p>
            <h2>One platform. A complete governance lens.</h2>
          </div>
          <p>Purpose-built workspaces connect risk monitoring, management execution and Board accountability without fragmenting institutional evidence.</p>
        </div>
        <div className="premium-module-grid">
          {modules.map((module) => (
            <Link className={`premium-module-card${module.featured ? " premium-module-featured" : ""}`} href={module.href} key={module.title}>
              <span className="premium-module-icon"><ModuleIcon name={module.icon} /></span>
              <span className="premium-module-content">
                <small>{module.eyebrow}</small>
                <strong>{module.title}</strong>
                <span>{module.text}</span>
              </span>
              <span className="premium-module-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="premium-entry-section">
        <div className="premium-entry-copy">
          <p className="premium-section-kicker">Begin with trusted data</p>
          <h2>Set the institutional context.<br />Then activate intelligence.</h2>
          <p>Configure the reporting environment and validate portfolio data before risk analysis begins.</p>
        </div>
        <div className="premium-entry-cards">
          <Link href="/institution-profile" className="premium-entry-card">
            <span className="premium-module-icon"><ModuleIcon name="institution" /></span>
            <span><small>Step 01</small><strong>Institution Profile</strong><em>Set reporting context and governance ownership.</em></span>
            <b aria-hidden="true">→</b>
          </Link>
          <Link href="/portfolio-upload" className="premium-entry-card">
            <span className="premium-module-icon"><ModuleIcon name="upload" /></span>
            <span><small>Step 02</small><strong>Portfolio Upload</strong><em>Validate data and prepare risk classification.</em></span>
            <b aria-hidden="true">→</b>
          </Link>
        </div>
      </section>

      <footer className="premium-home-footer">
        <span>KIPROD Risk Management Services</span>
        <strong>Insight <i /> Capability <i /> Execution</strong>
      </footer>
    </main>
  );
}
