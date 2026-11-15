import test from "node:test";
import assert from "node:assert/strict";
import { finishPasswordSetup } from "../lib/auth/password-setup.ts";

function client({ user = { id: "owner", email_confirmed_at: "2026-11-08" }, passwordError = null, profileError = null } = {}) {
  const calls = [];
  const query = {
    update(value) { calls.push(["profile", value]); return query; },
    eq(key, value) { calls.push([key, value]); return query; },
    select() { return query; },
    async single() { return { data: profileError ? null : { id: "owner" }, error: profileError }; },
    async maybeSingle() { return { data: { role: "student" }, error: null }; },
  };
  return { calls, auth: {
    async getUser() { return { data: { user }, error: null }; },
    async updateUser(value) { calls.push(["password", value]); return { error: passwordError }; },
  }, from(table) { assert.equal(table, "profiles"); return query; } };
}

test("password ownership is established before saving the verified owner's name", async () => {
  const c = client();
  assert.deepEqual(await finishPasswordSetup(c, "owner", "owner-passphrase", "  Real\tOwner "), { ok: true, role: "student" });
  assert.deepEqual(c.calls.slice(0, 3), [["password", { password: "owner-passphrase" }], ["profile", { full_name: "Real Owner" }], ["id", "owner"]]);
});

test("a changed or unconfirmed identity never receives a password update", async () => {
  for (const user of [null, { id: "different", email_confirmed_at: "today" }, { id: "owner", email_confirmed_at: null }]) {
    const c = client({ user });
    assert.equal((await finishPasswordSetup(c, "owner", "owner-passphrase")).ok, false);
    assert.equal(c.calls.length, 0);
  }
});

test("idempotent retry accepts only same_password, not other update failures", async () => {
  assert.equal((await finishPasswordSetup(client({ passwordError: { code: "same_password" } }), "owner", "owner-passphrase")).ok, true);
  for (const code of ["weak_password", "session_not_found", "unexpected_failure"]) {
    const c = client({ passwordError: { code, message: "private server details" } });
    const result = await finishPasswordSetup(c, "owner", "owner-passphrase", "Real Owner");
    assert.equal(result.ok, false);
    assert.doesNotMatch(result.message, /private server details/);
    assert.equal(c.calls.length, 1, "profile is not changed after a failed password write");
  }
});

test("a lost profile response is recoverable without reporting setup complete", async () => {
  const result = await finishPasswordSetup(client({ profileError: { code: "network" } }), "owner", "owner-passphrase", "Real Owner");
  assert.equal(result.ok, false);
  assert.match(result.message, /password is set/);
});

test("invalid passwords and names never reach Auth", async () => {
  for (const [password, name] of [["short", "Owner"], ["é".repeat(40), "Owner"], ["long-password", ""], ["long-password", "x".repeat(121)]]) {
    const c = client();
    assert.equal((await finishPasswordSetup(c, "owner", password, name)).ok, false);
    assert.equal(c.calls.length, 0);
  }
});

test("recovery does not overwrite an existing profile name", async () => {
  const c = client();
  assert.equal((await finishPasswordSetup(c, "owner", "owner-passphrase")).ok, true);
  assert.equal(c.calls.some(([kind]) => kind === "profile"), false);
});
