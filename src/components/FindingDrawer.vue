<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useMutation, useQuery } from "@vue/apollo-composable";
import { useI18n } from "vue-i18n";
import { METRICS, parseVector } from "../domain/cvss";
import { OWASP_TOP10, type Status } from "../domain/seed";
import { FINDING_QUERY, UPDATE_STATUS, type FindingDetail } from "../graphql/operations";
import { STATUSES } from "../stores/findings";
import { dateLocale } from "../i18n";
import SeverityBadge from "./SeverityBadge.vue";
import StatusBadge from "./StatusBadge.vue";

const props = defineProps<{ id: string }>();
const emit = defineEmits<{ close: [] }>();
const { t, te, locale } = useI18n();

const { result, loading } = useQuery<{ finding: FindingDetail | null }>(FINDING_QUERY, () => ({ id: props.id }));
const f = computed(() => result.value?.finding);
const metrics = computed(() => {
  if (!f.value) return [];
  const v = parseVector(f.value.cvssVector);
  return METRICS.map((m) => ({ m, label: t(`cvss.${m}.label`), value: t(`cvss.${m}.${v[m]}`), code: `${m}:${v[m]}` }));
});
const kb = (field: "d" | "r") => {
  const key = `cwe['${f.value?.cwe.id}'].${field}`;
  return f.value && te(key) ? t(key) : "";
};
const fmt = (iso: string) =>
  new Date(iso).toLocaleString(dateLocale(locale.value), { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }) + " UTC";

// ---- triagem ----
const newStatus = ref<Status>("IN_PROGRESS");
const justification = ref("");
const feedback = ref<{ kind: "ok" | "error"; text: string } | null>(null);
const needsJustification = computed(() => newStatus.value === "RISK_ACCEPTED" || newStatus.value === "FALSE_POSITIVE");
const canSave = computed(
  () => !!f.value && newStatus.value !== f.value.status && (!needsJustification.value || justification.value.trim().length >= 10),
);
watch(f, (v, old) => {
  if (v && v.id !== old?.id) {
    newStatus.value = v.status === "OPEN" ? "IN_PROGRESS" : v.status === "IN_PROGRESS" ? "FIXED" : "OPEN";
    justification.value = "";
    feedback.value = null;
  }
}, { immediate: true });

const { mutate, loading: saving } = useMutation(UPDATE_STATUS, {
  // a lista e o resumo dependem do status (filtros e contagens), então são recarregados
  refetchQueries: ["Findings", "Summary"],
});

async function save() {
  if (!f.value || !canSave.value) return;
  const current = f.value;
  const just = needsJustification.value ? justification.value.trim() : null;
  const at = new Date().toISOString();
  feedback.value = null;
  try {
    await mutate(
      { id: current.id, status: newStatus.value, justification: just },
      {
        // UI otimista: o badge muda na hora; se o servidor recusar, o Apollo desfaz sozinho
        optimisticResponse: {
          updateFindingStatus: {
            __typename: "Finding",
            id: current.id,
            status: newStatus.value,
            updatedAt: at,
            history: [
              ...current.history.map((h) => ({ __typename: "StatusChange", ...h })),
              { __typename: "StatusChange", from: current.status, to: newStatus.value, at, justification: just },
            ],
          },
        },
      },
    );
    feedback.value = { kind: "ok", text: t("detail.saved") };
    justification.value = "";
  } catch (e) {
    feedback.value = { kind: "error", text: e instanceof Error ? e.message : String(e) };
  }
}

