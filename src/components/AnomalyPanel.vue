<script setup>
import { computed, ref } from 'vue'
import { store } from '../composables/useStore.js'
import { detectAnomalies, getAnomalySummary, ANOMALY_TYPES } from '../utils/anomalyDetector.js'
import { ShieldAlert, ChevronDown, ChevronUp } from '@lucide/vue'

const anomalies = computed(() => {
  if (!store.rows.length) return []
  return detectAnomalies({
    headers: store.headers,
    rows: store.rows,
    types: store.types,
  })
})

const summary = computed(() => getAnomalySummary(anomalies.value))
const expanded = ref({})

function toggleExpand(idx) {
  expanded.value[idx] = !expanded.value[idx]
}

const severityClass = {
  high: 'bg-rose-50 border-rose-200 text-rose-700',
  medium: 'bg-amber-50 border-amber-200 text-amber-700',
  low: 'bg-slate-50 border-slate-200 text-slate-600',
}

const severityLabel = {
  high: '严重',
  medium: '中等',
  low: '轻微',
}
</script>

<template>
  <div v-if="store.rows.length" class="bg-surface rounded-lg border border-border p-5 space-y-4 animate-fade-in">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center">
        <ShieldAlert class="w-4 h-4" />
      </div>
      <div>
        <div class="font-semibold text-text text-sm" style="font-family: 'STKaiti', 'KaiTi', serif;">异常侦探</div>
        <div class="text-xs text-text-3">
          <span v-if="summary.total === 0" class="text-emerald-600 font-medium">数据看起来健康，未发现异常</span>
          <span v-else>
            发现 {{ summary.total }} 条异常
            <span v-if="summary.highCount > 0" class="text-rose-600 font-medium">（{{ summary.highCount }} 条严重）</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Category summary badges -->
    <div v-if="summary.total > 0" class="flex flex-wrap gap-2">
      <div
        v-for="t in ANOMALY_TYPES"
        :key="t.key"
        v-if="summary.counts[t.key] > 0"
        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border"
        :style="{ borderColor: t.color + '30', backgroundColor: t.color + '10', color: t.color }"
      >
        <span>{{ t.icon }}</span>
        <span>{{ t.label }}</span>
        <span class="font-bold">{{ summary.counts[t.key] }}</span>
      </div>
    </div>

    <!-- Anomaly list -->
    <div v-if="anomalies.length > 0" class="space-y-2 max-h-80 overflow-y-auto pr-1">
      <div
        v-for="(a, idx) in anomalies"
        :key="idx"
        class="rounded-lg border p-3 cursor-pointer transition-all hover:shadow-sm"
        :class="severityClass[a.severity]"
        @click="toggleExpand(idx)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-base shrink-0">{{ ANOMALY_TYPES.find(t => t.key === a.type)?.icon || '💡' }}</span>
            <div class="min-w-0">
              <div class="text-sm font-medium truncate">{{ a.message }}</div>
              <div v-if="a.column" class="text-xs opacity-70 mt-0.5">字段：{{ a.column }}</div>
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/60 font-medium">{{ severityLabel[a.severity] }}</span>
            <component :is="expanded[idx] ? ChevronUp : ChevronDown" class="w-4 h-4 opacity-50" />
          </div>
        </div>
        <div v-if="expanded[idx] && a.detail" class="mt-2 pt-2 border-t border-current/10 text-xs leading-relaxed opacity-80">
          {{ a.detail }}
        </div>
      </div>
    </div>
  </div>
</template>
