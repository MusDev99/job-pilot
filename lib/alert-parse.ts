// Turns one job alert email into job candidates. Pure: the caller decodes the MIME parts and passes text/html in.
// Only job-board links are trusted (OWASP A10: we never fetch them, we only store them for the user to click).
// Rule-based, best effort: a field we cannot find stays null ("not stated"). Real alert layouts vary, so the
// parser is deliberately generic (link + nearby lines) and is extended per sender from real samples.
import { extractSalary, extractSeniority, extractSkills } from "./job-extract.ts";

export interface AlertEmail {
  messageId: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  receivedAt: string; // ISO
}

export interface JobCandidate {
  messageId: string;
  source: string;
  title: string;
  company: string | null;
  location: string | null;
  url: string;
  skills: string[];
  salary: string | null;
  seniority: string | null;
  receivedAt: string;
}

interface Board {
  source: string;
  host: RegExp;
  /** Returns a clean canonical URL for a job link, or null when the link is not a job. */
  canonical(url: URL): string | null;
}

/** A board whose job links are recognised by host and path. The canonical link is host + path, with no query or tracking. */
function pathBoard(source: string, host: RegExp, path: RegExp): Board {
  return { source, host, canonical: (u) => (path.test(u.pathname) ? `https://${u.hostname}${u.pathname}` : null) };
}

const BOARDS: Board[] = [
  {
    source: "LinkedIn", host: /(^|\.)linkedin\.com$/,
    canonical: (u) => {
      const id = /\/jobs\/view\/(?:[^/?]*-)?(\d{6,})/.exec(u.pathname)?.[1] ?? u.searchParams.get("currentJobId");
      return id ? `https://www.linkedin.com/jobs/view/${id}` : null;
    },
  },
  {
    source: "Indeed", host: /(^|\.)indeed\.com$|(^|\.)indeed\.[a-z.]{2,6}$/,
    canonical: (u) => {
      const jk = u.searchParams.get("jk");
      return jk && /^[A-Za-z0-9]+$/.test(jk) ? `https://${u.hostname}/viewjob?jk=${jk}` : null;
    },
  },
  {
    source: "JobStreet", host: /(^|\.)jobstreet\.[a-z.]{2,8}$/,
    canonical: (u) => (/\/job\/\d+/.test(u.pathname) ? `https://${u.hostname}${u.pathname}` : null),
  },
  {
    source: "Jobsdb", host: /(^|\.)jobsdb\.com$/,
    canonical: (u) => (/\/job\/\d+/.test(u.pathname) ? `https://${u.hostname}${u.pathname}` : null),
  },
  {
    source: "Seek", host: /(^|\.)seek\.com(\.[a-z]{2})?$/,
    canonical: (u) => (/\/job\/\d+/.test(u.pathname) ? `https://${u.hostname}${u.pathname}` : null),
  },
  {
    source: "Glassdoor", host: /(^|\.)glassdoor\.[a-z.]{2,6}$/,
    canonical: (u) => {
      const id = u.searchParams.get("jobListingId");
      return /\/(job-listing|partner\/jobListing)/i.test(u.pathname) && id && /^\d+$/.test(id)
        ? `https://${u.hostname}/job-listing/j?jl=${id}`
        : null;
    },
  },
  {
    source: "Wellfound", host: /(^|\.)wellfound\.com$/,
    canonical: (u) => (/\/jobs\/\d+/.test(u.pathname) ? `https://wellfound.com${u.pathname}` : null),
  },
  // Newer sources: the link shapes below are best guesses from public job URLs and are tightened from real alert samples.
  pathBoard("Hiredly", /(^|\.)hiredly\.com$/, /^\/jobs\/[\w-]{4,}/),
  pathBoard("Maukerja", /(^|\.)maukerja\.(my|com)$/, /^\/(jobs?|job-detail)\/[\w-]{4,}/),
  pathBoard("Jora", /(^|\.)jora\.com$/, /^\/job\/[\w-]{6,}/),
  pathBoard("Kalibrr", /(^|\.)kalibrr\.com$/, /^\/c\/[\w-]+\/jobs\/\d+/),
  pathBoard("Monster", /(^|\.)monster\.[a-z.]{2,6}$/, /^\/job-openings\/[\w-]{6,}/),
  pathBoard("ZipRecruiter", /(^|\.)ziprecruiter\.com$/, /^\/(c\/[^/]+\/job\/|k\/l\/|jobs\/)[\w-]{4,}/i),
  pathBoard("We Work Remotely", /(^|\.)weworkremotely\.com$/, /^\/remote-jobs\/[\w-]{4,}/),
  pathBoard("Remote OK", /(^|\.)remoteok\.com$/, /^\/(remote-jobs\/[\w-]{4,}|l\/\d+)/),
  pathBoard("Michael Page", /(^|\.)michaelpage\.[a-z.]{2,8}$/, /^\/job-detail\/[\w-]{4,}/),
  pathBoard("Hays", /(^|\.)hays\.[a-z.]{2,8}$/, /^\/job-detail\/[\w-]{4,}/),
];

