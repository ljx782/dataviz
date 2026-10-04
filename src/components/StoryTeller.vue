<script setup>
import { computed } from 'vue'
import { store, chartData } from '../composables/useStore.js'
import { generateStory, generateSummary } from '../utils/storyGenerator.js'
import { BookOpen, Sparkles } from '@lucide/vue'

const stories = computed(() => {
  const { headers, rows, types } = chartData.value
  if (!rows.length) return []
  return generateStory({
    headers,
    rows,
    types,
    groupBy: store.useAggregation ? store.groupBy : store.xColumn,
    metrics: store.yColumns,
    agg: store.aggFunction,
    chartType: store.chartType,
  })
})

const summary = computed(() => {
  const { headers, rows, types } = chartData.value
  if (!rows.length) return ''
  return generateSummary({
    headers,
    rows,
    types,
    groupBy: store.useAggregation ? store.groupBy : store.xColumn,
    metrics: store.yColumns,
    agg: store.aggFunction,
  })
})

const typeStyles = {
  overview: { bg: 'bg-slate-50', border: 'border-slate-200', icon: '📊' },
  extreme: { bg: 'bg-amber-50', border: 'border-amber-200', icon: '🏆' },
  concentration: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: '🎯' },
  trend: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '📈' },
  anomaly: { bg: 'bg-rose-50', border: 'border-rose-200', icon: '⚡' },
  correlation: { bg: 'bg-violet-50', border: 'border-violet-200', icon: '🔗' },
}
</script>

<template>
  <div v-if="stories.length" class="story-teller bg-surface rounded-lg border border-border p-5 space-y-4 animate-fade-in">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center">
        <BookOpen class="w-4 h-4" />
      </div>
      <div>
        <div class="font-semibold text-text text-sm" style="font-family: 'STKaiti', 'KaiTi', serif;">数据故事</div>
        <div class="text-xs text-text-3">{{ summary }}</div>
      </div>
      <Sparkles class="w-4 h-4 text-amber-500 ml-auto" />
    </div>

    <div class="space-y-2.5">
      <div
        v-for="(story, idx) in stories"
        :key="idx"
        class="rounded-lg border p-3 text-sm leading-relaxed transition-all hover:shadow-sm"
        :class="[typeStyles[story.type]?.bg || 'bg-slate-50', typeStyles[story.type]?.border || 'border-slate-200']"
      >
        <span class="mr-1.5">{{ typeStyles[story.type]?.icon || '💡' }}</span>
        <span class="text-text">{{ story.text }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.story-teller {
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f1f5f9' fill-opacity='0.6'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}
</style>
