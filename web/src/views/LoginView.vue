<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { errMsg } from '../api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const account = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(account.value.trim(), password.value)
    router.push((route.query.redirect as string) || '/')
  } catch (e) {
    error.value = errMsg(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-card class="auth-card">
    <h2>登录</h2>
    <!-- 表单类错误就近展示（DD6），不用 toast -->
    <div v-if="error" class="error-box">{{ error }}</div>
    <form @submit.prevent="submit">
      <label>用户名或邮箱</label>
      <el-input v-model="account" autocomplete="username" required />
      <label>密码</label>
      <el-input v-model="password" type="password" autocomplete="current-password" show-password required />
      <div style="margin-top: 16px; display: flex; gap: 12px; align-items: center">
        <el-button type="primary" native-type="submit" :loading="loading">登录</el-button>
        <RouterLink to="/register">没有账号？去注册</RouterLink>
      </div>
    </form>
  </el-card>
</template>

<style scoped>
.auth-card {
  max-width: 400px;
  margin: 48px auto;
}
</style>
