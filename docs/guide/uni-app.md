---
title: uni-app 跨端开发
description: uni-app 核心知识体系：生命周期、条件编译、分包策略、nvue 渲染引擎、性能优化与高频面试题精讲
---

## 生命周期

uni-app 的生命周期分为 **应用生命周期**、**页面生命周期** 和 **组件生命周期** 三个层级。应用生命周期控制整个 App 的启动与前后台切换；页面生命周期管理单个页面的加载、显示、隐藏和销毁；组件生命周期与 Vue 标准生命周期基本一致，但需要注意与页面生命周期的执行顺序差异。

### 三层生命周期对比表

| 层级 | 钩子函数 | 触发时机 | 常用场景 |
|------|----------|----------|----------|
| 应用 | `onLaunch` | App 初始化完成（仅一次） | 获取用户信息、全局数据初始化 |
| 应用 | `onShow` | App 从后台进入前台 | 检查剪切板、恢复 Socket 连接 |
| 应用 | `onHide` | App 从前台进入后台 | 保存草稿、停用定时器 |
| 页面 | `onLoad` | 页面加载，接收参数 | 根据路由参数请求接口 |
| 页面 | `onShow` | 页面显示（每次进入都会触发） | 刷新页面数据、埋点统计 |
| 页面 | `onReady` | 页面初次渲染完成（仅一次） | 操作 DOM 节点（选择器查询） |
| 页面 | `onHide` | 页面隐藏（跳转到其他页面） | 暂停视频播放、暂停动画 |
| 页面 | `onUnload` | 页面卸载（返回上一页） | 清除定时器、重置状态 |
| 组件 | `mounted` | 组件挂载到 DOM | 初始化第三方库、获取节点 |
| 组件 | `destroyed` | 组件销毁 | 清理事件监听、释放资源 |

### onLaunch / onShow / onHide / onLoad / onReady / onUnload / mounted 对比

::: tip 执行顺序
App 冷启动时完整链路：`onLaunch → onLoad → onShow → mounted → onReady`
:::

各个关键生命周期的详细说明：

- **onLaunch**：整个应用只触发一次，适合做全局初始化如登录态检测、全局事件总线注册。它是应用级别最早执行的钩子，在所有页面加载之前运行。
- **onShow (App)**：应用每次从后台切到前台都会触发，适合刷新全局状态（如未读消息数）。注意 App 级 `onShow` 每次都会执行，而页面级 `onShow` 只在该页面可见时触发。
- **onHide (App)**：应用切到后台时触发，适合保存草稿、暂停音频播放、清理临时缓存等以节省资源。
- **onLoad**：每个页面只会调用一次，可以获取 `onLoad(options)` 中的路由参数。适合根据页面 ID 发起首屏数据请求。
- **onReady**：页面初次渲染完成，意味着可以安全地操作页面节点。适合用 `uni.createSelectorQuery()` 获取节点信息，但注意在 Vue 3 中节点获取方式有所不同。
- **onUnload**：页面卸载（navigateBack 或 redirectTo 时）触发，适合清除定时器、重置全局事件监听，防止内存泄漏。
- **mounted**：组件挂载完毕，比页面级 `onReady` 更早触发。适合在组件内访问 `this.$el` 并初始化 DOM 相关第三方库。

```js
// pages/home/index.vue
export default {
  onLoad(options) {
    // 接收路由参数，发起首屏请求
    console.log('页面参数:', options.id)
    this.fetchData(options.id)
  },
  onShow() {
    // 每次显示都刷新数据（如从详情页返回）
    this.refreshList()
  },
  onReady() {
    // 节点查询 — 仅一次
    uni.createSelectorQuery()
      .in(this)
      .select('.header')
      .boundingClientRect((rect) => {
        console.log('header 高度:', rect.height)
      })
      .exec()
  },
  onHide() {
    // 暂停视频，避免后台播放
    this.$refs.video?.pause()
  },
  onUnload() {
    // 清理定时器，防止内存泄漏
    clearInterval(this.timer)
  },
  mounted() {
    // 组件级初始化
    this.initSwiper()
  }
}
```

### Vue 2 vs Vue 3 版本差异

