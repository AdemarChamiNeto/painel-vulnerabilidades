import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { useFindingsStore } from "../src/stores/findings";

describe("store de filtros", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("começa mostrando só os abertos", () => {
    const s = useFindingsStore();
    expect(s.filter).toEqual({ statuses: ["OPEN", "IN_PROGRESS"] });
  });

  it("mudar filtro volta para a página 1", async () => {
    const s = useFindingsStore();
    s.nextPage("c1");
    s.nextPage("c2");
    expect(s.page).toBe(2);
    s.prevPage();
    expect(s.after).toBe("c1");
    s.severities = ["HIGH"];
    await nextTick();
    expect(s.page).toBe(0);
    expect(s.after).toBeNull();
  });

  it("ordenação alterna a direção na mesma coluna", () => {
    const s = useFindingsStore();
    s.toggleSort("CVSS");
    expect(s.direction).toBe("ASC");
    s.toggleSort("DETECTED_AT");
    expect([s.sort, s.direction]).toEqual(["DETECTED_AT", "DESC"]);
  });

  it("clique no gráfico liga e desliga o filtro", () => {
    const s = useFindingsStore();
    s.focusSeverity("CRITICAL");
    expect(s.severities).toEqual(["CRITICAL"]);
    s.focusSeverity("CRITICAL");
    expect(s.severities).toEqual([]);
  });

  it("ida e volta pela URL", () => {
    const a = useFindingsStore();
    a.severities = ["CRITICAL", "HIGH"];
    a.statuses = [];
    a.owasp = ["A03:2021"];
    a.search = "login";
    a.toggleSort("PROJECT");
    a.pageSize = 50;
    a.selectedId = "DEMO-2026-0007";
    const qs = a.toQuery();

    setActivePinia(createPinia());
    const b = useFindingsStore();
    b.fromQuery(qs);
    expect(b.filter).toEqual({ severities: ["CRITICAL", "HIGH"], owasp: ["A03:2021"], search: "login" });
    expect([b.sort, b.direction, b.pageSize, b.selectedId]).toEqual(["PROJECT", "ASC", 50, "DEMO-2026-0007"]);
  });

  it("ignora valores inválidos na URL", () => {
    const s = useFindingsStore();
    s.fromQuery("sev=CRITICAL,XSS&owasp=A99:2021&sort=DROP:TABLE&size=9999");
    expect(s.severities).toEqual(["CRITICAL"]);
    expect(s.owasp).toEqual([]);
    expect(s.sort).toBe("CVSS");
    expect(s.pageSize).toBe(20);
  });
});
