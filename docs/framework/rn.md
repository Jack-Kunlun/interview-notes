---
title: React Native
description: React Native 架构、Bridge 通信、热更新、性能优化、新架构与面试要点
---

# React Native

React Native 使用**原生控件映射**渲染——JSX 组件在 iOS 上映射为 UIView，Android 上映射为 ViewGroup。"Learn once, write anywhere"。

## 一、架构与通信

### 1.1 三线程模型

```
┌──────────────┐        Bridge 队列        ┌──────────────┐
│  JS Thread   │  ──── JSON 序列化 ────→   │ Native Thread │
│  业务逻辑     │  ←─── JSON 序列化 ────    │  原生渲染      │
└──────────────┘                           └──────────────┘
       │                                           │
       └─────── Shadow Thread (Yoga 布局) ────────┘
```

JS 线程执行业务逻辑 → Bridge 异步批量传递 JSON 消息 → Native/UI 线程负责渲染。Shadow 线程用 Yoga 引擎计算布局。**瓶颈**：JSON 序列化/反序列化开销 + 异步通信延迟。

### 1.2 核心组件速查

RN 没有 HTML 标签，所有 UI 由原生映射组件构成：

| 组件 | 原生映射 | 关键点 |
|---|---|---|
| `View` | UIView / ViewGroup | 布局容器，**Flexbox 默认列方向** |
| `Text` | UILabel / TextView | 所有文字必须包裹在 Text 内 |
| `Image` | UIImageView / ImageView | **必须设宽高**，否则加载后布局跳跃 |
| `FlatList` | 虚拟化列表 | 长列表首选，只渲染可视区 + 回收离屏 |
| `ScrollView` | UIScrollView | 有限内容滚动，会一次性渲染全部子节点 |

### 1.3 Bridge 通信方式

| 方式 | 方向 | 适用场景 | 核心 API |
|---|---|---|---|
| **Native Modules** | JS → Native | 调用原生能力（相机、蓝牙、支付） | `NativeModules.XxxModule` |
| **Event Emitter** | Native → JS | 原生主动推送（网络状态、传感器） | `NativeEventEmitter` |
| **JSI（新架构）** | 双向同步 | 直接 C++ 调用，跳过 Bridge | `jsi::HostObject` |

```tsx
// JS → Native
import { NativeModules } from 'react-native'
const eventId = await NativeModules.CalendarManager.addEvent('生日', '6-15', '上海')

// Native → JS（订阅原生事件）
import { NativeEventEmitter } from 'react-native'
const emitter = new NativeEventEmitter(NativeModules.NetworkMonitor)
const sub = emitter.addListener('NetworkChanged', (e) => {
  console.log('连接状态:', e.isConnected)
})
// 组件卸载时 sub.remove()，防止内存泄漏
```

> **面试要点**：Bridge 瓶颈三方面——JSON 序列化开销、异步延迟、单队列堵车。高频交互（onScroll 每帧回调）容易丢帧。新架构 JSI 让 JS 直接调 C++ 方法，同步调用、零序列化，从根本上解决。

## 二、热更新 CodePush

### 2.1 原理

JS Bundle 托管云端，App 启动时检查新版本 → 下载增量包（BSDiff 算法，通常几十 KB）→ 替换本地 Bundle → 重新加载生效。**苹果只限制原生二进制变更，JS 脚本可动态更新绕开审核**。

```
App 启动 → codePush.sync() → 查询新版本
  ├── 无新版本 → 直接进入
  └── 有新版本 → 下载 Bundle → 校验 → 安装
       └── 按 InstallMode 决定生效时机
```

### 2.2 更新策略

| 策略 | InstallMode | 用户感知 | 场景 |
|---|---|---|---|
| 强制更新 | `IMMEDIATE` | 弹窗阻断，立即重启 | 安全漏洞、严重 Bug |
| 静默更新 | `ON_NEXT_RESUME` | 无感知，后台下载 | 功能优化、文案修正 |
| 下次启动 | `ON_NEXT_RESTART` | 仅冷启动生效 | 非紧急修复 |

```tsx
import codePush from 'react-native-code-push'

const codePushOptions = {
  checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
  installMode: codePush.InstallMode.ON_NEXT_RESUME,
}

export default codePush(codePushOptions)(App)
```

::: warning 热更新限制
只能更新 JS Bundle 和静态资源。原生代码（`android/app/src`、`ios/`）变更必须走商店审核。新增 Native Module 后推送热更新 → 原生层无对应实现 → 崩溃。通过 `targetBinaryVersion` 限制更新版本范围。
:::

## 三、性能优化

### 3.1 Hermes 引擎

Hermes 在**构建时 AOT 编译** JS 为字节码，运行时跳过解析 + JIT 编译，TTI 提升 30-50%、内存降低。

```json
// android/app/build.gradle
project.ext.react = [ enableHermes: true ]
```

