<script setup lang="ts">
import type { Status } from "../domain/seed";

defineProps<{ status: Status }>();
</script>

<template>
  <span class="status" :class="`st-${status.toLowerCase()}`">{{ $t(`status.${status}`) }}</span>
</template>

<style scoped>
.status {
  display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 0.85em; white-space: nowrap;
  border: 1px solid var(--border); background: var(--surface-2);
}
.st-open { border-color: var(--sev-critical); }
.st-in_progress { border-color: var(--sev-medium); }
.st-fixed { border-color: var(--ok); color: var(--ok); }
.st-risk_accepted, .st-false_positive { color: var(--muted); }
</style>
