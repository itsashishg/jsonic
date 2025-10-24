import { createRouter, createWebHistory } from 'vue-router'

const JsonViewerView = () => import('../views/JsonViewerView.vue')
const JsonCompareView = () => import('../views/JsonCompareView.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'viewer',
      component: JsonViewerView,
    },
    {
      path: '/compare',
      name: 'compare',
      component: JsonCompareView,
    },
  ],
})

export default router
