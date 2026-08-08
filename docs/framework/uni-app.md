---
title: uni-app 跨端开发
description: uni-app 生命周期、条件编译、分包策略、nvue 渲染引擎与性能优化
---

# uni-app 跨端开发

uni-app 是 DCloud 推出的跨端框架，基于 Vue 生态，一套代码同时发布到微信小程序、H5、App 等 10+ 平台。核心优势：Vue 技术栈零学习成本、HBuilderX 集成开发、插件市场丰富。

## 一、快速上手

### 1.1 三层生命周期

uni-app 生命周期分三个层级，冷启动执行顺序：**App.onLaunch → Page.onLoad → Page.onShow → mounted → Page.onReady**。

| 层级 | 钩子 | 触发时机 | 常用场景 |
|---|---|---|---|
| 应用 | `onLaunch` | App 初始化（仅一次） | 登录态检测、全局初始化 |
| 应用 | `onShow` | 从后台切前台 | 刷新未读数、恢复 Socket |
| 应用 | `onHide` | 切后台 | 保存草稿、停用定时器 |
| 页面 | `onLoad` | 页面加载，可获取路由参数 | 根据参数请求首屏数据 |
| 页面 | `onShow` | 每次页面显示 | 刷新列表、埋点（**注意：从详情返回也会触发**） |
| 页面 | `onReady` | 首次渲染完成（仅一次） | 节点查询 `createSelectorQuery` |
| 页面 | `onHide` | 页面隐藏 | 暂停视频/音频 |
| 页面 | `onUnload` | 页面卸载（返回上一页） | 清除定时器、重置状态 |
| 组件 | `mounted` | 组件挂载 | 初始化第三方库 |

::: warning onShow vs onLoad
`onLoad` 只触发一次，适合初始化数据；`onShow` 每次页面显示都触发，适合刷新状态。踩坑：在 `onShow` 里放重请求（全量拉列表），从子页面返回时重复请求导致列表抖动。修复：加 `isFirstEnter` 标志位。
:::

```js
// 正确用法
export default {
  onLoad(options) {
    this.fetchData(options.id)  // 首次加载
  },
  onShow() {
    if (this.isFirstEnter) {
      this.isFirstEnter = false
      return
    }
    this.refreshBadge()  // 每次显示只做轻量刷新
  }
}
```

### 1.2 条件编译

通过 `#ifdef` / `#ifndef` 编译指令按平台剔除代码，编译后产物中只保留目标平台代码——零运行时开销。

```vue
<template>
  <!-- #ifdef MP-WEIXIN -->
  <view class="wechat-only">微信专属</view>
  <!-- #endif -->
</template>

<script>
export default {
  methods: {
    login() {
      // #ifdef MP-WEIXIN
      uni.login({ provider: 'weixin' })
      // #endif
      // #ifdef APP-PLUS
      plus.oauth.getServices(...)
      // #endif
    }
  }
}
</script>

<style>
/* #ifdef H5 */
.header { background: linear-gradient(...); }
/* #endif */
</style>
```

常用平台标识符：`H5`、`MP-WEIXIN`、`MP-ALIPAY`、`MP`（所有小程序）、`APP-PLUS`、`APP-PLUS-NVUE`。支持 `||` 组合：`#ifdef H5 || MP-WEIXIN`。

> 条件编译是编译时的，不是运行时的。能编译时确定的差异用条件编译（零开销），运行时才能确定的（如 iOS vs Android 安全区域高度）用 `uni.getSystemInfoSync().platform`。中大型项目建议抽象 `src/platform/` 适配层，业务代码只调统一接口。

## 二、项目实战

### 2.1 分包策略

小程序主包限制 2MB，超出必须分包。核心配置在 `pages.json`：

```json
{
  "pages": [
    { "path": "pages/index/index" },
    { "path": "pages/mine/index" }
  ],
  "subPackages": [{
    "root": "pages-sub/goods",
    "pages": [
      { "path": "detail/index" },
      { "path": "comment/index" }
    ]
  }],
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["pages-sub/goods"]
    }
  }
}
```

**分包限制**：单个主包 ≤ 2MB、单个分包 ≤ 2MB、总包 ≤ 20MB、分包数 ≤ 16。

