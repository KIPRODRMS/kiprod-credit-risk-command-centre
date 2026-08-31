import AdminPortalNav from "./AdminPortalNav";
import PortalSessionBar from "@/app/components/PortalSessionBar";

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100"><AdminPortalNav /><PortalSessionBar />{children}</div>;
}
