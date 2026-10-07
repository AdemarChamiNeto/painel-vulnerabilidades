import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import type { Severity } from "../domain/cvss";
import type { Source, Status } from "../domain/seed";
import type { FindingFilterInput, SortDirection, SortField } from "../graphql/operations";

export const SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
export const STATUSES: Status[] = ["OPEN", "IN_PROGRESS", "RISK_ACCEPTED", "FALSE_POSITIVE", "FIXED"];
export const SOURCES: Source[] = ["SAST", "DAST", "SCA"];
export const SORT_FIELDS: SortField[] = ["CVSS", "SEVERITY", "DETECTED_AT", "STATUS", "PROJECT"];
export const PAGE_SIZES = [10, 20, 50] as const;

/** Estado da tela: filtros, ordenação, paginação e achado aberto. Os dados em si ficam no cache do Apollo. */
export const useFindingsStore = defineStore("findings", () => {
  const severities = ref<Severity[]>([]);
  const statuses = ref<Status[]>(["OPEN", "IN_PROGRESS"]);
  const sources = ref<Source[]>([]);
  const projectIds = ref<string[]>([]);
  const owasp = ref<string[]>([]);
  const search = ref("");
  const sort = ref<SortField>("CVSS");
  const direction = ref<SortDirection>("DESC");
  const pageSize = ref<number>(20);
  /** Pilha de cursores: cursors[i] é o `after` da página i (a primeira é null). */
  const cursors = ref<(string | null)[]>([null]);
  const selectedId = ref<string | null>(null);

  const page = computed(() => cursors.value.length - 1);
  const after = computed(() => cursors.value[cursors.value.length - 1]);

  const filter = computed<FindingFilterInput>(() => ({
    ...(severities.value.length && { severities: severities.value }),
    ...(statuses.value.length && { statuses: statuses.value }),
    ...(sources.value.length && { sources: sources.value }),
    ...(projectIds.value.length && { projectIds: projectIds.value }),
    ...(owasp.value.length && { owasp: owasp.value }),
    ...(search.value.trim() && { search: search.value.trim() }),
  }));

  const activeFilterCount = computed(
    () => severities.value.length + statuses.value.length + sources.value.length + projectIds.value.length + owasp.value.length + (search.value.trim() ? 1 : 0),
  );

  // Qualquer mudança de filtro, ordenação ou tamanho volta para a página 1.
  watch([filter, sort, direction, pageSize], () => (cursors.value = [null]), { deep: true });

  function nextPage(endCursor: string | null) {
    if (endCursor) cursors.value = [...cursors.value, endCursor];
  }
  function prevPage() {
    if (cursors.value.length > 1) cursors.value = cursors.value.slice(0, -1);
  }

  /** Clicar na mesma coluna inverte a direção; numa coluna nova começa decrescente. */
  function toggleSort(field: SortField) {
    if (sort.value === field) direction.value = direction.value === "DESC" ? "ASC" : "DESC";
    else {
      sort.value = field;
      direction.value = field === "PROJECT" ? "ASC" : "DESC";
    }
  }

  function clearFilters() {
    severities.value = [];
    statuses.value = [];
    sources.value = [];
    projectIds.value = [];
    owasp.value = [];
    search.value = "";
  }

  /** Clique numa barra do gráfico: liga/desliga aquele valor como filtro único. */
  function focusSeverity(s: Severity) {
    severities.value = severities.value.length === 1 && severities.value[0] === s ? [] : [s];
  }
  function focusOwasp(code: string) {
    owasp.value = owasp.value.length === 1 && owasp.value[0] === code ? [] : [code];
  }

  // ---- URL: o estado vai para a query string, então um link compartilhado abre a mesma visão ----
  function toQuery(): string {
    const p = new URLSearchParams();
    const set = (k: string, v: string[]) => v.length && p.set(k, v.join(","));
    set("sev", severities.value);
    // status sempre vai, mesmo vazio: o padrão é "em aberto", então "nenhum filtro" precisa ser explícito
    p.set("status", statuses.value.join(","));
    set("src", sources.value);
    set("proj", projectIds.value);
    set("owasp", owasp.value);
    if (search.value.trim()) p.set("q", search.value.trim());
    if (sort.value !== "CVSS" || direction.value !== "DESC") p.set("sort", `${sort.value}:${direction.value}`);
    if (pageSize.value !== 20) p.set("size", String(pageSize.value));
    if (selectedId.value) p.set("id", selectedId.value);
    return p.toString();
  }

  function fromQuery(qs: string) {
    const p = new URLSearchParams(qs);
    const list = <T extends string>(k: string, allowed: readonly T[]) =>
      (p.get(k)?.split(",") ?? []).filter((x): x is T => (allowed as readonly string[]).includes(x));
    if (p.has("sev")) severities.value = list("sev", SEVERITIES);
    if (p.has("status")) statuses.value = list("status", STATUSES);
    if (p.has("src")) sources.value = list("src", SOURCES);
    if (p.has("proj")) projectIds.value = (p.get("proj") ?? "").split(",").filter(Boolean);
    if (p.has("owasp")) owasp.value = (p.get("owasp") ?? "").split(",").filter((x) => /^A(0[1-9]|10):2021$/.test(x));
    if (p.has("q")) search.value = p.get("q") ?? "";
    const [f, d] = (p.get("sort") ?? "").split(":");
    if ((SORT_FIELDS as string[]).includes(f) && (d === "ASC" || d === "DESC")) {
      sort.value = f as SortField;
      direction.value = d;
    }
    const size = Number(p.get("size"));
    if ((PAGE_SIZES as readonly number[]).includes(size)) pageSize.value = size;
    selectedId.value = p.get("id");
  }

  return {
    severities, statuses, sources, projectIds, owasp, search, sort, direction, pageSize, cursors, selectedId,
    page, after, filter, activeFilterCount,
    nextPage, prevPage, toggleSort, clearFilters, focusSeverity, focusOwasp, toQuery, fromQuery,
  };
});
