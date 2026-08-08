import { supabase } from "@/lib/supabaseClient";

export const INSTITUTION_PROFILE_STORAGE_KEY = "kiprodInstitutionProfile";
export const INSTITUTION_PROFILE_UPDATED_EVENT = "kiprod:institution-profile-updated";

export type InstitutionProfile = {
  institutionName: string;
  institutionType: string;
  countyRegion: string;
  primaryContact: string;
  reportingMonth: string;
  boardReportingFrequency: string;
  reportingCurrency: string;
  riskLead: string;
  creditManager: string;
  recoveryLead: string;
  boardChair: string;
  governanceMode: string;
};

export type MasterProfileSource = "supabase" | "local" | "default";

export type BoardReportOverride = {
  id: string;
  institutionId: string;
  reportingPeriod: string;
  fieldKey: BoardReportOverrideField;
  masterValueSnapshot: string;
  overrideValue: string;
  reason: string;
  updatedAt: string;
  updatedByRole: string;
  updatedByName: string;
};

export const defaultInstitutionProfile: InstitutionProfile = {
  institutionName: "",
  institutionType: "SACCO",
  countyRegion: "",
  primaryContact: "",
  reportingMonth: "",
  boardReportingFrequency: "Monthly",
  reportingCurrency: "KES",
  riskLead: "",
  creditManager: "",
  recoveryLead: "",
  boardChair: "",
  governanceMode: "Management prepares. Board oversees.",
};

export const BOARD_REPORT_OVERRIDE_FIELDS = [
  { key: "institutionName", label: "Institution Name" },
  { key: "institutionType", label: "Institution Type" },
  { key: "reportingMonth", label: "Reporting Month" },
  { key: "reportingCurrency", label: "Reporting Currency" },
  { key: "riskLead", label: "Risk Lead" },
  { key: "creditManager", label: "Credit Manager" },
  { key: "recoveryLead", label: "Recovery Lead" },
  { key: "boardChair", label: "Board Chair / Risk Lead" },
] as const;

export type BoardReportOverrideField =
  (typeof BOARD_REPORT_OVERRIDE_FIELDS)[number]["key"];

type InstitutionProfileRow = {
  institution_id: string;
  institution_name: string | null;
  institution_type: string | null;
  county_region: string | null;
  primary_contact: string | null;
  reporting_month: string | null;
  board_reporting_frequency: string | null;
  reporting_currency: string | null;
  risk_lead: string | null;
  credit_manager: string | null;
  recovery_lead: string | null;
  board_chair_risk_lead: string | null;
  governance_mode: string | null;
  updated_at?: string | null;
};

type OverrideRow = {
  id: string;
  institution_id: string;
  reporting_period: string;
  field_key: BoardReportOverrideField;
  master_value_snapshot: string | null;
  override_value: string;
  reason: string;
  updated_at: string;
  updated_by_role: string | null;
  updated_by_name: string | null;
};

export function getInstitutionId() {
  return process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID || "";
}

export function getCurrentRole() {
  if (typeof window === "undefined") return "MVP User";
  return localStorage.getItem("kiprodCurrentRole") || "MVP User";
}

export async function getCurrentActor() {
  const role = getCurrentRole();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const name =
    String(user?.user_metadata?.full_name || user?.user_metadata?.name || "").trim() ||
    user?.email ||
    role;
  return { role, name };
}

function profileFromRow(row: InstitutionProfileRow): InstitutionProfile {
  return {
    institutionName: row.institution_name || "",
    institutionType: row.institution_type || "SACCO",
    countyRegion: row.county_region || "",
    primaryContact: row.primary_contact || "",
    reportingMonth: row.reporting_month || "",
    boardReportingFrequency: row.board_reporting_frequency || "Monthly",
    reportingCurrency: row.reporting_currency || "KES",
    riskLead: row.risk_lead || "",
    creditManager: row.credit_manager || "",
    recoveryLead: row.recovery_lead || "",
    boardChair: row.board_chair_risk_lead || "",
    governanceMode:
      row.governance_mode || "Management prepares. Board oversees.",
  };
}