uni-app 同时支持 Vue 2 和 Vue 3，但两者在生命周期函数命名和行为上有明显差异：

| 对比维度 | Vue 2 (uni-app) | Vue 3 (uni-app) |
|----------|-----------------|-----------------|
| 组件选项写法 | Options API（`data/methods/computed`） | 支持 Composition API（`setup`） |
| 实例访问 | `this.xxx` 直接访问 | `getCurrentInstance()` 获取实例 |
| `beforeCreate` | 支持，在 `onLaunch` 之后 | 不支持，替代为 `setup()` |
| `beforeDestroy` | 支持 | 替代为 `onBeforeUnmount` |
| 全局挂载 | `Vue.prototype.$http` | `app.config.globalProperties.$http` |
| 状态管理 | Vuex | Pinia（推荐）/ Vuex 4 |
| TS 支持 | 需额外配置 | 原生支持 TypeScript |

```js
// Vue 2 写法
export default {
  data() {
    return { count: 0 }
  },
  onLoad() {
    this.count++
  }
}

// Vue 3 写法（Composition API）
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

export default {
  setup() {
    const count = ref(0)
    onLoad(() => {
      count.value++
    })
    return { count }
  }
}
```

::: warning 注意
Vue 3 中 `beforeCreate` 和 `created` 被 `setup()` 替代，不要再同时使用 Options API 和 Composition API 混写，可能导致生命周期执行顺序不可预期。
:::

---

## 条件编译

uni-app 的核心能力之一是**一套代码编译到多端**，而条件编译是实现"差异化"的关键手段。它允许开发者在同一个文件中为不同平台编写专属逻辑，编译时只保留目标平台的代码块，其余自动剔除。

### #ifdef / #ifndef 语法

条件编译指令可以用于 **JS、CSS、HTML（template）** 以及 **pages.json / manifest.json** 等配置文件中，语法统一：

- `#ifdef 平台标识符`：仅在该平台编译此代码块
- `#ifndef 平台标识符`：在该平台 **不** 编译此代码块
- `#endif`：结束条件编译块

```vue
<template>
  <view>
    <!-- H5 专属头部 -->
    <!-- #ifdef H5 -->
    <div class="h5-header">这是 H5 端的导航栏</div>
    <!-- #endif -->

    <!-- 非 H5 端使用原生导航 -->
    <!-- #ifndef H5 -->
    <view class="native-title">原生标题栏</view>
    <!-- #endif -->
  </view>
</template>

<script>
export default {
  methods: {
    login() {
      // #ifdef MP-WEIXIN
      // 微信小程序用 wx.login 获取 code
      uni.login({
        provider: 'weixin',
        success: (res) => { /* 微信登录 */ }
      })
      // #endif

      // #ifdef APP-PLUS
      // App 端使用第三方 SDK 登录
      this.appLogin()
      // #endif
    }
  }
}
</script>

<style>
/* 条件编译也适用于样式 */
/* #ifdef H5 */
.h5-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
/* #endif */

/* #ifndef H5 */
.native-title {
  padding-top: var(--status-bar-height);
}
/* #endif */
</style>
```

### 各端标识符速查表

| 标识符 | 目标平台 | 说明 |
|--------|----------|------|
| `H5` | 浏览器 Web | 含移动浏览器和 PC 浏览器 |
| `MP-WEIXIN` | 微信小程序 | 最主流的小程序平台 |
| `MP-ALIPAY` | 支付宝小程序 | — |
| `MP-BAIDU` | 百度小程序 | — |
| `MP-TOUTIAO` | 字节跳动/抖音小程序 | — |
| `MP-QQ` | QQ 小程序 | — |
| `MP-KUAISHOU` | 快手小程序 | — |
| `MP-JD` | 京东小程序 | — |
| `MP-360` | 360 小程序 | — |
| `MP` | 所有小程序平台 | 泛指任意小程序（H5 和 App 除外） |
| `APP-PLUS` | App（5+App/uni-app App） | iOS + Android 原生打包 |
| `APP-PLUS-NVUE` | App nvue 页面 | weex 渲染引擎专用 |
| `QUICKAPP-WEBVIEW` | 快应用 | — |

