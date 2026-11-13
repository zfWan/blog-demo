import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './style.css'
import App from './App.vue'
import router from './router'
import { initTheme } from './composables/useTheme'

// 挂载前先定主题，避免首帧闪白/闪黑
initTheme()
createApp(App).use(createPinia()).use(router).mount('#app')
