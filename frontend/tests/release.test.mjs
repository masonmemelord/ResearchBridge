import test from "node:test";
import assert from "node:assert/strict";
import { PILOT_CONTACT_EMAIL, pilotEmailHref, publicSignupEnabled, resumeDemoEnabled, draftSavingEnabled } from "../lib/release.ts";

for (const [name, enabled] of [["self signup", publicSignupEnabled], ["resume demo", resumeDemoEnabled], ["draft saving", draftSavingEnabled]]) {
  test(`${name} cannot be enabled in production`, () => {
    for (const flag of ["true", "false", "", undefined]) assert.equal(enabled(flag, "production"), false);
  });
  test(`${name} requires an explicit development opt-in`, () => {
    for (const flag of ["false", "", "TRUE", "1"]) assert.equal(enabled(flag, "development"), false);
    assert.equal(enabled("true", "development"), true);
  });
}

test("invitation email uses the approved team mailbox", () => {
  assert.equal(PILOT_CONTACT_EMAIL, "TheResearchAmbassadors@wave.tulane.edu");
  const url = new URL(pilotEmailHref());
  assert.equal(url.protocol, "mailto:");
  assert.equal(url.pathname, PILOT_CONTACT_EMAIL);
  assert.equal(url.searchParams.get("subject"), "ResearchBridge pilot invitation request");
  assert.match(url.searchParams.get("body"), /request access/);
});

test("opportunity title is encoded and cannot add an email recipient or header", () => {
  const title = 'Cells & bcc=other@example.com?\r\nCc: other@example.com "<script>"';
  const url = new URL(pilotEmailHref(title));
  assert.equal(url.pathname, PILOT_CONTACT_EMAIL);
  assert.deepEqual([...url.searchParams.keys()], ["subject", "body"]);
  assert.equal(url.searchParams.get("subject"), `ResearchBridge opportunity: ${title.replace(/\r\n/g, " ")}`);
  assert.doesNotMatch(url.searchParams.get("subject"), /[\r\n]/);
  assert.match(url.searchParams.get("body"), /faculty-approved next steps/);
});
