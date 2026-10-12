<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { FindingRow, SortDirection, SortField } from "../graphql/operations";
import SeverityBadge from "./SeverityBadge.vue";
import StatusBadge from "./StatusBadge.vue";
import { dateLocale } from "../i18n";

/** Tabela "burra": recebe linhas e estado, emite eventos. Toda a busca de dados fica no pai. */
const props = defineProps<{
  rows: FindingRow[];
  sort: SortField;
  direction: SortDirection;
  loading: boolean;
  error: boolean;
  selectedId?: string | null;
}>();
const emit = defineEmits<{ sort: [field: SortField]; open: [id: string]; retry: [] }>();
const { t, locale } = useI18n();

const columns: { key: string; label: string; sort?: SortField; class?: string }[] = [
  { key: "id", label: "table.id" },
  { key: "severity", label: "table.severity", sort: "SEVERITY" },
  { key: "cvss", label: "table.cvss", sort: "CVSS", class: "num" },
  { key: "weakness", label: "table.weakness" },
  { key: "project", label: "table.project", sort: "PROJECT" },
  { key: "source", label: "table.source" },
  { key: "status", label: "table.status", sort: "STATUS" },
  { key: "detected", label: "table.detected", sort: "DETECTED_AT" },
];

const ariaSort = (f?: SortField) =>
  !f || f !== props.sort ? undefined : props.direction === "ASC" ? "ascending" : "descending";
// um formatador por idioma: toLocaleDateString com opções cria um novo a cada chamada (caro numa tabela inteira)
const dateFmt = computed(() => new Intl.DateTimeFormat(dateLocale(locale.value), { timeZone: "UTC" }));
const fmtDate = (iso: string) => dateFmt.value.format(new Date(iso));

/** A linha inteira é clicável, mas o alvo de teclado é o botão no ID (um tab-stop por linha). */
function onRowClick(e: MouseEvent, id: string) {
  if ((e.target as HTMLElement).closest("button")) return;
  emit("open", id);
}
</script>

<template>
  <div class="wrap card" :aria-busy="loading">
    <table>
      <caption class="sr-only">{{ t("table.caption") }}</caption>
      <thead>
        <tr>
          <th v-for="c in columns" :key="c.key" scope="col" :class="c.class" :aria-sort="ariaSort(c.sort)">
            <button v-if="c.sort" type="button" class="sort" :aria-label="t('table.sortBy', { col: t(c.label) })" @click="emit('sort', c.sort)">
              {{ t(c.label) }}
              <span class="arrow" aria-hidden="true">{{ c.sort === sort ? (direction === "ASC" ? "▲" : "▼") : "↕" }}</span>
            </button>
            <template v-else>{{ t(c.label) }}</template>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="error" class="state">
          <td :colspan="columns.length" role="alert">
            {{ t("table.error") }} <button type="button" class="btn" @click="emit('retry')">{{ t("table.retry") }}</button>
          </td>
        </tr>
        <tr v-else-if="loading && !rows.length" class="state">
          <td :colspan="columns.length">{{ t("table.loading") }}</td>
        </tr>
        <tr v-else-if="!rows.length" class="state">
          <td :colspan="columns.length">{{ t("table.empty") }}</td>
        </tr>
        <tr
          v-for="r in rows" v-else :key="r.id" class="row" :class="{ selected: r.id === selectedId, stale: loading }"
          @click="onRowClick($event, r.id)"
        >
          <td>
            <button type="button" class="link mono" :aria-label="t('table.open', { id: r.id })" @click="emit('open', r.id)">{{ r.id }}</button>
          </td>
          <td><SeverityBadge :severity="r.severity" /></td>
          <td class="num mono">{{ r.cvssScore.toFixed(1) }}</td>
          <td class="weak">
            <span class="mono muted">{{ r.cwe.id }}</span> {{ r.cwe.name }}
            <div class="loc mono muted" :title="r.location">{{ r.location }}</div>
          </td>
          <td>{{ r.project.name }}</td>
          <td><span class="mono">{{ r.source }}</span></td>
          <td><StatusBadge :status="r.status" /></td>
          <td class="mono nowrap">{{ fmtDate(r.detectedAt) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border); vertical-align: top; }
th { position: sticky; top: 0; background: var(--surface); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); white-space: nowrap; }
.num { text-align: right; }
.sort { all: unset; cursor: pointer; display: inline-flex; gap: 4px; align-items: center; }
.sort:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; border-radius: 4px; }
th[aria-sort] { color: var(--text); }
.arrow { font-size: 0.75em; opacity: 0.8; }
.row { cursor: pointer; }
.row:hover { background: var(--surface-2); }
.row.selected { background: color-mix(in srgb, var(--accent-strong) 22%, transparent); }
.row.stale { opacity: 0.55; }
.link { all: unset; cursor: pointer; color: var(--accent); text-decoration: underline; text-underline-offset: 3px; white-space: nowrap; }
.link:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; border-radius: 3px; }
.weak { min-width: 260px; }
.loc { font-size: 0.8rem; max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nowrap { white-space: nowrap; }
.state td { padding: 28px; text-align: center; color: var(--muted); }
</style>
