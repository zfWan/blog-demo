<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, errMsg } from '../api'

const route = useRoute()
const router = useRouter()
const postId = computed(() => route.params.id as string | undefined)

const title = ref('')
const content = ref('')
const status = ref<'DRAFT' | 'PUBLISHED'>('DRAFT')
const previewHtml = ref<string | null>(null) // null = 编辑态，非 null = 预览态
const error = ref('')
const loading = ref(false)
const loaded = ref(!postId.value)

onMounted(async () => {
  if (!postId.value) return
  try {
    const { data } = await api.get(`/posts/${postId.value}`)
    title.value = data.title
    content.value = data.content
    status.value = data.status
    loaded.value = true
  } catch (e) {
    error.value = errMsg(e)
  }
})

async function save(next: 'DRAFT' | 'PUBLISHED') {
  error.value = ''
  loading.value = true
  try {
    const body = { title: title.value.trim(), content: content.value, status: next }
    if (postId.value) {
      await api.patch(`/posts/${postId.value}`, body)
    } else {
      const { data } = await api.post<{ id: string }>('/posts', body)
      // 新建后跳到编辑地址，避免重复创建
      router.replace(`/posts/${data.id}/edit`)
    }
    status.value = next
  } catch (e) {
    error.value = errMsg(e)
  } finally {
    loading.value = false
  }
}

async function togglePreview() {
  error.value = ''
  if (previewHtml.value !== null) {
    previewHtml.value = null
    return
  }
  try {
    const { data } = await api.post<{ html: string }>('/posts/preview', {
      content: content.value,
    })
    previewHtml.value = data.html
  } catch (e) {
    error.value = errMsg(e)
  }
}
</script>

<template>
  <h2>{{ postId ? '编辑文章' : '写文章' }}</h2>
  <div v-if="!loaded" class="meta">加载中…</div>
  <template v-else>
    <div v-if="error" class="error-box">{{ error }}</div>
    <label>标题</label>
    <input v-model="title" maxlength="100" placeholder="文章标题" />
    <template v-if="previewHtml === null">
      <label>正文（Markdown）</label>
      <textarea v-model="content" class="editor" placeholder="支持 Markdown…"></textarea>
    </template>
    <template v-else>
      <label>预览</label>
      <!-- 服务端 markdown-it(html:false) 渲染结果，无内嵌 HTML -->
      <div class="card article-md" v-html="previewHtml"></div>
    </template>
    <div style="margin-top: 16px; display: flex; gap: 12px">
      <button @click="togglePreview">{{ previewHtml === null ? '预览' : '继续编辑' }}</button>
      <span class="spacer" style="flex: 1"></span>
      <button :disabled="loading" @click="save('DRAFT')">保存草稿</button>
      <button class="primary" :disabled="loading" @click="save('PUBLISHED')">
        {{ status === 'PUBLISHED' ? '保存并保持发布' : '发布' }}
      </button>
    </div>
  </template>
</template>
