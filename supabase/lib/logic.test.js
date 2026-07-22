"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const logic = require("./logic.js");
const {
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
} = logic;

// ------------------------------------------------------------
//  CONSTANTS
// ------------------------------------------------------------
test("constants expose the expected shape", () => {
  assert.deepEqual(Object.keys(ROLES), ["SECTION", "AAO", "SAO", "HINDI_CELL"]);
  assert.equal(ROLES.SECTION.id, "SECTION");
  assert.equal(STATUS.SUBMITTED.id, "SUBMITTED");
  assert.equal(QUARTERS.length, 4);
  assert.deepEqual(QUARTERS.map((q) => q.id), ["Q1", "Q2", "Q3", "Q4"]);
  assert.equal(YEARS.length, 9);
  assert.equal(YEARS[0], "2022");
  assert.equal(SECTION_COLORS.length, 12);
});

// ------------------------------------------------------------
//  workflowActionsFor / canActOnReport
// ------------------------------------------------------------
test("workflowActionsFor returns configured actions", () => {
  const actions = workflowActionsFor("AAO", "PENDING_AAO");
  assert.equal(actions.length, 2);
  assert.deepEqual(actions.map((a) => a.action), ["AAO_APPROVED", "AAO_RETURNED"]);
  assert.equal(actions, WORKFLOW_ACTIONS.AAO.PENDING_AAO);
});

test("workflowActionsFor returns empty array for unknown role/status", () => {
  assert.deepEqual(workflowActionsFor("AAO", "SUBMITTED"), []);
  assert.deepEqual(workflowActionsFor("NON_ROLE", "PENDING_AAO"), []);
  assert.deepEqual(workflowActionsFor(undefined, undefined), []);
});

test("canActOnReport reflects available actions", () => {
  assert.equal(canActOnReport({ role: "AAO" }, { status: "PENDING_AAO" }), true);
  assert.equal(canActOnReport({ role: "AAO" }, { status: "SUBMITTED" }), false);
  assert.equal(canActOnReport({ role: "SECTION" }, { status: "AAO_RETURNED" }), true);
  assert.equal(canActOnReport({ role: "SECTION" }, { status: "PENDING_AAO" }), false);
});

// ------------------------------------------------------------
//  resubmitStatus
// ------------------------------------------------------------
test("resubmitStatus advances returned reports back into the pipeline", () => {
  assert.equal(resubmitStatus("SECTION", "AAO_RETURNED"), "PENDING_AAO");
  assert.equal(resubmitStatus("AAO", "SAO_RETURNED"), "AAO_APPROVED");
});

test("resubmitStatus leaves other combinations unchanged", () => {
  assert.equal(resubmitStatus("SECTION", "PENDING_AAO"), "PENDING_AAO");
  assert.equal(resubmitStatus("AAO", "AAO_RETURNED"), "AAO_RETURNED");
  assert.equal(resubmitStatus("HINDI_CELL", "SAO_APPROVED"), "SAO_APPROVED");
});

// ------------------------------------------------------------
//  genId
// ------------------------------------------------------------
test("genId produces a RAJ-prefixed identifier", () => {
  const id = genId();
  assert.match(id, /^RAJ-[0-9A-Z]{1,7}$/);
});

test("genId changes over time", () => {
  const first = genId();
  const now = Date.now;
  Date.now = () => now.call(Date) + 10 ** 8; // move far enough for base36 slice to differ
  try {
    assert.notEqual(genId(), first);
  } finally {
    Date.now = now;
  }
});

// ------------------------------------------------------------
//  emptyForm
// ------------------------------------------------------------
test("emptyForm returns sane defaults", () => {
  const form = emptyForm();
  assert.equal(form.year, "2026");
  assert.equal(form.quarter, "Q4");
  assert.equal(form.region, "B");
  assert.equal(form.b1_s9_agenda_hindi, "हाँ");
  assert.equal(form.b2_website_type, "केवल अंग्रेजी");
  assert.match(form.ackId, /^RAJ-/);
  assert.equal(form.b1_s1_total_files, "");
});

test("emptyForm returns a fresh object each call", () => {
  const a = emptyForm();
  const b = emptyForm();
  assert.notEqual(a, b);
  a.year = "1999";
  assert.equal(b.year, "2026");
});

// ------------------------------------------------------------
//  validateReport
// ------------------------------------------------------------
test("validateReport passes for a clean form", () => {
  assert.deepEqual(validateReport(emptyForm(), false), []);
  assert.deepEqual(validateReport({}, false), []);
  assert.deepEqual(validateReport(undefined, false), []);
});

