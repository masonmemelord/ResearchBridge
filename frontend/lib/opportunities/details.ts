/**
 * Opportunity details added for faculty reviewers: learning outcomes, weekly
 * time commitment, compensation, and expected duties/skills. Limits mirror the
 * check constraints in migration 20261023120000_opportunity_details.sql.
 */

export const DETAIL_TEXT_MIN = 20;
export const DETAIL_TEXT_MAX = 1500;
export const WEEKLY_HOURS_MIN = 1;
export const WEEKLY_HOURS_MAX = 40;
export const PAY_AMOUNT_MAX = 100_000;

export type PayPeriod = "hour" | "semester" | "total";

export const PAY_PERIODS: readonly { value: PayPeriod; label: string }[] = [
  { value: "hour", label: "Per hour" },
  { value: "semester", label: "Per semester" },
  { value: "total", label: "One-time total" },
];

export function isPayPeriod(value: unknown): value is PayPeriod {
  return value === "hour" || value === "semester" || value === "total";
}

/** Required free-text detail, e.g. learning outcomes. `subject` completes "Describe …". */
export function detailTextError(value: string, subject: string): string | undefined {
  const length = value.trim().length;
  if (length === 0) return `Describe ${subject}.`;
  const characters = (count: number) => (count === 1 ? "character" : "characters");
  const missing = DETAIL_TEXT_MIN - length;
  const extra = length - DETAIL_TEXT_MAX;
  if (missing > 0) return `Add ${missing} more ${characters(missing)} (${DETAIL_TEXT_MIN} minimum).`;
  if (extra > 0) return `Shorten by ${extra} ${characters(extra)} (${DETAIL_TEXT_MAX} maximum).`;
  return undefined;
}

export type WeeklyHours = { min: number; max: number | null };

/**
 * Validates "from" (required) and "to" (optional) hours per week. A "to" equal
 * to "from" is stored as a single number.
 */
export function parseWeeklyHours(
  fromInput: string,
  toInput: string,
): { ok: true; value: WeeklyHours } | { ok: false; field: "from" | "to"; message: string } {
  const range = `${WEEKLY_HOURS_MIN} to ${WEEKLY_HOURS_MAX}`;
  const from = fromInput.trim();
  const to = toInput.trim();
  if (!from) return { ok: false, field: "from", message: "Enter the expected hours per week." };
  const min = Number(from);
  if (!Number.isInteger(min) || min < WEEKLY_HOURS_MIN || min > WEEKLY_HOURS_MAX) {
    return { ok: false, field: "from", message: `Enter whole hours from ${range}.` };
  }
  if (!to) return { ok: true, value: { min, max: null } };
  const max = Number(to);
  if (!Number.isInteger(max) || max < WEEKLY_HOURS_MIN || max > WEEKLY_HOURS_MAX) {
    return { ok: false, field: "to", message: `Enter whole hours from ${range}, or leave blank.` };
  }
  if (max < min) return { ok: false, field: "to", message: `Enter at least ${min} hours, or leave blank.` };
  return { ok: true, value: { min, max: max === min ? null : max } };
}

/** Accepts "15", "15.50", "$1,500"; returns dollars or an error message. */
export function parsePayAmount(input: string): { ok: true; value: number } | { ok: false; message: string } {
  const cleaned = input.trim().replace(/^\$/, "").replace(/,/g, "").trim();
  if (!cleaned) return { ok: false, message: "Enter the pay amount in dollars." };
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return { ok: false, message: "Enter a dollar amount such as 15 or 15.50." };
  }
  const value = Number(cleaned);
  if (value <= 0) return { ok: false, message: "Enter an amount greater than $0, or choose No." };
  if (value > PAY_AMOUNT_MAX) return { ok: false, message: `Enter an amount up to $${PAY_AMOUNT_MAX.toLocaleString("en-US")}.` };
  return { ok: true, value };
}

export function weeklyHoursLabel(min: number | null, max: number | null): string {
  if (min === null) return "Not listed";
  return max !== null && max > min ? `${min}–${max} hours per week` : `${min} ${min === 1 ? "hour" : "hours"} per week`;
}

function formatDollars(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function compensationLabel(isPaid: boolean | null, amount: number | null, period: PayPeriod | null): string {
  if (isPaid === null) return "Not listed";
  if (!isPaid) return "Unpaid";
  if (amount === null || period === null) return "Paid";
  const dollars = formatDollars(amount);
  return period === "hour" ? `Paid · ${dollars} per hour` : period === "semester" ? `Paid · ${dollars} per semester` : `Paid · ${dollars} total`;
}
