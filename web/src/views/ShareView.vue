<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api, errMsg } from '../api'

interface SharedPost {
  id: string
  title: string
  contentHtml: string
  authorUsername: string
  updatedAt: string
}

const route = useRoute()
const post = ref<SharedPost | null>(null)
const needPassword = ref(false)
const password = ref('')
const error = ref('')
const lockedMsg = ref('')

async function load(token: string) {
  post.value = null
  needPassword.value = false
  error.value = ''
  try {
    post.value = (
      await api.get<{ post: SharedPost; hasPassword: boolean }>(`/share/${token}`)
    ).data.post
  } catch (e) {
    const resp = (e as { response?: { data?: { needPassword?: boolean; message?: string } } })
      .response
    if (resp?.data?.needPassword) {
      needPassword.value = true
      lockedMsg.value = resp.data.message ?? '该分享需要密码访问'
    } else {
      error.value = errMsg(e)
    }
  }
}

async function unlock() {
  error.value = ''
  const token = route.params.token as string
  try {
    await api.post(`/share/${token}/unlock`, { password: password.value })
    await load(token)
  } catch (e) {
    error.value = errMsg(e)
  }
}

function fmt(ts: string) {
  return new Date(ts).toLocaleString('zh-CN', { hour12: false })
}

onMounted(() => load(route.params.token as string))
watch(
  () => route.params.token,
  (t) => t && load(t as string),
)
</script>

<template>
  <div v-if="needPassword" class="card" style="max-width: 400px; margin: 48px auto">
    <h2>密码访问</h2>
    <p class="meta">{{ lockedMsg }}</p>
    <div v-if="error" class="error-box">{{ error }}</div>
    <form @submit.prevent="unlock">
      <label>分享密码</label>
      <input v-model="password" type="password" autofocus required />
      <div style="margin-top: 16px">
        <button class="primary" type="submit">解锁查看</button>
      </div>
    </form>
  </div>

  <div v-else-if="error" class="error-box">{{ error }}</div>

  <template v-else-if="post">
    <div class="card">
      <h2 style="margin: 0">{{ post.title }}</h2>
      <div class="meta">
        作者 {{ post.authorUsername }} · 更新于 {{ fmt(post.updatedAt) }} · 通过分享链接访问
      </div>
    </div>
    <!-- 服务端 markdown-it(html:false) 渲染结果 -->
    <div class="card article-md" v-html="post.contentHtml"></div>
  </template>
  <p v-else class="meta">加载中…</p>
</template>
