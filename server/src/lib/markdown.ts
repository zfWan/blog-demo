import MarkdownIt from 'markdown-it';

/**
 * 服务端 Markdown 渲染，统一安全策略：
 * - html:false：内嵌 HTML 全部转义，天然防 XSS
 * - linkify：自动识别链接；breaks：单换行成 <br>
 */
const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

export function renderMarkdown(source: string): string {
  return md.render(source);
}
