---
title: 跨端开发
description: uni-app、React Native、小程序跨端开发复习
---

# 跨端开发（uni-app / React Native / 小程序）

## 必会基础 ⭐⭐⭐

### uni-app 三层生命周期：应用 → 页面 → 组件

uni-app 的生命周期从大到小分为三个层级，执行顺序为 **App → 页面 → 组件**。理解三层生命周期是处理页面跳转、数据预加载、资源清理的前提，尤其注意 `onShow` 每次页面显示都会触发，而 `onLoad` 只在首次加载执行。

| 生命周期 | 层级 | 触发时机 |
|---|---|---|
| `onLaunch` | App | App 初始化（全局只触发一次） |
| `onLoad` | 页面 | 页面加载，可获取路由参数 |
| `onReady` | 页面 | 页面首次渲染完成（可操作 DOM） |
| `onShow` | 页面 | 页面显示（每次切换都触发） |
| `onHide` | 页面 | 页面隐藏 |
| `onUnload` | 页面 | 页面卸载 |

### 条件编译：`#ifdef MP-WEIXIN` 等实现多端差异化

条件编译让同一套代码在不同平台编译出不同产物，核心指令包括 `#ifdef` / `#ifndef` / `#endif`。编译器根据当前平台决定保留或剔除对应代码块，从而实现样式、API 调用的多端差异化，避免维护多套代码仓库。

```html
<!-- 仅微信小程序编译 -->
<!-- #ifdef MP-WEIXIN -->
<view class="wechat-only">微信专属样式</view>
<!-- #endif -->

<!-- 排除 H5 平台 -->
<!-- #ifndef H5 -->
<map :markers="markers"></map>
<!-- #endif -->
```

```javascript
// JS 中同样支持条件编译
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
```

### React Native 核心组件：`View` / `Text` / `FlatList` / `ScrollView`

RN 没有 HTML 标签，所有 UI 均由原生映射的 JS 组件构成。`View` 等价于 `div`，是布局容器；`Text` 承载所有文字（不能直接放在 `View` 内）；`FlatList` 是高性能长列表组件，按需渲染；`ScrollView` 适合有限内容的滚动容器，会一次性渲染全部子节点。

### RN 与 Web 的核心差异：无 DOM、Flexbox 默认列方向、样式子集

React Native 无浏览器 DOM / BOM，无法使用 `document`、`window` 等 API，动画通过 `Animated` 直接操作原生层。Flexbox 默认为 **列方向**（`flexDirection: 'column'`），与 Web 的默认行方向相反。样式仅支持 CSS 子集（无 `grid`、`@keyframes`、百分比单位），单位是逻辑像素而非 px。

### 💬 面试深度

**标准回答**：uni-app 生命周期分 App → 页面 → 组件三层，onLaunch 全局一次、onLoad 页面首次加载、onShow 每次显示都触发。条件编译通过 `#ifdef` / `#ifndef` 让一套代码在不同平台编译不同产物，解决多端 API 差异。React Native 没有 HTML 标签，用 `View` / `Text` / `FlatList` 替代，Flexbox 默认列方向（与 Web 相反），样式只支持 CSS 子集。

**追问预判**：
- Q："onShow 和 onLoad 有什么区别？" → onLoad 只触发一次适合初始化数据，onShow 每次页面显示都触发适合刷新状态（如从详情页返回列表页刷新页面数据）。
- Q："RN 为什么不能用 div？" → RN 没有浏览器 DOM 引擎，而是通过 Bridge 映射到 iOS 的 UIView 和 Android 的 View，所以必须用原生组件封装后的 JSX 组件。

**源码在哪**：
- uni-app 生命周期核心：`uni-app/packages/uni-core/src/service/plugin/lifecycle.ts`
- React Native 组件映射入口：`react-native/Libraries/Components/View/View.js`（JS 封装），原生实现在 `ReactAndroid/src/main/java/.../ReactViewGroup.java` 和 `React/Views/RCTView.m`

**踩过的坑**：在 uni-app 的 `onShow` 里直接放重请求（如全量拉列表），结果从子页面返回时每次都重新请求，列表反复刷新抖动。修复：加标记位 `isFirstEnter`，首次用 `onLoad` 初始化数据，`onShow` 只做轻量状态同步（如更新角标）。

**项目选型**：H5 + 小程序同时覆盖用 uni-app（Vue 生态、插件市场大），React 技术栈 + 需深度原生能力用 React Native，纯小程序且团队 React 栈选 Taro。

## 进阶考点 ⭐⭐

### uni-app 分包策略：主包体积控制、`preloadRule` 预加载

