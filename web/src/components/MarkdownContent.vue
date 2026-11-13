<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '../utils/markdown'

/** 统一 Markdown 渲染组件（DD5）：阅读页/分享页/编辑器预览共用同一渲染管线 */
const props = defineProps<{ source: string }>()

const html = computed(() => renderMarkdown(props.source))
</script>

<template>
  <!-- markdown-it html:false 渲染结果，内嵌 HTML 已转义 -->
  <div class="article-md" v-html="html"></div>
</template>
