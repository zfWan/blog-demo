<script setup lang="ts">
import { onMounted, ref } from 'vue'
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
const shareFor = ref<string | null>(null) // 正在管理分享的文章 id

async function load() {
  error.value = ''
  try {
    posts.value = (await api.get<PostItem[]>('/posts')).data
  } catch (e) {
    error.value = errMsg(e)
  }
}

async function removePost(id: string) {
  if (!confirm('确定删除这篇文章？分享链接将一并失效。')) return
  try {
    await api.delete(`/posts/${id}`)
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
    <RouterLink to="/posts/new"><button class="primary">写文章</button></RouterLink>
  </div>
  <div v-if="error" class="error-box">{{ error }}</div>

  <div v-for="p in posts" :key="p.id" class="card">
    <div style="display: flex; align-items: center; gap: 10px">
      <RouterLink :to="`/posts/${p.id}`" style="font-weight: 600">{{ p.title }}</RouterLink>
      <span v-if="p.status === 'DRAFT'" class="badge draft">草稿</span>
      <span class="spacer" style="flex: 1"></span>
      <template v-if="p.author.username === auth.user?.username">
        <RouterLink :to="`/posts/${p.id}/edit`"><button>编辑</button></RouterLink>
        <button @click="shareFor = shareFor === p.id ? null : p.id">
          {{ shareFor === p.id ? '收起分享' : '分享' }}
        </button>
        <button class="danger" @click="removePost(p.id)">删除</button>
      </template>
    </div>
    <div class="meta">
      作者 {{ p.author.username }} · 更新于 {{ fmt(p.updatedAt) }}
    </div>
    <ShareManager v-if="shareFor === p.id" :post-id="p.id" />
  </div>

  <p v-if="!posts.length && !error" class="meta">还没有文章，点「写文章」发布第一篇吧。</p>
</template>
