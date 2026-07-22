// ============================================================
//  QPR — Shared business logic
// ------------------------------------------------------------
//  Pure, framework-agnostic helpers and constants used by the
//  raajbhasha QPR app (supabase/index.html). Keeping them here
//  as a UMD module means the exact same code runs in the browser
//  (exposed as `window.QPRLogic`) and can be unit-tested in Node.
// ============================================================
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.QPRLogic = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ----------------------------------------------------------
  //  CONSTANTS
  // ----------------------------------------------------------
  const ROLES = {
    SECTION: { id: "SECTION", label: "DEO/Clerk", icon: "🏢", color: "#6366f1", bg: "#eef2ff", grad: "linear-gradient(135deg,#6366f1,#8b5cf6)" },
    AAO: { id: "AAO", label: "AAO", icon: "🔎", color: "#0ea5e9", bg: "#f0f9ff", grad: "linear-gradient(135deg,#0ea5e9,#6366f1)" },
    SAO: { id: "SAO", label: "SAO", icon: "✅", color: "#10b981", bg: "#ecfdf5", grad: "linear-gradient(135deg,#10b981,#0ea5e9)" },
    HINDI_CELL: { id: "HINDI_CELL", label: "हिंदी प्रकोष्ठ", icon: "🏛️", color: "#f59e0b", bg: "#fffbeb", grad: "linear-gradient(135deg,#f59e0b,#ef4444)" },
  };

  const STATUS = {
    DRAFT: { id: "DRAFT", label: "मसौदा", icon: "📝", color: "#94a3b8", bg: "#f8fafc" },
    PENDING_AAO: { id: "PENDING_AAO", label: "AAO के पास", icon: "⏳", color: "#6366f1", bg: "#eef2ff" },
    AAO_APPROVED: { id: "AAO_APPROVED", label: "AAO स्वीकृत", icon: "✔️", color: "#0ea5e9", bg: "#f0f9ff" },
    AAO_RETURNED: { id: "AAO_RETURNED", label: "AAO ने वापस किया", icon: "↩️", color: "#f97316", bg: "#fff7ed" },
    PENDING_SAO: { id: "PENDING_SAO", label: "SAO के पास", icon: "⏳", color: "#10b981", bg: "#ecfdf5" },
    SAO_APPROVED: { id: "SAO_APPROVED", label: "SAO स्वीकृत", icon: "✔️", color: "#10b981", bg: "#d1fae5" },
    SAO_RETURNED: { id: "SAO_RETURNED", label: "SAO ने वापस किया", icon: "↩️", color: "#f97316", bg: "#fff7ed" },
    SUBMITTED: { id: "SUBMITTED", label: "हिंदी प्रकोष्ठ स्वीकृत", icon: "🎉", color: "#16a34a", bg: "#dcfce7" },
    REJECTED: { id: "REJECTED", label: "अस्वीकृत", icon: "❌", color: "#dc2626", bg: "#fee2e2" },
  };

  const WORKFLOW_ACTIONS = {
    SECTION: {
      AAO_RETURNED: [{ label: "✅ AAO को पुनः भेजें", action: "PENDING_AAO", grad: "linear-gradient(135deg,#10b981,#0ea5e9)" }],
    },
    AAO: {
      PENDING_AAO: [{ label: "✅ SAO को अग्रेषित करें", action: "AAO_APPROVED", grad: "linear-gradient(135deg,#10b981,#0ea5e9)" }, { label: "↩️ अनुभाग को वापस करें", action: "AAO_RETURNED", grad: "linear-gradient(135deg,#f97316,#ef4444)" }],
      SAO_RETURNED: [{ label: "✅ SAO को पुनः भेजें", action: "AAO_APPROVED", grad: "linear-gradient(135deg,#10b981,#0ea5e9)" }, { label: "↩️ अनुभाग को वापस करें", action: "AAO_RETURNED", grad: "linear-gradient(135deg,#f97316,#ef4444)" }],
    },
    SAO: {
      AAO_APPROVED: [{ label: "✅ हिंदी प्रकोष्ठ को भेजें", action: "SAO_APPROVED", grad: "linear-gradient(135deg,#10b981,#0ea5e9)" }, { label: "↩️ AAO को वापस करें", action: "SAO_RETURNED", grad: "linear-gradient(135deg,#f97316,#ef4444)" }],
    },
    HINDI_CELL: {
      SAO_APPROVED: [{ label: "🎉 अंतिम स्वीकृति दें", action: "SUBMITTED", grad: "linear-gradient(135deg,#f59e0b,#10b981)" }, { label: "↩️ SAO को वापस करें", action: "SAO_RETURNED", grad: "linear-gradient(135deg,#dc2626,#9f1239)" }],
    },
  };

  const QUARTERS = [
    { id: "Q1", label: "Q1 · अप्रैल–जून" },
    { id: "Q2", label: "Q2 · जुलाई–सितंबर" },
    { id: "Q3", label: "Q3 · अक्टूबर–दिसंबर" },
    { id: "Q4", label: "Q4 · जनवरी–मार्च" },
  ];

  const YEARS = ["2022", "2023", "2024", "2025", "2026", "2027", "2028", "2029", "2030"];

  const SECTION_COLORS = [
    { bg: "#ede9fe", border: "#8b5cf6", text: "#5b21b6", icon: "📜" },
    { bg: "#fce7f3", border: "#ec4899", text: "#9d174d", icon: "🏛️" },
    { bg: "#fee2e2", border: "#ef4444", text: "#991b1b", icon: "📄" },
    { bg: "#fff7ed", border: "#f97316", text: "#9a3412", icon: "📬" },
    { bg: "#fefce8", border: "#eab308", text: "#854d0e", icon: "✉️" },
    { bg: "#f0fdf4", border: "#22c55e", text: "#166534", icon: "📨" },
    { bg: "#ecfeff", border: "#06b6d4", text: "#155e75", icon: "🗂️" },
    { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af", icon: "🎓" },
    { bg: "#f0fdf4", border: "#10b981", text: "#065f46", icon: "🤝" },
    { bg: "#fdf4ff", border: "#a855f7", text: "#581c87", icon: "📝" },
    { bg: "#fff1f2", border: "#f43f5e", text: "#881337", icon: "🏆" },
    { bg: "#f8fafc", border: "#64748b", text: "#0f172a", icon: "✅" },
  ];

  // ----------------------------------------------------------
  //  WORKFLOW
  // ----------------------------------------------------------
  const workflowActionsFor = (role, status) =>
    (WORKFLOW_ACTIONS[role] && WORKFLOW_ACTIONS[role][status]) || [];

  const canActOnReport = (user, report) =>
    workflowActionsFor(user.role, report.status).length > 0;

  // Status a report moves to when a returned report is re-submitted (edited).
  const resubmitStatus = (role, status) => {
    if (role === "SECTION" && status === "AAO_RETURNED") return "PENDING_AAO";
    if (role === "AAO" && status === "SAO_RETURNED") return "AAO_APPROVED";
    return status;
  };

  // ----------------------------------------------------------
  //  IDS / FORM
  // ----------------------------------------------------------
  function genId() {
    return `RAJ-${Date.now().toString(36).toUpperCase().slice(-7)}`;
  }

  function emptyForm() {
    return {
      officeNameAddress: "", officerName: "", stdCode: "", phone: "", email: "", year: "2026", quarter: "Q4", region: "B", ackId: genId(), rbOfficerPhone: "", rbOfficerEmail: "",
      b1_s1_total_files: "", b1_s1_hindi_files: "", b1_s2_total_meetings: "", b1_s2_hindi_minutes: "", b1_s2_total_docs: "", b1_s2_hindi_docs: "", b1_s3_total_issued: "", b1_s3_bilingual: "", b1_s3_english_only: "", b1_s3_hindi_only: "", b1_s4_total_received: "", b1_s4_no_reply_needed: "", b1_s4_hindi_reply: "", b1_s4_english_reply: "",
      b1_s5_ka_total: "", b1_s5_ka_hindi_reply: "", b1_s5_ka_eng_reply: "", b1_s5_ka_no_reply: "", b1_s5_kha_total: "", b1_s5_kha_hindi_reply: "", b1_s5_kha_eng_reply: "", b1_s5_kha_no_reply: "",
      b1_s6_ka_hindi: "", b1_s6_ka_english: "", b1_s6_ka_total: "", b1_s6_kha_hindi: "", b1_s6_kha_english: "", b1_s6_kha_total: "", b1_s6_ga_hindi: "", b1_s6_ga_english: "", b1_s6_ga_total: "",
      b1_s7_hindi_pages: "", b1_s7_eng_pages: "", b1_s7_total_pages: "", b1_s7_eoffice: "", b1_s8_workshops: "", b1_s8_officers: "", b1_s8_staff: "", b1_s9_meeting_date: "", b1_s9_sub_office_cmtes: "", b1_s9_sub_office_meetings: "", b1_s9_agenda_hindi: "हाँ", b1_s10_meeting_date: "", b1_s11_innovation: "", b1_s11_special: "", b1_s11_other: "",
      b2_s1_notified: "नहीं", b2_s1_sub_offices_total: "", b2_s1_sub_offices_notified: "", b2_s1_sub_offices_action: "",
      b2_s2_off_total: "", b2_s2_off_ministerial: "", b2_s2_off_pravinta: "", b2_s2_off_karyasadhak: "", b2_s2_off_training: "", b2_s2_off_remaining: "", b2_s2_staff_total: "", b2_s2_staff_ministerial: "", b2_s2_staff_pravinta: "", b2_s2_staff_karyasadhak: "", b2_s2_staff_training: "", b2_s2_staff_remaining: "",
      b2_shorthand_total: "", b2_shorthand_trained: "", b2_shorthand_working: "", b2_shorthand_pending: "", b2_typing_total: "", b2_typing_trained: "", b2_typing_working: "", b2_typing_pending: "", b2_tax_total: "", b2_tax_trained: "", b2_tax_working: "", b2_tax_pending: "", b2_translation_total: "", b2_translation_trained: "", b2_translation_pending: "",
      b2_comp_total: "", b2_comp_trained: "", b2_comp_working: "", b2_s4_total_laptops: "", b2_s4_unicode: "", b2_s4_hindi_pct: "", b2_s5_manuals_total: "", b2_s5_manuals_bilingual: "", b2_s5_forms_total: "", b2_s5_forms_bilingual: "", b2_rule84_ordered: "", b2_rule84_pending: "", b2_s7_name: "", b2_s7_duration: "", b2_s7_hindi: "", b2_s7_eng: "", b2_s7_mixed: "",
      b2_inspection_sections_total: "", b2_inspection_sections_inspected: "", b2_s8_hindi_sections: "", b2_inspection_offices_total: "", b2_inspection_offices_inspected: "", b2_publications_total: "", b2_publications_hindi: "", b2_publications_eng: "", b2_books_expenditure: "", b2_books_hindi_expenditure: "",
      b11_ds_total: "", b11_ds_know_hindi: "", b11_ds_not_doing: "", b11_ds_25: "", b11_ds_50: "", b11_ds_75: "", b11_ds_more: "", b11_ds_100: "", b12_bl_total: "", b12_bl_know_hindi: "", b12_bl_not_doing: "", b12_bl_25: "", b12_bl_50: "", b12_bl_75: "", b12_bl_more: "", b12_bl_100: "",
      b13_post_name: "", b13_hq_sanc: "", b13_hq_vac: "", b13_sub_sanc: "", b13_sub_vac: "", b2_website_url: "", b2_website_type: "केवल अंग्रेजी", b2_website_lang_option: "नहीं",
    };
  }

  // ----------------------------------------------------------
  //  VALIDATION
  // ----------------------------------------------------------
  const num = (v) => parseFloat(v) || 0;

  // Mirrors the ReportForm validation. Returns an array of Hindi error strings.
  function validateReport(data, showPart2) {
    const d = data || {};
    const errs = [];

    if (num(d.b1_s1_hindi_files) > num(d.b1_s1_total_files)) errs.push("भाग 1(1): हिंदी फाइलें कुल फाइलों से अधिक नहीं हो सकतीं।");
    if (num(d.b1_s2_hindi_minutes) > num(d.b1_s2_total_meetings)) errs.push("भाग 1(2): हिंदी बैठकें कुल बैठकों से अधिक नहीं हो सकतीं।");

    const sum3 = num(d.b1_s3_bilingual) + num(d.b1_s3_english_only) + num(d.b1_s3_hindi_only);
    if (num(d.b1_s3_total_issued) > 0 && sum3 !== num(d.b1_s3_total_issued)) errs.push(`भाग 1(3): जारी दस्तावेजों का योग (${sum3}) कुल (${d.b1_s3_total_issued}) के बराबर होना चाहिए।`);

    const sum4Reply = num(d.b1_s4_hindi_reply) + num(d.b1_s4_english_reply) + num(d.b1_s4_no_reply_needed);
    if (num(d.b1_s4_total_received) > 0 && sum4Reply !== num(d.b1_s4_total_received)) errs.push(`भाग 1(4): कुल उत्तरों का योग (${sum4Reply}) प्राप्त पत्रों (${d.b1_s4_total_received}) के बराबर होना चाहिए।`);

    if (showPart2) {
      if (num(d.b2_comp_trained) > num(d.b2_comp_total)) errs.push("भाग 2(3): प्रशिक्षित कार्मिक कुल कार्मिकों से अधिक नहीं हो सकते।");
      if (num(d.b2_s4_unicode) > num(d.b2_s4_total_laptops)) errs.push("भाग 2(4): यूनिकोड सक्षम लैपटॉप कुल लैपटॉप से अधिक नहीं हो सकते।");
      const pubsTotal = num(d.b2_publications_total);
      const pubsHindi = num(d.b2_publications_hindi);
      const pubsEng = num(d.b2_publications_eng);
      if (pubsHindi + pubsEng > pubsTotal) errs.push("भाग 2(9): हिंदी और अंग्रेजी प्रकाशनों का योग कुल प्रकाशनों से अधिक नहीं हो सकता।");
      if (num(d.b2_books_hindi_expenditure) > num(d.b2_books_expenditure)) errs.push("भाग 2(10): हिंदी पुस्तकों पर व्यय कुल व्यय से अधिक नहीं हो सकता।");
    }
    return errs;
  }

  // ----------------------------------------------------------
  //  DASHBOARD / INBOX
  // ----------------------------------------------------------
  function computeInboxCount(reports, user) {
    const list = reports || [];
    return {
      AAO: list.filter((x) => ["PENDING_AAO", "SAO_RETURNED"].includes(x.status) && x.section_name === user.mapped_section).length,
      SAO: list.filter((x) => x.status === "AAO_APPROVED" && x.section_name === user.mapped_section).length,
      HINDI_CELL: list.filter((x) => x.status === "SAO_APPROVED").length,
    };
  }

  function pendingForRole(reports, user) {
    return computeInboxCount(reports, user)[user.role] || 0;
  }

  // Inbox search: match on section name or acknowledgement id.
  function filterReportsBySearch(reports, search) {
    const list = reports || [];
    return list.filter((x) => !search || (x.section_name && x.section_name.includes(search)) || (x.ackId && x.ackId.includes(search)));
  }

  // Master control search: match on section name or year.
  function filterReportsByQuery(reports, query) {
    const list = reports || [];
    const q = query || "";
    return list.filter((r) => (r.section_name && r.section_name.includes(q)) || (r.year && r.year.includes(q)));
  }

  const sectionColorFor = (index) => SECTION_COLORS[index % SECTION_COLORS.length];

  // ----------------------------------------------------------
  //  CONSOLIDATION
  // ----------------------------------------------------------
  const AGG_PREFIXES = ["b1_", "b2_", "b11_", "b12_", "b13_"];

  // Sum numeric block fields across a set of reports.
  function aggregateReports(reports) {
    const agg = {};
    (reports || []).forEach((r) => {
      Object.keys(r).forEach((k) => {
        if (AGG_PREFIXES.some((p) => k.startsWith(p))) {
          const v = parseFloat(r[k]);
          if (!isNaN(v)) agg[k] = (agg[k] || 0) + v;
        }
      });
    });
    return agg;
  }

  // Percentage of hindi over total as displayed in the consolidated report.
  function hindiPct(hindi, total) {
    return total > 0 ? Math.round((hindi / total) * 100) + "%" : "-";
  }

  function isPart2Filled(quarter, agg) {
    return quarter === "Q4" && Boolean(agg.b2_s1_sub_offices_total || agg.b2_s2_off_total || agg.b2_comp_total);
  }

  return {
    ROLES,
    STATUS,
    WORKFLOW_ACTIONS,
    QUARTERS,
    YEARS,
    SECTION_COLORS,
    workflowActionsFor,
    canActOnReport,
    resubmitStatus,
    genId,
    emptyForm,
    validateReport,
    computeInboxCount,
    pendingForRole,
    filterReportsBySearch,
    filterReportsByQuery,
    sectionColorFor,
    aggregateReports,
    hindiPct,
    isPart2Filled,
  };
});
