import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAlert } from "../lib/alert-parse.ts";
import { ALERT_SENDER_DOMAINS, alertQuery } from "../lib/gmail.ts";

const mail = (html: string) => parseAlert({ messageId: "m", from: "alerts@example.com", subject: "s", text: "", html, receivedAt: "2026-11-05T00:00:00.000Z" });
const link = (href: string, title = "Backend Engineer") => `<a href="${href}">${title}</a><div>Acme · Kuala Lumpur</div>`;

test("newer job boards are recognised, tracking is dropped, and the source is named", () => {
  const cases: [string, string, string][] = [
    ["https://my.hiredly.com/jobs/backend-engineer-acme?utm_source=email", "Hiredly", "https://my.hiredly.com/jobs/backend-engineer-acme"],
    ["https://www.maukerja.my/jobs/backend-engineer-123", "Maukerja", "https://www.maukerja.my/jobs/backend-engineer-123"],
    ["https://my.jora.com/job/Backend-Engineer-abc123def", "Jora", "https://my.jora.com/job/Backend-Engineer-abc123def"],
    ["https://www.kalibrr.com/c/acme/jobs/1234/backend-engineer?x=1", "Kalibrr", "https://www.kalibrr.com/c/acme/jobs/1234/backend-engineer"],
    ["https://weworkremotely.com/remote-jobs/acme-backend-engineer", "We Work Remotely", "https://weworkremotely.com/remote-jobs/acme-backend-engineer"],
    ["https://www.michaelpage.com.my/job-detail/backend-engineer/ref/jn-1", "Michael Page", "https://www.michaelpage.com.my/job-detail/backend-engineer/ref/jn-1"],
  ];
  for (const [href, source, url] of cases) {
    const [job] = mail(link(href));
    assert.equal(job?.source, source, href);
    assert.equal(job?.url, url, href);
  }
});

test("links on those hosts that are not jobs are ignored", () => {
  assert.equal(mail(link("https://my.hiredly.com/about")).length, 0);
  assert.equal(mail(link("https://www.maukerja.my/unsubscribe")).length, 0);
  assert.equal(mail(link("https://evil.example/jobs/backend-engineer-123")).length, 0);
  assert.equal(mail(link("https://hiredly.com.evil.example/jobs/backend-engineer-123")).length, 0);
});

test("the Gmail search covers every sender and stays limited to them", () => {
  const q = alertQuery(30);
  for (const d of ALERT_SENDER_DOMAINS) assert.ok(q.includes(d), d);
  assert.match(q, /^from:\(.+\) newer_than:30d$/);
});
