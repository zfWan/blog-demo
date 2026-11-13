import MarkdownIt from 'markdown-it'

/**
 * 前端统一 Markdown 渲染入口（阅读页/分享页/编辑器预览共用，DD5）。
 * 配置与原服务端 renderMarkdown 逐项一致，保证防注入行为与渲染结果等效：
 * - html:false：内嵌 HTML 全部转义，天然防 XSS
 * - linkify：自动识别链接；breaks：单换行成 <br>
 */
const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

export function renderMarkdown(source: string): string {
  return md.render(source)
}
