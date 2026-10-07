import { graphql } from "graphql";
import { createSchema, memoryStorage } from "../src/graphql/schema";
import { generateFindings } from "../src/domain/seed";
import { baseScore, severityOf } from "../src/domain/cvss";

const run = (schema: ReturnType<typeof createSchema>, source: string, variableValues?: Record<string, unknown>) =>
  graphql({ schema, source, variableValues }) as Promise<{ data?: any; errors?: readonly { message: string; extensions: any }[] }>;

const LIST = `query($filter: FindingFilter, $sort: SortField, $direction: SortDirection, $first: Int, $after: String) {
  findings(filter: $filter, sort: $sort, direction: $direction, first: $first, after: $after) {
    totalCount pageInfo { hasNextPage endCursor } edges { node { id severity cvssScore status detectedAt project { name } } }
  }
}`;

describe("dataset", () => {
  it("é determinístico e coerente com o CVSS", () => {
    const a = generateFindings(), b = generateFindings();
    expect(a).toEqual(b);
    expect(a).toHaveLength(240);
    for (const f of a) {
      expect(f.cvssScore).toBe(baseScore(f.cvssVector));
      expect(f.severity).toBe(severityOf(f.cvssScore));
      expect(f.id).toMatch(/^DEMO-2026-\d{4}$/);
    }
  });
});

describe("API GraphQL", () => {
  let schema: ReturnType<typeof createSchema>;
  beforeEach(() => (schema = createSchema()));

  it("pagina com cursor sem repetir nem pular itens", async () => {
    const ids: string[] = [];
    let after: string | null = null;
    let total = 0;
    do {
      const r = await run(schema, LIST, { first: 50, after });
      const c = r.data.findings;
      total = c.totalCount;
      ids.push(...c.edges.map((e: any) => e.node.id));
      after = c.pageInfo.hasNextPage ? c.pageInfo.endCursor : null;
    } while (after);
    expect(ids).toHaveLength(total);
    expect(new Set(ids).size).toBe(total);
  });

  it("filtra por severidade, status e busca", async () => {
    const r = await run(schema, LIST, { filter: { severities: ["CRITICAL"], statuses: ["OPEN"] }, first: 100 });
    expect(r.data.findings.totalCount).toBeGreaterThan(0);
    for (const { node } of r.data.findings.edges) {
      expect(node.severity).toBe("CRITICAL");
      expect(node.status).toBe("OPEN");
    }
    const s = await run(schema, `{ findings(filter: { search: "cwe-89" }, first: 100) { edges { node { cwe { id } } } } }`);
    expect(s.data.findings.edges.length).toBeGreaterThan(0);
    expect(s.data.findings.edges.every((e: any) => e.node.cwe.id === "CWE-89")).toBe(true);
  });

  it("ordena por CVSS e por data nas duas direções", async () => {
    const desc = (await run(schema, LIST, { first: 100 })).data.findings.edges.map((e: any) => e.node.cvssScore);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    const asc = (await run(schema, LIST, { sort: "DETECTED_AT", direction: "ASC", first: 100 })).data.findings.edges.map((e: any) => e.node.detectedAt);
    expect(asc).toEqual([...asc].sort());
  });

  it("valida o tamanho da página e o cursor", async () => {
    expect((await run(schema, LIST, { first: 0 })).errors?.[0].extensions.code).toBe("BAD_USER_INPUT");
    expect((await run(schema, LIST, { after: btoa("lixo") })).errors?.[0].message).toMatch(/Cursor/);
  });

  it("resumo bate com a lista", async () => {
    const r = await run(schema, `{ summary { total open criticalOpen meanTimeToFixDays bySeverity { key count } } }`);
    const s = r.data.summary;
    expect(s.total).toBe(240);
    expect(s.bySeverity.reduce((n: number, b: any) => n + b.count, 0)).toBe(240);
    expect(s.meanTimeToFixDays).toBeGreaterThan(0);
    const open = await run(schema, LIST, { filter: { statuses: ["OPEN", "IN_PROGRESS"] } });
    expect(open.data.findings.totalCount).toBe(s.open);
  });

  it("triagem: exige justificativa, grava histórico e persiste", async () => {
    const storage = memoryStorage();
    schema = createSchema({ storage, now: () => new Date("2026-10-01T12:00:00Z") });
    const M = `mutation($id: ID!, $status: Status!, $j: String) {
      updateFindingStatus(id: $id, status: $status, justification: $j) { id status updatedAt history { from to justification } }
    }`;
    const id = "DEMO-2026-0001";

    const fail = await run(schema, M, { id, status: "RISK_ACCEPTED", j: "curta" });
    expect(fail.errors?.[0].extensions.code).toBe("JUSTIFICATION_REQUIRED");

    const ok = await run(schema, M, { id, status: "FALSE_POSITIVE", j: "Validado pelo middleware de entrada." });
    const f = ok.data.updateFindingStatus;
    expect(f.status).toBe("FALSE_POSITIVE");
    expect(f.updatedAt).toBe("2026-10-01T12:00:00.000Z");
    expect(f.history.at(-1)).toEqual({ from: "OPEN", to: "FALSE_POSITIVE", justification: "Validado pelo middleware de entrada." });

    // um novo "servidor" com o mesmo storage enxerga a mudança
    const again = await run(createSchema({ storage }), `{ finding(id: "${id}") { status } }`);
    expect(again.data.finding.status).toBe("FALSE_POSITIVE");

    expect((await run(schema, M, { id: "NAO-EXISTE", status: "FIXED" })).errors?.[0].extensions.code).toBe("NOT_FOUND");
  });
});
