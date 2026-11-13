<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api, errMsg } from '../api'
import MarkdownContent from '../components/MarkdownContent.vue'

interface PostDetail {
  id: string
  title: string
  content: string
  status: 'DRAFT' | 'PUBLISHED'
  createdAt: string
  updatedAt: string
  author: { username: string }
}

const route = useRoute()
const post = ref<PostDetail | null>(null)
const error = ref('')
const loaded = ref(false)

async function load(id: string) {
  post.value = null
  loaded.value = false
  error.value = ''
  try {
    post.value = (await api.get<PostDetail>(`/posts/${id}`)).data
  } catch (e) {
    error.value = errMsg(e)
  } finally {
    loaded.value = true
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

  <!-- AC-4：详情首载骨架 -->
  <el-card v-else-if="!loaded">
    <el-skeleton :rows="6" animated />
  </el-card>

  <template v-else-if="post">
    <div class="card">
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
        <h2 style="margin: 0">{{ post.title }}</h2>
        <el-tag v-if="post.status === 'DRAFT'" type="warning" size="small" effect="light">草稿</el-tag>
      </div>
      <div class="meta">
        作者 {{ post.author.username }} · 更新于 {{ fmt(post.updatedAt) }}
      </div>
    </div>
    <!-- 前端统一渲染（DD5）：消费接口返回的 content 原文 -->
    <el-card>
      <MarkdownContent :source="post.content" />
    </el-card>
  </template>
</template>
