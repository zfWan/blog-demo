<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api, errMsg } from '../api'
import { useAuthStore } from '../stores/auth'

interface PostItem {
  id: string
  title: string
  status: 'DRAFT' | 'PUBLISHED'
  updatedAt: string
  author: { username: string }
}

const auth = useAuthStore()
const myPosts = ref<PostItem[]>([])
const loading = ref(true)
const error = ref('')

// A2 约束：仅复用现有接口，不新增后端
const mine = computed(() =>
  myPosts.value.filter((p) => p.author.username === auth.user?.username),
)

function fmt(ts: string) {
  return new Date(ts).toLocaleString('zh-CN', { hour12: false })
}

onMounted(async () => {
  try {
    myPosts.value = (await api.get<PostItem[]>('/posts')).data
  } catch (e) {
    error.value = errMsg(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <h2>个人中心</h2>
  <div v-if="error" class="error-box">{{ error }}</div>

  <el-card v-loading="loading">
    <template #header><strong>我的信息</strong></template>
    <template v-if="auth.user">
      <p style="margin: 0 0 8px"><span class="meta">用户名：</span>{{ auth.user.username }}</p>
      <p style="margin: 0"><span class="meta">邮箱：</span>{{ auth.user.email }}</p>
    </template>
  </el-card>

  <el-card>
    <template #header><strong>我的文章（{{ mine.length }}）</strong></template>
    <template v-if="!loading">
      <div v-for="p in mine" :key="p.id" class="meta" style="display: flex; align-items: center; gap: 10px; margin: 8px 0">
        <RouterLink :to="`/posts/${p.id}`" style="font-weight: 600">{{ p.title }}</RouterLink>
        <span v-if="p.status === 'DRAFT'" class="badge draft">草稿</span>
        <span style="flex: 1"></span>
        <span>{{ fmt(p.updatedAt) }}</span>
        <RouterLink :to="`/posts/${p.id}/edit`">编辑</RouterLink>
      </div>
      <el-empty v-if="!mine.length" description="还没有文章" :image-size="80">
        <el-button type="primary" tag="RouterLink" to="/posts/new">去写文章</el-button>
      </el-empty>
    </template>
  </el-card>
</template>