小程序主包限制 2MB，超出必须分包。通过 `subPackages` 声明独立子包，利用 `preloadRule` 在进入某页时预下载关联分包，避免跳转时白屏等待。配置 `network: "all"` 表示不限制网络（Wi-Fi + 4G 均可预加载）。

```json
{
  "pages": [{ "path": "pages/index/index" }],
  "subPackages": [{
    "root": "subpkg-order",
    "pages": [
      { "path": "pages/order/list" },
      { "path": "pages/order/detail" }
    ]
  }],
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["subpkg-order"]
    }
  }
}
```

### RN 性能优化：`FlatList` 的 `getItemLayout` / `windowSize` / `removeClippedSubviews`

长列表性能优化关键是减少不必要的测量与渲染。`getItemLayout` 跳过动态测量（固定行高场景必备）；`windowSize` 控制当前视口外渲染的屏数（默认 21 偏大，调至 5~10 可显著降低内存）；`removeClippedSubviews` 移除屏幕外子视图，进一步释放资源。

```tsx
<FlatList
  data={items}
  keyExtractor={item => item.id}
  getItemLayout={(_, index) => ({    // 固定行高必须设置
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  windowSize={5}                     // 减小渲染窗口（默认21）
  removeClippedSubviews={true}       // 裁剪不可见组件
  initialNumToRender={10}
/>
```

### 小程序双线程架构：渲染层（WebView）与逻辑层（JSCore）通信

小程序采用 **双线程模型**：渲染层运行在 WebView 中负责界面呈现，逻辑层运行在 JSCore 中处理数据和业务逻辑，两者通过 Native 中转 `setData` 完成通信。这一设计隔离了 DOM 操作与 JS 执行，安全性高，但频繁 `setData` 会产生跨线程通信开销，需注意数据传输量和调用频率。

### 💬 面试深度

**标准回答**：小程序采用双线程模型——渲染层跑在 WebView 里负责界面，逻辑层跑在 JSCore 里处理数据，两者通过 Native 做 `setData` 中转通信。这么设计的原因：一是安全——逻辑层不能直接操作 DOM，杜绝了恶意脚本注入；二是管控——微信可以拦截、审核所有数据通信。分包策略解决主包 2MB 限制，`preloadRule` 在进入某页时预下载关联分包避免跳转白屏。

**追问预判**：
- Q："双线程通信的瓶颈在哪？" → `setData` 是异步跨线程的，数据量大或频率高时 Native 中转会成为瓶颈，每次通信都要序列化/反序列化，传输耗时阻塞渲染。优化：合并 `setData` 调用（把多次更新聚合成一次）、只传变化数据（不要全量覆盖）、优先用局部路径更新。
- Q："uni-app 和 Taro 怎么选？" → Vue 技术栈选 uni-app（社区大、插件市场成熟、HBuilderX 集成度高），React 技术栈选 Taro（JSX 写法天然契合、更贴近 Web 标准、跨端一致性更好）。uni-app 市场占有率更高，Taro 在 React 生态中几乎是最优解。

**源码在哪**：
- 小程序双线程架构为微信客户端实现（闭源），原理参考微信官方《小程序开发指南》白皮书
- uni-app 分包编译插件：`uni-app/packages/uni-mp-weixin/src/plugins/subPackage.ts`
- Taro 运行时双线程模拟：`taro/packages/taro-runtime/src/bom/document.ts`

**踩过的坑**：`setData` 频繁传大对象——列表场景每 2 秒轮询后端，直接用 `setData({ list: newList })` 全量替换 200 条数据（每条含 20+ 字段），导致页面明显卡顿、滑动掉帧。修复：改为增量更新，用局部路径 `setData({ ['list[0].status']: 'completed' })` 只更新变化字段；同时在前置做 diff 只传差异项，单次传输量从 ~500KB 降到 ~5KB。

**项目选型**：Vue 栈做小程序首选 uni-app（npm 包丰富、踩坑成本低），React 栈选 Taro（JSX + CSS Modules 天然契合），原生小程序开发仅在团队不熟悉框架或需求极其简单时推荐。

## 移动端自适应 ⭐⭐

移动端自适应是指同一套代码在不同屏幕尺寸和像素密度的设备上保持视觉一致性的方案。核心问题在于屏幕宽度不统一、物理像素与 CSS 像素存在倍率差异（Retina 屏 `devicePixelRatio >= 2`），需要通过相对单位和视口配置来抹平差异。

### 常用 CSS 单位对比

