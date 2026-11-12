import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  plugins: [
    // Nest 装饰器依赖 emitDecoratorMetadata，esbuild 不支持，改用 swc 转译
    swc.vite({ module: { type: 'es6' } }),
  ],
});
