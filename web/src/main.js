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

const supportedExternalFile = value => /\.(smm|xmind)$/i.test(value)

const decodeValue = value => {
  try {
    return decodeURIComponent(String(value || ''))
  } catch (error) {
    return String(value || '')
  }
}

const externalPathFromValue = value => {
  const source = decodeValue(value).replaceAll('\\', '/')
  if (/^file:\/\//i.test(source)) {
    try {
      return externalPathFromValue(new URL(source).pathname)
    } catch (error) {
      return ''
    }
  }
  if (/^https?:\/\//i.test(source)) {
    try {
      const url = new URL(source)
      return externalPathFromValue(url.searchParams.get('path') || url.searchParams.get('filePath') || url.searchParams.get('file_path'))
    } catch (error) {
      return ''
    }
  }
  return source.startsWith('/') && supportedExternalFile(source) ? source : ''
}

const launchTarget = () => {
  const url = new URL(window.location.href)
  const hashQuery = url.hash.includes('?') ? url.hash.slice(url.hash.indexOf('?') + 1) : ''
  const hashParams = new URLSearchParams(hashQuery)
  const keys = ['path', 'filePath', 'file_path', 'fileURL', 'fileUrl', 'file_url', 'url']
  const candidates = keys.flatMap(key => [url.searchParams.get(key), hashParams.get(key)])
  candidates.push(url.pathname.startsWith('/app/SimpleMindMap') ? url.pathname.slice('/app/SimpleMindMap'.length) : '')
  const externalPath = candidates.map(externalPathFromValue).find(Boolean)
  if (externalPath) return { externalPath }
  const fileURL = candidates.map(decodeValue).find(value => {
    try {
      return /^https?:\/\//i.test(value) && supportedExternalFile(new URL(value).pathname)
    } catch (error) {
      return false
    }
  })
  return fileURL ? { fileURL } : {}
}

const initApp = () => {
  i18n.locale = getLang()
  const { externalPath, fileURL } = launchTarget()
  if (externalPath && !router.currentRoute.query.path) {
    window.__simpleMindMapExternalPath = externalPath
    // Vue Router initializes from the hash when Vue mounts. Updating the hash
    // first prevents its initial `#/` route from racing and restoring Home.
    window.location.hash = `/edit?${new URLSearchParams({ path: externalPath }).toString()}`
  } else if (fileURL && !router.currentRoute.query.fileURL) {
    window.location.hash = `/edit?${new URLSearchParams({ fileURL }).toString()}`
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