| 单位 | 含义 | 换算 |
|---|---|---|
| `px` | 逻辑像素（CSS 像素） | 设计稿基准，受 `devicePixelRatio` 影响 |
| `rpx` | 微信小程序响应式像素 | `750rpx = 屏幕宽度`，自动等比缩放 |
| `rem` | 相对根元素 `font-size` | `1rem = html` 的 `font-size`（默认 16px） |
| `vw / vh` | 视口宽度/高度百分比 | `100vw = 视口宽度`，`100vh = 视口高度` |
| `em` | 相对父元素 `font-size` | `1em = 父元素` 的 `font-size` |
| `%` | 相对父容器的百分比 | 参照物随 `position` 而变化 |

### 移动端 1px 边框问题

在高 DPI 屏幕上，`border: 1px` 实际渲染为 2~3 个物理像素，导致边框显得过粗。解决思路是使用伪元素画 1px 边框，再通过 `transform: scale(0.5)` 将其缩放至 0.5 逻辑像素，从而在 Retina 屏上呈现真正的 1 物理像素细线。该方案兼容性好，无需 JS 判断设备像素比。

```css
/* 1px 下边框 —— 伪元素 + transform 缩放 */
.hairline {
  position: relative;
}
.hairline::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background-color: #e5e5e5;
  transform: scaleY(0.5);
  transform-origin: 0 0;
}

/* 1px 四周边框（需同时处理四个边）*/
.hairline-border {
  position: relative;
}
.hairline-border::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  border: 1px solid #e5e5e5;
  transform: scale(0.5);
  transform-origin: center;
  border-radius: 0; /* 如需圆角，按 2x 设置，缩放后自动减半 */
}
```

### viewport meta 标签

`viewport` meta 标签是移动端适配的第一道关卡，它告诉浏览器如何控制页面尺寸和缩放比例。没有该标签时，移动端浏览器会以桌面端宽度（约 980px）渲染页面，用户只能双指缩放查看。合理配置 `viewport` 才能启用响应式布局，让媒体查询和 `vw/vh` 正确生效。

```html
<!-- 标准移动端 viewport -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
```

| 属性 | 作用 | 推荐值 |
|---|---|---|
| `width` | 视口宽度 | `device-width`（设备独立像素宽度） |
| `initial-scale` | 初始缩放比例 | `1.0` |
| `maximum-scale` | 最大缩放比例 | `1.0`（禁止缩放） 或 `3.0`（允许缩放） |
| `minimum-scale` | 最小缩放比例 | `1.0` |
| `user-scalable` | 是否允许用户缩放 | `no` |

### rem 适配方案（flexible.js 思路）

经典方案是通过 JS 动态设置 `html` 的 `font-size`，使得 `1rem = 屏幕宽度 / 10`（或 / 7.5），CSS 中用 rem 写尺寸即可等比缩放。该方案在淘宝、京东移动端广泛应用，核心就是监听 `resize` 事件，用 `document.documentElement.clientWidth` 除以设计稿基准值重新计算根字号。

```javascript
// rem 自适应：设计稿 375px 为基准，1rem = 37.5px
(function () {
  const setRem = () => {
    const baseWidth = 375;               // 设计稿宽度
    const baseFontSize = 37.5;           // 基准 font-size
    const scale = document.documentElement.clientWidth / baseWidth;
    document.documentElement.style.fontSize = baseFontSize * scale + 'px';
  };
  setRem();
  window.addEventListener('resize', setRem);
  // 页面显示时重新计算（解决缓存返回问题）
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) setRem();
  });
})();
```

### 💬 面试深度

**标准回答**：移动端自适应的核心是让页面随屏幕宽度等比缩放。小程序用 `rpx`——750rpx 恒等于屏幕宽度，写起来最简单。H5 传统方案用 rem：JS 动态设置 `html` 的 `font-size`，CSS 中用 rem 写尺寸，监听 resize 重新计算。1px 边框在高 DPI 屏变粗，用伪元素 + `transform: scale(0.5)` 解决。`viewport` meta 标签是适配第一关——不设的话移动端浏览器会以 980px 桌面宽度渲染。

**追问预判**：
- Q："rpx 和 rem 的本质区别？" → rpx 是小程序框架内置的编译时转换，基准固定 750，无需 JS 参与；rem 需要 JS 动态设置根字号，依赖浏览器环境，基准可自定义（常用 375 / 750）。rpx 零成本但只能在小程序用，rem 通用但有 JS 依赖。
- Q："vw/vh 能完全替代 rem 吗？" → 可以，且更简洁无需 JS。但需要注意：旧版 Android 4.x 对 vw 支持有坑，且 vw 无法像 rem 那样通过修改 `html font-size` 统一缩放第三方组件库。新项目推荐 vw，旧项目改造用 rem。