```js
// 组合条件技巧
// #ifdef H5 || MP-WEIXIN
// H5 和微信小程序都执行的代码
// #endif
```

::: tip 最佳实践
将条件编译代码封装为单独的适配层文件（如 `platform/h5.js`、`platform/mp.js`），通过动态 import 按需加载，减少核心业务代码中的 `#ifdef` 碎片化。
:::

---

## 分包策略

小程序的包体积有严格限制，当项目变大后必须使用分包加载，将非首屏页面拆分到子包中按需下载，以提升启动速度。

### pages.json 配置示例（主包 + 分包 + 预加载）

```json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "navigationBarTitleText": "首页"
      }
    },
    {
      "path": "pages/mine/index",
      "style": {
        "navigationBarTitleText": "我的"
      }
    }
  ],
  "subPackages": [
    {
      "root": "pages-sub/goods",
      "pages": [
        {
          "path": "detail/index",
          "style": {
            "navigationBarTitleText": "商品详情"
          }
        },
        {
          "path": "comment/index",
          "style": {
            "navigationBarTitleText": "商品评价"
          }
        }
      ]
    },
    {
      "root": "pages-sub/order",
      "pages": [
        {
          "path": "list/index",
          "style": {
            "navigationBarTitleText": "订单列表"
          }
        },
        {
          "path": "detail/index",
          "style": {
            "navigationBarTitleText": "订单详情"
          }
        }
      ]
    }
  ],
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["pages-sub/goods"]
    },
    "pages/mine/index": {
      "network": "wifi",
      "packages": ["pages-sub/order"]
    }
  }
}
```

预加载配置说明：

- `network: "all"` — 无论网络状况都预加载（适合高频访问的分包）
- `network: "wifi"` — 仅 Wi-Fi 下预加载（节省流量，适合低频分包）
- `packages` — 指定预加载的分包 `root` 名称数组

```js
// 跳转到分包页面（自动按需加载该分包）
uni.navigateTo({
  url: '/pages-sub/goods/detail/index?id=123'
})

// 分包加载完成事件
const subPackageTask = uni.loadSubPackage({
  root: 'pages-sub/goods',
  success() {
    console.log('分包加载成功')
  },
  fail(err) {
    console.error('分包加载失败', err)
  }
})
// 支持监听加载进度
subPackageTask.onProgressUpdate(({ progress, totalBytesWritten, totalBytesExpectedToWrite }) => {
  console.log(`下载进度: ${progress}%`)
})
```

### 分包限制

| 限制项 | 上限 | 说明 |
|--------|------|------|
| 单个主包 | **2MB** | 含首页及公共资源，超出需拆分 |
| 单个分包 | **2MB** | 每个分包单独计算 |
| 总包体积 | **20MB**（微信）/ 8MB（支付宝）/ 20MB（百度） | 主包 + 所有分包总和 |
| 整个小程序分包数 | 最多 16 个 | 微信小程序限制 |
| 分包预加载 | 最多预加载 2 个分包 | 同一页面 `preloadRule` 内 |

::: tip 分包优化建议
1. **公共组件/工具** 放入 `common/` 目录在主包中
2. **图片资源** 尽量使用 CDN 远程加载，而非打包到本地
3. **第三方依赖** 按分包拆分，避免全部打到主包
4. 使用 Webpack Bundle Analyzer 分析打包体积，找出冗余模块
:::

---

## nvue

nvue（Native Vue）是 uni-app 为 App 端提供的原生渲染引擎，基于 weex 扩展。它使用原生组件而非 WebView 渲染，能够突破 WebView 的性能瓶颈，适用于高性能列表、地图和视频等场景。

### nvue vs vue 对比表

| 对比维度 | nvue（Native 渲染） | vue（WebView 渲染） |
|----------|---------------------|----------------------|
| 渲染引擎 | 原生渲染引擎（weex） | WebView 内核 |
| CSS 支持 | 子集（无百分比/rem/媒体查询） | 完整 CSS3 |
| Flexbox | **默认弹性布局**，且仅支持 flex | 自由选择布局方式 |
| 文字样式 | 仅 `<text>` 组件可设置文字样式 | 任意标签可承载文字样式 |
| 滚动容器 | `<list>` + `<cell>` 或 `<scroller>` | `<scroll-view>` |
| 动画性能 | 原生动画，60fps 流畅 | CSS 动画，复杂场景易卡顿 |
| DOM API | 不支持 `document` 和 DOM 操作 | 完整 DOM 操作（`uni.createSelectorQuery`） |
| 生命周期 | 与 Vue 页面存在差异（无 `onLoad` 的部分钩子） | Vue 标准生命周期 |
| 平台限制 | **仅 App 端支持** | 全端支持 |
| 适用场景 | 长列表、实时视频、复杂地图 | 常规页面、表单、信息展示 |