test("validateReport flags hindi files exceeding total", () => {
  const errs = validateReport({ b1_s1_total_files: "5", b1_s1_hindi_files: "6" }, false);
  assert.equal(errs.length, 1);
  assert.match(errs[0], /भाग 1\(1\)/);
});

test("validateReport flags hindi meetings exceeding total", () => {
  const errs = validateReport({ b1_s2_total_meetings: "2", b1_s2_hindi_minutes: "3" }, false);
  assert.equal(errs.length, 1);
  assert.match(errs[0], /भाग 1\(2\)/);
});

test("validateReport enforces section 3 sum equality only when total > 0", () => {
  const bad = validateReport({ b1_s3_total_issued: "10", b1_s3_bilingual: "3", b1_s3_english_only: "3", b1_s3_hindi_only: "3" }, false);
  assert.equal(bad.length, 1);
  assert.match(bad[0], /भाग 1\(3\)/);
  assert.match(bad[0], /\(9\)/); // computed sum interpolated

  const ok = validateReport({ b1_s3_total_issued: "9", b1_s3_bilingual: "3", b1_s3_english_only: "3", b1_s3_hindi_only: "3" }, false);
  assert.deepEqual(ok, []);

  const zeroTotal = validateReport({ b1_s3_total_issued: "0", b1_s3_bilingual: "3" }, false);
  assert.deepEqual(zeroTotal, []);
});

test("validateReport enforces section 4 reply sum", () => {
  const bad = validateReport({ b1_s4_total_received: "10", b1_s4_hindi_reply: "2", b1_s4_english_reply: "2", b1_s4_no_reply_needed: "2" }, false);
  assert.equal(bad.length, 1);
  assert.match(bad[0], /भाग 1\(4\)/);
});

test("validateReport skips part 2 rules unless showPart2", () => {
  const data = { b2_comp_total: "1", b2_comp_trained: "5" };
  assert.deepEqual(validateReport(data, false), []);
  const errs = validateReport(data, true);
  assert.equal(errs.length, 1);
  assert.match(errs[0], /भाग 2\(3\)/);
});

test("validateReport covers all part 2 rules", () => {
  const data = {
    b2_comp_total: "1", b2_comp_trained: "2",
    b2_s4_total_laptops: "1", b2_s4_unicode: "2",
    b2_publications_total: "5", b2_publications_hindi: "4", b2_publications_eng: "4",
    b2_books_expenditure: "100", b2_books_hindi_expenditure: "200",
  };
  const errs = validateReport(data, true);
  assert.equal(errs.length, 4);
  assert.ok(errs.some((e) => /भाग 2\(4\)/.test(e)));
  assert.ok(errs.some((e) => /भाग 2\(9\)/.test(e)));
  assert.ok(errs.some((e) => /भाग 2\(10\)/.test(e)));
});

test("validateReport treats blank/non-numeric values as zero", () => {
  assert.deepEqual(validateReport({ b1_s1_total_files: "", b1_s1_hindi_files: "" }, false), []);
  assert.deepEqual(validateReport({ b1_s1_total_files: "abc", b1_s1_hindi_files: "0" }, false), []);
});

// ------------------------------------------------------------
//  computeInboxCount / pendingForRole
// ------------------------------------------------------------
const SAMPLE_REPORTS = [
  { status: "PENDING_AAO", section_name: "Sec A" },
  { status: "SAO_RETURNED", section_name: "Sec A" },
  { status: "PENDING_AAO", section_name: "Sec B" },
  { status: "AAO_APPROVED", section_name: "Sec A" },
  { status: "SAO_APPROVED", section_name: "Sec C" },
  { status: "SAO_APPROVED", section_name: "Sec D" },
  { status: "SUBMITTED", section_name: "Sec A" },
];

test("computeInboxCount buckets reports per role", () => {
  const counts = computeInboxCount(SAMPLE_REPORTS, { mapped_section: "Sec A" });
  assert.equal(counts.AAO, 2); // PENDING_AAO + SAO_RETURNED in Sec A
  assert.equal(counts.SAO, 1); // AAO_APPROVED in Sec A
  assert.equal(counts.HINDI_CELL, 2); // all SAO_APPROVED regardless of section
});

