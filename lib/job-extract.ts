// Rule-based job details: skills, salary and seniority from plain text. Pure (no I/O). When unsure it
// returns null / [] ("not stated") instead of guessing (CLAUDE.md: no invented facts, no AI in v1.0.0).

// Canonical name -> aliases (lower case). Matched on word boundaries, so "java" never matches "javascript".
const SKILLS: Record<string, string[]> = {
  Python: ["python"], Java: ["java"], JavaScript: ["javascript", "js", "ecmascript"], TypeScript: ["typescript"],
  "Node.js": ["node.js", "nodejs", "node js"], React: ["react", "react.js", "reactjs"], "Next.js": ["next.js", "nextjs"],
  Vue: ["vue", "vue.js", "vuejs"], Angular: ["angular", "angularjs"], Svelte: ["svelte"], HTML: ["html", "html5"],
  CSS: ["css", "css3"], Tailwind: ["tailwind", "tailwindcss"], "C#": ["c#"], "C++": ["c++"], C: ["c language"],
  Go: ["golang", "go lang"], Rust: ["rust"], PHP: ["php"], Laravel: ["laravel"], Ruby: ["ruby", "ruby on rails", "rails"],
  Kotlin: ["kotlin"], Swift: ["swift", "swiftui"], Flutter: ["flutter"], Dart: ["dart"], "React Native": ["react native"],
  ".NET": [".net", "dotnet", "asp.net"], Spring: ["spring", "spring boot", "springboot"], Django: ["django"],
  Flask: ["flask"], FastAPI: ["fastapi"], Express: ["express", "express.js"], NestJS: ["nestjs", "nest.js"],
  GraphQL: ["graphql"], REST: ["rest", "restful", "rest api"], SQL: ["sql"], PostgreSQL: ["postgresql", "postgres"],
  MySQL: ["mysql"], MongoDB: ["mongodb", "mongo"], Redis: ["redis"], Elasticsearch: ["elasticsearch", "opensearch"],
  BigQuery: ["bigquery"], Kafka: ["kafka"], RabbitMQ: ["rabbitmq"], Spark: ["spark", "pyspark"], Airflow: ["airflow"],
  dbt: ["dbt"], Snowflake: ["snowflake"], Hadoop: ["hadoop"], Pandas: ["pandas"], NumPy: ["numpy"],
  "Machine Learning": ["machine learning", "ml"], "Deep Learning": ["deep learning"], TensorFlow: ["tensorflow"],
  PyTorch: ["pytorch"], LLM: ["llm", "llms", "large language model"], NLP: ["nlp"], "Data Science": ["data science"],
  "Data Engineering": ["data engineering"], "Power BI": ["power bi", "powerbi"], Tableau: ["tableau"], Excel: ["excel"],
  AWS: ["aws", "amazon web services"], Azure: ["azure"], GCP: ["gcp", "google cloud", "google cloud platform"],
  Docker: ["docker"], Kubernetes: ["kubernetes", "k8s"], Terraform: ["terraform"], Ansible: ["ansible"],
  Jenkins: ["jenkins"], "CI/CD": ["ci/cd", "cicd", "ci cd"], Git: ["git", "github", "gitlab"], Linux: ["linux"],
  DevOps: ["devops"], SRE: ["sre"], Serverless: ["serverless", "lambda", "cloud functions"],
  Microservices: ["microservices", "microservice"], Agile: ["agile", "scrum"], Jira: ["jira"], Figma: ["figma"],
  Selenium: ["selenium"], Cypress: ["cypress"], Playwright: ["playwright"], Jest: ["jest"], "Unit Testing": ["unit testing"],
  Security: ["cybersecurity", "appsec", "owasp"], Android: ["android"], iOS: ["ios"], Salesforce: ["salesforce"],
  SAP: ["sap"], "Product Management": ["product management", "product manager"],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const MATCHERS = Object.entries(SKILLS).map(([name, aliases]) => ({
  name,
  // Boundaries: not preceded/followed by a letter or digit (so "c++" works and "react" is not inside "reactive").
  re: new RegExp(`(?<![A-Za-z0-9+#.])(?:${aliases.map(escape).join("|")})(?![A-Za-z0-9+#]|\\.[A-Za-z0-9])`, "i"),
}));

/** Skills found in the text, in dictionary order, no duplicates. */
export function extractSkills(text: string): string[] {
  return MATCHERS.filter((m) => m.re.test(text)).map((m) => m.name);
}

const CURRENCY = "(?:RM|MYR|USD|US\\$|SGD|S\\$|THB|IDR|PHP|VND|INR|AUD|A\\$|GBP|EUR|HKD|HK\\$|\\$|£|€|₹)";
const AMOUNT = "\\d{1,3}(?:[,\\s]\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?\\s?[kK]?";
const PERIOD = "(?:\\s?(?:/|per|a)\\s?(?:month|mth|mo|year|yr|annum|hour|hr|day)|\\s?(?:monthly|annually|yearly|p\\.?a\\.?))?";
const SALARY_RE = new RegExp(
  `(${CURRENCY})\\s?(${AMOUNT})(?:\\s?(?:-|–|—|to)\\s?(?:${CURRENCY}\\s?)?(${AMOUNT}))?${PERIOD}`,
  "i",
);

/** The first salary mention ("RM 8,000 - 10,000 per month"), or null when none is stated. */
export function extractSalary(text: string): string | null {
  const match = SALARY_RE.exec(text);
  if (!match) return null;
  const [whole, , low] = match;
  // A bare "$5" or "RM 3" is a price or noise, not a salary: require a plausible magnitude on the low end.
  const toNumber = (v: string) => {
    const n = Number(v.replace(/[,\s]/g, "").replace(/k$/i, ""));
    return /k$/i.test(v.trim()) ? n * 1000 : n;
  };
  const first = toNumber(low ?? "");
  if (!Number.isFinite(first) || first < 500) return null;
  return whole.replace(/\s+/g, " ").trim();
}

const SENIORITY: { label: string; re: RegExp }[] = [
  { label: "Intern", re: /\b(intern|internship|trainee|graduate programme|graduate program)\b/i },
  { label: "Principal", re: /\b(principal|staff engineer|distinguished|architect)\b/i },
  { label: "Manager", re: /\b(engineering manager|manager|head of|director|vp)\b/i },
  { label: "Lead", re: /\b(lead|team lead|tech lead)\b/i },
  { label: "Senior", re: /\b(senior|sr\.?)\b/i },
  { label: "Junior", re: /\b(junior|jr\.?|entry[- ]level|associate|fresh graduate)\b/i },
  { label: "Mid", re: /\b(mid[- ]level|intermediate)\b/i },
];

/** Seniority from the job title (not the description, which mentions "senior stakeholders" and the like). */
export function extractSeniority(title: string): string | null {
  return SENIORITY.find((s) => s.re.test(title))?.label ?? null;
}
