import CreditManagerPortalNav from "./CreditManagerPortalNav";
import PortalSessionBar from "@/app/components/PortalSessionBar";

export default function CreditManagerPortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100"><CreditManagerPortalNav /><PortalSessionBar />{children}</div>;
}
