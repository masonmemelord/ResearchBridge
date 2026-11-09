// Real Auth + Mailpit + PostgREST checks. Never accepts hosted URLs or keys.
// --manage-local temporarily opens LOCAL signup and starts/stops the local stack;
// config is restored byte-for-byte, and no database reset is performed.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { finishPasswordSetup } from "../../lib/auth/password-setup.ts";

const backend = fileURLToPath(new URL("../../../backend/", import.meta.url));
const configPath = path.join(backend, "supabase/config.toml");
const managed = process.argv.includes("--manage-local");
const original = readFileSync(configPath);
const ids = new Set(), mails = new Set();
const prefix = `rb-auth-${Date.now()}-`;
const A = "first-registrant-A1", B = "verified-owner-B2", C = "recovered-owner-C3";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let api, mailpit, anon, secret, checks = 0;

function cli(args) {
  try { return execFileSync("supabase", args, { cwd: backend, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 180_000 }); }
  catch { throw new Error(`Local Supabase command failed: ${args.join(" ")}. Inspect the local stack; captured output is withheld to protect keys.`); }
}
function localURL(value) {
  const url = new URL(value);
  assert.ok(url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname), "Refusing a non-loopback service");
  return url.origin;
}
async function call(method, endpoint, body, token, admin = false) {
  const response = await fetch(api + endpoint, {
    method, signal: AbortSignal.timeout(15_000),
    headers: { apikey: admin ? secret : anon, Authorization: `Bearer ${token ?? (admin ? secret : anon)}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, json: await response.json().catch(() => null) };
}
function ok(result, label) {
  assert.ok(result.status >= 200 && result.status < 300, `${label}: HTTP ${result.status} (${result.json?.error_code ?? result.json?.code ?? "unknown"})`);
  return result.json;
}
function pass(label) { checks++; console.log(`PASS ${label}`); }
const login = (email, password) => call("POST", "/auth/v1/token?grant_type=password", { email, password });
async function codeFor(email, after = 0) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const response = await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`, { signal: AbortSignal.timeout(5_000) });
    const { messages = [] } = await response.json();
    if (messages.length > after) {
      for (const item of messages) mails.add(item.ID);
      const message = await (await fetch(`${mailpit}/api/v1/message/${messages[0].ID}`)).json();
      const code = `${message.Text ?? ""}\n${message.HTML ?? ""}`.match(/\b(\d{6})\b/)?.[1];
      assert.ok(code, "Email must contain a six-digit code; configure code-only templates");
      return code;
    }
    await delay(250);
  }
  throw new Error("Timed out waiting for synthetic local email");
}
async function signup(tag, password = A, data = {}) {
  const email = `${prefix}${tag}@example.test`;
  const user = ok(await call("POST", "/auth/v1/signup", { email, password, data }), "signup");
  assert.ok(user.id, "signup returned a synthetic user id"); ids.add(user.id);
  await codeFor(email);
  return { email, id: user.id };
}
async function verify(user, type = "email", after = 0) {
  const result = ok(await call("POST", "/auth/v1/verify", { type, email: user.email, token: await codeFor(user.email, after) }), "verify");
  assert.ok(result.access_token && result.refresh_token, "verification returned a session");
  return result;
}
async function setup(session, password, name) {
  const client = createClient(api, anon, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
  const installed = await client.auth.setSession(session);
  assert.equal(installed.error, null, "install verified session");
  const result = await finishPasswordSetup(client, session.user.id, password, name);
  assert.equal(result.ok, true, result.message ?? "finish password setup");
  return result;
}
async function denied(email, password) {
  const result = await login(email, password);
  assert.equal(result.status, 400, "Unproven password must never issue a session");
  assert.equal(result.json?.access_token, undefined, "No password-grant token exists for RLS use");
}

try {
  if (managed) {
    console.log("Preparing local Auth integration stack; existing data is preserved.");
    cli(["stop"]);
    const config = original.toString().replace(/(\[auth\][\s\S]*?\nenable_signup = )false/, "$1true")
      .replace(/email_sent = \d+/, "email_sent = 200")
      .replace(/sign_in_sign_ups = \d+/, "sign_in_sign_ups = 300")
      .replace(/token_verifications = \d+/, "token_verifications = 300");
    writeFileSync(configPath, config);
    cli(["start"]);
    cli(["migration", "up", "--local"]);
  }
  if (process.argv.includes("--database-checks")) {
    console.log(cli(["test", "db", "--local"]));
    console.log(cli(["db", "lint", "--local", "--level", "warning"]));
  }
  const local = JSON.parse(cli(["status", "-o", "json"]));
  api = localURL(local.API_URL); mailpit = localURL(local.INBUCKET_URL ?? "http://127.0.0.1:54324");
  anon = local.ANON_KEY; secret = local.SERVICE_ROLE_KEY;
  assert.ok(anon && secret, "Local keys are required and are never printed");

  // A then B reproduces the original attack using attacker-controlled metadata.
  const victim = await signup("gap", A, { role: "admin", full_name: "First Registrant" });
  await delay(1100);
  ok(await call("POST", "/auth/v1/signup", { email: victim.email, password: B, data: { self_signup: false, role: "professor" } }), "repeat signup");
  const competing = Array.from({ length: 4 }, () => login(victim.email, A));
  const owner = await verify(victim, "email", 1);
  competing.push(...Array.from({ length: 4 }, () => login(victim.email, A)));
  for (const attempt of await Promise.all(competing)) {
    assert.equal(attempt.status, 400, "Concurrent password grant must fail during confirmation");
    assert.equal(attempt.json?.access_token, undefined);
  }
  await denied(victim.email, A); await denied(victim.email, B);
  pass("A and B cannot sign in between verification and password setup; no attacker token is issued");
  assert.equal((await setup(owner, B, "Real Owner")).role, "student");
  await denied(victim.email, A);
  const signed = ok(await login(victim.email, B), "owner login");
  const profiles = ok(await call("GET", "/rest/v1/profiles?select=id,role,full_name", undefined, signed.access_token), "profile read");
  assert.equal(profiles.length, 1); assert.equal(profiles[0].role, "student"); assert.equal(profiles[0].full_name, "Real Owner");
  pass("owner B works, A fails, forged roles are ignored and the owner's name replaces the preregistrant's");
  assert.equal((await call("POST", "/rest/v1/rpc/admin_set_user_role", { target_user_id: victim.id, new_role: "professor" }, signed.access_token)).status, 403);
  assert.equal((await call("POST", "/rest/v1/profiles", { id: victim.id, role: "professor" }, signed.access_token)).status, 403);
  pass("direct API student cannot insert a profile or invoke professor promotion");

  const interrupted = await signup("interrupted");
  const pending = await verify(interrupted);
  await denied(interrupted.email, A);
  const resumed = ok(await call("POST", "/auth/v1/token?grant_type=refresh_token", { refresh_token: pending.refresh_token }), "resume session");
  await setup(resumed, B); await denied(interrupted.email, A); ok(await login(interrupted.email, B), "resumed owner login");
  pass("interrupted setup is safe and can resume using the verified session");

  const lost = await signup("lost-session");
  await verify(lost); await denied(lost.email, A); await delay(1100);
  ok(await call("POST", "/auth/v1/recover", { email: lost.email }), "request recovery");
  const recovered = await verify(lost, "recovery", 1);
  await setup(recovered, C); await denied(lost.email, A); ok(await login(lost.email, C), "recovered owner login");
  pass("lost-session owner recovers by emailed code; A never becomes usable");

  const normal = await signup("normal", B);
  const normalSession = await verify(normal);
  await setup(normalSession, B, "Normal Student"); ok(await login(normal.email, B), "normal student login");
  pass("ordinary student signup without any marker still provisions a student");

  const adminEmail = `${prefix}admin@example.test`;
  const admin = ok(await call("POST", "/auth/v1/admin/users", { email: adminEmail, password: B, email_confirm: true }, undefined, true), "team-created account");
  ids.add(admin.id);
  ok(await call("PATCH", `/rest/v1/profiles?id=eq.${admin.id}`, { role: "admin" }, undefined, true), "trusted admin provisioning");
  const adminSession = ok(await login(adminEmail, B), "team auto-confirm login");
  pass("dashboard-style auto-confirm preserves its password and trusted admin provisioning");

  const unconfirmed = await signup("pending");
  const promotion = await call("POST", "/rest/v1/rpc/admin_set_user_role", { target_user_id: unconfirmed.id, new_role: "professor" }, adminSession.access_token);
  assert.equal(promotion.status, 403);
  pass("even an admin cannot promote an unconfirmed, non-invited account");

  const invitedEmail = `${prefix}invited@example.test`;
  const invite = ok(await call("POST", "/auth/v1/invite", { email: invitedEmail }, undefined, true), "team invite");
  ids.add(invite.id); assert.ok(invite.invited_at, "trusted invite timestamp exists");
  ok(await call("POST", "/rest/v1/rpc/admin_set_user_role", { target_user_id: invite.id, new_role: "professor" }, adminSession.access_token), "activate invited professor");
  const accepted = await verify({ email: invitedEmail }, "invite");
  assert.equal((await setup(accepted, B)).role, "professor"); ok(await login(invitedEmail, B), "professor login");
  pass("team invite → admin activation → invite code → password → professor workspace role");
  await delay(1100);
  const reinvited = ok(await call("POST", "/auth/v1/invite", { email: unconfirmed.email }, undefined, true), "invite existing unconfirmed account");
  assert.equal(reinvited.id, unconfirmed.id, "Invitation preserves the existing account id");
  ok(await call("POST", "/rest/v1/rpc/admin_set_user_role", { target_user_id: unconfirmed.id, new_role: "professor" }, adminSession.access_token), "activate existing invited account");
  const reaccepted = await verify(unconfirmed, "invite", 1);
  await denied(unconfirmed.email, A);
  assert.equal((await setup(reaccepted, B)).role, "professor");
  await denied(unconfirmed.email, A); ok(await login(unconfirmed.email, B), "existing invited professor login");
  pass("inviting an existing unconfirmed account preserves its id and discards the preregistrant's password");

  ok(await call("POST", "/rest/v1/rpc/admin_set_user_role", { target_user_id: victim.id, new_role: "professor" }, adminSession.access_token), "promote existing confirmed student");
  const existingProfile = ok(await call("GET", `/rest/v1/profiles?id=eq.${victim.id}&select=id,role,full_name`, undefined, adminSession.access_token), "promoted profile");
  assert.equal(existingProfile[0].id, victim.id); assert.equal(existingProfile[0].full_name, "Real Owner");
  assert.equal(existingProfile[0].role, "professor");
  pass("confirmed student is promoted in place without replacing its account or profile name");
  console.log(`Auth integration: ${checks} checks passed. Hosted behavior remains unverified.`);
} finally {
  try {
    if (api && secret) {
      for (const id of ids) {
        const profile = await call("DELETE", `/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`, undefined, undefined, true);
        assert.ok(profile.status >= 200 && profile.status < 300, "Remove synthetic local profile before Auth user");
        const result = await call("DELETE", `/auth/v1/admin/users/${encodeURIComponent(id)}`, undefined, undefined, true);
        assert.equal(result.status, 200, "Remove synthetic local user");
      }
      if (ids.size) {
        const project = original.toString().match(/^project_id = "([A-Za-z0-9_-]+)"/m)?.[1];
        assert.ok(project, "Local project id is required for audit cleanup");
        for (const id of ids) assert.match(id, /^[0-9a-f-]{36}$/i);
        const values = [...ids].map(id => `'${id}'`).join(",");
        execFileSync("docker", ["exec", `supabase_db_${project}`, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-c", `delete from private.role_changes where target_user_id in (${values}) or changed_by in (${values})`], { stdio: "pipe" });
      }
      if (mails.size) {
        const result = await fetch(`${mailpit}/api/v1/messages`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ IDs: [...mails] }) });
        assert.ok(result.ok, "Remove only synthetic local messages");
      }
      console.log(`Removed ${ids.size} synthetic local users and their test emails.`);
    }
  } finally {
    if (managed) {
      writeFileSync(configPath, original);
      cli(["stop"]);
      assert.ok(readFileSync(configPath).equals(original), "Restore original config byte-for-byte");
      console.log("Restored config and stopped the local stack; existing data preserved.");
    }
  }
}
