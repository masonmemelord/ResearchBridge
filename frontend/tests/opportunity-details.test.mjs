import test from "node:test";
import assert from "node:assert/strict";
import {
  DETAIL_TEXT_MAX,
  DETAIL_TEXT_MIN,
  compensationLabel,
  detailTextError,
  parsePayAmount,
  parseWeeklyHours,
  weeklyHoursLabel,
} from "../lib/opportunities/details.ts";
import { filterOpportunities, EMPTY_FILTERS, normalizeOpportunity } from "../lib/opportunities/published.ts";

test("detail text is required and bounded after trimming", () => {
  assert.match(detailTextError("   ", "what students will learn"), /Describe what students will learn/);
  assert.match(detailTextError("x".repeat(DETAIL_TEXT_MIN - 1), "x"), /Add 1 more character \(/);
  assert.match(detailTextError("x".repeat(DETAIL_TEXT_MIN - 5), "x"), /Add 5 more characters/);
  assert.equal(detailTextError(`  ${"x".repeat(DETAIL_TEXT_MIN)}  `, "x"), undefined);
  assert.equal(detailTextError("x".repeat(DETAIL_TEXT_MAX), "x"), undefined);
  assert.match(detailTextError("x".repeat(DETAIL_TEXT_MAX + 1), "x"), /Shorten by 1 character \(/);
});

test("weekly hours accept a single number or a range and report the failing box", () => {
  assert.deepEqual(parseWeeklyHours("8", ""), { ok: true, value: { min: 8, max: null } });
  assert.deepEqual(parseWeeklyHours(" 8 ", "10"), { ok: true, value: { min: 8, max: 10 } });
  assert.deepEqual(parseWeeklyHours("8", "8"), { ok: true, value: { min: 8, max: null } });
  assert.equal(parseWeeklyHours("", "10").field, "from");
  for (const bad of ["0", "41", "7.5", "abc"]) assert.equal(parseWeeklyHours(bad, "").field, "from", bad);
  for (const bad of ["41", "2.5"]) assert.equal(parseWeeklyHours("8", bad).field, "to", bad);
  const lower = parseWeeklyHours("10", "8");
  assert.equal(lower.field, "to");
  assert.match(lower.message, /at least 10/);
});

test("pay amounts accept dollar formats and reject ambiguous values", () => {
  for (const [input, value] of [["15", 15], ["15.5", 15.5], ["$15.50", 15.5], ["1,500", 1500], ["$ 2,000.00", 2000]]) {
    assert.deepEqual(parsePayAmount(input), { ok: true, value }, input);
  }
  for (const bad of ["", "0", "-5", "15.555", "fifteen", "1e3", "100001"]) {
    assert.equal(parsePayAmount(bad).ok, false, bad);
  }
});

test("labels describe time commitment and compensation for students", () => {
  assert.equal(weeklyHoursLabel(8, 10), "8–10 hours per week");
  assert.equal(weeklyHoursLabel(1, null), "1 hour per week");
  assert.equal(weeklyHoursLabel(null, null), "Not listed");
  assert.equal(compensationLabel(true, 15, "hour"), "Paid · $15 per hour");
  assert.equal(compensationLabel(true, 15.5, "hour"), "Paid · $15.50 per hour");
  assert.equal(compensationLabel(true, 2000, "semester"), "Paid · $2,000 per semester");
  assert.equal(compensationLabel(true, 500, "total"), "Paid · $500 total");
  assert.equal(compensationLabel(false, null, null), "Unpaid");
  assert.equal(compensationLabel(null, null, null), "Not listed");
});

test("published rows carry the new details and older rows fall back cleanly", () => {
  const row = normalizeOpportunity({
    id: "1",
    title: "Imaging assistant",
    learning_outcomes: " Learn confocal microscopy ",
    duties_and_skills: "Prepare samples; Python helpful",
    weekly_hours_min: 8,
    weekly_hours_max: 10,
    is_paid: true,
    pay_amount: "15.50",
    pay_period: "hour",
  });
  assert.equal(row.learningOutcomes, "Learn confocal microscopy");
  assert.deepEqual([row.weeklyHoursMin, row.weeklyHoursMax], [8, 10]);
  assert.deepEqual([row.isPaid, row.payAmount, row.payPeriod], [true, 15.5, "hour"]);
  assert.equal(filterOpportunities([row], { ...EMPTY_FILTERS, query: "confocal python" }).length, 1);

  const legacy = normalizeOpportunity({ id: "2", title: "Older listing" });
  assert.deepEqual(
    [legacy.learningOutcomes, legacy.dutiesAndSkills, legacy.weeklyHoursMin, legacy.isPaid, legacy.payAmount],
    ["", "", null, null, null],
  );

  const unpaidWithStrayAmount = normalizeOpportunity({ id: "3", is_paid: false, pay_amount: 20, pay_period: "unknown" });
  assert.deepEqual([unpaidWithStrayAmount.payAmount, unpaidWithStrayAmount.payPeriod], [null, null]);
});
