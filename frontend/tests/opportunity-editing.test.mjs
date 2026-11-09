import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY_FORM, parseOpportunity, opportunityFields } from "../lib/opportunities/form.ts";
import { EDIT_MESSAGES, normalizeEditableOpportunity, loadOpportunityForEditing, updateOpportunity } from "../lib/opportunities/editing.ts";

const id = "f4444444-4444-4444-8444-444444444444";
const owner = "f1111111-1111-4111-8111-111111111111";
const row = {
  id, professor_id: owner, updated_at: "2026-10-24T00:00:00.123456+00:00", status: "published",
  title: "Imaging assistant", description: "A detailed description of the research project and its purpose.",
  school: "science_and_engineering", department: "Biology", preferred_majors: ["Biology"], keywords: ["microscopy"],
  duration_semesters: 2, eligible_class_years: ["junior", "senior"], positions_available: 2,
  learning_outcomes: "Learn microscopy and analyze image data.", duties_and_skills: "Prepare samples and document the experiments.",
  weekly_hours_min: 8, weekly_hours_max: 10, is_paid: true, pay_amount: "15.50", pay_period: "hour",
};

test("existing listings round-trip through the shared form without losing data", () => {
  const record = normalizeEditableOpportunity(row);
  assert.equal(record.updatedAt, row.updated_at);
  assert.deepEqual(record.values.classYears, ["Junior", "Senior"]);
  assert.equal(record.values.school, "Science and Engineering");
  const parsed = parseOpportunity(record.values, record.status);
  assert.equal(parsed.ok, true);
  const fields = opportunityFields(parsed.value);
  for (const key of Object.keys(fields)) {
    assert.deepEqual(fields[key], key === "pay_amount" ? 15.5 : row[key], key);
  }
});

test("legacy listings load missing details as unanswered and require completion", () => {
  const record = normalizeEditableOpportunity({ ...row, is_paid: null, pay_amount: null, pay_period: null, learning_outcomes: null, duties_and_skills: null, weekly_hours_min: null, weekly_hours_max: null });
  assert.equal(record.values.isPaid, "");
  assert.equal(record.values.hoursFrom, "");
  const parsed = parseOpportunity(record.values, "published");
  assert.equal(parsed.ok, false);
  assert.ok(parsed.errors.learningOutcomes);
  assert.ok(parsed.errors.isPaid);
});

test("shared validation rejects invalid enum and numerical values before saving", () => {
  const valid = normalizeEditableOpportunity(row).values;
  for (const changes of [{ duration: "9" }, { classYears: ["Graduate"] }, { hoursTo: "7" }, { payAmount: "0" }, { isPaid: "" }, { school: "Other" }]) {
    assert.equal(parseOpportunity({ ...valid, ...changes }, "published").ok, false);
  }
  assert.equal(parseOpportunity(EMPTY_FORM, "published").ok, false);
});

test("unpaid edits clear old pay values and single hours stay single", () => {
  const values = { ...normalizeEditableOpportunity(row).values, isPaid: "no", hoursTo: "" };
  const result = parseOpportunity(values, "closed");
  assert.equal(result.ok, true);
  assert.equal(result.value.status, "closed");
  assert.deepEqual([result.value.payAmount, result.value.payPeriod, result.value.weeklyHours.max], [null, null, null]);
});

function clientFor(response) {
  const calls = [];
  const query = {
    select(columns) { calls.push(["select", columns]); return query; },
    eq(field, value) { calls.push(["eq", field, value]); return query; },
    update(fields) { calls.push(["update", fields]); return query; },
    async maybeSingle() { if (response instanceof Error) throw response; return response; },
  };
  return { calls, from(table) { assert.equal(table, "opportunities"); return query; } };
}

test("edit loading filters by both listing and owner", async () => {
  const client = clientFor({ data: row, error: null });
  assert.equal((await loadOpportunityForEditing(client, id, owner)).ok, true);
  assert.deepEqual(client.calls.filter(([method]) => method === "eq"), [["eq", "id", id], ["eq", "professor_id", owner]]);
});

test("invalid, absent, and wrong-owner listings never become editable", async () => {
  const neverQuery = { from() { throw new Error("Invalid ID should not reach the database"); } };
  assert.equal((await loadOpportunityForEditing(neverQuery, "invalid", owner)).message, EDIT_MESSAGES.unavailable);
  for (const data of [null, { ...row, professor_id: "someone-else" }, { ...row, updated_at: null }]) {
    assert.equal((await loadOpportunityForEditing(clientFor({ data, error: null }), id, owner)).message, EDIT_MESSAGES.unavailable);
  }
});

test("editing updates in place with ownership and version filters and excludes protected fields", async () => {
  const existing = normalizeEditableOpportunity(row);
  const input = parseOpportunity({ ...existing.values, title: "Revised imaging assistant" }, "closed").value;
  const client = clientFor({ data: { id, created_at: "2026-10-01T00:00:00Z" }, error: null });
  assert.equal((await updateOpportunity(client, existing, { ...input, id: "forged", professor_id: "forged", updated_at: "forged" })).ok, true);
  const payload = client.calls.find(([method]) => method === "update")[1];
  for (const protectedField of ["id", "professor_id", "status", "created_at", "updated_at", "applications"]) assert.equal(protectedField in payload, false);
  assert.equal(payload.title, "Revised imaging assistant");
  assert.deepEqual(client.calls.filter(([method]) => method === "eq"), [["eq", "id", id], ["eq", "professor_id", owner], ["eq", "updated_at", row.updated_at]]);
});

test("a zero-row update is a conflict instead of a false success", async () => {
  const existing = normalizeEditableOpportunity(row);
  const input = parseOpportunity(existing.values, existing.status).value;
  const result = await updateOpportunity(clientFor({ data: null, error: null }), existing, input);
  assert.deepEqual(result, { ok: false, message: EDIT_MESSAGES.conflict });
});

test("database and network failures provide recoverable messages without raw details", async () => {
  const existing = normalizeEditableOpportunity(row);
  const input = parseOpportunity(existing.values, existing.status).value;
  const error = { code: "42501", message: "Private server details" };
  assert.equal((await updateOpportunity(clientFor({ data: null, error }), existing, input)).message, EDIT_MESSAGES.unavailable);
  assert.equal((await updateOpportunity(clientFor(new Error("Network")), existing, input)).message, EDIT_MESSAGES.saveFailed);
  assert.equal((await loadOpportunityForEditing(clientFor(new Error("Network")), id, owner)).message, EDIT_MESSAGES.loadFailed);
});
