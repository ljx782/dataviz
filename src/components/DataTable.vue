<script setup>
import { computed, ref } from 'vue'
import { store } from '../composables/useStore.js'
import { ArrowLeft, ArrowRight, Search } from '@lucide/vue'

const pageSize = 15
const currentPage = ref(1)
const searchQuery = ref('')

const filteredRows = computed(() => {
  if (!searchQuery.value) return store.rows
  const q = searchQuery.value.toLowerCase()
  return store.rows.filter(row =>
    row.some(cell => String(cell).toLowerCase().includes(q))
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize)))

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredRows.value.slice(start, start + pageSize)
})

function goPage(p) {
  if (p >= 1 && p <= totalPages.value) currentPage.value = p
}

const typeBadge = {
  number: 'bg-primary/10 text-primary',
  string: 'bg-accent/10 text-accent',
  date: 'bg-warn/10 text-warn',
}

function typeLabel(t) {
  return t === 'number' ? '数值' : t === 'date' ? '日期' : '文本'
}
</script>

<template>
  <div class="space-y-4 animate-fade-in">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="text-sm text-text-2">
        共 <span class="font-semibold text-text">{{ store.rows.length }}</span> 行
        <span class="mx-1">·</span>
        <span class="font-semibold text-text">{{ store.headers.length }}</span> 列
      </div>
      <div class="relative">
        <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
        <input
          v-model="searchQuery"
          placeholder="搜索数据..."
          class="pl-9 pr-3 py-1.5 text-sm rounded-md border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="border border-border rounded-lg overflow-auto bg-surface" style="max-height: 520px;">
      <table class="w-full text-sm data-table">
        <thead>
          <tr>
            <th class="px-4 py-2.5 text-left text-xs font-semibold text-text-2 whitespace-nowrap">#</th>
            <th
              v-for="h in store.headers"
              :key="h"
              class="px-4 py-2.5 text-left text-xs font-semibold text-text-2 whitespace-nowrap"
            >
              <div class="flex items-center gap-2">
                <span>{{ h }}</span>
                <span
                  class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  :class="typeBadge[store.types[h]] || typeBadge.string"
                >
                  {{ typeLabel(store.types[h]) }}
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in paginatedRows" :key="idx">
            <td class="px-4 py-2 text-text-3 text-xs whitespace-nowrap">
              {{ (currentPage - 1) * pageSize + idx + 1 }}
            </td>
            <td
              v-for="(cell, cIdx) in row"
              :key="cIdx"
              class="px-4 py-2 text-text whitespace-nowrap"
            >
              {{ cell === '' ? '-' : cell }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between text-sm">
      <div class="text-text-3">
        显示 {{ filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0 }} -
        {{ Math.min(currentPage * pageSize, filteredRows.length) }} / {{ filteredRows.length }}
      </div>
      <div class="flex items-center gap-1">
        <button
          @click="goPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="p-1.5 rounded-lg border border-border hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft class="w-4 h-4" />
        </button>
        <span class="px-3 py-1 text-text-2">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <button
          @click="goPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="p-1.5 rounded-lg border border-border hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
