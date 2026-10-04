import test from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_MESSAGES,
  filterAdminOpportunities,
  filterUsers,
  normalizeAdminOpportunities,
  normalizeAdminUsers,
  setOpportunityStatus,
  setUserRole,
} from "../lib/admin/admin.ts";
import { ROLE_HOME } from "../lib/auth/profile.ts";

test("every role has a home page, and admins land on the dashboard", () => {
  assert.equal(ROLE_HOME.admin, "/admin");
  assert.equal(ROLE_HOME.professor, "/professor/opportunities");
  assert.equal(ROLE_HOME.student, "/opportunities");
});

const users = normalizeAdminUsers([
  { id: "u1", email: "ada@tulane.edu", full_name: "Ada Admin", role: "admin", created_at: "2026-10-01", last_sign_in_at: null },
  { id: "u2", email: "pat@tulane.edu", full_name: "Pat Professor", role: "professor", created_at: "2026-10-02" },
  { id: "u3", email: "sam@tulane.edu", full_name: null, role: "student", created_at: "2026-10-03" },
  { id: "u4", email: "new@tulane.edu", full_name: "", role: null, created_at: "2026-10-04" },
  { id: "u5", email: "odd@tulane.edu", role: "superuser" },
  { email: "missing-id@tulane.edu" },
]);

test("accounts normalize roles and skip rows without an id", () => {
  assert.deepEqual(users.map((u) => u.id), ["u1", "u2", "u3", "u4", "u5"]);
  assert.equal(users[3].role, null);
  assert.equal(users[3].fullName, null);
  assert.equal(users[4].role, null, "unknown roles are treated as needing a role");
  assert.equal(users[0].lastSignInAt, null);
});

test("people search matches name or email and filters by role", () => {
  assert.deepEqual(filterUsers(users, "pat", "all").map((u) => u.id), ["u2"]);
  assert.deepEqual(filterUsers(users, "SAM@TULANE", "all").map((u) => u.id), ["u3"]);
  assert.deepEqual(filterUsers(users, "", "none").map((u) => u.id), ["u4", "u5"]);
  assert.deepEqual(filterUsers(users, "", "professor").map((u) => u.id), ["u2"]);
  assert.deepEqual(filterUsers(users, "tulane ada", "admin").map((u) => u.id), ["u1"]);
});

test("postings carry the professor name and filter by status and text", () => {
  const postings = normalizeAdminOpportunities([
    { id: "o1", title: "Survey lab", status: "published", created_at: "2026-10-02", professor: { full_name: "Pat Professor" }, applications: [] },
    { id: "o2", title: "Archive work", status: "closed", created_at: "2026-10-03", professor: null, applications: [
      { id: "a1", student_email: "sam@tulane.edu", created_at: "2026-10-03" },
    ] },
  ]);
  assert.equal(postings[0].id, "o2", "newest first");
  assert.equal(postings[0].professorName, null);
  assert.equal(postings[0].applicants.length, 1);
  assert.equal(postings[1].professorName, "Pat Professor");
  assert.deepEqual(filterAdminOpportunities(postings, "pat", "all").map((p) => p.id), ["o1"]);
  assert.deepEqual(filterAdminOpportunities(postings, "", "closed").map((p) => p.id), ["o2"]);
});

function rpcClient(error) {
  const calls = [];
  return {
    calls,
    rpc: async (name, args) => {
      calls.push({ name, args });
      return { data: null, error };
    },
  };
}

test("role changes call the admin function with only the target and role", async () => {
  const client = rpcClient(null);
  const result = await setUserRole(client, "u4", "professor");
  assert.equal(result.ok, true);
  assert.deepEqual(client.calls, [{ name: "admin_set_user_role", args: { target_user_id: "u4", new_role: "professor" } }]);
});

test("database refusals become specific admin messages", async () => {
  const own = await setUserRole(rpcClient({ code: "42501", message: "admins cannot change their own role" }), "u1", "student");
  assert.equal(own.ok ? "" : own.message, ADMIN_MESSAGES.ownRole);
  const otherAdmin = await setUserRole(rpcClient({ code: "42501", message: "admin roles are managed in the database only" }), "u1", "student");
  assert.equal(otherAdmin.ok ? "" : otherAdmin.message, ADMIN_MESSAGES.adminRole);
  const notAdmin = await setOpportunityStatus(rpcClient({ code: "42501", message: "admin access required" }), "o1", "closed");
  assert.equal(notAdmin.ok ? "" : notAdmin.message, ADMIN_MESSAGES.forbidden);
  const gone = await setOpportunityStatus(rpcClient({ code: "P0002", message: "opportunity not found" }), "o1", "closed");
  assert.equal(gone.ok ? "" : gone.message, ADMIN_MESSAGES.notFound);
});
