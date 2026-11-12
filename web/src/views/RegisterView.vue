<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, errMsg } from '../api'

const router = useRouter()
const email = ref('')
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await api.post('/auth/register', {
      email: email.value.trim(),
      username: username.value.trim(),
      password: password.value,
    })
    // 注册成功后直接带去登录页（账号已预填场景由用户自行输入）
    router.push('/login')
  } catch (e) {
    error.value = errMsg(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="card" style="max-width: 400px; margin: 48px auto">
    <h2>注册</h2>
    <div v-if="error" class="error-box">{{ error }}</div>
    <form @submit.prevent="submit">
      <label>邮箱</label>
      <input v-model="email" type="email" autocomplete="email" required />
      <label>用户名（2-20 位字母数字下划线中划线）</label>
      <input v-model="username" required />
      <label>密码（至少 8 位）</label>
      <input v-model="password" type="password" autocomplete="new-password" required />
      <div style="margin-top: 16px; display: flex; gap: 12px; align-items: center">
        <button class="primary" :disabled="loading" type="submit">注册</button>
        <RouterLink to="/login">已有账号？去登录</RouterLink>
      </div>
    </form>
  </div>
</template>
