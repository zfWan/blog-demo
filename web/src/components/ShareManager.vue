<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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
const loaded = ref(false)

async function load() {
  error.value = ''
  try {
    shares.value = (await api.get<ShareItem[]>(`/posts/${props.postId}/shares`)).data
  } catch (e) {
    error.value = errMsg(e)
  } finally {
    loaded.value = true
  }
}

async function create() {
  error.value = ''
  try {
    await api.post(`/posts/${props.postId}/shares`, {
      password: password.value || undefined,
    })
    password.value = ''
    ElMessage.success('分享链接已创建')
    await load()
  } catch (e) {
    error.value = errMsg(e)
  }
}

async function toggle(s: ShareItem) {
  error.value = ''
  try {
    await api.patch(`/shares/${s.id}`, { enabled: !s.enabled })
    ElMessage.success(s.enabled ? '分享已停用' : '分享已启用')
    await load()
  } catch (e) {
    error.value = errMsg(e)
  }
}

async function remove(s: ShareItem) {
  try {
    await ElMessageBox.confirm('删除后该链接将立即失效。', '确定删除该分享链接？', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return // 用户取消
  }
  error.value = ''
  try {
    await api.delete(`/shares/${s.id}`)
    ElMessage.success('分享已删除')
    await load()
  } catch (e) {
    error.value = errMsg(e)
  }
}

function fullUrl(s: ShareItem) {
  return `${location.origin}${s.url}`
}

async function copy(s: ShareItem) {
  try {
    await navigator.clipboard.writeText(fullUrl(s))
    ElMessage.success('链接已复制')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

function fmt(ts: string) {
  return new Date(ts).toLocaleString('zh-CN', { hour12: false })
}

onMounted(load)
</script>

<template>
  <div class="share-panel" style="margin-top: 12px; background: var(--c-bg); border-radius: 8px; padding: 12px 16px">
    <strong>分享管理</strong>
    <div v-if="error" class="error-box">{{ error }}</div>

    <div style="display: flex; gap: 8px; align-items: center; margin: 10px 0; flex-wrap: wrap">
      <el-input
        v-model="password"
        type="password"
        placeholder="访问密码（留空 = 免密分享，至少 6 位）"
        show-password
        style="max-width: 320px"
      />
      <el-button type="primary" @click="create">创建分享链接</el-button>
    </div>

    <template v-if="loaded">
      <div v-for="s in shares" :key="s.id" class="meta" style="display: flex; align-items: center; gap: 8px; margin: 8px 0; flex-wrap: wrap">
        <code class="share-url" style="word-break: break-all">{{ fullUrl(s) }}</code>
        <el-tag size="small" :type="s.hasPassword ? 'warning' : 'info'" effect="light">
          {{ s.hasPassword ? '密码访问' : '免密' }}
        </el-tag>
        <el-tag v-if="!s.enabled" size="small" type="info" effect="plain">已停用</el-tag>
        <span>{{ fmt(s.createdAt) }}</span>
        <span style="display: inline-flex; gap: 6px">
          <el-button size="small" @click="copy(s)">复制链接</el-button>
          <el-button size="small" @click="toggle(s)">{{ s.enabled ? '停用' : '启用' }}</el-button>
          <el-button size="small" type="danger" plain @click="remove(s)">删除</el-button>
        </span>
      </div>
      <el-empty v-if="!shares.length" description="还没有分享链接" :image-size="60" />
    </template>
    <el-skeleton v-else :rows="1" animated style="margin-top: 8px" />
  </div>
</template>
