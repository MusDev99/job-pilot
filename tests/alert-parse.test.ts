import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAlert } from "../lib/alert-parse.ts";
import type { AlertEmail } from "../lib/alert-parse.ts";

// SYNTHETIC fixtures that imitate common alert layouts. Replace/extend with real (redacted) samples.
const base = { messageId: "m1", from: "jobalerts-noreply@linkedin.com", subject: "New jobs", text: "", receivedAt: "2026-11-04T08:00:00.000Z" };

const linkedin: AlertEmail = {
  ...base,
  html: `<table><tr><td>
    <a href="https://www.linkedin.com/comm/jobs/view/4012345678/?trackingId=abc&amp;refId=x">Senior Python Engineer</a>
    <div>Acme Sdn Bhd · Kuala Lumpur, Malaysia</div><div>RM 12,000 - 15,000 per month · AWS, Docker</div>
  </td></tr><tr><td>
    <a href="https://www.linkedin.com/jobs/view/senior-python-engineer-at-acme-4012345678?x=1">Senior Python Engineer</a>
    <a href="https://www.linkedin.com/jobs/view/4099999999">Data Analyst</a>
    <div>Globex · Singapore</div>
    <a href="https://www.linkedin.com/comm/jobs/view/4011111111">View job</a>
    <a href="https://www.linkedin.com/psettings/email">Unsubscribe</a>
  </td></tr></table>`,
};

test("linkedin: title, company, location, salary, skills, seniority, canonical url, dedupe", () => {
  const jobs = parseAlert(linkedin);
  assert.equal(jobs.length, 2, "duplicate id, generic link and settings link are dropped");
  const [first, second] = jobs;
  assert.equal(first?.url, "https://www.linkedin.com/jobs/view/4012345678");
  assert.equal(first?.title, "Senior Python Engineer");
  assert.equal(first?.company, "Acme Sdn Bhd");
  assert.equal(first?.location, "Kuala Lumpur, Malaysia");
  assert.equal(first?.salary, "RM 12,000 - 15,000 per month");
  assert.deepEqual(first?.skills, ["Python", "AWS", "Docker"]);
  assert.equal(first?.seniority, "Senior");
  assert.equal(first?.source, "LinkedIn");
  assert.equal(second?.title, "Data Analyst");
  assert.equal(second?.salary, null);
  assert.equal(second?.seniority, null);
});

test("indeed and jobstreet links", () => {
  const jobs = parseAlert({
    ...base,
    html: `<a href="https://my.indeed.com/rc/clk?jk=abc123DEF&amp;fccid=1">Backend Developer</a><div>Initech - Penang</div>
           <a href="https://www.jobstreet.com.my/job/84561234?type=standard">DevOps Engineer</a><div>Hooli</div>`,
  });
  assert.deepEqual(jobs.map((j) => [j.source, j.url]), [
    ["Indeed", "https://my.indeed.com/viewjob?jk=abc123DEF"],
    ["JobStreet", "https://www.jobstreet.com.my/job/84561234"],
  ]);
  assert.equal(jobs[0]?.company, "Initech");
  assert.equal(jobs[0]?.location, "Penang");
});

test("only job-board job links are kept: lookalike hosts, other pages and bad schemes are ignored", () => {
  const jobs = parseAlert({
    ...base,
    html: `<a href="https://linkedin.com.evil.example/jobs/view/4012345678">Fake Job</a>
           <a href="https://www.linkedin.com/feed/">Your feed</a>
           <a href="javascript:alert(1)">Click</a>
           <a href="https://example.com/job/123456">Other Site Job</a>`,
  });
  assert.deepEqual(jobs, []);
});

test("an email with no jobs gives an empty list", () => {
  assert.deepEqual(parseAlert({ ...base, html: "<p>Your receipt</p>", text: "Your receipt" }), []);
});

test("plain-text fallback", () => {
  const jobs = parseAlert({
    ...base,
    html: "",
    text: "Backend Engineer\nInitech - Remote\nhttps://www.linkedin.com/comm/jobs/view/4055555555?trk=1\n\nQA Engineer\nHooli\nhttps://www.seek.com.au/job/77777777",
  });
  assert.equal(jobs.length, 2);
  assert.equal(jobs[0]?.title, "Backend Engineer");
  assert.equal(jobs[0]?.company, "Initech");
  assert.equal(jobs[0]?.location, "Remote");
  assert.equal(jobs[1]?.url, "https://www.seek.com.au/job/77777777");
});

test("html entities in titles are decoded and tags stripped", () => {
  const jobs = parseAlert({ ...base, html: `<a href="https://www.linkedin.com/jobs/view/4012345678"><b>R&amp;D Engineer</b></a>` });
  assert.equal(jobs[0]?.title, "R&D Engineer");
});

test("entities like &middot; are decoded and a tag cut by the slice never leaks into the text", () => {
  const html =
    '<a href="https://www.linkedin.com/jobs/view/4000000001">Dev</a><div>Acme &middot; Kuala Lumpur (Hybrid)</div>' +
    `<td class="job-card-flavor__container" style="-webkit${"x ".repeat(900)}`;
  const [job] = parseAlert({ messageId: "m", from: "jobs-noreply@linkedin.com", subject: "s", text: "", html, receivedAt: "2026-11-05T00:00:00.000Z" });
  assert.equal(job?.company, "Acme");
  assert.equal(job?.location, "Kuala Lumpur (Hybrid)");
});
