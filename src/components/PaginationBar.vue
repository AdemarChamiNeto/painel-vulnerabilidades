<script setup lang="ts">
import { computed } from "vue";
import { PAGE_SIZES } from "../stores/findings";

const props = defineProps<{ page: number; pageSize: number; total: number; hasNext: boolean; disabled?: boolean }>();
const emit = defineEmits<{ prev: []; next: []; "update:pageSize": [n: number] }>();

const from = computed(() => (props.total === 0 ? 0 : props.page * props.pageSize + 1));
const to = computed(() => Math.min(props.total, (props.page + 1) * props.pageSize));
</script>

<template>
  <nav class="pager" :aria-label="$t('pagination.label')">
    <label class="size">
      {{ $t("pagination.pageSize") }}
      <select :value="pageSize" @change="emit('update:pageSize', Number(($event.target as HTMLSelectElement).value))">
        <option v-for="n in PAGE_SIZES" :key="n" :value="n">{{ n }}</option>
      </select>
    </label>
    <span class="range" aria-live="polite">{{ $t("pagination.range", { from, to, total }) }}</span>
    <div class="buttons">
      <button type="button" class="btn" :disabled="disabled || page === 0" @click="emit('prev')">← {{ $t("pagination.prev") }}</button>
      <span class="muted">{{ $t("pagination.page", { n: page + 1 }) }}</span>
      <button type="button" class="btn" :disabled="disabled || !hasNext" @click="emit('next')">{{ $t("pagination.next") }} →</button>
    </div>
  </nav>
</template>

<style scoped>
.pager { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; justify-content: space-between; padding: 4px 2px; }
.size { display: inline-flex; gap: 8px; align-items: center; color: var(--muted); }
select { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; }
.range { font-variant-numeric: tabular-nums; }
.buttons { display: inline-flex; gap: 10px; align-items: center; }
</style>
