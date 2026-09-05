<template>
  <div class="toolbarContainer" :class="{ isDark: isDark }">
    <div v-if="!isMobile" class="toolbar" ref="toolbarRef">
      <!-- 节点操作 -->
      <div class="toolbarBlock">
        <ToolbarNodeBtnList :list="horizontalList"></ToolbarNodeBtnList>
        <!-- 更多 -->
        <el-popover
          v-model="popoverShow"
          placement="bottom-end"
          width="120"
          trigger="hover"
          v-if="showMoreBtn"
          :style="{ marginLeft: horizontalList.length > 0 ? '20px' : 0 }"
        >
          <ToolbarNodeBtnList
            dir="v"
            :list="verticalList"
            @click.native="popoverShow = false"
          ></ToolbarNodeBtnList>
          <div slot="reference" class="toolbarBtn">
            <span class="icon iconfont icongongshi"></span>
            <span class="text">{{ $t('toolbar.more') }}</span>
          </div>
        </el-popover>
      </div>
      <!-- 文件操作 -->
      <div class="toolbarBlock">
        <div class="toolbarBtn" @click="backHome">
          <span class="icon el-icon-back"></span>
          <span class="text">返回</span>
        </div>
        <div class="toolbarBtn" @click="saveCloud">
          <span class="icon el-icon-document-checked"></span>
          <span class="text">保存</span>
        </div>
        <div class="documentInfo" :title="activePath">
          <span class="documentPath">{{ directory }}</span>
          <span class="documentName">{{ fileName }}</span>
        </div>
        <!-- 本地文件树 -->
        <div
          class="fileTreeBox"
          v-if="fileTreeVisible"
          :class="{ expand: fileTreeExpand }"
        >
          <div class="fileTreeToolbar">
            <div class="fileTreeName">
              {{ rootDirName ? '/' + rootDirName : '' }}
            </div>
            <div class="fileTreeActionList">
              <div
                class="btn"
                :class="[
                  fileTreeExpand ? 'el-icon-arrow-up' : 'el-icon-arrow-down'
                ]"
                @click="fileTreeExpand = !fileTreeExpand"
              ></div>
              <div
                class="btn el-icon-close"
                @click="fileTreeVisible = false"
              ></div>
            </div>
          </div>
          <div class="fileTreeWrap">
            <el-tree
              :props="fileTreeProps"
              :load="loadFileTreeNode"
              :expand-on-click-node="false"
              node-key="id"
              lazy
            >
              <span class="customTreeNode" slot-scope="{ node, data }">
                <div class="treeNodeInfo">
                  <span
                    class="treeNodeIcon iconfont"
                    :class="[
                      data.type === 'file' ? 'iconwenjian' : 'icondakai'
                    ]"
                  ></span>
                  <span class="treeNodeName">{{ node.label }}</span>
                </div>
                <div class="treeNodeBtnList" v-if="data.type === 'file'">
                  <el-button
                    type="text"
                    size="mini"
                    v-if="data.enableEdit"
                    @click="editLocalFile(data)"
                    >编辑</el-button
                  >
                  <el-button
                    type="text"
                    size="mini"
                    v-else
                    @click="importLocalFile(data)"
                    >导入</el-button
                  >
                </div>
              </span>
            </el-tree>
          </div>
        </div>
      </div>
      <div class="toolbarBlock transferBlock">
        <div class="toolbarBtn" @click="downloadCloud">
          <span class="icon el-icon-download"></span>
          <span class="text">下载</span>
        </div>
        <div class="toolbarBtn" @click="$bus.$emit('showExport')" style="margin-right: 0;">
          <span class="icon el-icon-share"></span>
          <span class="text">导出为</span>
        </div>
      </div>
    </div>
    <div v-else class="mobileToolbar">
      <div class="toolbarBtn" @click="backHome">
        <span class="icon el-icon-back"></span>
        <span class="text">返回</span>
      </div>
      <div class="toolbarBtn" @click="saveCloud">
        <span class="icon el-icon-document-checked"></span>
        <span class="text">保存</span>
      </div>
      <ToolbarNodeBtnList :list="mobilePrimaryList"></ToolbarNodeBtnList>
      <el-popover v-model="mobileMoreOpen" placement="top-end" width="168" trigger="click">
        <div class="mobileMoreMenu">
          <ToolbarNodeBtnList dir="v" :list="mobileMoreList" @click.native="mobileMoreOpen = false"></ToolbarNodeBtnList>
          <div class="mobileMoreAction" @click="downloadCloud; mobileMoreOpen = false"><span class="mobileMoreActionIcon el-icon-download"></span><span>下载</span></div>
          <div class="mobileMoreAction" @click="$bus.$emit('showExport'); mobileMoreOpen = false"><span class="mobileMoreActionIcon el-icon-share"></span><span>导出为</span></div>
        </div>
        <div slot="reference" class="toolbarBtn mobileMoreTrigger">
          <span class="icon el-icon-more"></span>
          <span class="text">更多</span>
        </div>
      </el-popover>
    </div>
    <NodeImage></NodeImage>
    <NodeHyperlink></NodeHyperlink>
    <NodeIcon></NodeIcon>
    <NodeNote></NodeNote>
    <NodeTag></NodeTag>
    <Export></Export>
    <Import ref="ImportRef"></Import>
    <el-dialog title="离开本地文件" :visible.sync="leaveLocalOpen" width="440px" :close-on-click-modal="false">
      <p>该文件尚未保存到云端。您可以保存到云端、下载到本地，或不保存直接返回。</p>
      <span slot="footer">
        <el-button @click="leaveLocalOpen = false">取消</el-button>
        <el-button @click="downloadAndLeave">下载到本地</el-button>
        <el-button type="primary" @click="openCloudSaveDialog(true)">保存到云端</el-button>
        <el-button type="danger" @click="discardAndLeave">不保存并返回</el-button>
      </span>
    </el-dialog>
    <el-dialog title="保存到云端" :visible.sync="cloudSaveOpen" width="460px" :close-on-click-modal="false">
      <el-form label-width="80px">
        <el-form-item label="文件名"><el-input v-model="cloudSaveName"></el-input></el-form-item>
        <el-form-item label="保存位置"><el-select v-model="cloudSavePath" filterable placeholder="请选择文件夹" style="width:100%"><el-option v-for="folder in cloudFolders" :key="folder.path" :label="folder.path" :value="folder.path"></el-option></el-select></el-form-item>
      </el-form>
      <span slot="footer"><el-button @click="cloudSaveOpen = false">取消</el-button><el-button type="primary" :disabled="!cloudSaveName || !cloudSavePath" @click="saveLocalToCloud">确认保存</el-button></span>
    </el-dialog>
  </div>