### 使用场景

**高性能列表** — nvue 使用 `<list>` 和 `<cell>` 组件实现原生列表回收复用，相比 `<scroll-view>` 渲染万级列表时性能极大提升。列表项离开屏幕时原生引擎会自动回收节点，滚动帧率稳定在 60fps。

**地图展示** — nvue 中可使用原生地图组件 `<map>`，比 WebView 内的 `<map>` 定位更快、拖拽更流畅，且支持更多原生 API（如 3D 视角、自定义 Marker 动画）。

**视频播放** — nvue 的 `<video>` 组件由原生播放器内核驱动，支持硬件解码，避免 WebView 内视频播放的层级遮盖问题和性能损耗。

```vue
<!-- pages/list/nvue.nvue -->
<template>
  <list class="list" @loadmore="onLoadmore">
    <cell v-for="item in dataList" :key="item.id">
      <view class="cell-item">
        <text class="title">{{ item.title }}</text>
        <text class="desc">{{ item.desc }}</text>
      </view>
    </cell>
    <loading-indicator v-if="loading" class="loading"></loading-indicator>
  </list>
</template>

<script>
export default {
  data() {
    return {
      dataList: [],
      page: 1,
      loading: false
    }
  },
  onLoad() {
    this.loadData()
  },
  methods: {
    async loadData() {
      const res = await uni.request({ url: `/api/list?page=${this.page}` })
      this.dataList = this.dataList.concat(res.data)
    },
    onLoadmore() {
      this.page++
      this.loadData()
    }
  }
}
</script>

<style>
.cell-item {
  flex-direction: column;
  padding: 24rpx;
  border-bottom-width: 1rpx;
  border-bottom-color: #eee;
}
.title {
  font-size: 32rpx;
  color: #333;
  lines: 1;
}
.desc {
  font-size: 26rpx;
  color: #999;
  margin-top: 8rpx;
  lines: 2;
}
</style>
```

::: warning nvue 开发注意事项
- nvue 页面扩展名必须为 `.nvue`，且路径需在 `pages.json` 中正确配置
- 仅支持 `flex` 布局，默认排列方向为列（column），需要横向排列时显式设置 `flex-direction: row`
- CSS 不支持 `position: fixed`、百分比高度、`rem` 单位，推荐使用 `rpx`（750rpx 为屏幕宽度）
- 不支持 `transition` 动画，替代方案使用 `animation` 模块或 bindingx
:::

---

## 常见问题 & 面试题

### 1. uni-app 如何做性能优化？

性能优化的核心思路是**减少包体积 + 减少渲染开销 + 优化网络请求**，具体措施如下：

**分包加载**（见上文分包策略章节）—— 将非首屏页面和低频功能拆入子包，减少主包体积，从而加快首次加载速度。结合 `preloadRule` 预加载高频分包，兼顾了加载体验。

**图片懒加载** —— 列表中的图片使用 `v-lazy` 或 `<image lazy-load>` 属性，仅加载可视区域内的图片，减少首屏带宽消耗和内存占用。

**列表虚拟化** —— 对于超长列表（>1000 条），使用 `<recycle-view>`（uni-ui 提供）或 nvue 的 `<list>` 组件实现虚拟滚动，只渲染可视区域的节点而非全量 DOM，显著降低内存和渲染开销。

**请求合并** —— 将多个首屏 API 聚合为一个接口，减少网络往返次数；使用 `Promise.all` 并发非依赖请求。

**静态资源 CDN** —— 图片、字体等大体积资源托管在 CDN 上，避免打入小程序包内。