**源码在哪**：
- uni-app rpx 转换：`uni-app/packages/uni-mp-weixin/src/plugins/postcss/rpx.ts`
- flexible.js（rem 经典方案）：`lib-flexible/src/flexible.js`（淘宝开源，已归档，官方推荐迁移 vw）
- 小程序 WXSS rpx 转换在微信开发者工具编译层（闭源）

**踩过的坑**：rem 方案在 iOS Safari 底部导航栏弹出/收起时，`window.innerHeight` 变化触发 resize 事件导致 `font-size` 被重新计算，页面瞬间跳闪。修复：在 resize 回调里加 200ms 防抖，且只在 `clientWidth` 变化时才重新计算（忽略纯高度变化），或直接迁移到 vw 方案彻底规避。

**项目选型**：小程序直接用 rpx 零成本适配；H5 新项目优先 vw/vh（原生 CSS 能力、零 JS 依赖）；旧项目维护用 rem（改动成本低）；PC + 移动共一套页面用 CSS media query + `max-width` 断点布局。

## React Native 热更新 ⭐⭐

热更新（Hot Update / OTA）指在不经过 App Store / Google Play 审核的情况下，直接向用户推送 JS Bundle 增量更新，快速修复 Bug 或上线新功能。React Native 的 JS 代码运行在 JSCore / Hermes 中，天然支持运行时替换，这是热更新的技术基础。

### CodePush 原理

CodePush（现集成于 App Center）是微软提供的热更新服务。核心原理是：App 启动时检查远程是否有新版本的 JS Bundle，若有则下载增量包（diff update），存储到本地，下次启动或立即应用新包。增量下发通过 BSDiff 算法对比新旧 Bundle 的二进制差异，大幅减少下载量（通常仅几十 KB），而非每次都拉取完整 Bundle。

| 特性 | 说明 |
|---|---|
| 更新粒度 | JS Bundle（JS 代码 + 图片资源），不含原生代码 |
| 更新方式 | 增量更新（BSDiff），对比上次已安装版本 |
| 生效时机 | 立即生效 或 下次启动生效 |
| 回滚能力 | 自动回滚：新包崩溃时恢复上一个稳定版本 |
| 原生变更 | 涉及 Native 模块修改时**必须走应用商店更新** |

### AppCenter CLI 配置

App Center 提供 `appcenter-cli` 命令行工具管理热更新。核心命令：`codepush release-react` 发布 JS Bundle 到指定部署环境。通常将 `Staging` 环境用于内部测试，`Production` 用于线上用户。

```bash
# 安装 CLI
npm install -g appcenter-cli

# 登录
appcenter login

# 发布 React Native 热更新
appcenter codepush release-react \
  -a <owner>/<app-name> \
  -d Staging \                # 部署环境：Staging / Production
  -t ">=1.0.0" \              # 目标二进制版本范围
  --description "修复首页白屏问题" \
  --mandatory false           # 是否强制更新

# 查看发布历史
appcenter codepush deployment history -a <owner>/<app-name> Staging

# 回滚到上一版本
appcenter codepush rollback -a <owner>/<app-name> Staging
```

### 强制更新 vs 静默更新

| 对比维度 | 强制更新（Mandatory） | 静默更新（Silent） |
|---|---|---|
| 用户体验 | 弹窗阻断，用户必须更新后才能使用 | 后台静默下载，无感知 |
| 适用场景 | 严重 Bug 修复、安全漏洞、不可兼容的接口变更 | 文案调整、样式优化、新增非核心功能 |
| 生效时机 | 下载后**立即**应用（配合 `sync` 的 `installMode`） | 下次启动时应用 |
| 风险 | 阻断式体验，可能导致用户流失 | 延迟生效，Bug 修复不够及时 |
| CLI 参数 | `--mandatory true` | `--mandatory false`（默认） |

### 热更新完整流程

