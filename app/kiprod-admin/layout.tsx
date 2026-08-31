import KiprodAdminNav from "./KiprodAdminNav";
import PortalSessionBar from "@/app/components/PortalSessionBar";

export default function KiprodAdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100"><KiprodAdminNav /><PortalSessionBar />{children}</div>;
}
