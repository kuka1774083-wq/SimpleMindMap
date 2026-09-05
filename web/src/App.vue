<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style lang="less">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
}

.customScrollbar {
  &::-webkit-scrollbar {
    width: 7px;
    height: 7px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 7px;
    background-color: rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }

  &::-webkit-scrollbar-track {
    box-shadow: none;
    background: transparent;
    display: none;
  }
}

.el-dialog{
  border-radius: 10px;
}

@media screen and (max-width: 700px) {
  .el-message-box__wrapper {
    top: 0 !important;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 16px;
  }

  .el-message-box {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
  }

  .el-message-box__btns {
    display: flex;
    gap: 8px;
    padding-top: 12px;
  }

  .el-message-box__btns .el-button {
    flex: 1 1 0;
    min-width: 0;
    margin: 0;
  }

  .mobileMoreMenu {
    max-height: 58vh;
    overflow-y: auto;
  }

  .mobileMoreMenu .mobileMoreAction {
    display: flex;
    align-items: center;
    height: 36px;
    margin: 10px 0;
    padding: 0;
    color: rgba(26, 26, 26, 0.8);
    cursor: pointer;
  }

  .mobileMoreMenu .mobileMoreActionIcon {
    display: flex;
    width: 36px;
    height: 26px;
    align-items: center;
    justify-content: center;
    margin-right: 10px;
    border: 1px solid #e9e9e9;
    border-radius: 4px;
    font-size: 16px;
  }

  .mobileToolbar > .toolbarBtn,
  .mobileToolbar .mobileMoreTrigger {
    display: flex !important;
    flex: 0 0 20% !important;
    width: 20%;
    min-width: 0;
    align-items: center;
    justify-content: flex-start;
    flex-direction: column !important;
    margin: 0 !important;
  }

  .mobileToolbar > .toolbarBtn .icon,
  .mobileToolbar .mobileMoreTrigger .icon {
    display: flex;
    width: 38px;
    height: 30px;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    background: transparent;
    text-align: center;
    font-size: 18px;
  }

  .mobileToolbar > .toolbarBtn .text,
  .mobileToolbar .mobileMoreTrigger .text {
    display: block;
    width: 100%;
    margin-top: 1px;
    line-height: 16px;
    text-align: center;
    white-space: nowrap;
  }
}
</style>
