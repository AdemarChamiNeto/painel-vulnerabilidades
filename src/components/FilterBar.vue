<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useQuery } from "@vue/apollo-composable";
import { useI18n } from "vue-i18n";
import { OWASP_TOP10 } from "../domain/seed";
import { PROJECTS_QUERY } from "../graphql/operations";
import { SEVERITIES, SOURCES, STATUSES, useFindingsStore } from "../stores/findings";
import ChipFilter from "./ChipFilter.vue";

const store = useFindingsStore();
const { t } = useI18n();
const { result } = useQuery<{ projects: { id: string; name: string }[] }>(PROJECTS_QUERY);

const severityOpts = computed(() => SEVERITIES.map((value) => ({ value, label: t(`severity.${value}`) })));
const statusOpts = computed(() => STATUSES.map((value) => ({ value, label: t(`status.${value}`) })));
const sourceOpts = computed(() => SOURCES.map((value) => ({ value, label: value })));
const projectOpts = computed(() => (result.value?.projects ?? []).map((p) => ({ value: p.id, label: p.name })));

// A busca espera o usuário parar de digitar (300 ms) antes de virar filtro.
const term = ref(store.search);
let timer: ReturnType<typeof setTimeout> | undefined;
watch(term, (v) => {
  clearTimeout(timer);
  timer = setTimeout(() => (store.search = v), 300);
});
watch(() => store.search, (v) => (term.value = v));
</script>

<template>
  <section class="card filters" :aria-label="$t('filters.title')">
    <div class="search">
      <label for="busca">{{ $t("filters.search") }}</label>
      <input id="busca" v-model="term" type="search" :placeholder="$t('filters.searchPlaceholder')" autocomplete="off" />
    </div>
    <ChipFilter v-model="store.severities" :legend="$t('filters.severity')" :options="severityOpts" />
    <ChipFilter v-model="store.statuses" :legend="$t('filters.status')" :options="statusOpts" />
    <ChipFilter v-model="store.sources" :legend="$t('filters.source')" :options="sourceOpts" />
    <ChipFilter v-model="store.projectIds" :legend="$t('filters.project')" :options="projectOpts" />
    <div class="footer">
      <button
        v-for="code in store.owasp" :key="code" type="button" class="btn btn-ghost owasp"
        :title="OWASP_TOP10[code]" @click="store.focusOwasp(code)"
      >OWASP {{ code }} <span aria-hidden="true">×</span></button>
      <button v-if="store.activeFilterCount" type="button" class="btn btn-ghost" @click="store.clearFilters()">
        {{ $t("filters.clear", { n: store.activeFilterCount }) }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.filters { padding: 14px 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px 22px; align-items: start; }
.search { display: grid; gap: 6px; grid-column: 1 / -1; }
.search label { font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
.search input {
  width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg);
}
.footer { grid-column: 1 / -1; display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.footer:empty { display: none; }
.owasp { border-color: var(--accent); }
</style>