test("pendingForRole selects the caller's bucket", () => {
  assert.equal(pendingForRole(SAMPLE_REPORTS, { role: "AAO", mapped_section: "Sec A" }), 2);
  assert.equal(pendingForRole(SAMPLE_REPORTS, { role: "SAO", mapped_section: "Sec A" }), 1);
  assert.equal(pendingForRole(SAMPLE_REPORTS, { role: "HINDI_CELL" }), 2);
  assert.equal(pendingForRole(SAMPLE_REPORTS, { role: "SECTION", section_name: "Sec A" }), 0);
  assert.equal(pendingForRole([], { role: "AAO" }), 0);
});

// ------------------------------------------------------------
//  filters
// ------------------------------------------------------------
const SEARCH_REPORTS = [
  { section_name: "लेखा", ackId: "RAJ-ABC", year: "2025" },
  { section_name: "स्थापना", ackId: "RAJ-XYZ", year: "2026" },
  { ackId: "RAJ-NON", year: "2026" },
];

test("filterReportsBySearch matches section name or ackId and returns all when blank", () => {
  assert.equal(filterReportsBySearch(SEARCH_REPORTS, "").length, 3);
  assert.equal(filterReportsBySearch(SEARCH_REPORTS, "लेखा").length, 1);
  assert.equal(filterReportsBySearch(SEARCH_REPORTS, "RAJ-XYZ").length, 1);
  assert.equal(filterReportsBySearch(SEARCH_REPORTS, "RAJ-").length, 3);
  assert.equal(filterReportsBySearch(SEARCH_REPORTS, "nomatch").length, 0);
});

test("filterReportsByQuery matches section name or year", () => {
  assert.equal(filterReportsByQuery(SEARCH_REPORTS, "").length, 3);
  assert.equal(filterReportsByQuery(SEARCH_REPORTS, "2026").length, 2);
  assert.equal(filterReportsByQuery(SEARCH_REPORTS, "स्थापना").length, 1);
  assert.equal(filterReportsByQuery(SEARCH_REPORTS, undefined).length, 3);
});

// ------------------------------------------------------------
//  sectionColorFor
// ------------------------------------------------------------
test("sectionColorFor cycles through palette", () => {
  assert.equal(sectionColorFor(0), SECTION_COLORS[0]);
  assert.equal(sectionColorFor(SECTION_COLORS.length), SECTION_COLORS[0]);
  assert.equal(sectionColorFor(SECTION_COLORS.length + 2), SECTION_COLORS[2]);
});

// ------------------------------------------------------------
//  aggregateReports / hindiPct / isPart2Filled
// ------------------------------------------------------------
test("aggregateReports sums numeric block fields across reports", () => {
  const agg = aggregateReports([
    { b1_s1_total_files: "10", b1_s1_hindi_files: "4", section_name: "ignored", note: "skip" },
    { b1_s1_total_files: "5", b1_s1_hindi_files: "abc", b2_comp_total: "3" },
    { b11_ds_total: "2", b12_bl_total: "1", b13_hq_sanc: "7" },
  ]);
  assert.equal(agg.b1_s1_total_files, 15);
  assert.equal(agg.b1_s1_hindi_files, 4); // non-numeric skipped
  assert.equal(agg.b2_comp_total, 3);
  assert.equal(agg.b11_ds_total, 2);
  assert.equal(agg.b12_bl_total, 1);
  assert.equal(agg.b13_hq_sanc, 7);
  assert.equal(agg.section_name, undefined); // non-block key ignored
  assert.equal(agg.note, undefined);
});

test("aggregateReports handles empty input", () => {
  assert.deepEqual(aggregateReports([]), {});
  assert.deepEqual(aggregateReports(undefined), {});
});

test("hindiPct rounds a percentage or returns dash", () => {
  assert.equal(hindiPct(1, 2), "50%");
  assert.equal(hindiPct(1, 3), "33%");
  assert.equal(hindiPct(0, 0), "-");
  assert.equal(hindiPct(5, 0), "-");
});

test("isPart2Filled requires Q4 and a filled part-2 field", () => {
  assert.equal(isPart2Filled("Q4", { b2_comp_total: 5 }), true);
  assert.equal(isPart2Filled("Q4", { b2_s2_off_total: 1 }), true);
  assert.equal(isPart2Filled("Q4", { b1_s1_total_files: 5 }), false);
  assert.equal(isPart2Filled("Q1", { b2_comp_total: 5 }), false);
  assert.equal(isPart2Filled("Q4", {}), false);
});
