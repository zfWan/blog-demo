import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('渲染基础 Markdown', () => {
    const html = renderMarkdown('# 标题\n\n**加粗** 文本');
    expect(html).toContain('<h1>标题</h1>');
    expect(html).toContain('<strong>加粗</strong>');
  });

  it('内嵌 HTML 被转义（防 XSS）', () => {
    const html = renderMarkdown('hello <script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('img onerror 属性随标签一起转义', () => {
    const html = renderMarkdown('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('链接自动识别', () => {
    const html = renderMarkdown('visit https://example.com now');
    expect(html).toContain('<a href="https://example.com"');
  });
});