</template>

<script>
import NodeImage from './NodeImage.vue'
import NodeHyperlink from './NodeHyperlink.vue'
import NodeIcon from './NodeIcon.vue'
import NodeNote from './NodeNote.vue'
import NodeTag from './NodeTag.vue'
import Export from './Export.vue'
import Import from './Import.vue'
import { mapState } from 'vuex'
import { Notification } from 'element-ui'
import Vue from 'vue'
import exampleData from 'simple-mind-map/example/exampleData'
import { getData } from '../../../api'
import ToolbarNodeBtnList from './ToolbarNodeBtnList.vue'
import { throttle, isMobile } from 'simple-mind-map/src/utils/index'

// 工具栏
let fileHandle = null
const defaultBtnList = [
  'back',
  'forward',
  'painter',
  'siblingNode',
  'childNode',
  'deleteNode',
  'image',
  'icon',
  'link',
  'note',
  'tag',
  'summary',
  'associativeLine',
  'formula',
  // 'attachment',
  'outerFrame',
  'annotation',
  'ai'
]

export default {
  components: {
    NodeImage,
    NodeHyperlink,
    NodeIcon,
    NodeNote,
    NodeTag,
    Export,
    Import,
    ToolbarNodeBtnList
  },
  data() {
    return {
      isMobile: isMobile(),
      mobileMoreOpen: false,
      mobilePrimaryList: ['back', 'childNode'],
      horizontalList: [],
      verticalList: [],
      showMoreBtn: true,
      popoverShow: false,
      fileTreeProps: {
        label: 'name',
        children: 'children',
        isLeaf: 'leaf'
      },
      fileTreeVisible: false,
      rootDirName: '',
      fileTreeExpand: true,
      waitingWriteToLocalFile: false,
      leaveLocalOpen: false,
      cloudSaveOpen: false,
      cloudSavePath: '',
      cloudSaveName: '',
      cloudFolders: [],
      leaveAfterSave: false
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark,
      isHandleLocalFile: state => state.isHandleLocalFile,
      openNodeRichText: state => state.localConfig.openNodeRichText,
      enableAi: state => state.localConfig.enableAi
    }),

    isCloud() {
      return Boolean(this.$route && this.$route.query.cloudPath)
    },

    isExternal() {
      return Boolean((this.$route && this.$route.query.path) || window.__simpleMindMapExternalPath)
    },

    isLocalTransient() {
      return Boolean(this.$route && this.$route.query.localFile === '1')
    },

    localName() {
      return String((this.$route && this.$route.query.localName) || '思维导图.smm')
    },

    cloudPath() {
      return String((this.$route && this.$route.query.cloudPath) || '')
    },

    activePath() {
      return this.cloudPath || this.localName
    },

    directory() {
      if (!this.isCloud) return '本地文件'
      const index = this.cloudPath.lastIndexOf('/')
      return index === -1 ? '云端文件' : this.cloudPath.slice(0, index) || '云端文件'
    },

    fileName() {
      if (!this.isCloud) return this.localName
      const index = this.cloudPath.lastIndexOf('/')
      return index === -1 ? this.cloudPath : this.cloudPath.slice(index + 1)
    },

    btnLit() {
      let res = [...defaultBtnList]
      if (!this.openNodeRichText) {
        res = res.filter(item => {
          return item !== 'formula'
        })
      }
      if (!this.enableAi) {
        res = res.filter(item => {
          return item !== 'ai'
        })
      }
      return res
    },

    mobileMoreList() {
      return this.btnLit.filter(item => !this.mobilePrimaryList.includes(item))
    }
  },
  watch: {
    isHandleLocalFile(val) {
      if (!val) {
        Notification.closeAll()
      }
    },
    btnLit: {
      deep: true,
      handler() {
        this.computeToolbarShow()
      }
    }
  },
  created() {
    this.$bus.$on('write_local_file', this.onWriteLocalFile)
  },
  mounted() {
    this.computeToolbarShow()
    this.computeToolbarShowThrottle = throttle(this.computeToolbarShow, 300)
    window.addEventListener('resize', this.computeToolbarShowThrottle)
    this.onMobileResize = () => {
      this.isMobile = isMobile()
      if (!this.isMobile) this.computeToolbarShow()
    }
    window.addEventListener('resize', this.onMobileResize)
    this.$bus.$on('lang_change', this.computeToolbarShowThrottle)
    window.addEventListener('beforeunload', this.onUnload)
    this.$bus.$on('node_note_dblclick', this.onNodeNoteDblclick)
    this.openPendingLocalFile()
  },
  beforeDestroy() {
    this.$bus.$off('write_local_file', this.onWriteLocalFile)
    window.removeEventListener('resize', this.computeToolbarShowThrottle)
    window.removeEventListener('resize', this.onMobileResize)
    this.$bus.$off('lang_change', this.computeToolbarShowThrottle)
    window.removeEventListener('beforeunload', this.onUnload)
    this.$bus.$off('node_note_dblclick', this.onNodeNoteDblclick)
  },
  methods: {
    saveCloud() {
      if (this.isCloud || this.isExternal) {
        this.$bus.$emit('manualSave')
        return
      }
      this.openCloudSaveDialog(false)
    },

    backHome() {
      if (this.isLocalTransient) {
        this.leaveLocalOpen = true
        return
      }
      this.$router.push('/')
    },

    downloadCloud() {
      this.$bus.$emit('downloadCloud')
    },

    async openPendingLocalFile() {
      const file = window.__simpleMindMapLocalFile
      if (!this.isLocalTransient || !file || !this.$refs.ImportRef) return
      window.__simpleMindMapLocalFile = null
      this.$refs.ImportRef.onChange({ raw: file, name: file.name })
      this.$refs.ImportRef.confirm()
    },

    async openCloudSaveDialog(leaveAfterSave) {
      this.leaveAfterSave = Boolean(leaveAfterSave)
      this.cloudSaveName = this.localName
      this.cloudSavePath = ''
      try {
        const res = await fetch('/app/SimpleMindMap/api/tree')
        if (!res.ok) throw new Error('tree_failed')
        const data = await res.json()
        const folders = []
        const walk = items => (items || []).forEach(item => {
          if (item.type === 'folder') {
            folders.push(item)
            walk(item.children)
          }
        })
        walk(data.tree)
        this.cloudFolders = folders
        this.cloudSaveOpen = true
        if (!folders.length) this.$message.warning('请先在主界面创建文件夹')
      } catch (error) {
        this.$message.error('无法读取云端文件夹')
      }
    },

    async saveLocalToCloud() {
      try {
        const data = Vue.prototype.getCurrentData && Vue.prototype.getCurrentData()
        if (!data) throw new Error('data_unavailable')
        const bytes = new TextEncoder().encode(JSON.stringify(data))
        let binary = ''
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
        const res = await fetch('/app/SimpleMindMap/api/upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ targetPath: this.cloudSavePath, files: [{ name: this.cloudSaveName, relativePath: this.cloudSaveName, content: btoa(binary) }] })
        })
        if (!res.ok) throw new Error('upload_failed')
        this.cloudSaveOpen = false
        this.leaveLocalOpen = false
        this.$message.success('已保存到云端')
        if (this.leaveAfterSave) this.$router.push('/')
        else this.$router.replace({ path: '/edit', query: { cloudPath: `${this.cloudSavePath}/${this.cloudSaveName}` } })
      } catch (error) {
        this.$message.error('保存到云端失败')
      }
    },

    downloadAndLeave() {
      this.downloadCloud()
      this.discardAndLeave()
    },

    discardAndLeave() {
      this.leaveLocalOpen = false
      this.$router.push('/')
    },

    // 计算工具按钮如何显示
    computeToolbarShow() {
      if (!this.$refs.toolbarRef) return
      const windowWidth = window.innerWidth - 40
      const all = [...this.btnLit]
      let index = 1
      const loopCheck = () => {
        if (index > all.length) return done()
        this.horizontalList = all.slice(0, index)
        this.$nextTick(() => {
          const width = this.$refs.toolbarRef.getBoundingClientRect().width
          if (width < windowWidth) {
            index++
            loopCheck()
          } else if (index > 0 && width > windowWidth) {
            index--
            this.horizontalList = all.slice(0, index)
            done()
          }
        })
      }
      const done = () => {
        this.verticalList = all.slice(index)
        this.showMoreBtn = this.verticalList.length > 0
      }
      loopCheck()
    },

    // 监听本地文件读写
    onWriteLocalFile(content) {
      clearTimeout(this.timer)
      if (fileHandle && this.isHandleLocalFile) {
        this.waitingWriteToLocalFile = true
      }
      this.timer = setTimeout(() => {
        this.writeLocalFile(content)
      }, 1000)
    },

    onUnload(e) {
      if (this.waitingWriteToLocalFile) {
        const msg = '存在未保存的数据'
        e.returnValue = msg
        return msg
      }
    },

    // 加载本地文件树
    async loadFileTreeNode(node, resolve) {
      try {
        let dirHandle
        if (node.level === 0) {
          dirHandle = await window.showDirectoryPicker()
          this.rootDirName = dirHandle.name
        } else {
          dirHandle = node.data.handle
        }
        const dirList = []
        const fileList = []
        for await (const [key, value] of dirHandle.entries()) {
          const isFile = value.kind === 'file'
          if (isFile && !/\.(smm|xmind|md|json)$/.test(value.name)) {
            continue
          }
          const enableEdit = isFile && /\.smm$/.test(value.name)
          const data = {
            id: key,
            name: value.name,
            type: value.kind,
            handle: value,
            leaf: isFile,
            enableEdit
          }
          if (isFile) {
            fileList.push(data)
          } else {
            dirList.push(data)
          }
        }
        resolve([...dirList, ...fileList])
      } catch (error) {
        console.log(error)
        this.fileTreeVisible = false
        resolve([])
        if (error.toString().includes('aborted')) {
          return
        }
        this.$message.warning(this.$t('toolbar.notSupportTip'))
      }
    },

    // 扫描本地文件夹
    openDirectory() {
      this.fileTreeVisible = false
      this.fileTreeExpand = true
      this.rootDirName = ''
      this.$nextTick(() => {
        this.fileTreeVisible = true
      })
    },

    // 编辑指定文件
    editLocalFile(data) {
      if (data.handle) {
        fileHandle = data.handle
        this.readFile()
      }
    },

    // 导入指定文件
    async importLocalFile(data) {
      try {
        const file = await data.handle.getFile()
        this.$refs.ImportRef.onChange({
          raw: file,
          name: file.name
        })
        this.$refs.ImportRef.confirm()
      } catch (error) {
        console.log(error)
      }
    },

    // 打开本地文件
    async openLocalFile() {
      try {
        let [_fileHandle] = await window.showOpenFilePicker({
          types: [
            {
              description: '',
              accept: {
                'application/json': ['.smm']
              }
            }
          ],
          excludeAcceptAllOption: true,
          multiple: false
        })
        if (!_fileHandle) {
          return
        }
        fileHandle = _fileHandle
        if (fileHandle.kind === 'directory') {
          this.$message.warning(this.$t('toolbar.selectFileTip'))
          return
        }
        this.readFile()
      } catch (error) {
        console.log(error)
        if (error.toString().includes('aborted')) {
          return
        }
        this.$message.warning(this.$t('toolbar.notSupportTip'))
      }
    },

    // 读取本地文件
    async readFile() {
      let file = await fileHandle.getFile()
      let fileReader = new FileReader()
      fileReader.onload = async () => {
        this.$store.commit('setIsHandleLocalFile', true)
        this.setData(fileReader.result)
        Notification.closeAll()
        Notification({
          title: this.$t('toolbar.tip'),
          message: `${this.$t('toolbar.editingLocalFileTipFront')}${
            file.name
          }${this.$t('toolbar.editingLocalFileTipEnd')}`,
          duration: 0,
          showClose: true
        })
      }
      fileReader.readAsText(file)
    },

    // 渲染读取的数据
    setData(str) {
      try {
        let data = JSON.parse(str)
        if (typeof data !== 'object') {
          throw new Error(this.$t('toolbar.fileContentError'))
        }
        if (data.root) {
          this.isFullDataFile = true
        } else {
          this.isFullDataFile = false
          data = {
            ...exampleData,
            root: data
          }
        }
        this.$bus.$emit('setData', data)
      } catch (error) {
        console.log(error)
        this.$message.error(this.$t('toolbar.fileOpenFailed'))
      }
    },

    // 写入本地文件
    async writeLocalFile(content) {
      if (!fileHandle || !this.isHandleLocalFile) {
        this.waitingWriteToLocalFile = false
        return
      }
      if (!this.isFullDataFile) {
        content = content.root
      }
      let string = JSON.stringify(content)
      const writable = await fileHandle.createWritable()
      await writable.write(string)
      await writable.close()
      this.waitingWriteToLocalFile = false
    },

    // 创建本地文件
    async createNewLocalFile() {
      await this.createLocalFile(exampleData)
    },

    // 另存为
    async saveLocalFile() {
      let data = getData()
      await this.createLocalFile(data)
    },

    // 创建本地文件
    async createLocalFile(content) {
      try {
        let _fileHandle = await window.showSaveFilePicker({
          types: [
            {
              description: '',
              accept: { 'application/json': ['.smm'] }
            }
          ],
          suggestedName: this.$t('toolbar.defaultFileName')
        })
        if (!_fileHandle) {
          return
        }
        const loading = this.$loading({
          lock: true,
          text: this.$t('toolbar.creatingTip'),
          spinner: 'el-icon-loading',
          background: 'rgba(0, 0, 0, 0.7)'
        })
        fileHandle = _fileHandle
        this.$store.commit('setIsHandleLocalFile', true)
        this.isFullDataFile = true
        await this.writeLocalFile(content)
        await this.readFile()
        loading.close()
      } catch (error) {
        console.log(error)
        if (error.toString().includes('aborted')) {
          return
        }
        this.$message.warning(this.$t('toolbar.notSupportTip'))
      }
    },

    onNodeNoteDblclick(node, e) {
      e.stopPropagation()
      this.$bus.$emit('showNodeNote', node)
    }
  }
}
</script>

