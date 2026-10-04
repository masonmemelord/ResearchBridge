import test from "node:test";
import assert from "node:assert/strict";
import {
  APPLICATION_MESSAGE_MAX,
  APPLICATION_MESSAGES,
  applicantEmailHref,
  applicationMessageError,
  applyErrorMessage,
  formatDate,
  normalizeMyApplications,
  normalizeProfessorOpportunities,
  statusLabel,
  submitApplication,
} from "../lib/applications/applications.ts";

test("the optional message allows empty text and the full limit", () => {
  assert.equal(applicationMessageError(""), undefined);
  assert.equal(applicationMessageError("x".repeat(APPLICATION_MESSAGE_MAX)), undefined);
  assert.equal(applicationMessageError(`  ${"x".repeat(APPLICATION_MESSAGE_MAX)}  `), undefined);
  assert.match(applicationMessageError("x".repeat(APPLICATION_MESSAGE_MAX + 1)), /1000 characters/);
});

test("database errors map to recoverable student messages", () => {
  assert.equal(applyErrorMessage({ code: "23505" }), APPLICATION_MESSAGES.duplicate);
  assert.equal(applyErrorMessage({ code: "42501" }), APPLICATION_MESSAGES.notAllowed);
  assert.equal(applyErrorMessage({ code: "PGRST205" }), APPLICATION_MESSAGES.network);
  assert.equal(applyErrorMessage(null), APPLICATION_MESSAGES.network);
});

test("a student's applications are keyed by opportunity and malformed rows are skipped", () => {
  const map = normalizeMyApplications([
    { id: "a1", opportunity_id: "o1", created_at: "2026-10-04T12:00:00Z" },
    { id: "", opportunity_id: "o2" },
    null,
    "junk",
  ]);
  assert.deepEqual([...map.keys()], ["o1"]);
  assert.equal(map.get("o1").id, "a1");
});

test("professor listings normalize applicants newest first and drop rows without email", () => {
  const [listing, older] = normalizeProfessorOpportunities([
    {
      id: "o-old",
      title: "Older",
      status: "draft",
      created_at: "2026-09-01T00:00:00Z",
      positions_available: 0,
      applications: [],
    },
    {
      id: "o-new",
      title: "  Newer  ",
      status: "published",
      created_at: "2026-10-01T00:00:00Z",
      positions_available: 2,
      applications: [
        { id: "a1", student_name: "First", student_email: "first@test.edu", message: "  ", created_at: "2026-10-02T00:00:00Z" },
        { id: "a2", student_name: "", student_email: "second@test.edu", message: "Hi", created_at: "2026-10-03T00:00:00Z" },
        { id: "a3", student_name: "No email", student_email: null, created_at: "2026-10-04T00:00:00Z" },
      ],
    },
  ]);
  assert.equal(listing.id, "o-new");
  assert.equal(listing.title, "Newer");
  assert.equal(listing.positionsAvailable, 2);
  assert.deepEqual(listing.applicants.map((a) => a.id), ["a2", "a1"]);
  assert.equal(listing.applicants[0].name, null);
  assert.equal(listing.applicants[1].message, null);
  assert.equal(older.positionsAvailable, null);
  assert.deepEqual(older.applicants, []);
});

test("statuses and dates have readable fallbacks", () => {
  assert.equal(statusLabel("published"), "Published");
  assert.equal(statusLabel("archived"), "Unknown status");
  assert.equal(formatDate("not a date"), "");
  assert.match(formatDate("2026-10-04T15:00:00Z"), /Oct \d+, 2026/);
});

test("applicant email links keep the address and cannot add recipients or headers", () => {
  const url = new URL(applicantEmailHref("student+lab@tulane.edu", "Lab\r\nBcc: x@evil.test"));
  assert.equal(url.protocol, "mailto:");
  assert.equal(decodeURIComponent(url.pathname), "student+lab@tulane.edu");
  assert.deepEqual([...url.searchParams.keys()], ["subject"]);
  assert.doesNotMatch(url.searchParams.get("subject"), /[\r\n]/);
});

test("an over-long message is rejected before any network call", async () => {
  const client = {
    from() {
      throw new Error("must not be called");
    },
  };
  const result = await submitApplication(client, {
    opportunityId: "o1",
    studentId: "s1",
    message: "x".repeat(APPLICATION_MESSAGE_MAX + 1),
  });
  assert.equal(result.ok, false);
});

test("the insert sends only the opportunity, student, and trimmed message", async () => {
  let inserted;
  const client = {
    from(table) {
      assert.equal(table, "applications");
      return {
        insert(row) {
          inserted = row;
          return {
            select() {
              return {
                single: async () => ({
                  data: { id: "a1", opportunity_id: "o1", created_at: "2026-10-04T00:00:00Z" },
                  error: null,
                }),
              };
            },
          };
        },
      };
    },
  };
  const result = await submitApplication(client, { opportunityId: "o1", studentId: "s1", message: "  " });
  assert.deepEqual(inserted, { opportunity_id: "o1", student_id: "s1", message: null });
  assert.equal(result.ok, true);
  assert.equal(result.value.opportunityId, "o1");
});
