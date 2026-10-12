<script setup lang="ts">
import { computed } from "vue";

/** Barras horizontais em SVG puro. Cada barra é um botão (teclado e leitor de tela incluídos). */
export interface Bar { key: string; label: string; count: number; color?: string; title?: string }
const props = defineProps<{ title: string; bars: Bar[]; hint?: string }>();
const emit = defineEmits<{ select: [key: string] }>();

const max = computed(() => Math.max(1, ...props.bars.map((b) => b.count)));
const ROW = 28;
</script>

<template>
  <figure class="chart">
    <figcaption>{{ title }}<span v-if="hint" class="hint"> · {{ hint }}</span></figcaption>
    <ul class="rows">
      <li v-for="b in bars" :key="b.key">
        <button type="button" class="row" :title="b.title" @click="emit('select', b.key)">
          <span class="label">{{ b.label }}</span>
          <svg class="bar" :height="ROW - 10" preserveAspectRatio="none" viewBox="0 0 100 10" aria-hidden="true">
            <rect x="0" y="0" height="10" rx="1.5" :width="(b.count / max) * 100" :fill="b.color ?? 'var(--accent)'" />
          </svg>
          <span class="count mono">{{ b.count }}</span>
        </button>
      </li>
    </ul>
  </figure>
</template>

<style scoped>
.chart { margin: 0; }
figcaption { font-weight: 600; margin-bottom: 8px; }
.hint { font-weight: 400; color: var(--muted); font-size: 0.85em; }
.rows { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.row {
  width: 100%; display: grid; grid-template-columns: minmax(90px, 38%) 1fr 3ch; gap: 10px; align-items: center;
  background: transparent; border: 0; border-radius: 6px; padding: 3px 6px; cursor: pointer; text-align: left;
}
.row:hover { background: var(--surface-2); }
.label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.9rem; }
.bar { width: 100%; display: block; }
.count { text-align: right; }
</style>
