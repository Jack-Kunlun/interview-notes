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

### 💬 面试深度

**标准回答**：uni-app 生命周期分三层——应用级（onLaunch/onShow/onHide）、页面级（onLoad/onShow/onReady/onHide/onUnload）和组件级（Vue 标准钩子）。冷启动时执行顺序是 onLaunch → onLoad → onShow → mounted → onReady，注意 Vue 2 的 mounted 在 onReady 之前触发，因为组件先挂载完成，页面才整体渲染完毕。onShow 每次页面显示都会触发，适合做数据刷新和埋点；onUnload 用来清理定时器防止内存泄漏。

**追问预判**：

- Q: "onShow 和 mounted 都能做初始化，怎么选？" → A: onShow 每次页面显示都执行（包括从下一页返回），适合刷新数据；mounted 仅执行一次，适合初始化第三方库和绑定事件。如果用 onShow 做一次性初始化会重复执行造成浪费。
- Q: "Vue 3 setup() 和 onLoad 谁先执行？" → A: setup() 在组件实例创建时立即执行，早于 onLoad。如果需要路由参数（options），必须在 onLoad 中获取，setup 中拿不到。

**源码在哪**：uni-app 生命周期通过 `@dcloudio/uni-mp-vue` 桥接层实现，小程序端由 `@dcloudio/uni-mp-compiler` 将 Vue SFC 编译为小程序原生 Page/Component 定义，页面钩子映射到小程序 `Page({})` 的生命周期方法。

**踩过的坑**：在 onShow 中调用 `uni.navigateTo` 未加条件判断，导致从子页面返回时再次触发跳转形成死循环。后果是页面不断自己跳自己，用户无法返回。修复：在 onShow 中加 `if (this.isFirstEnter)` 标志位，或使用 onLoad 处理一次性跳转逻辑。

**项目选型**：Vue 2 + Options API 适合 uni-app 老项目维护，Vue 3 + Composition API + Pinia 适合新项目启航——后者逻辑复用性更强，但需注意 uni-app 的 Vue 3 对小程序部分 API 的兼容仍有坑（如 `getCurrentInstance` 在小程序端行为差异）。

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

### 💬 面试深度

**标准回答**：条件编译是 uni-app 实现一套代码多端运行的核心机制，通过 `#ifdef` / `#ifndef` 预处理指令在编译时按平台剔除或保留代码块。它可以用于 template、script、style 甚至 pages.json 等配置文件，编译后不同平台的产物中只有对应平台的代码，零运行时开销。实战中建议把平台差异代码收敛到 `src/platform/` 适配层，业务代码只调统一接口，避免 `#ifdef` 满天飞。

**追问预判**：

- Q: "条件编译和运行时 uni.getSystemInfoSync().platform 判断怎么选？" → A: 编译时能确定的差异（如微信 API vs App SDK）用条件编译，零运行时体积；运行时才能确定的（如 iOS vs Android 安全区域高度）用平台 API 判断。原则：能用编译时方案就不用运行时。
- Q: "多个平台共享一段逻辑怎么写？" → A: 用 `||` 组合：`#ifdef H5 || MP-WEIXIN`，或者反过来 `#ifndef APP-PLUS` 排除法覆盖大部分平台。

**源码在哪**：uni-app 的条件编译由 `@dcloudio/uni-cli-shared` 包中的预处理器实现，在 webpack/vite 编译阶段通过正则匹配 `#ifdef` / `#ifndef` / `#endif` 注释并替换为目标平台代码。`@dcloudio/uni-mp-compiler` 在编译小程序时同样走这套预处理逻辑。

**踩过的坑**：在 `#ifdef H5` 块内调用了 `wx.login()`，忘了外层还需要 `#ifndef H5` 保护，导致 H5 构建时直接报 `wx is not defined`。后果是 H5 构建失败，阻塞整个发版流程。修复：涉及平台专有 API 必须同时用 `#ifdef` 和 `#ifndef` 双向保护——`#ifdef MP-WEIXIN` 包裹微信 API，其余走通用逻辑，并用 ESLint 插件在 CI 中做静态检查。

