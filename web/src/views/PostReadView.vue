<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api, errMsg } from '../api'

interface PostDetail {
  id: string
  title: string
  contentHtml: string
  status: 'DRAFT' | 'PUBLISHED'
  createdAt: string
  updatedAt: string
  author: { username: string }
}

const route = useRoute()
const post = ref<PostDetail | null>(null)
const error = ref('')

async function load(id: string) {
  post.value = null
  error.value = ''
  try {
    post.value = (await api.get<PostDetail>(`/posts/${id}`)).data
  } catch (e) {
    error.value = errMsg(e)
  }
}

function fmt(ts: string) {
  return new Date(ts).toLocaleString('zh-CN', { hour12: false })
}

onMounted(() => load(route.params.id as string))
watch(
  () => route.params.id,
  (id) => id && load(id as string),
)
</script>

<template>
  <div v-if="error" class="error-box">{{ error }}</div>
  <template v-else-if="post">
    <div class="card">
      <div style="display: flex; align-items: center; gap: 10px">
        <h2 style="margin: 0">{{ post.title }}</h2>
        <span v-if="post.status === 'DRAFT'" class="badge draft">草稿</span>
      </div>
      <div class="meta">
        作者 {{ post.author.username }} · 更新于 {{ fmt(post.updatedAt) }}
      </div>
    </div>
    <!-- 服务端 markdown-it(html:false) 渲染结果 -->
    <div class="card article-md" v-html="post.contentHtml"></div>
  </template>
  <p v-else class="meta">加载中…</p>
</template>