function profileToRow(profile: InstitutionProfile, actor: { role: string; name: string }) {
  return {
    institution_id: getInstitutionId(),
    institution_name: profile.institutionName.trim(),
    institution_type: profile.institutionType.trim(),
    county_region: profile.countyRegion.trim(),
    primary_contact: profile.primaryContact.trim(),
    reporting_month: profile.reportingMonth.trim(),
    board_reporting_frequency: profile.boardReportingFrequency.trim(),
    reporting_currency: profile.reportingCurrency.trim(),
    risk_lead: profile.riskLead.trim(),
    credit_manager: profile.creditManager.trim(),
    recovery_lead: profile.recoveryLead.trim(),
    board_chair_risk_lead: profile.boardChair.trim(),
    governance_mode: profile.governanceMode.trim(),
    updated_by_role: actor.role,
    updated_by_name: actor.name,
    updated_at: new Date().toISOString(),
  };
}

export function readLocalInstitutionProfile() {
  if (typeof window === "undefined") return defaultInstitutionProfile;
  try {
    const raw = localStorage.getItem(INSTITUTION_PROFILE_STORAGE_KEY);
    if (!raw) return defaultInstitutionProfile;
    return {
      ...defaultInstitutionProfile,
      ...(JSON.parse(raw) as Partial<InstitutionProfile>),
    };
  } catch {
    return defaultInstitutionProfile;
  }
}

