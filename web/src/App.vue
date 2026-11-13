<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from './stores/auth'
import { useTheme } from './composables/useTheme'

const router = useRouter()
const auth = useAuthStore()
const { dark, toggle } = useTheme()

function onUserCommand(command: string) {
  if (command === 'profile') {
    router.push('/profile')
  } else if (command === 'logout') {
    onLogout()
  }
}

async function onLogout() {
  await auth.logout()
  ElMessage.success('已退出登录')
  router.push('/login')
}
</script>

<template>
  <!-- AC-2：已登录顶栏导航；未登录不渲染导航，登录/注册为居中卡片页 -->
  <header v-if="auth.user" class="topbar">
    <span class="brand">Markdown 博客</span>
    <nav>
      <RouterLink to="/">文章</RouterLink>
      <RouterLink to="/posts/new">写文章</RouterLink>
      <RouterLink to="/profile">个人中心</RouterLink>
    </nav>
    <span class="spacer"></span>
    <div class="actions">
      <el-button :title="dark ? '切换到浅色主题' : '切换到暗色主题'" text @click="toggle">
        {{ dark ? '🌙' : '☀️' }}
      </el-button>
      <el-dropdown @command="onUserCommand">
        <span class="user-entry">
          {{ auth.user.username }}
          <span style="font-size: 10px">▼</span>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">个人信息</el-dropdown-item>
            <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
  <main>
    <RouterView />
  </main>
</template>