// ---- diálogo acessível: foco inicial, Esc fecha, Tab fica preso dentro, foco volta ao sair ----
const panel = ref<HTMLElement>();
let returnFocus: HTMLElement | null = null;
function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    emit("close");
  } else if (e.key === "Tab" && panel.value) {
    const items = [...panel.value.querySelectorAll<HTMLElement>("button, select, textarea, input, [href], [tabindex]:not([tabindex='-1'])")]
      .filter((el) => !el.hasAttribute("disabled"));
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}
// escuta no document: se o foco cair no body (ex.: botão desabilitado após salvar), o Esc continua funcionando
onMounted(async () => {
  returnFocus = document.activeElement as HTMLElement | null;
  document.addEventListener("keydown", onKey);
  await nextTick();
  panel.value?.focus();
});
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKey);
  // a linha pode ter saído da lista (ex.: marcada como corrigida); aí o foco volta para a tabela
  const target = returnFocus?.isConnected ? returnFocus : document.getElementById("tabela");
  target?.focus();
});
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <aside
      ref="panel" class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabindex="-1"
    >
      <header class="head">
        <div>
          <p class="mono muted id">{{ id }}</p>
          <h2 id="drawer-title">{{ f ? `${f.cwe.id} · ${f.cwe.name}` : loading ? "…" : t("detail.notFound") }}</h2>
        </div>
        <button type="button" class="btn btn-ghost" :aria-label="t('detail.close')" @click="emit('close')">✕</button>
      </header>

      <div v-if="f" class="body">
        <div class="badges">
          <SeverityBadge :severity="f.severity" :score="f.cvssScore" />
          <StatusBadge :status="f.status" />
          <span class="mono muted">{{ f.source }}</span>
          <span class="muted">{{ f.project.name }}</span>
        </div>

        <dl class="facts">
          <dt>{{ t("detail.location") }}</dt><dd class="mono">{{ f.location }}</dd>
          <dt>{{ t("detail.owasp") }}</dt><dd>{{ f.owasp }} — {{ OWASP_TOP10[f.owasp] }}</dd>
          <dt>{{ t("table.detected") }}</dt><dd>{{ fmt(f.detectedAt) }}</dd>
          <dt>{{ t("detail.vector") }}</dt><dd class="mono vector">{{ f.cvssVector }}</dd>
        </dl>

        <section>
          <h3>{{ t("detail.breakdown") }}</h3>
          <ul class="metrics">
            <li v-for="x in metrics" :key="x.m"><span class="muted">{{ x.label }}</span> <strong>{{ x.value }}</strong> <span class="mono muted">{{ x.code }}</span></li>
          </ul>
        </section>

        <section v-if="kb('d')">
          <h3>{{ t("detail.description") }}</h3>
          <p>{{ kb("d") }}</p>
          <h3>{{ t("detail.recommendation") }}</h3>
          <p>{{ kb("r") }}</p>
        </section>

        <section>
          <h3>{{ t("detail.history") }}</h3>
          <ol v-if="f.history.length" class="history">
            <li v-for="(h, i) in f.history" :key="i">
              <span class="mono muted">{{ fmt(h.at) }}</span>
              <span><StatusBadge :status="h.from" /> → <StatusBadge :status="h.to" /></span>
              <q v-if="h.justification">{{ h.justification }}</q>
            </li>
          </ol>
          <p v-else class="muted">{{ t("detail.noHistory") }}</p>
        </section>

        <form class="triage card" @submit.prevent="save">
          <h3>{{ t("detail.triage") }}</h3>
          <label>
            {{ t("detail.newStatus") }}
            <select v-model="newStatus">
              <option v-for="s in STATUSES" :key="s" :value="s" :disabled="s === f.status">{{ t(`status.${s}`) }}</option>
            </select>
          </label>
          <label v-if="needsJustification">
            {{ t("detail.justification") }}
            <textarea v-model="justification" rows="3" maxlength="500" aria-describedby="just-hint" required></textarea>
            <small id="just-hint" class="muted">{{ t("detail.justificationHint") }}</small>
          </label>
          <div class="actions">
            <button type="submit" class="btn btn-primary" :disabled="!canSave || saving">{{ saving ? t("detail.saving") : t("detail.save") }}</button>
            <span v-if="feedback" :class="feedback.kind" role="status">{{ feedback.text }}</span>
          </div>
        </form>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 0.45); display: flex; justify-content: flex-end; z-index: 50; }
.drawer {
  width: min(560px, 100%); height: 100%; overflow-y: auto; background: var(--surface); border-left: 1px solid var(--border);
  box-shadow: var(--shadow); padding: 20px 22px 32px; animation: slide 0.18s ease-out;
}
.drawer:focus { outline: none; }
@keyframes slide { from { transform: translateX(24px); opacity: 0; } }
.head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.id { margin: 0 0 4px; }
h2 { margin: 0; font-size: 1.2rem; }
h3 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin: 18px 0 6px; }
.body { display: grid; gap: 4px; }
.badges { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 14px 0 6px; }
.facts { display: grid; grid-template-columns: max-content 1fr; gap: 6px 14px; margin: 10px 0 0; }
dt { color: var(--muted); }
dd { margin: 0; overflow-wrap: anywhere; }
.metrics { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 0.92rem; }
.history { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.history li { display: grid; gap: 4px; }
q { color: var(--muted); font-style: italic; }
p { margin: 0; }
.triage { padding: 4px 14px 14px; margin-top: 18px; display: grid; gap: 10px; background: var(--surface-2); }
label { display: grid; gap: 4px; }
select, textarea { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; }
.actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.ok { color: var(--ok); }
.error { color: var(--danger); }
@media (max-width: 560px) { .metrics { grid-template-columns: 1fr; } }
</style>
