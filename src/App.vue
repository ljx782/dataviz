<script setup>
import { computed } from 'vue'
import { store, clearData } from './composables/useStore.js'
import { auth, isLoggedIn, logout, initAuth } from './composables/useAuth.js'
import DataImporter from './components/DataImporter.vue'
import DataTable from './components/DataTable.vue'
import ChartConfig from './components/ChartConfig.vue'
import ChartRenderer from './components/ChartRenderer.vue'
import StatPanel from './components/StatPanel.vue'
import InsightCards from './components/InsightCards.vue'
import LoginView from './components/LoginView.vue'
import { BarChart3, Table2, Settings, PieChart, Trash2, LogOut, User, Lightbulb, Wand2 } from '@lucide/vue'
import StoryTeller from './components/StoryTeller.vue'
import AnomalyPanel from './components/AnomalyPanel.vue'
import NLCommand from './components/NLCommand.vue'
import TimeAnimation from './components/TimeAnimation.vue'

initAuth()

const hasData = computed(() => store.headers.length > 0)

const tabs = computed(() => [
  { key: 'import', label: '导入', icon: Settings, show: true },
  { key: 'table', label: '数据', icon: Table2, show: hasData.value },
  { key: 'chart', label: '图表', icon: PieChart, show: hasData.value },
  { key: 'stats', label: '统计', icon: BarChart3, show: hasData.value },
  { key: 'insight', label: '洞察', icon: Lightbulb, show: hasData.value },
])

const activeTabLabel = computed(() => {
  const t = tabs.value.find(t => t.key === store.activeTab)
  return t ? t.label : ''
})
</script>

<template>
  <LoginView v-if="!isLoggedIn" />
  <div v-else class="min-h-screen bg-surface-2 flex flex-col">
    <!-- Header -->
    <header class="bg-surface border-b border-border">
      <div class="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-md bg-primary text-white flex items-center justify-center" style="font-family: 'Georgia', serif;">
            <BarChart3 class="w-4 h-4" />
          </div>
          <span class="font-bold text-text" style="font-family: 'STKaiti', 'KaiTi', serif; font-size: 1.15rem;">DataViz</span>
        </div>

        <nav class="flex items-center gap-0.5 bg-surface-2 rounded-md p-0.5 border border-border">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            v-show="tab.show"
            @click="store.activeTab = tab.key"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm font-medium transition-all"
            :class="store.activeTab === tab.key ? 'bg-primary text-white' : 'text-text-2 hover:text-text hover:bg-surface-3'"
          >
            <component :is="tab.icon" class="w-4 h-4" />
            <span class="hidden sm:inline">{{ tab.label }}</span>
          </button>
        </nav>

        <div class="flex items-center gap-2">
          <div class="flex items-center gap-2 mr-1">
            <div class="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <User class="w-3.5 h-3.5" />
            </div>
            <span class="text-sm text-text hidden sm:inline">{{ auth.user?.username }}</span>
          </div>
          <button
            v-if="hasData"
            @click="clearData"
            class="p-2 rounded-md text-text-3 hover:text-danger hover:bg-danger/10 transition-colors"
            title="清空数据"
          >
            <Trash2 class="w-4 h-4" />
          </button>
          <button
            @click="logout"
            class="p-2 rounded-md text-text-3 hover:text-danger hover:bg-danger/10 transition-colors"
            title="退出登录"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 py-6">
      <!-- Empty state hint on import page when data exists -->
      <div v-if="hasData && store.activeTab === 'import'" class="mb-4 p-3 rounded-md bg-primary/5 border border-primary/20 text-sm text-primary flex items-center justify-between">
        <span>数据已加载，共 {{ store.rows.length }} 行 × {{ store.headers.length }} 列，可前往图表或统计页查看。</span>
        <button @click="store.activeTab = 'chart'" class="underline font-medium">去图表页</button>
      </div>

      <div class="grid grid-cols-1 gap-6">
        <template v-if="store.activeTab === 'chart' && hasData">
          <!-- Insight KPI Cards -->
          <InsightCards class="mb-2" />

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <!-- Left Sidebar: NLCommand + ChartConfig -->
            <div class="lg:col-span-4 space-y-4">
              <NLCommand />
              <div class="bg-surface rounded-lg border border-border p-5 sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto">
                <div class="flex items-center gap-2 font-semibold text-text mb-4" style="font-family: 'STKaiti', 'KaiTi', serif;">
                  <Settings class="w-4 h-4 text-primary" />
                  图表配置
                </div>
                <ChartConfig />
              </div>
            </div>
            <!-- Right: TimeAnimation + Chart Renderer + StoryTeller -->
            <div class="lg:col-span-8 space-y-4">
              <TimeAnimation />
              <ChartRenderer />
              <StoryTeller />
            </div>
          </div>
        </template>

        <template v-else-if="store.activeTab === 'import'">
          <DataImporter />
        </template>

        <template v-else-if="store.activeTab === 'table' && hasData">
          <div class="bg-surface rounded-lg border border-border p-5">
            <div class="flex items-center gap-2 font-semibold text-text mb-4" style="font-family: 'STKaiti', 'KaiTi', serif;">
              <Table2 class="w-4 h-4 text-primary" />
              数据预览
            </div>
            <DataTable />
          </div>
        </template>

        <template v-else-if="store.activeTab === 'stats' && hasData">
          <div class="bg-surface rounded-lg border border-border p-5">
            <div class="flex items-center gap-2 font-semibold text-text mb-4" style="font-family: 'STKaiti', 'KaiTi', serif;">
              <BarChart3 class="w-4 h-4 text-primary" />
              统计分析
            </div>
            <StatPanel />
          </div>
        </template>

        <template v-else-if="store.activeTab === 'insight' && hasData">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnomalyPanel />
            <StoryTeller />
          </div>
        </template>

        <template v-else>
          <div class="text-center py-20 text-text-3">
            请先导入数据
          </div>
        </template>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-border bg-surface mt-auto">
      <div class="max-w-7xl mx-auto px-4 py-4 text-xs text-text-3 text-center" style="font-family: 'STKaiti', 'KaiTi', serif;">
        DataViz · 数据可视化手账
      </div>
    </footer>
  </div>
</template>
