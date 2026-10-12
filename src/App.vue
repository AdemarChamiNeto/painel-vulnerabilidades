<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useQuery } from "@vue/apollo-composable";
import { useI18n } from "vue-i18n";
import { FINDINGS_QUERY, type FindingsData } from "./graphql/operations";
import { useFindingsStore } from "./stores/findings";
import { saveLocale } from "./i18n";
import type { Locale } from "./i18n/messages";
import SummaryPanel from "./components/SummaryPanel.vue";
import FilterBar from "./components/FilterBar.vue";
import FindingsTable from "./components/FindingsTable.vue";
import PaginationBar from "./components/PaginationBar.vue";
import FindingDrawer from "./components/FindingDrawer.vue";

const base = import.meta.env.BASE_URL;
const props = withDefaults(defineProps<{ syncUrl?: boolean }>(), { syncUrl: true });
const store = useFindingsStore();
const { locale } = useI18n();
// lê filtros da URL antes da primeira query, para não buscar duas vezes
if (props.syncUrl) store.fromQuery(location.search);

const { result, loading, error, refetch } = useQuery<FindingsData>(
  FINDINGS_QUERY,
  () => ({ filter: store.filter, sort: store.sort, direction: store.direction, first: store.pageSize, after: store.after }),
  { keepPreviousResult: true },
);
const conn = computed(() => result.value?.findings);
const rows = computed(() => conn.value?.edges.map((e) => e.node) ?? []);

// ---- estado <-> URL ----
if (props.syncUrl) {
  watch(() => store.toQuery(), (qs) => {
    const lang = new URLSearchParams(location.search).get("lang");
    const p = new URLSearchParams(qs);
    if (lang) p.set("lang", lang);
    const s = p.toString();
    history.replaceState(null, "", s ? `?${s}` : location.pathname);
  });
}

// ---- tema ----
type Theme = "dark" | "light";
const theme = ref<Theme>("dark");
onMounted(() => {
  let saved: string | null = null;
  try { saved = localStorage.getItem("painel-vuln:theme"); } catch { /* sem storage */ }
  theme.value = saved === "light" || saved === "dark" ? saved : matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
});
watch(theme, (v) => {
  document.documentElement.dataset.theme = v;
  try { localStorage.setItem("painel-vuln:theme", v); } catch { /* sem storage */ }
});

function setLocale(l: Locale) {
  locale.value = l;
  saveLocale(l);
}
watch(locale, (l) => (document.title = l === "en" ? "Vulnerability Dashboard" : "Painel de Vulnerabilidades"), { immediate: true });
</script>

<template>
  <a class="skip" href="#tabela">{{ $t("app.skip") }}</a>
  <header class="top">
    <div>
      <h1>{{ $t("app.title") }}</h1>
      <p class="muted">{{ $t("app.subtitle") }}</p>
    </div>
    <div class="tools">
      <div class="seg" role="group" :aria-label="$t('app.language')">
        <button type="button" :aria-pressed="locale === 'pt'" @click="setLocale('pt')">PT</button>
        <button type="button" :aria-pressed="locale === 'en'" @click="setLocale('en')">EN</button>
      </div>
      <button
        type="button" class="btn" :aria-label="theme === 'dark' ? $t('app.theme.light') : $t('app.theme.dark')"
        @click="theme = theme === 'dark' ? 'light' : 'dark'"
      >{{ theme === "dark" ? "☀" : "☾" }}</button>
    </div>
  </header>

  <main class="layout">
    <p class="notice">{{ $t("app.demoNotice") }}</p>
    <SummaryPanel />
    <FilterBar />
    <section id="tabela" class="table-area" tabindex="-1">
      <FindingsTable
        :rows="rows" :sort="store.sort" :direction="store.direction" :loading="loading" :error="!!error"
        :selected-id="store.selectedId" @sort="store.toggleSort" @open="store.selectedId = $event" @retry="refetch()"
      />
      <PaginationBar
        :page="store.page" :page-size="store.pageSize" :total="conn?.totalCount ?? 0"
        :has-next="!!conn?.pageInfo.hasNextPage" :disabled="loading"
        @prev="store.prevPage()" @next="store.nextPage(conn?.pageInfo.endCursor ?? null)" @update:page-size="store.pageSize = $event"
      />
    </section>
  </main>

  <footer class="foot">
    <a :href="`${base}privacidade.html`">{{ $t("app.privacy") }}</a>
    <span aria-hidden="true">·</span>
    <a href="https://github.com/AdemarChamiNeto/painel-vulnerabilidades">{{ $t("app.source") }}</a>
  </footer>

  <FindingDrawer v-if="store.selectedId" :id="store.selectedId" :key="store.selectedId" @close="store.selectedId = null" />
</template>

<style scoped>
.top { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 18px 24px 8px; max-width: 1280px; margin: 0 auto; flex-wrap: wrap; }
h1 { margin: 0; font-size: 1.45rem; }
.top p { margin: 2px 0 0; }
.tools { display: flex; gap: 10px; align-items: center; }
.seg { display: inline-flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.seg button { background: transparent; border: 0; padding: 6px 12px; cursor: pointer; min-height: 34px; }
.seg button[aria-pressed="true"] { background: var(--accent-strong); color: #fff; }
.layout { max-width: 1280px; margin: 0 auto; padding: 8px 24px 40px; display: grid; gap: 14px; }
.foot { max-width: 1280px; margin: 0 auto; padding: 0 24px 32px; display: flex; gap: 8px; font-size: 0.85rem; color: var(--muted); }
.foot a { color: inherit; }
.notice { margin: 0; font-size: 0.85rem; color: var(--muted); border-left: 3px solid var(--accent); padding-left: 10px; }
.table-area { display: grid; gap: 10px; }
.table-area:focus { outline: none; }
@media (max-width: 600px) { .top, .layout { padding-left: 14px; padding-right: 14px; } }
</style>
