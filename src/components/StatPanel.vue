<script setup>
import { ref, computed } from 'vue'
import { store, numericColumns } from '../composables/useStore.js'
import { Calculator, TrendingUp, TrendingDown, Sigma, Hash, BarChart3 } from '@lucide/vue'

const selectedCol = ref('')

const stats = computed(() => {
  const col = selectedCol.value
  if (!col) return null
  const idx = store.headers.indexOf(col)
  if (idx === -1) return null
  const values = store.rows.map(r => Number(r[idx])).filter(v => !isNaN(v))
  if (values.length === 0) return null

  const sum = values.reduce((a, b) => a + b, 0)
  const avg = sum / values.length
  const min = Math.min(...values)
  const max = Math.max(...values)
  const sorted = [...values].sort((a, b) => a - b)
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)]
  const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length
  const std = Math.sqrt(variance)

  return { count: values.length, sum, avg, min, max, median, std }
})

function fmt(n) {
  if (n == null) return '-'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(2)
}

const statCards = computed(() => {
  const s = stats.value
  if (!s) return []
  return [
    { label: '样本数', value: s.count, icon: Hash, color: 'text-primary', bg: 'bg-primary/10' },
    { label: '总和', value: fmt(s.sum), icon: Sigma, color: 'text-accent', bg: 'bg-accent/10' },
    { label: '平均值', value: fmt(s.avg), icon: Calculator, color: 'text-warn', bg: 'bg-warn/10' },
    { label: '最大值', value: fmt(s.max), icon: TrendingUp, color: 'text-danger', bg: 'bg-danger/10' },
    { label: '最小值', value: fmt(s.min), icon: TrendingDown, color: 'text-primary', bg: 'bg-primary/10' },
    { label: '中位数', value: fmt(s.median), icon: BarChart3, color: 'text-accent', bg: 'bg-accent/10' },
    { label: '标准差', value: fmt(s.std), icon: BarChart3, color: 'text-text-2', bg: 'bg-surface-3' },
  ]
})
</script>

<template>
  <div class="space-y-5 animate-fade-in">
    <!-- Column Selector -->
    <div class="bg-surface rounded-lg border border-border p-4">
      <label class="block text-sm font-medium text-text mb-2" style="font-family: 'STKaiti', 'KaiTi', serif;">选择数值列进行分析</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="col in numericColumns"
          :key="col"
          @click="selectedCol = col"
          class="px-3 py-1.5 rounded-md text-sm border transition-all"
          :class="selectedCol === col ? 'bg-primary text-white border-primary' : 'bg-surface-2 text-text-2 border-border hover:border-primary/40'"
        >
          {{ col }}
        </button>
        <span v-if="numericColumns.length === 0" class="text-sm text-text-3">暂无数值列</span>
      </div>
    </div>

    <!-- Stats Cards -->
    <div v-if="stats" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <div
        v-for="card in statCards"
        :key="card.label"
        class="bg-surface rounded-lg border border-border p-4 flex items-start gap-3"
      >
        <div class="w-9 h-9 rounded-md flex items-center justify-center shrink-0" :class="card.bg">
          <component :is="card.icon" class="w-4 h-4" :class="card.color" />
        </div>
        <div>
          <div class="text-xs text-text-3">{{ card.label }}</div>
          <div class="text-lg font-semibold text-text mt-0.5" style="font-family: 'Georgia', serif;">{{ card.value }}</div>
        </div>
      </div>
    </div>

    <!-- Distribution Bar -->
    <div v-if="stats" class="bg-surface rounded-lg border border-border p-4 space-y-3">
      <div class="text-sm font-medium text-text" style="font-family: 'STKaiti', 'KaiTi', serif;">分布概览</div>
      <div class="space-y-2">
        <div class="flex items-center gap-3 text-xs">
          <span class="w-12 text-text-3 shrink-0">最小</span>
          <div class="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
            <div class="h-full bg-primary/30 rounded-full" style="width: 10%"></div>
          </div>
          <span class="w-16 text-right text-text-2">{{ fmt(stats.min) }}</span>
        </div>
        <div class="flex items-center gap-3 text-xs">
          <span class="w-12 text-text-3 shrink-0">中位</span>
          <div class="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
            <div class="h-full bg-accent/50 rounded-full" :style="{ width: Math.min(100, ((stats.median - stats.min) / (stats.max - stats.min || 1)) * 80 + 10) + '%' }"></div>
          </div>
          <span class="w-16 text-right text-text-2">{{ fmt(stats.median) }}</span>
        </div>
        <div class="flex items-center gap-3 text-xs">
          <span class="w-12 text-text-3 shrink-0">平均</span>
          <div class="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
            <div class="h-full bg-warn/50 rounded-full" :style="{ width: Math.min(100, ((stats.avg - stats.min) / (stats.max - stats.min || 1)) * 80 + 10) + '%' }"></div>
          </div>
          <span class="w-16 text-right text-text-2">{{ fmt(stats.avg) }}</span>
        </div>
        <div class="flex items-center gap-3 text-xs">
          <span class="w-12 text-text-3 shrink-0">最大</span>
          <div class="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
            <div class="h-full bg-danger/40 rounded-full" style="width: 100%"></div>
          </div>
          <span class="w-16 text-right text-text-2">{{ fmt(stats.max) }}</span>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-10 text-text-3 text-sm">
      请选择上方的一个数值列查看统计信息
    </div>
  </div>
</template>