const NAMED: Record<string, string> = {
  nbsp: " ", lt: "<", gt: ">", quot: '"', apos: "'", middot: "·", bull: "•", ndash: "–", mdash: "—",
  hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", copy: "©", reg: "®", trade: "™", euro: "€", pound: "£",
};

/** Decodes the entities alert emails really use. `&amp;` goes last so "&amp;lt;" stays the text "&lt;". */
const decodeEntities = (s: string) =>
  s.replace(/&([a-z]+);/gi, (m, name: string) => NAMED[name.toLowerCase()] ?? m)
    .replace(/&#x([0-9a-f]+);/gi, (m, n: string) => codePoint(parseInt(n, 16), m))
    .replace(/&#(\d+);/g, (m, n: string) => codePoint(Number(n), m))
    .replace(/&amp;/g, "&");

const codePoint = (n: number, fallback: string) => (n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : fallback);

/** HTML fragment -> lines of visible text. */
function toLines(html: string): string[] {
  const text = html
    .replace(/<[^>]*$/, "") // a slice can end inside a tag: drop the unfinished tag instead of showing its attributes
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\s*(br|\/p|\/div|\/tr|\/li|\/h\d|\/td)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(text).split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
}

const GENERIC_TITLE = /^(view|apply|see|open|learn|more|job|jobs|click|here|unsubscribe|manage|easy apply|view job|see job|apply now|view all jobs|see all jobs)\b.{0,20}$/i;
const SEPARATOR = /\s+[·•|]\s+|\s+-\s+|\s+–\s+/;

function boardFor(rawUrl: string): { board: Board; url: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(decodeEntities(rawUrl));
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  for (const board of BOARDS) {
    if (!board.host.test(parsed.hostname)) continue;
    const url = board.canonical(parsed);
    if (url) return { board, url };
  }
  return null;
}

/** Splits "Acme Corp · Kuala Lumpur" (or "Acme - KL") into company and location. */
function companyAndLocation(lines: string[]): { company: string | null; location: string | null } {
  const first = lines.find((l) => l.length >= 2 && l.length <= 120 && !GENERIC_TITLE.test(l));
  if (!first) return { company: null, location: null };
  const [company, ...rest] = first.split(SEPARATOR);
  const location = rest.length > 0 ? rest.join(", ") : (lines[lines.indexOf(first) + 1] ?? null);
  const plausible = (v: string | null | undefined) => (v && v.length <= 80 && !/https?:\/\//.test(v) ? v.trim() : null);
  return { company: plausible(company), location: plausible(location) };
}

/** Job candidates in one email, de-duplicated by canonical URL. Empty for emails that are not job alerts. */
export function parseAlert(email: AlertEmail): JobCandidate[] {
  const found = new Map<string, JobCandidate>();
  const anchor = /<a\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const html = email.html;
  const matches = [...html.matchAll(anchor)];

  matches.forEach((m, i) => {
    const hit = boardFor(m[1] ?? "");
    if (!hit) return;
    const title = toLines(m[2] ?? "").join(" ").trim();
    if (title.length < 3 || title.length > 140 || GENERIC_TITLE.test(title)) return;
    if (found.has(hit.url)) return;
    // The text between this link and the next one holds company, location and sometimes salary.
    const start = (m.index ?? 0) + m[0].length;
    const end = matches[i + 1]?.index ?? Math.min(html.length, start + 1500);
    const nearby = toLines(html.slice(start, Math.min(end, start + 1500)));
    const { company, location } = companyAndLocation(nearby);
    const context = [title, ...nearby].join(" \n ");
    found.set(hit.url, {
      messageId: email.messageId, source: hit.board.source, title, company, location, url: hit.url,
      skills: extractSkills(context), salary: extractSalary(context), seniority: extractSeniority(title),
      receivedAt: email.receivedAt,
    });
  });

  // Plain-text fallback: "Title\nCompany - Location\nhttps://..." blocks, when the email has no usable HTML links.
  if (found.size === 0 && email.text) {
    const lines = email.text.split(/\r?\n/).map((l) => l.trim());
    lines.forEach((line, i) => {
      const url = /https?:\/\/\S+/.exec(line)?.[0]?.replace(/[)>.,]+$/, "");
      const hit = url ? boardFor(url) : null;
      if (!hit || found.has(hit.url)) return;
      const before = lines.slice(Math.max(0, i - 3), i).filter((l) => l && !/https?:\/\//.test(l));
      const title = before[0];
      if (!title || title.length < 3 || title.length > 140 || GENERIC_TITLE.test(title)) return;
      const { company, location } = companyAndLocation(before.slice(1));
      const context = before.join(" \n ");
      found.set(hit.url, {
        messageId: email.messageId, source: hit.board.source, title, company, location, url: hit.url,
        skills: extractSkills(context), salary: extractSalary(context), seniority: extractSeniority(title),
        receivedAt: email.receivedAt,
      });
    });
  }
  return [...found.values()];
}
