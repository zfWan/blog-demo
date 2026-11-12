import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import PostListView from '../views/PostListView.vue'
import PostEditView from '../views/PostEditView.vue'
import PostReadView from '../views/PostReadView.vue'
import ShareView from '../views/ShareView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView, meta: { public: true } },
    { path: '/register', component: RegisterView, meta: { public: true } },
    { path: '/share/:token', component: ShareView, meta: { public: true } },
    { path: '/', component: PostListView },
    { path: '/posts/new', component: PostEditView },
    { path: '/posts/:id/edit', component: PostEditView },
    { path: '/posts/:id', component: PostReadView },
  ],
})

// 体验层守卫：真正的权限控制在 API 层（全局 JwtAuthGuard）
router.beforeEach(async (to) => {
  if (to.meta.public) return true
  const auth = useAuthStore()
  if (!auth.loaded) await auth.fetchMe()
  return auth.user ? true : { path: '/login', query: { redirect: to.fullPath } }
})

export default router
