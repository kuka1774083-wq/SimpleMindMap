import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import '@/assets/icon-font/iconfont.css'
import 'viewerjs/dist/viewer.css'
import VueViewer from 'v-viewer'
import i18n from './i18n'
import { getLang } from '@/api'
// import VConsole from 'vconsole'
// const vConsole = new VConsole()

Vue.config.productionTip = false
const bus = new Vue()
Vue.prototype.$bus = bus
Vue.use(ElementUI)
Vue.use(VueViewer)

const initApp = () => {
  i18n.locale = getLang()
  // fnOS appends the file-manager path before the hash. Move it into the
  // hash route so Vue Router can retain the external-file editing session.
  const hashQuery = window.location.hash.includes('?')
    ? window.location.hash.slice(window.location.hash.indexOf('?') + 1)
    : ''
  const externalPath = new URLSearchParams(window.location.search).get('path') || new URLSearchParams(hashQuery).get('path')
  if (externalPath && !router.currentRoute.query.path) {
    window.__simpleMindMapExternalPath = externalPath
    router.replace({ path: '/edit', query: { path: externalPath } })
  }
  new Vue({
    render: h => h(App),
    router,
    store,
    i18n
  }).$mount('#app')
}

// 是否处于接管应用模式
if (window.takeOverApp) {
  window.initApp = initApp
  window.$bus = bus
} else {
  initApp()
}
