import assert from "node:assert/strict";
import { test } from "node:test";
import { safeHttpUrl, syncBanner, toJobViews } from "../lib/job-view.ts";

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
