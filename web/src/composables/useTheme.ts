import { ref } from 'vue'

const THEME_KEY = 'blog-theme'

/** 当前是否暗色（全局单例状态） */
const dark = ref(false)

function apply(value: boolean) {
  dark.value = value
  // 与 Element Plus 官方暗色变量（dark/css-vars.css）联动
  document.documentElement.classList.toggle('dark', value)
}

/** 应用启动时调用：localStorage 优先，否则跟随系统 prefers-color-scheme */
export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  apply(
    saved
      ? saved === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
}

/** 顶栏主题切换 */
export function useTheme() {
  function toggle() {
    apply(!dark.value)
    localStorage.setItem(THEME_KEY, dark.value ? 'dark' : 'light')
  }
  return { dark, toggle }
}
