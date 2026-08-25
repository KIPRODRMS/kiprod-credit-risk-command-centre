import CreditManagerPortalNav from "./CreditManagerPortalNav";

export default function CreditManagerPortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100"><CreditManagerPortalNav />{children}</div>;
}
