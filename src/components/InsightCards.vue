<script setup>
import { computed } from 'vue'
import { store, chartData, currentKPIs } from '../composables/useStore.js'
import { TrendingUp, TrendingDown, Sigma, BarChart3 } from '@lucide/vue'
import { fmt } from '../utils/aggregator.js'

const kpis = computed(() => {
  const computedKPIs = currentKPIs.value
  if (computedKPIs && computedKPIs.length) return computedKPIs

  // fallback: compute simple KPIs from current chart data
  const { headers, rows } = chartData.value
  const yIdxs = store.yColumns.map(y => headers.indexOf(y)).filter(i => i !== -1)
  if (!yIdxs.length) return []

  return yIdxs.map(idx => {
    const colName = headers[idx]
    const vals = rows.map(r => Number(r[idx])).filter(v => !isNaN(v))
    const sum = vals.reduce((a, b) => a + b, 0)
    const avg = vals.length ? sum / vals.length : 0
    const max = vals.length ? Math.max(...vals) : 0
    const min = vals.length ? Math.min(...vals) : 0
    return { metric: colName, total: sum, avg, max, min, count: vals.length }
  })
})

const cards = computed(() => {
  if (!kpis.value.length) return []
  const k = kpis.value[0]
  return [
    { label: k.metric + ' 总计', value: fmt(k.total), icon: Sigma, color: 'text-primary', bg: 'bg-primary/8', border: 'border-primary/15' },
    { label: '平均值', value: fmt(k.avg), icon: BarChart3, color: 'text-accent', bg: 'bg-accent/8', border: 'border-accent/15' },
    { label: '最大值', value: fmt(k.max), icon: TrendingUp, color: 'text-warn', bg: 'bg-warn/8', border: 'border-warn/15' },
    { label: '最小值', value: fmt(k.min), icon: TrendingDown, color: 'text-danger', bg: 'bg-danger/8', border: 'border-danger/15' },
  ]
})

const extraInsights = computed(() => {
  if (!kpis.value.length) return []
  const insights = []
  kpis.value.forEach(k => {
    if (k.maxDim && k.maxDim !== '-') {
      insights.push({ text: `${k.metric} 最高出现在「${k.maxDim}」`, type: 'up' })
    }
    if (k.minDim && k.minDim !== '-') {
      insights.push({ text: `${k.metric} 最低出现在「${k.minDim}」`, type: 'down' })
    }
  })
  return insights.slice(0, 4)
})
</script>

<template>
  <div class="space-y-4 animate-fade-in">
    <!-- KPI Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div
        v-for="card in cards"
        :key="card.label"
        class="bg-surface rounded-lg border p-4 flex items-start gap-3 transition-all"
        :class="card.border"
      >
        <div class="w-10 h-10 rounded-md flex items-center justify-center shrink-0" :class="card.bg">
          <component :is="card.icon" class="w-5 h-5" :class="card.color" />
        </div>
        <div class="min-w-0">
          <div class="text-xs text-text-3 font-medium">{{ card.label }}</div>
          <div class="text-xl font-bold text-text mt-1" style="font-family: 'Georgia', 'Times New Roman', serif;">{{ card.value }}</div>
        </div>
      </div>
    </div>

    <!-- Extra insights row -->
    <div v-if="extraInsights.length" class="flex flex-wrap gap-2">
      <div
        v-for="(ins, i) in extraInsights"
        :key="i"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium"
        :class="ins.type === 'up' ? 'bg-primary/5 text-primary border border-primary/10' : 'bg-danger/5 text-danger border border-danger/10'"
      >
        <component :is="ins.type === 'up' ? TrendingUp : TrendingDown" class="w-3.5 h-3.5" />
        {{ ins.text }}
      </div>
    </div>
  </div>
</template>