```tsx
import codePush from 'react-native-code-push';

// 1. 基础集成：高阶组件包裹 App
const App = () => {
  // ...业务代码
};

const codePushOptions = {
  checkFrequency: codePush.CheckFrequency.ON_APP_RESUME, // App 回到前台时检查
  installMode: codePush.InstallMode.ON_NEXT_RESUME,       // 下载后下次 Resume 生效
  mandatoryInstallMode: codePush.InstallMode.IMMEDIATE,   // 强制更新立即生效
};

export default codePush(codePushOptions)(App);

// 2. 更精细的控制：手动 sync + 状态回调
async function checkForUpdate() {
  const update = await codePush.sync(
    {
      installMode: codePush.InstallMode.ON_NEXT_RESTART,
      mandatoryInstallMode: codePush.InstallMode.IMMEDIATE,
    },
    // 状态变化回调
    (status) => {
      switch (status) {
        case codePush.SyncStatus.CHECKING_FOR_UPDATE:
          console.log('正在检查更新...');
          break;
        case codePush.SyncStatus.DOWNLOADING_PACKAGE:
          console.log('正在下载更新包...');
          break;
        case codePush.SyncStatus.INSTALLING_UPDATE:
          console.log('正在安装更新...');
          break;
        case codePush.SyncStatus.UPDATE_INSTALLED:
          console.log('更新已安装，下次启动生效');
          break;
      }
    },
    // 下载进度回调
    ({ receivedBytes, totalBytes }) => {
      const progress = (receivedBytes / totalBytes * 100).toFixed(0);
      console.log(`下载进度: ${progress}%`);
    }
  );
  return update;
}

// 3. 区分环境：开发环境跳过热更新检查
const isDev = __DEV__;

const codePushOptions = isDev
  ? { checkFrequency: codePush.CheckFrequency.MANUAL } // 开发环境手动触发
  : {
      checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
      installMode: codePush.InstallMode.ON_NEXT_RESUME,
    };

export default codePush(codePushOptions)(App);
```

### 热更新流程时序

```
App 启动 → codePush.sync() → 请求 CodePush Server
    ├── 无新版本 → 直接进入 App
    └── 有新版本
        ├── 下载增量 Bundle（diff）
        ├── 校验签名 & MD5
        ├── 解压到本地目录
        └── InstallMode 决定生效时机
            ├── IMMEDIATE       → 立即 reload（强制更新推荐）
            ├── ON_NEXT_RESUME  → App 下次回到前台时 reload
            └── ON_NEXT_RESTART → 完全退出后下次冷启动生效
```

> **面试要点**：热更新只能更新 JS 层代码和图片资源，原生代码（`android/app/src`、`ios/`）变更必须走商店审核。如果新增了 Native Module 或升级了 RN 版本，热更新推送会导致原生层与 JS 层不匹配而崩溃，此时应通过 `targetBinaryVersion` 限制更新的二进制版本范围。

### 💬 面试深度

**标准回答**：RN 热更新的核心是利用 JS Bundle 运行时替换的特性，通过 CodePush 在不经过应用商店审核的情况下推送增量更新。增量包用 BSDiff 算法只传差异部分，通常几十 KB。更新分强制和静默——严重 Bug 设 mandatory 立即生效（阻断式），普通优化设 silent 下次启动生效（无感知）。但原生代码变更必须走商店审核，热更新只能覆盖 JS 层和图片资源。

**追问预判**：
- Q："热更新包崩溃了怎么兜底？" → CodePush 自带自动回滚——新 Bundle 启动即崩溃，下次会自动回退到上一个稳定版本。另外可在 sync 流程中 try/catch，捕获异常后调用 `codePush.clearUpdates()` 主动清除坏包，确保用户尽快回到可用状态。
- Q："为什么原生模块变更必须走商店？" → RN 原生模块（如 `react-native-camera`）编译进 APK/IPA 的是 .so / .a 二进制文件，热更新只下发 JS Bundle，无法修改已编译的原生代码。JS 层调了新增的原生方法但原生层没有对应实现，会直接红屏崩溃。

**源码在哪**：
- CodePush SDK（JS 层）：`react-native-code-push/CodePush.js`
- CodePush 原生层 Android：`react-native-code-push/android/app/src/main/java/com/microsoft/codepush/react/CodePush.java`
- CodePush 原生层 iOS：`react-native-code-push/ios/CodePush/CodePush.m`
- App Center 服务端为微软 Azure 托管（闭源）

**踩过的坑**：发版时忘记更新 `targetBinaryVersion`——用户 App 原生版本是 1.0.0，但热更新 Bundle 调用了 1.1.0 才新增的 Native Module（如 `NativeModules.NewPayModule`），低版本用户打开 App 直接白屏崩溃，影响整个线上用户。修复：每次发版在 CI 中加校验脚本，自动匹配 `-t` 参数与 `package.json` 版本号；同时在 JS 侧对 `NativeModules` 调用做 `if (NativeModules.NewPayModule)` 防御。

**项目选型**：CodePush 适合 RN 项目快速热修（微软维护、BSDiff 增量成熟）；国内替代 Bugly 热更新（腾讯、支持 RN/Cocos/Unity）和 Pushy（React Native 中文社区）；Flutter 热更新目前无官方方案，需借助非官方 CodePush 绑定或自定义引擎替换。
