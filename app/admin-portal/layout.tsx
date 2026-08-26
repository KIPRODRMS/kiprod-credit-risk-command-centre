import AdminPortalNav from "./AdminPortalNav";

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100"><AdminPortalNav />{children}</div>;
}
