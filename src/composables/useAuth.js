import { reactive, computed } from 'vue'

const STORAGE_KEY = 'dataviz_auth'
const USERS_KEY = 'dataviz_users'

// Simple hash for demo purpose (not cryptographically secure)
function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash.toString(16)
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function getStoredAuth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

export const auth = reactive({
  user: getStoredAuth(),
  error: '',
  loading: false,
})

export const isLoggedIn = computed(() => !!auth.user)

export function register(username, password) {
  auth.error = ''
  if (!username || !password) {
    auth.error = '用户名和密码不能为空'
    return false
  }
  if (username.length < 3) {
    auth.error = '用户名至少 3 个字符'
    return false
  }
  if (password.length < 6) {
    auth.error = '密码至少 6 位'
    return false
  }
  const users = getUsers()
  if (users[username]) {
    auth.error = '用户名已存在'
    return false
  }
  users[username] = {
    username,
    passwordHash: simpleHash(password),
    createdAt: new Date().toISOString(),
  }
  saveUsers(users)
  return true
}

export function login(username, password) {
  auth.error = ''
  auth.loading = true
  if (!username || !password) {
    auth.error = '用户名和密码不能为空'
    auth.loading = false
    return false
  }
  const users = getUsers()
  const user = users[username]
  if (!user) {
    auth.error = '用户不存在'
    auth.loading = false
    return false
  }
  if (user.passwordHash !== simpleHash(password)) {
    auth.error = '密码错误'
    auth.loading = false
    return false
  }
  auth.user = {
    username: user.username,
    createdAt: user.createdAt,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth.user))
  auth.loading = false
  return true
}

export function logout() {
  auth.user = null
  localStorage.removeItem(STORAGE_KEY)
}

export function initAuth() {
  const stored = getStoredAuth()
  if (stored && stored.username) {
    const users = getUsers()
    if (users[stored.username]) {
      auth.user = stored
    } else {
      logout()
    }
  }
}