**项目选型**：简单项目直接在页面内条件编译即可；中大型项目强烈建议抽象 `platform/` 适配层——每个平台独立文件 + 统一接口导出，条件编译只出现在适配层内部，业务代码完全无感。

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

### 💬 面试深度

**标准回答**：uni-app 分包是突破小程序 2MB 主包限制的核心策略。在 pages.json 中配置 `subPackages` 将非首屏页面拆入子包按需加载，配合 `preloadRule` 在首页静默预加载高频分包实现秒开体验。优化四步走——静态资源全部走 CDN、公共组件和工具库放主包 common 目录复用、第三方大库按分包粒度拆分、用 webpack-bundle-analyzer 分析包构成精准瘦身。

**追问预判**：

- Q: "主包 2MB 限制怎么破？" → A: 四步走——① 静态资源（图片/字体/图标）全部挪到 CDN，本地只保留首屏必需的小图标；② 非首屏页面全部拆入分包；③ 公共组件和工具库放主包 common，用分包异步化让子包引用主包资源而非重复打包；④ 用 webpack-bundle-analyzer 分析主包构成，找出大模块针对性替换（如 moment.js → dayjs 省 400KB+）。
- Q: "分包预加载会不会拖慢首页？" → A: preloadRule 的下载是异步低优先级，在页面 onReady 后才触发，不阻塞首屏渲染。关键要控制预加载分包的体积（建议每个 < 500KB、不超过 2 个），WiFi 下预加载、4G 下按需加载更稳妥。

**源码在哪**：分包配置在项目根目录 `pages.json` 的 `subPackages` 和 `preloadRule` 字段中声明。uni-app 编译时 `@dcloudio/uni-mp-compiler` 将该配置转换为对应小程序的 `app.json` 中的 `subpackages` 和 `preloadRule` 字段，微信客户端根据配置在运行时执行分包下载。

**踩过的坑**：把 600KB 的 echarts 直接 import 在主包页面中，导致主包体积飙到 2.3MB 超出微信 2MB 限制，上传代码时报包体积超限错误。后果是发版卡了两天紧急拆分。修复：将图表页拆入分包，echarts 改为分包内按需引入，同时将 Canvas 渲染替换为小程序的 `ec-canvas` 组件。教训：第三方大库绝对不能放主包，CI 中应加入包体积检查门禁。

**项目选型**：页面 ≤ 10 的小项目一个主包足够；20+ 页面的中大型项目必须分包，按业务域拆分（商品、订单、用户各一个分包），配合 preloadRule 保证体验不降级。

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

### 💬 面试深度

**标准回答**：nvue 是 uni-app App 端的原生渲染引擎，基于 weex，用原生组件替代 WebView 渲染。它的核心优势是长列表性能——使用 `<list>` + `<cell>` 实现原生回收复用，万级列表滚动稳定 60fps，而 WebView 渲染在同样场景下可能掉到 30fps 以下。但代价是 CSS 支持受限（仅 flex 布局、不支持百分比和 rem），且只能用于 App 端，不能跨端复用。

**追问预判**：

- Q: "nvue 和 vue 页面能混用吗？" → A: 可以混用，同一个 App 中可以同时存在 .vue 和 .nvue 页面，路由跳转无差异。但 nvue 页面之间共享原生渲染层，vue 页面之间共享 WebView，两种页面之间的切换有额外开销（原生 ↔ WebView 上下文切换），不建议高频来回跳转。
- Q: "什么时候必须用 nvue？" → A: 长列表超过 500 条且需要丝滑滚动时（如朋友圈 Feed 流）、地图上需要拖拽大量自定义 Marker 时、视频需要嵌入滚动列表且不能有层级遮挡时。一般表单页和展示页用 vue 页面即可。

