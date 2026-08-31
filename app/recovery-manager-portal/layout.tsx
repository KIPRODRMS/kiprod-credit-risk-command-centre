import RecoveryManagerPortalNav from "./RecoveryManagerPortalNav";
import PortalSessionBar from "@/app/components/PortalSessionBar";

export default function RecoveryManagerPortalLayout({children}:{children:React.ReactNode}){
  return <div className="min-h-screen bg-slate-100"><RecoveryManagerPortalNav /><PortalSessionBar />{children}</div>;
}
