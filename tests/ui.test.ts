import { flushPromises, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { h, provide } from "vue";
import { DefaultApolloClient } from "@vue/apollo-composable";
import App from "../src/App.vue";
import FindingsTable from "../src/components/FindingsTable.vue";
import ChipFilter from "../src/components/ChipFilter.vue";
import { createApolloClient } from "../src/graphql/client";
import { createAppI18n } from "../src/i18n";
import type { FindingRow } from "../src/graphql/operations";

const i18n = () => createAppI18n("pt");

/** Espera a cadeia de promessas do Apollo assentar. */
async function settle() {
  for (let i = 0; i < 6; i++) {
    await flushPromises();
    await new Promise((r) => setTimeout(r, 0));
  }
}

function mountApp() {
  const apollo = createApolloClient();
  return mount({ setup: () => provide(DefaultApolloClient, apollo), render: () => h(App, { syncUrl: false }) }, {
    global: { plugins: [createPinia(), i18n()] },
    attachTo: document.body,
  });
}

const row = (over: Partial<FindingRow> = {}): FindingRow => ({
  id: "DEMO-2026-0001", owasp: "A03:2021", source: "SAST", severity: "CRITICAL", cvssScore: 9.8, status: "OPEN",
  location: "src/x.ts:1", detectedAt: "2026-09-01T00:00:00Z", cwe: { id: "CWE-89", name: "SQL Injection" },
  project: { id: "p1", name: "Portal do Cliente" }, ...over,
});

describe("FindingsTable", () => {
  const base = { sort: "CVSS" as const, direction: "DESC" as const, loading: false, error: false };

  it("marca a coluna ordenada com aria-sort e emite sort", async () => {
    const w = mount(FindingsTable, { props: { ...base, rows: [row()] }, global: { plugins: [i18n()] } });
    const sorted = w.findAll("th").filter((th) => th.attributes("aria-sort"));
    expect(sorted).toHaveLength(1);
    expect(sorted[0].text()).toContain("CVSS");
    expect(sorted[0].attributes("aria-sort")).toBe("descending");
    await w.find("button[aria-label='Ordenar por Projeto']").trigger("click");
    expect(w.emitted("sort")).toEqual([["PROJECT"]]);
  });

  it("estados de carregando, vazio e erro", async () => {
    const w = mount(FindingsTable, { props: { ...base, rows: [], loading: true }, global: { plugins: [i18n()] } });
    expect(w.text()).toContain("Carregando");
    await w.setProps({ loading: false });
    expect(w.text()).toContain("Nenhum achado");
    await w.setProps({ error: true });
    expect(w.find("[role=alert]").exists()).toBe(true);
    await w.find("[role=alert] button").trigger("click");
    expect(w.emitted("retry")).toHaveLength(1);
  });

  it("abre o detalhe pelo botão ou clicando na linha", async () => {
    const w = mount(FindingsTable, { props: { ...base, rows: [row()] }, global: { plugins: [i18n()] } });
    await w.find("button.link").trigger("click");
    await w.find("td.weak").trigger("click");
    expect(w.emitted("open")).toEqual([["DEMO-2026-0001"], ["DEMO-2026-0001"]]);
  });
});

describe("ChipFilter", () => {
  it("alterna valores com aria-pressed", async () => {
    const w = mount(ChipFilter, {
      props: { legend: "Origem", options: [{ value: "SAST", label: "SAST" }, { value: "SCA", label: "SCA" }], modelValue: ["SAST"],
        "onUpdate:modelValue": (v: string[]) => w.setProps({ modelValue: v }) },
    });
    const [sast, sca] = w.findAll("button");
    expect(sast.attributes("aria-pressed")).toBe("true");
    await sca.trigger("click");
    await sast.trigger("click");
    expect(w.props("modelValue")).toEqual(["SCA"]);
  });
});

describe("App (com o servidor GraphQL em memória)", () => {
  afterEach(() => (document.body.innerHTML = ""));

  it("carrega a tabela, filtra e pagina", async () => {
    const w = mountApp();
    await settle();
    expect(w.findAll("tbody tr.row")).toHaveLength(20);
    const range = () => w.find(".range").text();
    const total = Number(range().split(" de ")[1]);
    expect(total).toBeGreaterThan(20);

    const next = w.findAll(".pager button").at(-1)!;
    await next.trigger("click");
    await settle();
    expect(range()).toMatch(/^21–40/);

    const critical = w.findAll(".chip").find((c) => c.text() === "Crítica")!;
    await critical.trigger("click");
    await settle();
    expect(range()).toMatch(/^1–/); // filtro novo volta para a página 1
    expect(w.findAll("tbody tr.row .sev").every((s) => s.text().startsWith("Crítica"))).toBe(true);
    w.unmount();
  });

  it("triagem pelo drawer atualiza a linha e exige justificativa", async () => {
    const w = mountApp();
    await settle();
    const firstId = w.find("tbody tr.row button.link").text();
    await w.find("tbody tr.row button.link").trigger("click");
    await settle();

    const dialog = () => document.querySelector("[role=dialog]")!;
    expect(dialog().textContent).toContain(firstId);
    const select = w.find("[role=dialog] select");
    await select.setValue("RISK_ACCEPTED");
    const save = () => w.find("[role=dialog] button[type=submit]");
    expect(save().attributes("disabled")).toBeDefined();
    await w.find("[role=dialog] textarea").setValue("Sistema interno sem exposição externa.");
    expect(save().attributes("disabled")).toBeUndefined();
    await w.find("[role=dialog] form").trigger("submit");
    await settle();

    expect(dialog().textContent).toContain("Status atualizado.");
    expect(dialog().textContent).toContain("Risco aceito");
    // o padrão mostra só abertos: o achado aceito sai da lista
    expect(w.findAll("tbody tr.row button.link").map((b) => b.text())).not.toContain(firstId);

    await w.find("[role=dialog]").trigger("keydown", { key: "Escape" });
    expect(document.querySelector("[role=dialog]")).toBeNull();
    w.unmount();
  });

  it("troca o idioma", async () => {
    const w = mountApp();
    await settle();
    await w.find(".seg button:last-child").trigger("click");
    expect(w.find("h1").text()).toBe("Vulnerability Dashboard");
    w.unmount();
  });
});