| 维度 | Hermes | JavaScriptCore |
|---|---|---|
| 编译 | AOT（构建时） | JIT（运行时） |
| 启动 | 快 | 慢 |
| 内存 | 低 | 高 |
| 代价 | 不支持 Proxy/Intl/eval | 完整 ES6+ |

### 3.2 FlatList 优化

```tsx
const ITEM_HEIGHT = 64

<FlatList
  data={items}
  keyExtractor={item => item.id}
  getItemLayout={(_, i) => ({    // 跳过动态测量 ← 60fps 关键
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * i,
    index: i,
  })}
  windowSize={11}                 // 缩小渲染窗口
  removeClippedSubviews           // Android 移除离屏
  maxToRenderPerBatch={10}
/>
```

| 属性 | 作用 | 推荐值 |
|---|---|---|
| `getItemLayout` | 跳过动态测量，`scrollToIndex` 瞬时定位 | 固定高度必须设 |
| `windowSize` | 离屏渲染行数（单位：屏） | 5~11 |
| `removeClippedSubviews` | Android 移除屏幕外子视图 | true |

### 3.3 减少 Bridge 通信

```tsx
// ❌ 每帧都跨 Bridge setState
<ScrollView onScroll={e => setScrollY(e.nativeEvent.contentOffset.y)} />

// ✅ Animated 原生驱动，完全在 Native 侧计算
const scrollY = useRef(new Animated.Value(0)).current
<Animated.ScrollView
  onScroll={Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  )}
/>
```

::: warning useNativeDriver 仅支持 transform 和 opacity
因为原生驱动不触发布局重算（那需要 Shadow 线程），width/height/left/top 等属性必须走 JS → Bridge → Shadow 路径。
:::

### 3.4 图片优化

| 策略 | 做法 |
|---|---|
| 固定尺寸 | Image 必须设 width/height（否则加载后撑开导致布局跳跃） |
| 渐进加载 | 先低清再高清 |
| 缓存 | `react-native-fast-image` 替代原生 Image（磁盘缓存 + 预加载） |

## 四、新架构（Fabric + Turbo Modules + JSI）

旧架构核心痛点是 Bridge 的异步序列化瓶颈。新架构三大组件：

| 组件 | 解决的问题 |
|---|---|
| **JSI** | JS 直接调 C++ HostObject，跳过 JSON 序列化，实现同步调用 |
| **Fabric** | Shadow Tree 放 C++ 层，支持渲染优先级调度（高优交互打断低优渲染） |
| **Turbo Modules** | 原生模块懒加载——首次 import 才初始化，替代旧架构启动时全量加载 |

```tsx
// 新架构：Turbo Module 按需加载
const { TurboCamera } = NativeModules  // ← 此刻才初始化
TurboCamera.takePicture()  // JSI 同步调用，无 Bridge 开销
```

## 五、RN vs Flutter

| 维度 | React Native | Flutter |
|---|---|---|
| 渲染 | 映射原生控件（Bridge / JSI） | Skia 自绘引擎 |
| UI 一致性 | 依赖平台控件，有差异 | **像素级一致** |
| 性能 | Bridge 瓶颈，新架构改善 | 接近原生（Dart 编译 ARM） |
| 热更新 | ✅ CodePush（仅 JS） | ❌ 不支持 |
| 包体积 | 小（~7MB） | 大（~15MB+） |
| 学习成本 | React 基础即可 | 需学 Dart + Widget |
| 适用 | React 团队、需热更新、原生混合 | 追求 UI 一致性、独立团队 |

## 六、面试要点

**Q1: Bridge 为什么有性能瓶颈？**

JSON 序列化开销 + 异步延迟 + 单队列堵车。新架构 JSI 让 JS 直接调 C++，同步无序列化。Animated 的 `useNativeDriver` 是绕过 Bridge 的经典手段——动画配置一次性传给原生，中间帧全在 Native 侧算。

**Q2: Hermes 为什么快？**

AOT 编译：构建时预编译字节码 → 运行时直接执行 → 跳过解析 + JIT 编译。代价：不支持 Proxy/Intl/eval。对移动端而言冷启动比峰值性能更重要。

**Q3: 热更新能 100% 替代发版吗？**

不能。原生代码变更（新增 Native Module、升级 RN 版本、第三方 SDK 更新）必须走商店审核。CodePush 只能更新 JS Bundle + 静态资源。

**Q4: getItemLayout 为什么是 60fps 的关键？**

FlatList 默认需逐个测量每个 Item 高度才能定位——快速滑动时测量来不及完成，列表空白 + 掉帧 + 位置跳动。设了 getItemLayout 直接根据 `index × 固定高度` 反算 offset，`scrollToIndex` 瞬时定位。

**Q5: RN 新架构的核心突破是什么？**

JSI 是核心——让 JS 持有 C++ 对象引用，调用通过 vtable 直接执行，完全跳过 JSON 序列化和 Bridge 队列，实现同步调用。Fabric 做优先级调度，TurboModules 做懒加载。三者合力把性能差距从 30-50% 缩到接近 Flutter。
