import RiskManagerPortalNav from "./RiskManagerPortalNav";

export default function RiskManagerPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <RiskManagerPortalNav />
      {children}
    </div>
  );
}
