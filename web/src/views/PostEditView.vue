<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { EditorView } from '@codemirror/view'
import { EditorView as EditorViewExt } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { Codemirror } from 'vue-codemirror'
import { api, errMsg } from '../api'
import MarkdownContent from '../components/MarkdownContent.vue'

const route = useRoute()
const router = useRouter()
const postId = computed(() => route.params.id as string | undefined)

const title = ref('')
const content = ref('')
const status = ref<'DRAFT' | 'PUBLISHED'>('DRAFT')
const error = ref('')
const loading = ref(false)
const loaded = ref(!postId.value)

// ---- CodeMirror 6 编辑器（AC-8/DD2）----
const extensions = [markdown(), EditorViewExt.lineWrapping]
let editorView: EditorView | null = null

function onEditorReady(payload: { view: EditorView }) {
  editorView = payload.view
}

onBeforeUnmount(() => {
  editorView = null
})

/** 工具栏：把选中文本用 before/after 包裹（仅文本包裹，不做富文本） */
function wrapSelection(before: string, after: string, placeholder: string) {
  if (!editorView) return
  const { from, to } = editorView.state.selection.main
  const selected = editorView.state.sliceDoc(from, to) || placeholder
  editorView.dispatch({
    changes: { from, to, insert: `${before}${selected}${after}` },
    selection: { anchor: from + before.length, head: from + before.length + selected.length },
  })
  editorView.focus()
}

const toolbarItems = [
  { label: 'B', title: '加粗', before: '**', after: '**', placeholder: '加粗文本' },
  { label: 'I', title: '斜体', before: '*', after: '*', placeholder: '斜体文本' },
  { label: 'H', title: '标题', before: '## ', after: '', placeholder: '标题' },
  { label: '</>', title: '代码块', before: '\n```\n', after: '\n```\n', placeholder: '代码' },
  { label: '🔗', title: '链接', before: '[', after: '](https://)', placeholder: '链接文本' },
]

// ---- 窄屏页签（AC-5/DD2：≤768px 编辑/预览切换）----
const isNarrow = ref(window.matchMedia('(max-width: 768px)').matches)
const mobilePane = ref<'edit' | 'preview'>('edit')
function onMediaChange(e: MediaQueryListEvent) {
  isNarrow.value = e.matches
}
let mediaList: MediaQueryList | null = null
onMounted(() => {
  mediaList = window.matchMedia('(max-width: 768px)')
  mediaList.addEventListener('change', onMediaChange)
})
onBeforeUnmount(() => mediaList?.removeEventListener('change', onMediaChange))

const showEditor = computed(() => !isNarrow.value || mobilePane.value === 'edit')
const showPreview = computed(() => !isNarrow.value || mobilePane.value === 'preview')

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
    ElMessage.success(next === 'DRAFT' ? '草稿已保存' : '已发布')
  } catch (e) {
    ElMessage.error(errMsg(e))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <h2>{{ postId ? '编辑文章' : '写文章' }}</h2>
  <div v-if="error" class="error-box">{{ error }}</div>

  <div v-if="!loaded && !error" v-loading="true" style="min-height: 240px"></div>

  <template v-else>
    <label>标题</label>
    <el-input v-model="title" maxlength="100" placeholder="文章标题" />

    <!-- 窄屏页签 -->
    <div v-if="isNarrow" style="display: flex; gap: 8px; margin: 12px 0">
      <el-button size="small" :type="mobilePane === 'edit' ? 'primary' : 'default'" @click="mobilePane = 'edit'">编辑</el-button>
      <el-button size="small" :type="mobilePane === 'preview' ? 'primary' : 'default'" @click="mobilePane = 'preview'">预览</el-button>
    </div>

    <!-- 工具栏：仅做 Markdown 文本包裹 -->
    <div style="display: flex; gap: 6px; margin: 12px 0; flex-wrap: wrap">
      <el-button
        v-for="item in toolbarItems"
        :key="item.label"
        size="small"
        :title="item.title"
        style="min-width: 36px; font-weight: 600"
        @click="wrapSelection(item.before, item.after, item.placeholder)"
      >{{ item.label }}</el-button>
    </div>

    <div class="editor-split">
      <div v-show="showEditor" class="editor-pane">
        <div class="pane-title">编辑（Markdown）</div>
        <div class="editor-host">
          <Codemirror
            v-model="content"
            :extensions="extensions"
            placeholder="支持 Markdown…"
            @ready="onEditorReady"
          />
        </div>
      </div>
      <div v-show="showPreview" class="editor-pane preview-pane">
        <div class="pane-title">预览（与阅读页渲染一致）</div>
        <!-- 复用统一渲染组件（DD5/DD2）：三处渲染一致 -->
        <MarkdownContent class="preview-body" :source="content" />
      </div>
    </div>

    <div style="margin-top: 16px; display: flex; gap: 12px; flex-wrap: wrap">
      <span class="spacer" style="flex: 1"></span>
      <el-button :disabled="loading" @click="save('DRAFT')">保存草稿</el-button>
      <el-button type="primary" :disabled="loading" @click="save('PUBLISHED')">
        {{ status === 'PUBLISHED' ? '保存并保持发布' : '发布' }}
      </el-button>
    </div>
  </template>
</template>

<style scoped>
.preview-body {
  padding: 12px 16px;
}
</style>