**优化四步走**：
1. 静态资源全部走 CDN（图片/字体/图标）
2. 非首屏页面全部拆入分包
3. 公共组件和工具库放主包 `common/`，用分包异步化引用
4. `webpack-bundle-analyzer` 分析主包构成，精准瘦身

> `preloadRule` 在页面 `onReady` 后才触发，异步低优先级下载，不阻塞首屏渲染。控制预加载分包体积（每个 < 500KB），WiFi 预加载、4G 按需加载。

### 2.2 nvue 原生渲染

nvue 是 uni-app App 端的原生渲染引擎，基于 weex，使用原生组件而非 WebView 渲染。

| 维度 | nvue（Native 渲染） | vue（WebView 渲染） |
|---|---|---|
| 渲染引擎 | weex 原生引擎 | WebView 内核 |
| CSS 支持 | 子集（无百分比/rem/媒体查询） | 完整 CSS3 |
| 布局 | **仅支持 flex**，默认列方向 | 自由选择 |
| 文字 | 仅 `<text>` 组件可设样式 | 任意标签 |
| 列表 | `<list>` + `<cell>` 原生回收复用 | `<scroll-view>` |
| DOM API | 不支持 | 完整支持 |
| 适用场景 | 长列表、地图、视频 | 常规页面、表单、展示 |

```vue
<!-- pages/list.nvue -->
<template>
  <list class="list" @loadmore="onLoadmore">
    <cell v-for="item in dataList" :key="item.id">
      <view class="cell-item">
        <text class="title">{{ item.title }}</text>
      </view>
    </cell>
  </list>
</template>
```

::: warning nvue 注意
- 不支持 `position: fixed`、百分比高度、`rem`、`transition`
- 仅 App 端可用
- 与 vue 页面可混用但频繁切换有原生 ↔ WebView 上下文开销
:::

## 三、性能优化

### 3.1 优化三板斧

| 策略 | 做法 | 收益 |
|---|---|---|
| **分包** | 非首屏拆入子包 + `preloadRule` | 首屏加载快 40%+ |
| **图片懒加载** | `<image lazy-load>` 或 `v-lazy` | 减少首屏带宽 |
| **列表虚拟化** | `<recycle-view>` 或 nvue `<list>` | 长列表滚动 60fps |

### 3.2 请求优化

```js
// 并发请求
async onLoad() {
  const [user, config, banner] = await Promise.all([
    uni.request({ url: '/api/user' }),
    uni.request({ url: '/api/config' }),
    uni.request({ url: '/api/banner' })
  ])
}
```

### 3.3 跨端兼容原则

**编译时差异** → 条件编译（零运行时开销）
**运行时差异** → `uni.getSystemInfoSync().platform`（动态判断）
**业务层** → 抽象 `src/platform/` 适配层，统一接口导出

## 四、面试要点

**Q1: uni-app 三层生命周期执行顺序？**

App 冷启动：`onLaunch → onLoad → onShow → mounted → onReady`。`onShow` 每次页面显示都触发，`onLoad` 仅首次。Vue 3 中 `setup()` 在 `onLoad` 之前执行——`setup` 在组件实例创建时立即运行，而 `onLoad` 是页面级钩子，晚于组件初始化。

**Q2: 条件编译 vs 运行时判断怎么选？**

编译时能确定（不同平台的 API 差异）→ 条件编译，零运行时体积；运行时才能确定（iOS vs Android 设备特性）→ 平台 API 判断。原则：能用编译时就不用运行时。

**Q3: nvue 什么时候必须用？**

长列表 > 500 条需要丝滑滚动、地图拖拽大量自定义 Marker、视频嵌入滚动列表不能有层级遮挡。一般表单和展示页用 vue 页面即可。

**Q4: 主包 2MB 限制怎么破？**

四步走：① 静态资源 CDN；② 非首屏分包；③ 公共代码放主包 `common/` 复用；④ `bundle-analyzer` 分析。踩坑：600KB 的 echarts 放主包导致超限，移入分包 + 按需引入后解决。

**Q5: uni-app 的 Vue 生态插件能直接用吗？**

不能无脑搬。许多 Vue 插件依赖 DOM/BOM API（如 `vue-lazyload`），小程序端无 DOM 会直接失效不报错。替代方案：用 uni-app 原生能力（`<image lazy-load>`），或用条件编译做平台差异化引入。