export function cacheInstitutionProfile(profile: InstitutionProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(INSTITUTION_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  window.dispatchEvent(
    new CustomEvent(INSTITUTION_PROFILE_UPDATED_EVENT, { detail: profile })
  );
}

function hasLocalProfile(profile: InstitutionProfile) {
  return Boolean(
    profile.institutionName.trim() ||
      profile.reportingMonth.trim() ||
      profile.riskLead.trim() ||
      profile.creditManager.trim() ||
      profile.recoveryLead.trim() ||
      profile.boardChair.trim()
  );
}

export async function loadMasterInstitutionProfile(): Promise<{
  profile: InstitutionProfile;
  source: MasterProfileSource;
  message: string;
}> {
  const localProfile = readLocalInstitutionProfile();
  const institutionId = getInstitutionId();

  if (!institutionId) {
    return {
      profile: localProfile,
      source: hasLocalProfile(localProfile) ? "local" : "default",
      message:
        "Database sync is waiting for NEXT_PUBLIC_DEFAULT_INSTITUTION_ID. Local fallback is active.",
    };
  }

  const { data, error } = await supabase
    .from("institution_profiles")
    .select("*")
    .eq("institution_id", institutionId)
    .maybeSingle();

  if (error) {
    return {
      profile: localProfile,
      source: hasLocalProfile(localProfile) ? "local" : "default",
      message: `Database profile unavailable: ${error.message}`,
    };
  }

  if (data) {
    const profile = profileFromRow(data as InstitutionProfileRow);
    cacheInstitutionProfile(profile);
    return {
      profile,
      source: "supabase",
      message: "Shared master record loaded from Supabase.",
    };
  }

  if (hasLocalProfile(localProfile)) {
    const actor = await getCurrentActor();
    const { data: migrated, error: migrationError } = await supabase
      .from("institution_profiles")
      .upsert(profileToRow(localProfile, actor), { onConflict: "institution_id" })
      .select("*")
      .single();

    if (!migrationError && migrated) {
      const profile = profileFromRow(migrated as InstitutionProfileRow);
      cacheInstitutionProfile(profile);
      return {
        profile,
        source: "supabase",
        message: "Existing browser profile migrated to the shared master record.",
      };
    }
  }

  return {
    profile: localProfile,
    source: hasLocalProfile(localProfile) ? "local" : "default",
    message: hasLocalProfile(localProfile)
      ? "Local profile loaded; save it to create the shared master record."
      : "No master record exists yet. Complete and save the Institution Profile.",
  };
}

export async function saveMasterInstitutionProfile(profile: InstitutionProfile) {
  const institutionId = getInstitutionId();
  cacheInstitutionProfile(profile);

  if (!institutionId) {
    return {
      savedToDatabase: false,
      message:
        "Saved locally. Add NEXT_PUBLIC_DEFAULT_INSTITUTION_ID to enable shared database sync.",
    };
  }

  const actor = await getCurrentActor();
  const { data, error } = await supabase
    .from("institution_profiles")
    .upsert(profileToRow(profile, actor), { onConflict: "institution_id" })
    .select("*")
    .single();

  if (error) {
    return {
      savedToDatabase: false,
      message: `Saved locally, but database sync failed: ${error.message}`,
    };
  }

  const savedProfile = profileFromRow(data as InstitutionProfileRow);
  cacheInstitutionProfile(savedProfile);

  return {
    savedToDatabase: true,
    profile: savedProfile,
    message: "Institution Profile saved as the shared Supabase master record.",
  };
}

export async function writeAuditLog(entry: {
  module: string;
  actionType: string;
  recordRef: string;
  oldValue: string;
  newValue: string;
  note: string;
}) {
  const institutionId = getInstitutionId();
  if (!institutionId) {
    return { saved: false, error: "Missing default institution ID." };
  }
  const actor = await getCurrentActor();
  const { error } = await supabase.from("audit_logs").insert({
    institution_id: institutionId,
    module: entry.module,
    action_type: entry.actionType,
    record_ref: entry.recordRef,
    old_value: entry.oldValue,
    new_value: entry.newValue,
    role: actor.role,
    user_name: actor.name,
    note: entry.note,
  });
  return { saved: !error, error: error?.message || "" };
}

export async function loadBoardReportOverrides(reportingPeriod: string) {
  const institutionId = getInstitutionId();
  if (!institutionId) return [] as BoardReportOverride[];
  const { data, error } = await supabase
    .from("board_report_overrides")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("reporting_period", reportingPeriod)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data || []) as OverrideRow[]).map((row) => ({
    id: row.id,
    institutionId: row.institution_id,
    reportingPeriod: row.reporting_period,
    fieldKey: row.field_key,
    masterValueSnapshot: row.master_value_snapshot || "",
    overrideValue: row.override_value,
    reason: row.reason,
    updatedAt: row.updated_at,
    updatedByRole: row.updated_by_role || "MVP User",
    updatedByName: row.updated_by_name || row.updated_by_role || "MVP User",
  }));
}

export async function saveBoardReportOverride(args: {
  fieldKey: BoardReportOverrideField;
  reportingPeriod: string;
  masterValue: string;
  previousReportValue: string;
  overrideValue: string;
  reason: string;
}) {
  const institutionId = getInstitutionId();
  if (!institutionId) throw new Error("Missing NEXT_PUBLIC_DEFAULT_INSTITUTION_ID.");
  const actor = await getCurrentActor();
  const { error } = await supabase.rpc("kiprod_save_board_report_override", {
    p_institution_id: institutionId,
    p_reporting_period: args.reportingPeriod,
    p_field_key: args.fieldKey,
    p_master_value: args.masterValue,
    p_previous_report_value: args.previousReportValue,
    p_override_value: args.overrideValue.trim(),
    p_reason: args.reason.trim(),
    p_role: actor.role,
    p_user_name: actor.name,
  });
  if (error) throw error;
}

export async function removeBoardReportOverride(args: {
  override: BoardReportOverride;
  masterValue: string;
  reason: string;
}) {
  const actor = await getCurrentActor();
  const { error } = await supabase.rpc("kiprod_remove_board_report_override", {
    p_override_id: args.override.id,
    p_master_value: args.masterValue,
    p_reason: args.reason.trim(),
    p_role: actor.role,
    p_user_name: actor.name,
  });
  if (error) throw error;
}
