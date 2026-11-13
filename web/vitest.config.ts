import { defineConfig } from 'vitest/config'

// 前端渲染单测（纯函数，node 环境即可）；构建走 vite.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