```js
// 列表虚拟化示例（使用 uni-ui 的 recycle-view）
<template>
  <recycle-view :style="{ height: screenHeight + 'px' }" :items="list">
    <template v-slot:default="{ item }">
      <recycle-item class="card">
        <image :src="item.avatar" lazy-load mode="aspectFill" />
        <text>{{ item.name }}</text>
      </recycle-item>
    </template>
  </recycle-view>
</template>
```

```js
// 并发请求优化
async onLoad() {
  const [userRes, configRes, bannerRes] = await Promise.all([
    uni.request({ url: '/api/user' }),
    uni.request({ url: '/api/config' }),
    uni.request({ url: '/api/banner' })
  ])
  this.user = userRes.data
  this.config = configRes.data
  this.banners = bannerRes.data
}
```

### 2. 跨端兼容如何处理？

跨端兼容主要有两条路径：

**条件编译**（编译时方案）—— 使用 `#ifdef` / `#ifndef` 在编译阶段按平台剔除代码，零运行时开销。适用于 UI 差异、API 差异较大的场景。

**平台判断 API**（运行时方案）—— 通过 `uni.getSystemInfoSync().platform` 获取当前运行平台，在运行时动态选择逻辑。适用于同逻辑不同数据源、微调交互的场景。

```js
// 运行时平台判断
const platform = uni.getSystemInfoSync().platform

if (platform === 'android') {
  // Android 特有处理：如虚拟按键适配
  this.bottomPadding = 48
} else if (platform === 'ios') {
  // iOS 特有处理：如安全区域适配
  this.bottomPadding = 34
}

// uni-app 也提供语义化 API
// #ifdef MP-WEIXIN
wx.showShareMenu({ withShareTicket: true })
// #endif

// #ifdef APP-PLUS
plus.share.sendWithSystem({ type: 'text', content: '分享内容' })
// #endif
```

::: tip 选择策略
- **编译时能解决的问题用条件编译**（零运行时开销）
- **运行时才能确定的逻辑用平台 API**（如用户设备类型、系统版本）
- 封装平台适配层：创建 `src/platform/` 目录，每个文件导出统一接口，内部条件编译，业务代码只引入适配层
:::

### 3. uni-app 与纯小程序开发的优劣对比

| 对比维度 | uni-app | 纯小程序原生开发 |
|----------|---------|-------------------|
| 跨端能力 | ✅ 一套代码同时产出 H5 + 小程序 + App | ❌ 每个平台需独立开发 |
| 开发效率 | ✅ Vue 生态 + HBuilderX 热更新快 | ⚠️ 原生 DSL 生态较封闭 |
| 组件库 | ✅ uni-ui / uView / 丰富的 Vue 组件 | ⚠️ WeUI 等，选择较少 |
| 性能 | ⚠️ 中间层有轻微损耗（可忽略） | ✅ 最贴近底层，性能最优 |
| 包体积 | ⚠️ 框架有一定基础体积（~100KB+） | ✅ 无框架开销，体积更小 |
| 原生能力 | ⚠️ App 端需要原生插件扩展 | ✅ 微信 API 调用最直接 |
| 社区生态 | ✅ 论坛 + 插件市场 + Vue 社区 | ✅ 微信官方文档及社区 |
| 调试工具 | ✅ HBuilderX 集成 + Chrome DevTools | ✅ 微信开发者工具 |
| 人员招聘 | ✅ Vue 开发者即可上手 | ⚠️ 需要小程序开发经验 |
| 适合场景 | 多端覆盖、快速迭代、中大型项目 | 仅微信生态、对性能和体积极致要求 |

**综合建议**：如果产品需要覆盖微信小程序以外的平台（H5、App、支付宝小程序等），uni-app 是当前性价比最高的方案。如果仅做微信小程序且对启动速度和包体积有极致要求，原生开发更合适。对于大多数中小型商业项目，uni-app 的效率优势远超其微弱的性能开销。

---

## 写在最后

uni-app 的核心竞争力在于"一套代码多端运行"，掌握生命周期、条件编译、分包策略和 nvue 是合格 uni-app 开发者的基本功。面试中，除了概念回答外，结合实际项目经验（如"我负责的项目通过分包将首屏从 2.4MB 降到 1.8MB"）更能打动面试官。
