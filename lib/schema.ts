// Column order of every tab, defined once (row 1 of each tab = header). Tenant tables belong to one user:
// they must start with `id`, `userId` and are only reachable through `lib/store.ts`.
export const USER_COLUMNS = [
  "id", "email", "googleSub", "name", "picture", "active", "createdAt", "lastLoginAt",
] as const;

export const TENANT_TABLES = {
  // One row per job found in an alert email. `skills` is comma-separated; empty cells mean "not stated".
  jobs: [
    "id", "userId", "messageId", "source", "title", "company", "location", "url", "skills", "salary", "seniority",
    "receivedAt", "createdAt", "updatedAt",
  ],
  search_profiles: [
    "id", "userId", "name", "keywords", "location", "remoteOnly", "minSalary", "active", "createdAt", "updatedAt",
  ],
} as const;

export type TenantTable = keyof typeof TENANT_TABLES;
export type TableName = TenantTable | "users";

export const TABLES: Record<TableName, readonly string[]> = { users: USER_COLUMNS, ...TENANT_TABLES };
