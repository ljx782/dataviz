<script setup>
import { ref, watch } from 'vue'
import { auth, login, register } from '../composables/useAuth.js'
import { BarChart3, LogIn, UserPlus, Eye, EyeOff } from '@lucide/vue'

const mode = ref('login') // 'login' | 'register'
const username = ref('')
const password = ref('')
const showPassword = ref(false)

watch(mode, () => {
  auth.error = ''
})

function handleSubmit() {
  if (mode.value === 'login') {
    const ok = login(username.value, password.value)
    if (ok) {
      username.value = ''
      password.value = ''
    }
  } else {
    const ok = register(username.value, password.value)
    if (ok) {
      // Auto login after register
      login(username.value, password.value)
      username.value = ''
      password.value = ''
    }
  }
}
</script>

<template>
  <div class="min-h-screen bg-surface-2 flex items-center justify-center p-4">
    <div class="w-full max-w-md animate-fade-in">
      <!-- Logo Header -->
      <div class="text-center mb-8">
        <div class="w-14 h-14 rounded-lg bg-primary text-white flex items-center justify-center mx-auto mb-4">
          <BarChart3 class="w-7 h-7" />
        </div>
        <h1 class="text-2xl font-bold text-text" style="font-family: 'STKaiti', 'KaiTi', serif;">DataViz</h1>
        <p class="text-text-2 text-sm mt-1">数据可视化手账</p>
      </div>

      <!-- Card -->
      <div class="bg-surface rounded-lg border border-border p-6 sm:p-8">
        <!-- Tabs -->
        <div class="flex items-center gap-1 bg-surface-2 rounded-md p-1 mb-6 border border-border">
          <button
            @click="mode = 'login'"
            class="flex-1 flex items-center justify-center gap-2 py-2 rounded-sm text-sm font-medium transition-all"
            :class="mode === 'login' ? 'bg-primary text-white' : 'text-text-2 hover:text-text'"
          >
            <LogIn class="w-4 h-4" />
            登录
          </button>
          <button
            @click="mode = 'register'"
            class="flex-1 flex items-center justify-center gap-2 py-2 rounded-sm text-sm font-medium transition-all"
            :class="mode === 'register' ? 'bg-primary text-white' : 'text-text-2 hover:text-text'"
          >
            <UserPlus class="w-4 h-4" />
            注册
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-text mb-1.5">用户名</label>
            <input
              v-model="username"
              type="text"
              placeholder="请输入用户名"
              class="w-full px-3.5 py-2.5 rounded-md border border-border bg-surface text-text placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-text mb-1.5">密码</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                class="w-full px-3.5 py-2.5 pr-10 rounded-md border border-border bg-surface text-text placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text transition-colors"
              >
                <Eye v-if="showPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div v-if="auth.error" class="p-3 rounded-md bg-danger/10 border border-danger/20 text-sm text-danger">
            {{ auth.error }}
          </div>

          <button
            type="submit"
            :disabled="auth.loading"
            class="w-full py-2.5 rounded-md bg-primary text-white font-medium text-sm hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {{ mode === 'login' ? '登录' : '注册' }}
          </button>
        </form>

        <div class="mt-6 text-center text-xs text-text-3">
          <p v-if="mode === 'login'">还没有账号？点击上方「注册」创建新账号</p>
          <p v-else>已有账号？点击上方「登录」进入系统</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-6 text-center text-xs text-text-3" style="font-family: 'STKaiti', 'KaiTi', serif;">
        DataViz · 数据可视化手账
      </div>
    </div>
  </div>
</template>
