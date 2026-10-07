import { makeExecutableSchema } from "@graphql-tools/schema";
import { GraphQLError } from "graphql";
import { SEVERITY_ORDER } from "../domain/cvss";
import { generateFindings, PROJECTS, type Finding, type Status } from "../domain/seed";

export const typeDefs = /* GraphQL */ `
  enum Severity { CRITICAL HIGH MEDIUM LOW }
  enum Status { OPEN IN_PROGRESS RISK_ACCEPTED FALSE_POSITIVE FIXED }
  enum Source { SAST DAST SCA }
  enum SortField { CVSS SEVERITY DETECTED_AT STATUS PROJECT }
  enum SortDirection { ASC DESC }

  type Project { id: ID! name: String! }
  type Cwe { id: String! name: String! }
  type StatusChange { from: Status! to: Status! at: String! justification: String }

  type Finding {
    id: ID!
    cwe: Cwe!
    owasp: String!
    source: Source!
    severity: Severity!
    cvssScore: Float!
    cvssVector: String!
    status: Status!
    project: Project!
    location: String!
    detectedAt: String!
    updatedAt: String!
    history: [StatusChange!]!
  }

  input FindingFilter {
    severities: [Severity!]
    statuses: [Status!]
    sources: [Source!]
    projectIds: [ID!]
    "Códigos OWASP Top 10, ex.: A03:2021"
    owasp: [String!]
    "Busca no ID, CWE, título da CWE e local"
    search: String
  }

  type PageInfo { hasNextPage: Boolean! endCursor: String }
  type FindingEdge { cursor: String! node: Finding! }
  type FindingConnection { edges: [FindingEdge!]! pageInfo: PageInfo! totalCount: Int! }

  type CountBy { key: String! count: Int! }
  type Summary {
    total: Int!
    open: Int!
    criticalOpen: Int!
    "Média de dias entre detecção e correção (só achados FIXED)"
    meanTimeToFixDays: Float
    bySeverity: [CountBy!]!
    byStatus: [CountBy!]!
    byOwasp: [CountBy!]!
  }

  type Query {
    projects: [Project!]!
    findings(filter: FindingFilter, sort: SortField = CVSS, direction: SortDirection = DESC, first: Int = 20, after: String): FindingConnection!
    finding(id: ID!): Finding
    summary(filter: FindingFilter): Summary!
  }

  type Mutation {
    "RISK_ACCEPTED e FALSE_POSITIVE exigem justificativa (mín. 10 caracteres)"
    updateFindingStatus(id: ID!, status: Status!, justification: String): Finding!
  }
`;

export interface FindingFilter {
  severities?: string[] | null;
  statuses?: string[] | null;
  sources?: string[] | null;
  projectIds?: string[] | null;
  owasp?: string[] | null;
  search?: string | null;
}

type SortField = "CVSS" | "SEVERITY" | "DETECTED_AT" | "STATUS" | "PROJECT";

const OPEN_STATUSES: Status[] = ["OPEN", "IN_PROGRESS"];
const STATUS_ORDER: Record<Status, number> = { OPEN: 0, IN_PROGRESS: 1, RISK_ACCEPTED: 2, FALSE_POSITIVE: 3, FIXED: 4 };
const projectName = (id: string) => PROJECTS.find((p) => p.id === id)?.name ?? id;

/** Cursor opaco: base64 do índice na lista ordenada. */
export const encodeCursor = (i: number) => btoa(`idx:${i}`);
export function decodeCursor(c: string): number {
  const m = /^idx:(\d+)$/.exec(atob(c));
  if (!m) throw new GraphQLError("Cursor inválido", { extensions: { code: "BAD_USER_INPUT" } });
  return Number(m[1]);
}

export function applyFilter(list: Finding[], f?: FindingFilter | null): Finding[] {
  if (!f) return list;
  const q = f.search?.trim().toLowerCase();
  return list.filter(
    (x) =>
      (!f.severities?.length || f.severities.includes(x.severity)) &&
      (!f.statuses?.length || f.statuses.includes(x.status)) &&
      (!f.sources?.length || f.sources.includes(x.source)) &&
      (!f.projectIds?.length || f.projectIds.includes(x.projectId)) &&
      (!f.owasp?.length || f.owasp.includes(x.owasp)) &&
      (!q || [x.id, x.cwe.id, x.cwe.name, x.location].some((s) => s.toLowerCase().includes(q))),
  );
}

