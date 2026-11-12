<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, errMsg } from '../api'

interface ShareItem {
  id: string
  token: string
  url: string
  enabled: boolean
  hasPassword: boolean
  createdAt: string
}

const props = defineProps<{ postId: string }>()

const shares = ref<ShareItem[]>([])
const password = ref('')
const error = ref('')
const copied = ref('')

async function load() {
  error.value = ''
  try {
    shares.value = (await api.get<ShareItem[]>(`/posts/${props.postId}/shares`)).data
  } catch (e) {
    error.value = errMsg(e)
  }
}

async function create() {
  error.value = ''
  try {
    await api.post(`/posts/${props.postId}/shares`, {
      password: password.value || undefined,
    })
    password.value = ''
    await load()
  } catch (e) {
    error.value = errMsg(e)
  }
}

async function toggle(s: ShareItem) {
  error.value = ''
  try {
    await api.patch(`/shares/${s.id}`, { enabled: !s.enabled })
    await load()
  } catch (e) {
    error.value = errMsg(e)
  }
}

async function remove(s: ShareItem) {
  if (!confirm('确定删除该分享链接？')) return
  error.value = ''
  try {
    await api.delete(`/shares/${s.id}`)
    await load()
  } catch (e) {
    error.value = errMsg(e)
  }
}

function fullUrl(s: ShareItem) {
  return `${location.origin}${s.url}`
}

async function copy(s: ShareItem) {
  await navigator.clipboard.writeText(fullUrl(s))
  copied.value = s.id
  setTimeout(() => (copied.value = ''), 1500)
}

function fmt(ts: string) {
  return new Date(ts).toLocaleString('zh-CN', { hour12: false })
}

onMounted(load)
</script>

<template>
  <div class="share-panel card" style="margin-top: 12px; background: #fafbfc">
    <strong>分享管理</strong>
    <div v-if="error" class="error-box">{{ error }}</div>

    <div style="display: flex; gap: 8px; align-items: center; margin: 10px 0">
      <input
        v-model="password"
        type="password"
        placeholder="访问密码（留空 = 免密分享，至少 6 位）"
        style="max-width: 320px"
      />
      <button class="primary" @click="create">创建分享链接</button>
    </div>

    <div v-for="s in shares" :key="s.id" class="meta" style="margin: 6px 0">
      <code>{{ fullUrl(s) }}</code>
      <span class="badge" style="margin-left: 8px">{{ s.hasPassword ? '密码访问' : '免密' }}</span>
      <span v-if="!s.enabled" class="badge" style="margin-left: 4px">已停用</span>
      <span style="margin-left: 8px">{{ fmt(s.createdAt) }}</span>
      <span style="margin-left: 12px; display: inline-flex; gap: 6px">
        <button @click="copy(s)">{{ copied === s.id ? '已复制' : '复制链接' }}</button>
        <button @click="toggle(s)">{{ s.enabled ? '停用' : '启用' }}</button>
        <button class="danger" @click="remove(s)">删除</button>
      </span>
    </div>
    <p v-if="!shares.length" class="meta">还没有分享链接。</p>
  </div>
</template>
