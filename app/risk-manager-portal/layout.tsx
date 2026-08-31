import RiskManagerPortalNav from "./RiskManagerPortalNav";
import PortalSessionBar from "@/app/components/PortalSessionBar";

export default function RiskManagerPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <RiskManagerPortalNav />
      <PortalSessionBar />
      {children}
    </div>
  );
}
