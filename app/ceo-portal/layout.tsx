import CeoPortalNav from "./CeoPortalNav";
import PortalSessionBar from "@/app/components/PortalSessionBar";
export default function CeoPortalLayout({children}:{children:React.ReactNode}){return <div className="min-h-screen bg-slate-100"><CeoPortalNav /><PortalSessionBar />{children}</div>}