function comparator(field: SortField): (a: Finding, b: Finding) => number {
  switch (field) {
    case "SEVERITY": return (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.cvssScore - b.cvssScore;
    case "DETECTED_AT": return (a, b) => a.detectedAt.localeCompare(b.detectedAt);
    case "STATUS": return (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    case "PROJECT": return (a, b) => projectName(a.projectId).localeCompare(projectName(b.projectId), "pt-BR");
    default: return (a, b) => a.cvssScore - b.cvssScore;
  }
}

const countBy = (list: Finding[], key: (f: Finding) => string) => {
  const m = new Map<string, number>();
  for (const f of list) m.set(key(f), (m.get(key(f)) ?? 0) + 1);
  return [...m].map(([k, count]) => ({ key: k, count }));
};

/** Armazena só as mudanças de triagem; os achados em si são regenerados pela semente. */
export interface TriageStorage {
  load(): Record<string, Pick<Finding, "status" | "updatedAt" | "history">>;
  save(data: Record<string, Pick<Finding, "status" | "updatedAt" | "history">>): void;
}

export const memoryStorage = (): TriageStorage => {
  let data = {};
  return { load: () => data, save: (d) => void (data = d) };
};

export function createSchema(opts: { storage?: TriageStorage; now?: () => Date } = {}) {
  const storage = opts.storage ?? memoryStorage();
  const now = opts.now ?? (() => new Date());
  const overrides = storage.load();
  const db = generateFindings().map((f) => ({ ...f, ...overrides[f.id] }));

  const resolvers = {
    Finding: { project: (f: Finding) => ({ id: f.projectId, name: projectName(f.projectId) }) },
    Query: {
      projects: () => PROJECTS,
      finding: (_: unknown, { id }: { id: string }) => db.find((f) => f.id === id) ?? null,
      findings: (
        _: unknown,
        a: { filter?: FindingFilter; sort: SortField; direction: "ASC" | "DESC"; first: number; after?: string | null },
      ) => {
        if (a.first < 1 || a.first > 100) throw new GraphQLError("first deve ficar entre 1 e 100", { extensions: { code: "BAD_USER_INPUT" } });
        const cmp = comparator(a.sort);
        const dir = a.direction === "ASC" ? 1 : -1;
        // desempate pelo ID para a ordem ser estável entre páginas
        const sorted = applyFilter(db, a.filter).sort((x, y) => dir * cmp(x, y) || x.id.localeCompare(y.id));
        const start = a.after ? decodeCursor(a.after) + 1 : 0;
        const slice = sorted.slice(start, start + a.first);
        return {
          totalCount: sorted.length,
          edges: slice.map((node, i) => ({ cursor: encodeCursor(start + i), node })),
          pageInfo: {
            hasNextPage: start + a.first < sorted.length,
            endCursor: slice.length ? encodeCursor(start + slice.length - 1) : null,
          },
        };
      },
      summary: (_: unknown, { filter }: { filter?: FindingFilter }) => {
        const list = applyFilter(db, filter);
        const open = list.filter((f) => OPEN_STATUSES.includes(f.status));
        // o MTTR ignora o filtro de status (senão some quando a tela mostra só os abertos)
        const fixed = applyFilter(db, { ...filter, statuses: null }).filter((f) => f.status === "FIXED");
        const days = fixed.map((f) => (Date.parse(f.updatedAt) - Date.parse(f.detectedAt)) / 86_400_000);
        return {
          total: list.length,
          open: open.length,
          criticalOpen: open.filter((f) => f.severity === "CRITICAL").length,
          meanTimeToFixDays: days.length ? Math.round((days.reduce((s, d) => s + d, 0) / days.length) * 10) / 10 : null,
          bySeverity: countBy(list, (f) => f.severity),
          byStatus: countBy(list, (f) => f.status),
          byOwasp: countBy(list, (f) => f.owasp).sort((x, y) => x.key.localeCompare(y.key)),
        };
      },
    },
    Mutation: {
      updateFindingStatus: (_: unknown, a: { id: string; status: Status; justification?: string | null }) => {
        const f = db.find((x) => x.id === a.id);
        if (!f) throw new GraphQLError("Achado não encontrado", { extensions: { code: "NOT_FOUND" } });
        const justification = a.justification?.trim() || null;
        if ((a.status === "RISK_ACCEPTED" || a.status === "FALSE_POSITIVE") && (!justification || justification.length < 10)) {
          throw new GraphQLError("Justificativa obrigatória (mín. 10 caracteres)", { extensions: { code: "JUSTIFICATION_REQUIRED" } });
        }
        if (f.status === a.status) return f;
        const at = now().toISOString();
        f.history = [...f.history, { from: f.status, to: a.status, at, justification }];
        f.status = a.status;
        f.updatedAt = at;
        storage.save({ ...storage.load(), [f.id]: { status: f.status, updatedAt: f.updatedAt, history: f.history } });
        return f;
      },
    },
  };

  return makeExecutableSchema({ typeDefs, resolvers });
}
