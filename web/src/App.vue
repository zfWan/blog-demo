<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const auth = useAuthStore()

async function onLogout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <header class="topbar" v-if="auth.user">
    <span class="brand">Markdown 博客</span>
    <nav>
      <RouterLink to="/">文章列表</RouterLink>
    </nav>
    <span class="spacer"></span>
    <span class="who">{{ auth.user.username }}</span>
    <button @click="onLogout">退出登录</button>
  </header>
  <main>
    <RouterView />
  </main>
</template>
