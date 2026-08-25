import RecoveryManagerPortalNav from "./RecoveryManagerPortalNav";

export default function RecoveryManagerPortalLayout({children}:{children:React.ReactNode}){
  return <div className="min-h-screen bg-slate-100"><RecoveryManagerPortalNav />{children}</div>;
}