**源码在哪**：nvue 的渲染引擎基于 weex 内核（`@dcloudio/uni-app-plus-nvue`），编译时 `@dcloudio/uni-mp-compiler`（App 端为 `@dcloudio/vue-cli-plugin-uni`）将 .nvue 文件编译为 weex 可识别的 JS Bundle，在 App 端由原生 weex 容器加载渲染。

**踩过的坑**：在 nvue 页面中用了 `position: fixed` 做吸顶导航，结果在 iOS 上完全不生效（nvue 不支持 fixed 定位）。后果是导航栏随页面滚动消失，用户体验很差。修复：改用 nvue 支持的 flex 布局 + `<header>` 固定区域实现吸顶效果，将导航放在 `<list>` 外部，利用 nvue 默认的列布局实现头部固定、列表滚动。教训：nvue 开发前务必过一遍 CSS 限制清单。

**项目选型**：纯信息展示 App 不需要 nvue；社交/电商类 App 的长列表 Feed 和商品列表推荐用 nvue 提升体验，其余页面保持 .vue 享受完整 CSS 能力。

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

### 💬 面试深度

**标准回答**：uni-app 性能优化就四板斧——分包减小首屏体积、图片懒加载降低带宽、长列表虚拟化减少 DOM 节点、预加载下一页提升感知速度。我在项目中通过分包把主包从 2.4MB 降到 1.6MB，首屏加载快了 40%；列表页接入 recycle-view 虚拟滚动，1000 条数据从卡顿到丝滑。跨端兼容上，编译时差异用条件编译、运行时差异用平台 API、业务层抽象 platform 适配层，三者配合基本能覆盖 95% 的场景。

**追问预判**：

- Q: "uni-app 和 Taro 怎么选？" → A: uni-app 优势是 HBuilderX 一键发布多端、社区插件多、Vue 技术栈上手快；Taro 优势是 React/Vue 多框架支持、编译时优化更激进、京东系项目天然亲近。如果团队是 Vue 技术栈且需要覆盖 App 端，首选 uni-app；如果是 React 技术栈或只做小程序，Taro 也很成熟。
- Q: "uni-app 包体积比原生小程序大约多少？对启动速度影响多大？" → A: uni-app 框架基础体积约 100-150KB（压缩后），在 2MB 主包中占约 5-8%。启动速度比原生慢约 100-300ms（框架初始化开销），对绝大多数业务场景可忽略。如果启动速度是核心指标（如小游戏、工具类即用即走场景），原生更合适。

**源码在哪**：uni-app 核心编译链路——`@dcloudio/uni-cli-shared`（共享工具）→ `@dcloudio/uni-mp-compiler`（小程序编译）→ `@dcloudio/uni-mp-vue`（Vue 运行时桥接）。App 端走 `@dcloudio/vue-cli-plugin-uni` → weex/nvue 渲染管线。调试时可查看 `node_modules/@dcloudio/` 下的源码，或 clone uni-app 仓库断点调试编译流程。

**踩过的坑**：在 uni-app 项目中使用 Vue 生态的 `vue-lazyload` 图片懒加载插件，小程序端完全不生效且无报错（因为插件依赖 DOM API，小程序无 DOM）。后果是列表页上百张图片同时加载，低端机直接白屏。修复：替换为 uni-app 原生 `<image lazy-load>` 属性，或使用 uni-ui 的 `<uni-load-more>` 配合 Intersection Observer 自行实现。教训：Vue 生态插件不能无脑搬进 uni-app，必须确认是否依赖 DOM/BOM API。

**项目选型**：需覆盖微信 + H5 + App 三端 → uni-app 性价比最高；仅微信且 React 技术栈 → Taro；仅微信且对性能极致要求 → 原生。大多数商业项目选 uni-app 不会错。

---

## 写在最后

uni-app 的核心竞争力在于"一套代码多端运行"，掌握生命周期、条件编译、分包策略和 nvue 是合格 uni-app 开发者的基本功。面试中，除了概念回答外，结合实际项目经验（如"我负责的项目通过分包将首屏从 2.4MB 降到 1.8MB"）更能打动面试官。
