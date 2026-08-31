import PortfolioManagerPortalNav from "./PortfolioManagerPortalNav";
import PortalSessionBar from "@/app/components/PortalSessionBar";
export default function PortfolioManagerPortalLayout({children}:{children:React.ReactNode}){return <div className="min-h-screen bg-slate-100"><PortfolioManagerPortalNav /><PortalSessionBar />{children}</div>}