<style lang="less" scoped>
.toolbarContainer {
  .mobileToolbar {
    display: none;
  }
  &.isDark {
    .toolbar {
      color: hsla(0, 0%, 100%, 0.9);
      .toolbarBlock {
        background-color: #262a2e;

        .fileTreeBox {
          background-color: #262a2e;

          /deep/ .el-tree {
            background-color: #262a2e;

            &.el-tree--highlight-current {
              .el-tree-node.is-current > .el-tree-node__content {
                background-color: hsla(0, 0%, 100%, 0.05) !important;
              }
            }

            .el-tree-node:focus > .el-tree-node__content {
              background-color: hsla(0, 0%, 100%, 0.05) !important;
            }

            .el-tree-node__content:hover,
            .el-upload-list__item:hover {
              background-color: hsla(0, 0%, 100%, 0.02) !important;
            }
          }

          .fileTreeWrap {
            .customTreeNode {
              .treeNodeInfo {
                color: #fff;
              }

              .treeNodeBtnList {
                .el-button {
                  padding: 7px 5px;
                }
              }
            }
          }
        }
      }

      .toolbarBtn {
        .icon {
          background: transparent;
          border-color: transparent;
        }

        &:hover {
          &:not(.disabled) {
            .icon {
              background: hsla(0, 0%, 100%, 0.05);
            }
          }
        }

        &.disabled {
          color: #54595f;
        }
      }
    }
  }
  .toolbar {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    top: 20px;
    width: max-content;
    display: flex;
    flex-direction: row-reverse;
    font-size: 12px;
    font-family: PingFangSC-Regular, PingFang SC;
    font-weight: 400;
    color: rgba(26, 26, 26, 0.8);
    z-index: 2;

    .toolbarBlock {
      display: flex;
      background-color: #fff;
      padding: 10px 20px;
      border-radius: 6px;
      box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(0, 0, 0, 0.06);
      margin-right: 0;
      margin-left: 20px;
      flex-shrink: 0;
      position: relative;

      &:last-of-type {
        margin-left: 0;
      }

      &.transferBlock {
        order: -1;
        margin-left: 20px;
      }

      .documentInfo {
        display: flex;
        flex: 0 1 260px;
        min-width: 120px;
        flex-direction: column;
        justify-content: center;
        margin-left: 4px;
        line-height: 16px;
      }

      .documentPath,
      .documentName {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .documentPath {
        color: #8a95a3;
      }

      .documentName {
        color: #334155;
        font-weight: 600;
      }

      .fileTreeBox {
        position: absolute;
        left: 0;
        top: 68px;
        width: 100%;
        height: 30px;
        background-color: #fff;
        padding: 12px 5px;
        padding-top: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 5px;
        min-width: 200px;
        box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);

        &.expand {
          height: 300px;

          .fileTreeWrap {
            visibility: visible;
          }
        }

        .fileTreeToolbar {
          width: 100%;
          height: 30px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e9e9e9;
          margin-bottom: 12px;
          padding-left: 12px;

          .fileTreeName {
          }

          .fileTreeActionList {
            .btn {
              font-size: 18px;
              margin-left: 12px;
              cursor: pointer;
            }
          }
        }

        .fileTreeWrap {
          width: 100%;
          height: 100%;
          overflow: auto;
          visibility: hidden;

          .customTreeNode {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 13px;
            padding-right: 5px;

            .treeNodeInfo {
              display: flex;
              align-items: center;

              .treeNodeIcon {
                margin-right: 5px;
                opacity: 0.7;
              }

              .treeNodeName {
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            }

            .treeNodeBtnList {
              display: flex;
              align-items: center;
            }
          }
        }
      }
    }

    .toolbarBtn {
      display: flex;
      justify-content: center;
      flex-direction: column;
      min-width: 32px;
      flex-shrink: 0;
      cursor: pointer;
      margin-right: 20px;

      &:last-of-type {
        margin-right: 0;
      }

      &:hover {
        &:not(.disabled) {
          .icon {
            background: #f5f5f5;
          }
        }
      }

      &.active {
        .icon {
          background: #f5f5f5;
        }
      }

      &.disabled {
        color: #bcbcbc;
        cursor: not-allowed;
        pointer-events: none;
      }

      .icon {
        display: flex;
        height: 26px;
        background: #fff;
        border-radius: 4px;
        border: 1px solid #e9e9e9;
        justify-content: center;
        flex-direction: column;
        text-align: center;
        padding: 0 5px;
      }

      .text {
        white-space: nowrap;
      }

      .text {
        margin-top: 3px;
      }
    }
  }
}

@media (max-width: 700px) {
  .toolbarContainer {
    .toolbar {
      display: none;
    }

    .mobileToolbar {
      position: fixed;
      z-index: 20;
      left: 0;
      right: 0;
      bottom: 0;
      min-height: 64px;
      padding: 7px 8px calc(7px + env(safe-area-inset-bottom));
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0;
      background: rgba(255, 255, 255, 0.97);
      border-top: 1px solid #e5e7eb;
      box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.1);

      .toolbarNodeBtnList {
        display: flex;
        flex: 0 0 40%;
        justify-content: space-around;
      }

      .toolbarBtn {
        flex: 0 0 20%;
        min-width: 0;
        margin: 0 !important;
        display: flex !important;
        align-items: center;
        flex-direction: column !important;

        .icon {
          width: 38px;
          height: 30px;
          border: 0;
          background: transparent;
          font-size: 18px;
        }

        .text {
          margin-top: 1px;
          font-size: 11px;
          text-align: center;
          line-height: 16px;
          white-space: nowrap;
        }
      }

      .mobileMoreTrigger {
        flex: 0 0 20%;
      }

      ::v-deep .toolbarNodeBtnList:not(.v) .toolbarBtn {
        flex: 1 1 0;
        min-width: 0;
        margin: 0 !important;
        display: flex !important;
        align-items: center;
        flex-direction: column !important;

        .icon {
          width: 38px;
          height: 30px;
          border: 0;
          background: transparent;
          font-size: 18px;
        }

        .text {
          width: 100%;
          margin-top: 1px;
          font-size: 11px;
          line-height: 16px;
          text-align: center;
          white-space: nowrap;
        }
      }
    }

    .mobileMoreMenu {
      max-height: 58vh;
      overflow-y: auto;

      .toolbarNodeBtnList.v {
        width: 100%;
      }

      .mobileMoreAction {
        display: flex;
        align-items: center;
        gap: 10px;
        height: 36px;
        margin-top: 10px;
        margin-bottom: 10px;
        padding: 0 10px;
        border-top: 1px solid #eef1f5;
        border-radius: 4px;
        cursor: pointer;

        &:active {
          background: #f1f6ff;
        }
      }
    }
  }
}
</style>
