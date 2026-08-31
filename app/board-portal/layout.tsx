import BoardPortalNav from "./BoardPortalNav";
import PortalSessionBar from "@/app/components/PortalSessionBar";
export default function BoardPortalLayout({children}:{children:React.ReactNode}){return <div className="min-h-screen bg-slate-100"><BoardPortalNav /><PortalSessionBar />{children}</div>;}
