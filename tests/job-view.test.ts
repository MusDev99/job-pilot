import assert from "node:assert/strict";
import { test } from "node:test";
import { filterJobs, hasFilters, jobStats, parseFilters, receivedAgo, safeHttpUrl, syncBanner, toJobViews } from "../lib/job-view.ts";

test("views: newest first, skills split, empty cells become null, titleless rows dropped", () => {
  const views = toJobViews([
    { id: "1", title: "Old", company: null, location: "KL", url: "https://x.example/1", source: "LinkedIn", skills: "Python, AWS", salary: null, seniority: "Senior", receivedAt: "2026-11-01T00:00:00.000Z" },
    { id: "2", title: " New ", company: "Acme", location: null, url: "https://x.example/2", source: null, skills: null, salary: "RM 8,000", seniority: null, receivedAt: "2026-11-03T00:00:00.000Z" },
    { id: "3", title: "", url: "https://x.example/3", receivedAt: "2026-11-04T00:00:00.000Z" },
  ]);
  assert.deepEqual(views.map((v) => v.id), ["2", "1"]);
  assert.deepEqual(views[1]?.skills, ["Python", "AWS"]);
  assert.equal(views[0]?.title, "New");
  assert.equal(views[0]?.source, "Email");
  assert.deepEqual(views[0]?.skills, []);
});

test("links: only http(s) become links", () => {
  assert.equal(safeHttpUrl("https://www.linkedin.com/jobs/view/1"), "https://www.linkedin.com/jobs/view/1");
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("data:text/html,x"), null);
  assert.equal(safeHttpUrl("not a url"), null);
  assert.equal(safeHttpUrl(null), null);
});

test("banner: outcomes and unknown values", () => {
  assert.equal(syncBanner("ok", "3")?.message, "Synced: 3 new jobs added.");
  assert.equal(syncBanner("ok", "1")?.message, "Synced: 1 new job added.");
  assert.match(syncBanner("ok", "0")?.message ?? "", /no new jobs/);
  assert.equal(syncBanner("denied", undefined)?.tone, "error");
  assert.equal(syncBanner("mismatch", undefined)?.tone, "error");
  assert.equal(syncBanner("<script>", undefined), null);
  assert.equal(syncBanner(undefined, undefined), null);
});

const sample = toJobViews([
  { id: "1", title: "Backend Engineer", company: "Grab", location: "Kuala Lumpur", url: "https://x.example/1", source: "LinkedIn", skills: "Node.js, AWS", salary: "RM 12,000", seniority: "Senior", receivedAt: "2026-11-04T00:00:00.000Z" },
  { id: "2", title: "Data Analyst", company: "Acme", location: "Penang", url: "https://x.example/2", source: "JobStreet", skills: "SQL", salary: null, seniority: null, receivedAt: "2026-10-01T00:00:00.000Z" },
]);
const NOW = new Date("2026-11-05T00:00:00.000Z");

test("filters: query, source and salary combine; query also matches skills", () => {
  const none = { q: "", source: "", salaryOnly: false };
  assert.equal(filterJobs(sample, none).length, 2);
  assert.deepEqual(filterJobs(sample, { ...none, q: "AWS" }).map((j) => j.id), ["1"]);
  assert.deepEqual(filterJobs(sample, { ...none, q: "penang" }).map((j) => j.id), ["2"]);
  assert.deepEqual(filterJobs(sample, { ...none, source: "JobStreet" }).map((j) => j.id), ["2"]);
  assert.deepEqual(filterJobs(sample, { ...none, salaryOnly: true }).map((j) => j.id), ["1"]);
  assert.equal(filterJobs(sample, { q: "aws", source: "JobStreet", salaryOnly: false }).length, 0);
});

test("filters from the URL are trimmed, capped and tolerate arrays", () => {
  assert.deepEqual(parseFilters({ q: "  node  ", source: ["A", "B"], salary: "1" }), { q: "node", source: "A", salaryOnly: true });
  assert.equal(parseFilters({ q: "x".repeat(500) }).q.length, 100);
  assert.deepEqual(parseFilters({ salary: "yes" }), { q: "", source: "", salaryOnly: false });
  assert.equal(hasFilters(parseFilters({})), false);
  assert.equal(hasFilters(parseFilters({ q: "a" })), true);
});

test("stats: totals, last 7 days, salary stated, distinct sorted sources", () => {
  assert.deepEqual(jobStats(sample, NOW), { total: 2, lastWeek: 1, withSalary: 1, sources: ["JobStreet", "LinkedIn"] });
  assert.deepEqual(jobStats([], NOW), { total: 0, lastWeek: 0, withSalary: 0, sources: [] });
});

test("receivedAgo: relative for a week, then a date; bad input is empty", () => {
  assert.equal(receivedAgo("2026-11-05T00:00:00.000Z", NOW), "today");
  assert.equal(receivedAgo("2026-11-04T00:00:00.000Z", NOW), "yesterday");
  assert.equal(receivedAgo("2026-11-02T00:00:00.000Z", NOW), "3 days ago");
  assert.equal(receivedAgo("2026-10-01T00:00:00.000Z", NOW), "2026-10-01");
  assert.equal(receivedAgo("nope", NOW), "");
});
