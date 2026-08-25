"use client";

import { useState } from "react";
import { MANAGEMENT_ROLES, type PortalClarification } from "@/lib/portalRouting";
import { supabase } from "@/lib/supabaseClient";

const ISSUE_TYPES = [
  "Overdue Management Action",
  "NPL Exposure",
  "High Exposure Account",
  "Unresolved Watchlist Account",
  "Repeated Deterioration",
  "Restructured Account Concern",
  "Missing Responsible Officer",
  "Policy Exception",
  "Board Report Clarification",
  "Other",
];

type Props = {
  role: string;
  pendingManagement: number;
  awaitingBoard: number;
  onCreated: () => Promise<void>;
};

const institutionId = () => process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID || "";

export default function BoardClarificationForm({ role, pendingManagement, awaitingBoard, onCreated }: Props) {
  const [requestTitle, setRequestTitle] = useState("");
  const [riskSource, setRiskSource] = useState("Board Oversight");
  const [loanAccount, setLoanAccount] = useState("");
  const [memberName, setMemberName] = useState("");
  const [riskClass, setRiskClass] = useState("Red");
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [priority, setPriority] = useState("High");
  const [assignedTo, setAssignedTo] = useState<string>(MANAGEMENT_ROLES[2]);
  const [dueDate, setDueDate] = useState("");
  const [visibilityReason, setVisibilityReason] = useState("");
  const [clarification, setClarification] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    if (!requestTitle.trim() || !clarification.trim()) {
      setMessage("Request title and clarification required are mandatory.");
      return;
    }
    const id = institutionId();
    if (!id) { setMessage("Institution ID is not configured."); return; }
    const protectedQuestion = [
      "[Governance Context]",
      `Risk Source: ${riskSource}`,
      `Risk Class: ${riskClass}`,
      `Priority: ${priority}`,
      `Due Date: ${dueDate || "Not specified"}`,
      `Board Visibility Reason: ${visibilityReason.trim() || "Not specified"}`,
      "[Clarification Required]",
      clarification.trim(),
    ].join("\n");
    setSaving(true);
    const { data, error } = await supabase.from("clarification_requests").insert({
      institution_id: id,
      request_title: requestTitle.trim(),
      loan_account: loanAccount.trim() || "N/A",
      member_name: memberName.trim() || "N/A",
      issue_type: issueType,
      question: protectedQuestion,
      requested_by_role: role,
      assigned_to: assignedTo,
      status: "Pending Management Response",
      management_response: "",
      board_review_notes: "",
    }).select().single();
    setSaving(false);
    if (error) { setMessage(`Request could not be created: ${error.message}`); return; }
    const created = data as PortalClarification;
    await supabase.from("audit_logs").insert({
      institution_id: id,
      module: "Clarification Requests",
      action_type: "CLARIFICATION_REQUEST_CREATED",
      record_ref: `${created.loan_account || "No account"} - ${created.request_title}`,
      old_value: "No request",
      new_value: "Pending Management Response",
      role,
      user_name: role,
      note: `Board clarification routed to ${assignedTo} with ${priority} priority.`,
    });
    setRequestTitle(""); setLoanAccount(""); setMemberName(""); setDueDate("");
    setVisibilityReason(""); setClarification("");
    setMessage(`Clarification sent to ${assignedTo}.`);
    await onCreated();
  }

  const inputClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-950 outline-none focus:border-amber-500";
  return (
    <section id="clarifications" className="scroll-mt-24 rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap justify-between gap-4">
        <div><h2 className="text-2xl font-black">Raise a management clarification</h2><p className="mt-1 text-sm text-slate-600">Full governance context is protected and routed to the selected management portal and Audit History.</p></div>
        <div className="flex flex-wrap justify-end gap-2"><span className="rounded-full bg-amber-100 px-3 py-2 text-xs font-bold">{pendingManagement} awaiting management</span><span className="rounded-full bg-blue-100 px-3 py-2 text-xs font-bold">{awaitingBoard} awaiting Board</span></div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-bold">Request title<input value={requestTitle} onChange={e=>setRequestTitle(e.target.value)} className={inputClass} placeholder="Formal request title" /></label>
        <label className="text-sm font-bold">Risk source<input value={riskSource} onChange={e=>setRiskSource(e.target.value)} className={inputClass} placeholder="Board Oversight, Board Report..." /></label>
        <label className="text-sm font-bold">Loan account<input value={loanAccount} onChange={e=>setLoanAccount(e.target.value)} className={inputClass} placeholder="LN-0047" /></label>
        <label className="text-sm font-bold">Member name<input value={memberName} onChange={e=>setMemberName(e.target.value)} className={inputClass} /></label>
        <label className="text-sm font-bold">Risk class / overlay<select value={riskClass} onChange={e=>setRiskClass(e.target.value)} className={inputClass}>{["Green","Amber","Red","NPL","Restructured","High Exposure"].map(item=><option key={item}>{item}</option>)}</select></label>
        <label className="text-sm font-bold">Issue type<select value={issueType} onChange={e=>setIssueType(e.target.value)} className={inputClass}>{ISSUE_TYPES.map(item=><option key={item}>{item}</option>)}</select></label>
        <label className="text-sm font-bold">Priority<select value={priority} onChange={e=>setPriority(e.target.value)} className={inputClass}>{["Low","Medium","High","Critical"].map(item=><option key={item}>{item}</option>)}</select></label>
        <label className="text-sm font-bold">Assign to<select value={assignedTo} onChange={e=>setAssignedTo(e.target.value)} className={inputClass}>{MANAGEMENT_ROLES.map(item=><option key={item}>{item}</option>)}</select></label>
        <label className="text-sm font-bold">Response due date<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className={inputClass} /></label>
        <label className="text-sm font-bold md:col-span-1 xl:col-span-3">Board visibility reason<input value={visibilityReason} onChange={e=>setVisibilityReason(e.target.value)} className={inputClass} placeholder="Explain why this matter requires Board attention" /></label>
        <label className="text-sm font-bold md:col-span-2 xl:col-span-4">Clarification required<textarea value={clarification} onChange={e=>setClarification(e.target.value)} className={`${inputClass} min-h-32`} placeholder="State exactly what management must explain, confirm and deliver." /></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4"><button onClick={()=>void submit()} disabled={saving} className="rounded-xl bg-amber-500 px-5 py-3 font-black text-slate-950 disabled:opacity-50">{saving?"Saving...":"Send clarification"}</button>{message&&<p role="status" className="text-sm font-bold text-slate-700">{message}</p>}</div>
    </section>
  );
}
