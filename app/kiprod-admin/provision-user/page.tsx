import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerAccessContext } from "@/lib/accessServer";
import ProvisionUserForm from "./ProvisionUserForm";

type InstitutionRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  approved_domain: string | null;
};

export default async function ProvisionInstitutionUserPage() {
  const access = await getServerAccessContext();

  if (access.activeRole !== "KIPROD Admin") {
    redirect(access.activeRole ? "/" : "/login");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("institutions")
    .select("id,name,slug,status,approved_domain")
    .order("name", { ascending: true });

  const institutions = ((data || []) as InstitutionRow[]).filter(
    (institution) => institution.status !== "Suspended",
  );

  return (
    <main className="min-h-screen bg-[#eef2f6] p-4 text-slate-950 sm:p-8">
      <div className="mx-auto max-w-[1100px] space-y-6">
        <header className="rounded-[2rem] bg-[#071426] p-8 text-white shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[.22em] text-violet-300">
            Existing institution provisioning
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">
            Add user to an existing institution
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-slate-300">
            Create Board, executive and management portal accounts without
            recreating the institution or touching its unique slug.
          </p>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-violet-700">
                User provisioning
              </p>
              <h2 className="mt-1 text-2xl font-black">
                Assign account to institution
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                One institution can have many users. Each user is linked by
                institution ID and receives their own approved portal role.
              </p>
            </div>

            <Link
              href="/kiprod-admin"
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-black"
            >
              Back to KIPROD Admin
            </Link>
          </div>

          {error ? (
            <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-800">
              Institutions could not be loaded: {error.message}
            </p>
          ) : institutions.length ? (
            <ProvisionUserForm institutions={institutions} />
          ) : (
            <p className="rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-900">
              No active institutions are available. Create or reactivate an
              institution first.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <strong className="text-emerald-900">
            Locked risk-policy protection remains untouched
          </strong>
          <p className="mt-2 text-sm text-emerald-800">
            This patch only adds account provisioning. It does not edit
            riskPolicy, PAR30, PAR90, Watchlist, overdue logic, portfolio data
            or action-history logic.
          </p>
        </section>
      </div>
    </main>
  );
}
