import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const ROLES = ["product-owner", "senior-architect", "security-auditor", "qa"];
const NO_EDIT = ["security-auditor", "qa"];

const read = (path: string): string => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function frontMatter(text: string): Record<string, string> {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  assert.ok(match, "front matter missing");
  const fields: Record<string, string> = {};
  for (const line of (match[1] ?? "").split("\n")) {
    const at = line.indexOf(":");
    if (at > 0) fields[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return fields;
}

const toolsOf = (role: string): string[] =>
  (frontMatter(read(`.claude/agents/${role}.md`)).tools ?? "").split(",").map((t) => t.trim());

test("agents: each role file has a matching name, a description and a tool list", () => {
  for (const role of ROLES) {
    const fields = frontMatter(read(`.claude/agents/${role}.md`));
    assert.equal(fields.name, role);
    assert.ok((fields.description ?? "").length > 40, `${role}: description too short`);
    assert.ok(toolsOf(role).length > 0, `${role}: no tools`);
  }
});

test("agents: only the Senior Architect can both edit code and run commands", () => {
  const po = toolsOf("product-owner");
  assert.ok(!po.includes("Bash") && !po.includes("Edit"), "product-owner writes specs only");
  for (const role of NO_EDIT) {
    const tools = toolsOf(role);
    assert.ok(!tools.includes("Edit") && !tools.includes("Write"), `${role} must not edit`);
  }
});

test("team command: names every role, both CTO gates and the round budget", () => {
  const command = read(".claude/commands/team.md");
  for (const role of ["Product Owner", "Senior Architect", "QA", "Security Auditor"]) {
    assert.ok(command.includes(role), `missing ${role}`);
  }
  assert.match(command, /Gate 1 \(CTO\)/);
  assert.match(command, /Gate 2 \(CTO\)/);
  assert.match(command, /3 rounds/);
  assert.match(command, /resume <slug>/);
  assert.match(command, /runs\.md/);
});

test("qa: reviews with the shared code-review skill and blocks on major findings", () => {
  const qa = read(".claude/agents/qa.md");
  const skill = ".agents/skills/code-review/SKILL.md";
  assert.ok(qa.includes(skill), "qa must name the shared skill");
  assert.match(read(skill), /^---\nname: code-review\n/);
  assert.match(qa, /Any 🔴 or 🟠 finding means `CHANGES`/);
});

test("security: checks tenant isolation, scopes and the dependency audit", () => {
  const sec = read(".claude/agents/security-auditor.md");
  assert.match(sec, /Tenant isolation/);
  assert.match(sec, /gmail\.readonly/);
  assert.match(sec, /npm audit --omit=dev/);
});

test("settings: secrets and main are off limits", () => {
  const deny: string[] = JSON.parse(read(".claude/settings.json")).permissions.deny;
  assert.ok(deny.includes("Read(./.env)"));
  assert.ok(deny.includes("Read(./credentials/**)"));
  assert.ok(deny.includes("Bash(git push origin main:*)"));
  assert.ok(deny.includes("Bash(gh pr merge:*)"));
  assert.ok(!deny.some((rule) => rule.includes(".env.example")));
});
