import assert from "node:assert/strict";
import { test } from "node:test";
import { extractSalary, extractSeniority, extractSkills } from "../lib/job-extract.ts";

test("skills: whole words only, no duplicates", () => {
  assert.deepEqual(extractSkills("We use Python, AWS and Docker. Python daily."), ["Python", "AWS", "Docker"]);
  assert.deepEqual(extractSkills("javascript and node.js"), ["JavaScript", "Node.js"]);
  assert.ok(!extractSkills("JavaScript only").includes("Java"));
  assert.ok(!extractSkills("reactive programming").includes("React"));
});

test("skills: symbols and dotted names", () => {
  assert.deepEqual(extractSkills("C++ and C# and .NET"), ["C#", "C++", ".NET"]);
  assert.ok(extractSkills("CI/CD pipelines on GCP").includes("CI/CD"));
  assert.ok(extractSkills("CI/CD pipelines on GCP").includes("GCP"));
});

test("skills: nothing found means an empty list", () => {
  assert.deepEqual(extractSkills("Great team, great culture"), []);
});

test("salary: ranges, currencies and periods", () => {
  assert.equal(extractSalary("Offer: RM 8,000 - 10,000 per month"), "RM 8,000 - 10,000 per month");
  assert.equal(extractSalary("$120k - $150k"), "$120k - $150k");
  assert.equal(extractSalary("SGD 5,000 to 7,000"), "SGD 5,000 to 7,000");
});

test("salary: not stated when absent or implausible", () => {
  assert.equal(extractSalary("Competitive salary"), null);
  assert.equal(extractSalary("Coffee costs RM 3"), null);
  assert.equal(extractSalary(""), null);
});

test("seniority: from the title only", () => {
  assert.equal(extractSeniority("Senior Backend Engineer"), "Senior");
  assert.equal(extractSeniority("Junior Data Analyst"), "Junior");
  assert.equal(extractSeniority("Engineering Manager"), "Manager");
  assert.equal(extractSeniority("Software Engineer Intern"), "Intern");
  assert.equal(extractSeniority("Software Engineer"), null);
});
