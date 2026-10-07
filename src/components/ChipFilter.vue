<script setup lang="ts" generic="T extends string">
/** Grupo de filtros multi-seleção: cada chip é um botão com aria-pressed. */
defineProps<{ legend: string; options: { value: T; label: string }[] }>();
const model = defineModel<T[]>({ required: true });

function toggle(v: T) {
  model.value = model.value.includes(v) ? model.value.filter((x) => x !== v) : [...model.value, v];
}
</script>

<template>
  <fieldset class="chips">
    <legend>{{ legend }}</legend>
    <button
      v-for="o in options" :key="o.value" type="button" class="chip"
      :aria-pressed="model.includes(o.value)" @click="toggle(o.value)"
    >{{ o.label }}</button>
  </fieldset>
</template>

<style scoped>
.chips { border: 0; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
legend { font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; padding: 0; }
.chip {
  cursor: pointer; border: 1px solid var(--border); background: transparent; border-radius: 999px;
  padding: 4px 11px; font-size: 0.9rem; min-height: 30px;
}
.chip:hover { border-color: var(--accent); }
.chip[aria-pressed="true"] { background: var(--accent-strong); border-color: var(--accent-strong); color: #fff; }
</style>
