<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api, errMsg } from '../api'
import { useAuthStore } from '../stores/auth'
import ShareManager from '../components/ShareManager.vue'

interface PostItem {
  id: string
  title: string
  status: 'DRAFT' | 'PUBLISHED'
  createdAt: string
  updatedAt: string
  author: { username: string }
}

const auth = useAuthStore()
const posts = ref<PostItem[]>([])
const error = ref('')
const loaded = ref(false)
const shareFor = ref<string | null>(null) // 正在管理分享的文章 id

async function load() {
  error.value = ''
  try {
    posts.value = (await api.get<PostItem[]>('/posts')).data
  } catch (e) {
    error.value = errMsg(e)
  } finally {
    loaded.value = true
  }
}

async function removePost(id: string) {
  try {
    await ElMessageBox.confirm('删除后分享链接将一并失效，且不可恢复。', '确定删除这篇文章？', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    })
  } catch {
    return // 用户取消
  }
  try {
    await api.delete(`/posts/${id}`)
    ElMessage.success('文章已删除')
    await load()
  } catch (e) {
    error.value = errMsg(e)
  }
}

function fmt(ts: string) {
  return new Date(ts).toLocaleString('zh-CN', { hour12: false })
}

onMounted(load)
</script>

<template>
  <h2>文章列表</h2>
  <div style="margin-bottom: 16px">
    <el-button type="primary" tag="RouterLink" to="/posts/new">写文章</el-button>
  </div>
  <div v-if="error" class="error-box">{{ error }}</div>

  <!-- AC-4：首载骨架屏 -->
  <template v-if="!loaded">
    <el-card v-for="i in 3" :key="i" style="margin-bottom: 12px">
      <el-skeleton :rows="2" animated />
    </el-card>
  </template>

  <template v-else>
    <el-card v-for="p in posts" :key="p.id" style="margin-bottom: 12px">
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
        <RouterLink :to="`/posts/${p.id}`" style="font-weight: 600">{{ p.title }}</RouterLink>
        <el-tag v-if="p.status === 'DRAFT'" type="warning" size="small" effect="light">草稿</el-tag>
        <span class="spacer" style="flex: 1"></span>
        <div v-if="p.author.username === auth.user?.username" class="post-actions" style="display: inline-flex; gap: 8px">
          <el-button size="small" tag="RouterLink" :to="`/posts/${p.id}/edit`">编辑</el-button>
          <el-button size="small" @click="shareFor = shareFor === p.id ? null : p.id">
            {{ shareFor === p.id ? '收起分享' : '分享' }}
          </el-button>
          <el-button size="small" type="danger" plain @click="removePost(p.id)">删除</el-button>
        </div>
      </div>
      <div class="meta">
        作者 {{ p.author.username }} · 更新于 {{ fmt(p.updatedAt) }}
      </div>
      <ShareManager v-if="shareFor === p.id" :post-id="p.id" />
    </el-card>

    <!-- AC-4：空状态引导 -->
    <el-empty v-if="!posts.length && !error" description="还没有文章，发布第一篇吧">
      <el-button type="primary" tag="RouterLink" to="/posts/new">写文章</el-button>
    </el-empty>
  </template>
</template>
