<script setup lang="ts">
import { computed } from "vue";
import { useQuery } from "@vue/apollo-composable";
import { useI18n } from "vue-i18n";
import { OWASP_TOP10 } from "../domain/seed";
import { SUMMARY_QUERY, type SummaryData } from "../graphql/operations";
import { SEVERITIES, useFindingsStore } from "../stores/findings";
import type { Severity } from "../domain/cvss";
import BarChart, { type Bar } from "./BarChart.vue";

const store = useFindingsStore();
const { t } = useI18n();
const { result } = useQuery<SummaryData>(SUMMARY_QUERY, () => ({ filter: store.filter }));
const s = computed(() => result.value?.summary);

const severityBars = computed<Bar[]>(() =>
  SEVERITIES.map((key) => ({
    key,
    label: t(`severity.${key}`),
    count: s.value?.bySeverity.find((b) => b.key === key)?.count ?? 0,
    color: `var(--sev-${key.toLowerCase()})`,
  })),
);
const owaspBars = computed<Bar[]>(() =>
  (s.value?.byOwasp ?? []).map((b) => ({ key: b.key, label: `${b.key.slice(0, 3)} ${OWASP_TOP10[b.key]}`, title: OWASP_TOP10[b.key], count: b.count })),
);
</script>

<template>
  <section class="summary" :aria-busy="!s">
    <div class="kpis">
      <div class="card kpi">
        <span class="k-label">{{ $t("summary.total") }}</span>
        <strong class="k-value">{{ s?.total ?? "…" }}</strong>
      </div>
      <div class="card kpi">
        <span class="k-label">{{ $t("summary.open") }}</span>
        <strong class="k-value">{{ s?.open ?? "…" }}</strong>
      </div>
      <div class="card kpi crit">
        <span class="k-label">{{ $t("summary.criticalOpen") }}</span>
        <strong class="k-value">{{ s?.criticalOpen ?? "…" }}</strong>
      </div>
      <div class="card kpi">
        <span class="k-label">{{ $t("summary.mttr") }}</span>
        <strong class="k-value">{{
          !s ? "…" : s.meanTimeToFixDays === null ? $t("summary.none") : $t("summary.days", { n: s.meanTimeToFixDays.toLocaleString() })
        }}</strong>
      </div>
    </div>
    <div class="charts">
      <div class="card pad">
        <BarChart :title="$t('summary.bySeverity')" :hint="$t('summary.chartHint')" :bars="severityBars" @select="store.focusSeverity($event as Severity)" />
      </div>
      <div class="card pad">
        <BarChart :title="$t('summary.byOwasp')" :hint="$t('summary.chartHint')" :bars="owaspBars" @select="store.focusOwasp" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.summary { display: grid; gap: 12px; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kpi { padding: 14px 16px; display: grid; gap: 2px; }
.k-label { color: var(--muted); font-size: 0.85rem; }
.k-value { font-size: 1.7rem; font-variant-numeric: tabular-nums; }
.crit .k-value { color: var(--sev-critical); }
.charts { display: grid; grid-template-columns: 1fr 1.4fr; gap: 12px; align-items: start; }
.pad { padding: 14px 16px; }
@media (max-width: 900px) {
  .kpis { grid-template-columns: repeat(2, 1fr); }
  .charts { grid-template-columns: 1fr; }
}
</style>
