<script setup lang="ts">
import type { Severity } from "../domain/cvss";

defineProps<{ severity: Severity; score?: number }>();
</script>

<template>
  <span class="sev" :class="`sev-${severity.toLowerCase()}`">
    <span class="dot" aria-hidden="true"></span>
    {{ $t(`severity.${severity}`) }}<template v-if="score !== undefined"> · <span class="mono">{{ score.toFixed(1) }}</span></template>
  </span>
</template>

<style scoped>
.sev { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; white-space: nowrap; color: var(--c); }
.dot { width: 9px; height: 9px; border-radius: 50%; background: var(--c); flex: none; }
.sev-critical { --c: var(--sev-critical); }
.sev-high { --c: var(--sev-high); }
.sev-medium { --c: var(--sev-medium); }
.sev-low { --c: var(--sev-low); }
.sev-none { --c: var(--muted); }
</style>
