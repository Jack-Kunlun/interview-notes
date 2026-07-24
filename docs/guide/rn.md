---
title: React Native
description: React Native 核心组件、Bridge 通信原理、热更新、性能优化与常见面试题
---

# React Native

## 核心组件 ⭐⭐⭐

### View / Text / Image / ScrollView / FlatList / TextInput / TouchableOpacity 快速参考

React Native 提供了一套跨平台的基础组件，每个组件都映射到 iOS 和 Android 的原生 UI 控件。`View` 对应 iOS 的 UIView 和 Android 的 ViewGroup，是最基础的容器；`Text` 承载所有文字内容且支持嵌套样式继承；`Image` 用于显示本地和网络图片；`ScrollView` 包裹可滚动内容但适合有限数量子元素；`FlatList` 是高性能长列表组件，支持懒加载和回收机制；`TextInput` 是文本输入框；`TouchableOpacity` 提供点击反馈（按下时透明度降低）。

| 组件 | 映射原生控件 | 核心用途 | 关键属性 |
|---|---|---|---|
| `View` | UIView / ViewGroup | 布局容器 | `style`, `onLayout` |
| `Text` | UILabel / TextView | 文字渲染 | `numberOfLines`, `onPress` |
| `Image` | UIImageView / ImageView | 图片展示 | `source`, `resizeMode`, `onLoad` |
| `ScrollView` | UIScrollView / ScrollView | 有限内容滚动 | `contentContainerStyle`, `onScroll` |
| `FlatList` | 虚拟化列表 | 长列表高性能渲染 | `data`, `renderItem`, `keyExtractor` |
| `TextInput` | UITextField / EditText | 文本输入 | `onChangeText`, `value`, `secureTextEntry` |
| `TouchableOpacity` | 手势识别 + 动画 | 点击交互 | `onPress`, `activeOpacity`, `disabled` |

```tsx
import {
  View, Text, Image, ScrollView, FlatList,
  TextInput, TouchableOpacity
} from 'react-native'

// 基础组件组合示例
const Demo = () => (
  <ScrollView>
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
        用户信息
      </Text>
      <Image
        source={{ uri: 'https://example.com/avatar.png' }}
        style={{ width: 80, height: 80, borderRadius: 40 }}
        resizeMode="cover"
      />
      <TextInput
        placeholder="请输入用户名"
        onChangeText={(text) => console.log(text)}
      />
      <TouchableOpacity
        onPress={() => alert('提交')}
        activeOpacity={0.7}
      >
        <Text>提交</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
)
```

### FlatList 性能优化（getItemLayout / windowSize / removeClippedSubviews）

FlatList 通过虚拟化技术只渲染当前可见区域的元素，极大地降低内存占用和 UI 线程压力。当列表项高度固定时，使用 `getItemLayout` 可跳过动态测量步骤，使滚动定位和 `scrollToIndex` 精确且瞬时完成。`windowSize` 控制渲染窗口大小（默认 21，即 10 屏外 + 1 屏可视 + 10 屏外，单位是视口高度），减小该值可减少离屏渲染数量。`removeClippedSubviews` 在 Android 上将屏幕外的子视图从原生视图树中移除，减少 GPU 合成负担。

```tsx
// FlatList 性能优化示例
const ITEM_HEIGHT = 64

<FlatList
  data={largeDataset}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <View style={{ height: ITEM_HEIGHT }}>
      <Text>{item.name}</Text>
    </View>
  )}
  // ✅ 固定高度下，跳过测量的 getItemLayout
  getItemLayout={(_, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  // ✅ 缩小渲染窗口（只保留 5 屏外的缓冲区）
  windowSize={11}
  // ✅ Android 移除屏幕外子视图
  removeClippedSubviews
  // ✅ 初始渲染优化
  initialNumToRender={10}
  maxToRenderPerBatch={10}
/>

// ❌ 错误：动态高度 + 未设置 getItemLayout
// FlatList 需要逐个测量所有元素，造成严重卡顿
```

| 优化属性 | 作用 | 推荐值 | 适用场景 |
|---|---|---|---|
| `getItemLayout` | 跳过动态测量 | 固定高度值 | 高度一致的列表 |
| `windowSize` | 控制离屏渲染范围 | 5~11 | 列表很长时 |
| `removeClippedSubviews` | Android 移除离屏视图 | `true` | 复杂的 Item 嵌套 |
| `maxToRenderPerBatch` | 每批次最大渲染数 | 5~10 | 控制增量渲染速度 |
| `initialNumToRender` | 首屏渲染数 | 10 | 控制首屏绘制 |

### 自定义组件封装示例

```tsx
// 封装一个可复用的卡片组件
interface CardProps {
  title: string
  description: string
  onPress: () => void
}

const Card: React.FC<CardProps> = ({ title, description, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      backgroundColor: '#fff',
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }}
  >
    <Text style={{ fontSize: 16, fontWeight: '600' }}>{title}</Text>
    <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
      {description}
    </Text>
  </TouchableOpacity>
)
```

### 💬 面试深度

**标准回答**：React Native 的核心组件本质上是对 iOS 和 Android 原生控件的跨平台封装——View 对应 UIView/ViewGroup，Text 对应 UILabel/TextView，Image 对应 UIImageView/ImageView。日常 80% 的 UI 靠这七个组件搭出来，记住两条铁律：Image 必须设宽高否则布局跳跃，长列表用 FlatList 替代 ScrollView。

**追问预判**：
- 「ScrollView 和 FlatList 到底怎么选？」→ ScrollView 一次性渲染所有子元素，适合内容少且固定的场景（表单、设置页）；FlatList 只渲染可视区域并回收离屏元素，适合超过一屏的长列表。一句话：超过屏幕高度一律 FlatList。
- 「Text 组件的嵌套样式继承和 Web CSS 有什么不同？」→ RN 的 Text 嵌套时子 Text 继承父 Text 样式，但 View 内的 Text 不会继承 View 的样式——这和 CSS 层叠继承完全不同，很多人在这里踩坑。

**源码在哪**：
- JS 组件层：`react-native/Libraries/Components/View/View.js`、`Libraries/Image/Image.js`、`Libraries/Lists/FlatList.js`
- iOS 原生映射：`React/Views/RCTView.m`
- Android 原生映射：`ReactAndroid/src/main/java/com/facebook/react/views/view/ReactViewGroup.java`

**踩过的坑**：Image 组件不设 width/height，网络图片加载前高度为 0，加载完成后突然撑开，下方所有元素位置跟着跳——低端机上用户误触率飙升。**修复**：让后端返回图片宽高比，前端用 `width: screenWidth, height: screenWidth * aspectRatio` 提前占位，或用骨架屏撑住布局。

**项目选型**：基础 UI 用 RN 核心组件足够；复杂手势和动画场景引入 `react-native-gesture-handler` + `react-native-reanimated`，别用内置 Touchable 和 Animated 硬撑。

## 原生通信 Bridge ⭐⭐⭐

### 整体架构

React Native 运行在三线程模型上：**JS 线程**（执行 JavaScript 逻辑）、**Native/UI 线程**（负责原生渲染和用户交互）、**Shadow 线程**（计算布局，生成原生布局树）。JS 线程与 Native 线程之间通过 **Bridge** 进行异步批量通信——JS 侧调用被序列化为 JSON 消息放入队列，Native 侧定期从队列中取出并执行，结果再以同样方式回传。

```
┌──────────────┐          Bridge 队列          ┌──────────────┐
│  JS Thread   │  ─────  JSON 序列化  ─────  │ Native Thread │
│  JavaScript  │                                │  iOS/Android  │
│  业务逻辑     │  ←────  JSON 序列化  ─────  │  原生控件      │
└──────────────┘          （异步批量）          └──────────────┘
        │                                              │
        └──────────  Shadow Thread (Yoga 布局) ────────┘
```

### Native Modules（JS → Native）

Native Modules 是 JS 调用原生能力的桥梁。当 React Native 内置 API 不满足需求时（如访问蓝牙、调用支付 SDK），开发者需要在原生层编写模块类，继承 `RCTBridgeModule`（iOS）或 `ReactContextBaseJavaModule`（Android），用宏或注解标记需要暴露给 JS 的方法，然后 JS 侧通过 `NativeModules` 导入直接调用。调用参数会被 JSON 序列化，经 Bridge 传递到原生线程执行，返回值以 Promise 或 Callback 形式回传 JS。

```tsx
// JS 侧：调用 Native Modules
import { NativeModules } from 'react-native'

const { CalendarManager, BluetoothService } = NativeModules

// Promise 式调用
const eventId = await CalendarManager.addEvent(
  '生日聚会',
  '2025-06-15',
  '上海'
)

// Callback 式调用
BluetoothService.scanDevices(
  (device) => console.log('发现设备:', device),
  (error) => console.error('扫描失败:', error)
)
```

```java
// Android 侧：注册原生模块
@ReactMethod
public void addEvent(String name, String date, String location,
                      Promise promise) {
    try {
        int eventId = calendarHelper.addEvent(name, date, location);
        promise.resolve(eventId);
    } catch (Exception e) {
        promise.reject("CALENDAR_ERROR", e.getMessage());
    }
}
```

```objc
// iOS 侧：暴露方法给 JS
RCT_EXPORT_METHOD(addEvent:(NSString *)name
                  date:(NSString *)date
                  location:(NSString *)location
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSInteger eventId = [self.calendarHelper addEvent:name date:date location:location];
    if (eventId >= 0) {
        resolve(@(eventId));
    } else {
        reject(@"CALENDAR_ERROR", @"添加事件失败", nil);
    }
}
```

### Native Event Emitter（Native → JS）

原生层需要主动向 JS 推送事件时（如监听网络状态变化、收到推送通知、传感器数据变化），使用 **Event Emitter** 机制。原生侧继承 `RCTEventEmitter`（iOS）或使用 `DeviceEventManagerModule.RCTDeviceEventEmitter`（Android），通过 `sendEventWithName:body:` 发送事件；JS 侧通过 `NativeEventEmitter` 订阅，在组件卸载时记得移除监听，否则会造成事件重复注册和内存泄漏。

```tsx
// JS 侧：订阅原生事件
import { NativeEventEmitter, NativeModules } from 'react-native'
import { useEffect } from 'react'

const { NetworkMonitor } = NativeModules
const emitter = new NativeEventEmitter(NetworkMonitor)

const useNetworkStatus = () => {
  useEffect(() => {
    const subscription = emitter.addListener(
      'NetworkStatusChanged',
      (event) => {
        console.log('连接状态:', event.isConnected)
        console.log('网络类型:', event.connectionType)
      }
    )
    // ✅ 组件卸载时移除监听，防止内存泄漏
    return () => subscription.remove()
  }, [])
}
```

```objc
// iOS 侧：继承 RCTEventEmitter 发送事件
#import <React/RCTEventEmitter.h>

@interface NetworkMonitor : RCTEventEmitter
@end

@implementation NetworkMonitor

- (NSArray<NSString *> *)supportedEvents {
    return @[@"NetworkStatusChanged"];
}

- (void)onNetworkChange:(BOOL)isConnected type:(NSString *)type {
    [self sendEventWithName:@"NetworkStatusChanged"
                       body:@{@"isConnected": @(isConnected),
                              @"connectionType": type}];
}
@end
```

### 通信原理（Bridge 队列 + 批量处理）

Bridge 的核心设计是**异步 + 批量**。JS 线程每帧产生的所有 Native 调用被序列化为 JSON 消息，放入 Bridge 队列；Native 线程在每帧开始时批量取出队列中全部消息并执行，结果也批量回传。这样做的优势是减少线程切换次数、提高吞吐量，但代价是：大数据量的高频交互会产生序列化/反序列化开销，且 JS 和 Native 是异步的，无法保证实时同步。对实时性要求高的场景（如动画、手势跟随），RN 提供了 `Animated` 和 `react-native-gesture-handler` 通过直接操作原生驱动来绕开 Bridge。

```
每次帧周期（~16ms at 60fps）：

JS Thread:    [call1, call2, call3]  →  JSON  →  入队列
                                                   ↓
Native Thread:  出队列  →  反序列化  →  执行  →  结果 JSON
                                                   ↓
JS Thread:    解析结果  →  setState  →  触发 re-render
```

| 通信方式 | 方向 | 适用场景 | 核心 API |
|---|---|---|---|
| Native Modules | JS → Native | 调用原生能力（相机、蓝牙） | `NativeModules` |
| Event Emitter | Native → JS | 原生主动推送事件 | `NativeEventEmitter` |
| JSI (新架构) | 双向同步 | 直接 C++ 调用，跳过 Bridge | `jsi::HostObject` |
| Turbo Modules | 双向按需 | 懒加载原生模块 | 新架构 `TurboModule` |

### 💬 面试深度

**标准回答**：RN 的三线程架构——JS 线程跑业务逻辑，Native/UI 线程负责渲染原生控件，Shadow 线程用 Yoga 引擎算布局。JS 线程发 JSON 消息到 Bridge 队列，Native 线程每帧批量消费；瓶颈在于 JSON 序列化/反序列化开销和异步通信延迟，高频交互（如 onScroll 回调）容易丢帧。Animated 的 useNativeDriver 是绕过 Bridge 的经典手段——动画配置一次性序列化传给原生，中间帧计算全在 Native 侧完成。

**追问预判**：
- 「新架构（Fabric + TurboModule + JSI）怎么解决 Bridge 瓶颈？」→ JSI 是核心突破——让 JS 直接持有 C++ 宿主对象（HostObject）的引用，调用时通过 vtable 直接执行 C++ 方法，完全跳过 JSON 序列化和 Bridge 队列，实现同步调用。Fabric 把 Shadow Tree 放到 C++ 层维护，支持渲染优先级调度（高优交互可打断低优渲染）。Turbo Modules 按需懒加载原生模块——只在首次 import 时才初始化，替代旧架构启动时全量加载所有 NativeModule 的慢启问题。
- 「Animated 的 useNativeDriver 为什么只支持 transform 和 opacity？」→ 因为原生驱动动画在 Native 侧计算中间帧时不能触发布局重算（那需要回到 Shadow 线程），所以只能用 transform（平移/旋转/缩放）和 opacity 这类不影响布局的属性。要动画化 width/height/left/top 等布局属性，必须走 JS 线程 → Bridge → Shadow 线程的路径，无法用原生驱动。

**源码在哪**：
- Bridge 核心（iOS）：`React/Base/RCTBridge.m`、`React/CxxBridge/RCTCxxBridge.mm`
- JSI 接口定义：`ReactCommon/jsi/jsi/jsi.h`
- JSI Executor：`React/JSIRuntime/RCTJSIExecutor.mm`
- Android Bridge 核心：`ReactAndroid/src/main/java/com/facebook/react/bridge/CatalystInstanceImpl.java`
- NativeModule 注册：`React/Base/RCTModuleData.m`

**踩过的坑**：在 `onScroll` 回调里直接 `setState({scrollY})`——每帧触发一次 Bridge 序列化 → JS setState → re-render → Shadow 线程重算布局，低端机上滚动从 60fps 掉到 30fps 以下。**修复**：改用 `Animated.event` + `useNativeDriver: true`，滚动位置绑定到 Animated.Value，完全在 Native 侧流转；如果必须拿到 JS 用，至少把 `scrollEventThrottle` 调到 100ms 以上，降低 Bridge 调用频率。

**项目选型**：新项目直接上 0.76+ 的新架构（默认启用）；老项目评估三方库（react-native-reanimated、react-native-gesture-handler）兼容性后渐进迁移；涉及蓝牙/硬件通信等高频 Native 调用的模块优先封装为 TurboModule。

## 热更新 CodePush ⭐⭐⭐

### 原理与配置

CodePush 是微软提供的 React Native 热更新服务，核心原理是将 JS Bundle 和静态资源托管在云端（Azure / 私有服务器），App 启动时检查更新并下载新 Bundle，下次启动或立即加载新版本——从而绕过 App Store / Google Play 漫长的审核周期。**关键在于：苹果审核指南允许动态更新 JS 脚本，但不允许改变 App 的二进制原生代码**，所以原生模块变更仍需走发版流程。

CodePush 工作流程：App 启动 → 调用 `codePush.sync()` → 查询云端是否有新版本 → 下载 Bundle → 安装 → 根据策略决定立即生效或下次启动生效。Bundle 存储在设备本地，下次启动优先加载已下载的最新 Bundle。

```tsx
import codePush from 'react-native-code-push'

// 基础配置
const codePushOptions = {
  // 检查更新的频率
  checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
  // 安装策略
  installMode: codePush.InstallMode.ON_NEXT_RESUME,
  // 最低后台下载时间
  minimumBackgroundDuration: 60 * 5,
}

const App = () => (
  <MainApp />
)

export default codePush(codePushOptions)(App)
```

### 强制更新 vs 静默更新

强制更新适用于修复严重 Bug 或安全漏洞的场景，用户必须立即获取最新版本才能继续使用 App——弹窗阻止用户操作，显示下载进度，完成后自动重启。静默更新适用于功能优化和非关键修复，后台静默下载，用户无感知地在下次启动或切回前台时应用新版本。CodePush 通过 `InstallMode` 控制：`IMMEDIATE`（立即安装并重启）、`ON_NEXT_RESTART`（下次冷启动）、`ON_NEXT_RESUME`（下次从后台切回）、`ON_NEXT_SUSPEND`（下次进入后台）。

```tsx
// 强制更新实现
codePush.sync(
  {
    installMode: codePush.InstallMode.IMMEDIATE,
    // 弹出自定义对话框告知用户
    updateDialog: {
      title: '重要更新',
      mandatoryUpdateMessage: '检测到安全更新，请立即更新以继续使用',
      mandatoryContinueButtonLabel: '立即更新',
    },
  },
  (status) => {
    switch (status) {
      case codePush.SyncStatus.DOWNLOADING_PACKAGE:
        showProgressBar()
        break
      case codePush.SyncStatus.INSTALLING_UPDATE:
        hideProgressBar()
        break
    }
  }
)

// 静默更新实现
codePush.sync({
  installMode: codePush.InstallMode.ON_NEXT_RESUME,
  // 不弹出对话框，用户无感知
  updateDialog: false,
})
```

| 更新策略 | InstallMode | 用户感知 | 适用场景 |
|---|---|---|---|
| 强制更新 | `IMMEDIATE` | 弹窗阻断，强制等待 | 安全漏洞、严重 Bug |
| 静默更新 | `ON_NEXT_RESUME` | 无感知，自动完成 | 功能优化、文案修正 |
| 下次启动 | `ON_NEXT_RESTART` | 仅下次启动生效 | 非紧急修复 |
| 手动更新 | 不自动 sync | 用户主动触发 | 不希望在关键时刻更新 |

### 💬 面试深度

**标准回答**：CodePush 把 JS Bundle 和静态资源放到云端，App 启动时比对版本、下载新包、替换本地文件加载——因为苹果只限制原生二进制变更，JS 脚本可以动态更新绕开审核。更新策略分四种：IMMEDIATE 强制更新（修严重 Bug 弹窗阻断）、ON_NEXT_RESUME 静默更新（用户无感知）、ON_NEXT_RESTART 下次启动生效、手动触发。

**追问预判**：
- 「原生代码变了热更新还有效吗？」→ **无效**——这是 RN 热更新最大的限制。原生模块（Objective-C/Java/Kotlin）编译进了 App 二进制，CodePush 只能更新 JS Bundle 和静态资源。一旦改了原生代码（如升级第三方 SDK、新增 Native Module），必须重新打包走 App Store / Google Play 审核。所以 RN 不能 100% 热更——涉及原生依赖变更时必须走发版流程。
- 「CodePush 的回滚机制怎么设计？」→ CodePush 自带自动回滚——如果新 Bundle 加载后 crash，下次启动自动恢复到上一个稳定版本；也可以手动调用 `codePush.clearUpdates()` 回滚。生产环境建议配合崩溃上报（Sentry/Firebase Crashlytics）做监控，crash 率超标时触发自动回滚。

**源码在哪**（CodePush SDK）：
- iOS 端：`react-native-code-push/ios/CodePush/CodePush.m`
- Android 端：`react-native-code-push/android/app/src/main/java/com/microsoft/codepush/react/CodePush.java`
- Bundle 加载逻辑：`react-native/Libraries/AppLoader/RCTAppLoader.mm`

**踩过的坑**：CodePush 只更新了 JS Bundle 但忘记同步新增的静态资源（图片/字体），导致新 UI 引用新图片时本地不存在——白屏占位或 crash。**修复**：部署时用 `code-push release-react` 命令确保 assets 目录被包含，或者在 CI 流程中校验 Bundle 和 assets 的完整性；关键图片也可以 base64 内联到 JS 中兜底。

**项目选型**：CodePush 适合纯 JS/UI 层面的快速迭代（文案、样式、逻辑修复），不适合原生模块频繁变动的项目；也可考虑 expo-updates（Expo 生态的原生热更新替代方案）；国内还可以配合 Pushy（react-native-update）作为 CodePush 服务不可用时的备份方案。

## 性能优化 ⭐⭐⭐

### Hermes 引擎

Hermes 是 Meta 专为 React Native 打造的轻量级 JavaScript 引擎，替代了传统的 JavaScriptCore。它在 **构建阶段（AOT）** 将 JS 源码预编译为字节码，运行时省略了 JSC 的解析和 JIT 编译开销，显著缩短了 App 冷启动时间（尤其 Android 上 TTI 提升 30-50%）、减少内存占用和 APK 体积。Hermes 专注于 React Native 场景做了特化优化，但牺牲了对部分 ES6+ 特性的完整支持（如 Proxy、Intl），且不支持动态 `eval`。

```json
// android/app/build.gradle — 启用 Hermes
project.ext.react = [
    enableHermes: true,  // ← 开启 Hermes
]

// ios/Podfile
:hermes_enabled => true  // ← iOS 开启 Hermes
```

```tsx
// 验证 Hermes 是否生效
const isHermes = () => !!global.HermesInternal
console.log('Hermes 已启用:', isHermes())
// true → 正在使用 Hermes
```

| 维度 | Hermes | JavaScriptCore |
|---|---|---|
| 编译方式 | AOT（构建时预编译字节码） | JIT（运行时即时编译） |
| 冷启动速度 | 快（跳过解析阶段） | 慢（需要解析 + JIT） |
| 运行时内存 | 低（精简 GC） | 较高 |
| APK 体积 | 小（字节码更紧凑） | 较大 |
| ES6+ 支持 | 部分（无 Proxy、Intl） | 完整 |
| `eval` | 不支持 | 支持 |

### FlatList 优化（完整策略）

FlatList 性能优化是一个组合策略，除了前面提到的 `getItemLayout`、`windowSize`、`removeClippedSubviews`，还需要关注：`keyExtractor` 提供稳定 key 避免 re-render；`React.memo` 包裹 `renderItem` 避免已渲染的 Item 因父组件状态变化而重复渲染；避免在 `renderItem` 中创建匿名函数和对象（每次渲染都是新引用）；对复杂 Item 使用 `React.useCallback` 缓存事件处理函数。

```tsx
// ✅ 完整的 FlatList 优化示例
const MemoizedItem = React.memo(({ item, onPress }) => {
  // 确保 onPress 引用稳定（由父组件 useCallback 保证）
  return (
    <TouchableOpacity onPress={() => onPress(item.id)}>
      <Text>{item.title}</Text>
    </TouchableOpacity>
  )
})

const OptimizedList = ({ data }) => {
  // 缓存事件处理函数
  const handlePress = useCallback((id: string) => {
    navigation.navigate('Detail', { id })
  }, [navigation])

  const renderItem = useCallback(
    ({ item }) => <MemoizedItem item={item} onPress={handlePress} />,
    [handlePress]
  )

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}        // 稳定 key
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      windowSize={11}
      removeClippedSubviews
      maxToRenderPerBatch={10}
      initialNumToRender={10}
    />
  )
}
```

### 减少 Bridge 通信

Bridge 通信的瓶颈在于 JSON 序列化/反序列化和线程切换。减少通信的核心策略：**合并调用**（一次传更多数据而不是多次小调用）；**把交互逻辑移到原生侧**（如使用 `Animated` 的原生驱动让动画完全跑在 Native 线程）；**使用新架构的 JSI**（JavaScript Interface，允许 JS 直接调用 C++ 方法，跳过 JSON 序列化）；**避免高频 Bridge 调用**（如 `onScroll` 事件不做 `setState`，改用 `useAnimatedValue`）。

```tsx
// ❌ 高频 Bridge 通信 — 每次滚动都跨 Bridge setState
<FlatList
  onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
  scrollEventThrottle={16}
/>

// ✅ 使用 Animated 原生驱动，动画跑在 Native 侧
import { Animated } from 'react-native'

const scrollY = useRef(new Animated.Value(0)).current

<Animated.FlatList
  onScroll={Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }  // ← 原生驱动，不经过 Bridge
  )}
/>
```

### 图片优化

React Native 中的图片优化涉及多个维度：使用合适分辨率的图片（`@2x`、`@3x`）避免不必要的缩放；大图使用渐进式加载（先低清后高清）；`resizeMode` 选择 `cover` 或 `contain` 代替 `stretch` 以避免变形；使用 `FastImage` 替代 `Image` 获得更好的缓存策略（磁盘缓存 + 内存缓存 + 预加载）；对于长列表中的图片，设置固定 `width` 和 `height` 防止布局抖动。

```tsx
import FastImage from 'react-native-fast-image'

// ✅ FastImage — 更优的缓存和预加载
<FastImage
  source={{
    uri: 'https://example.com/high-res.jpg',
    priority: FastImage.priority.normal,
    cache: FastImage.cacheControl.immutable, // 永久缓存
  }}
  style={{ width: 200, height: 200 }}
  resizeMode={FastImage.resizeMode.cover}
/>

// ✅ 预加载关键图片
FastImage.preload([
  { uri: 'https://example.com/banner1.jpg' },
  { uri: 'https://example.com/banner2.jpg' },
])

// ✅ 固定尺寸，防止渲染时布局跳跃
<Image
  source={{ uri: item.avatar }}
  style={{ width: 48, height: 48 }}
/>
```

| 优化策略 | 具体做法 | 收益 |
|---|---|---|
| 启用 Hermes | Gradle / Podfile 开启 `enableHermes: true` | 启动速度 ↑30%，内存 ↓ |
| FlatList 虚拟化 | `getItemLayout` + `windowSize` + `React.memo` | 长列表流畅 60fps |
| 减少 Bridge 通信 | `useNativeDriver: true` + Animated | 动画不掉帧 |
| 图片缓存 | `react-native-fast-image` | 减少网络请求 |
| 懒加载 | `React.lazy` + `Suspense` | 减少首屏 Bundle 体积 |
| 避免内联函数 | `useCallback` + `useMemo` | 减少子组件 re-render |

### 💬 面试深度

**标准回答**：RN 性能优化的核心三板斧——Hermes 引擎（AOT 编译字节码，TTI 提升 30-50%）、FlatList 虚拟化（getItemLayout + windowSize + React.memo）、减少 Bridge 通信（useNativeDriver + Animated 原生驱动）。再加上 FastImage 做图片缓存、useCallback 避免冗余渲染，低端机也能跑出 60fps。

**追问预判**：
- 「getItemLayout 为什么是 60fps 的关键？」→ FlatList 默认需要逐个测量每个 Item 的高度才能计算滚动位置和总内容高度；设了 getItemLayout 直接跳过测量步骤，根据 index × 固定高度反算 offset，`scrollToIndex` 瞬时定位。没设的话，快速滑动时测量来不及完成，列表空白、掉帧、滚动位置跳动——这是长列表卡顿的头号原因。
- 「Hermes 的 AOT 和 JSC 的 JIT 本质区别是什么？」→ AOT 在构建时把 JS 编译成字节码，运行时直接执行，省去了解析 + 编译阶段；JIT 是运行时收集热点代码再编译成机器码，首次执行慢但峰值性能高。Hermes 牺牲了 JIT 的峰值性能换更快的冷启动和更低内存——对移动端而言冷启动比峰值更重要。

**源码在哪**：
- Hermes 引擎：`node_modules/hermes-engine/`（预编译二进制），源码在 Meta 的 `facebook/hermes` 仓库
- FlatList 虚拟化核心：`react-native/Libraries/Lists/VirtualizedList.js`
- Animated 原生驱动：`React/Fabric/RCTSurfaceTouchHandler.mm`（Fabric 事件处理）
- Yoga 布局引擎：`ReactCommon/yoga/yoga/`

**踩过的坑**：Image 组件不设宽高——网络图片加载前高度为 0，加载完成后突然撑开，下方所有元素位置跟着跳；低端机上连续出现用户误触（元素位置变了手指还没移开），体验极差。**修复**：让后端返回图片宽高比，前端用 `width: screenWidth, height: screenWidth * aspectRatio` 提前占位，或用骨架屏撑住布局。

**项目选型**：快速启动选 Hermes（RN 0.76+ 默认引擎）；需要 Proxy/Intl 等特性回退 JSC；图片缓存选 FastImage（优于社区其他方案）；复杂动画选 react-native-reanimated v3（支持 Shared Value，完全跑在 Native 线程）。

## RN 与 Flutter 对比 ⭐⭐

React Native 和 Flutter 是当前最主流的两大跨平台方案，设计和哲学截然不同。RN 采用 **"Learn once, write anywhere"**，通过 Bridge 调用原生控件，本质上渲染的是平台原生 UI；Flutter 采用自绘引擎 Skia，用 Dart 直接绘制所有像素，不依赖平台 UI 组件，保证跨平台像素级一致。RN 适合已有 React 技术栈的团队快速复用 Web 端代码；Flutter 适合追求高一致性 UI、复杂动画的团队。

```dart
// Flutter — 一切皆 Widget
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Flutter Demo')),
      body: Center(
        child: ElevatedButton(
          onPressed: () {},
          child: Text('点击'),
        ),
      ),
    );
  }
}
```

```tsx
// RN — JSX + 原生控件映射
const MyScreen = () => (
  <View style={{ flex: 1 }}>
    <View style={styles.header}>
      <Text style={styles.title}>RN Demo</Text>
    </View>
    <TouchableOpacity onPress={() => {}}>
      <Text>点击</Text>
    </TouchableOpacity>
  </View>
)
```

| 维度 | React Native | Flutter |
|---|---|---|
| 语言 | JavaScript / TypeScript | Dart |
| 渲染引擎 | 映射原生控件（Bridge） | 自绘引擎 Skia |
| UI 一致性 | 依赖平台控件，有差异 | 像素级一致 |
| 性能 | Bridge 瓶颈，新架构改善中 | 接近原生（直接编译为 ARM） |
| 热更新 | CodePush（仅 JS 部分） | 不支持（编译为原生代码） |
| 学习成本 | 有 React 基础较低 | 需学 Dart + Widget 体系 |
| 生态成熟度 | 2015 起，npm 生态丰富 | 2018 起，pub.dev 快速增长 |
| 包体积 | 较小（~7MB） | 较大（~15MB+） |
| 适用团队 | React 技术栈的 Web 团队 | 追求 UI 一致性、独立团队 |

### 💬 面试深度

**标准回答**：RN 是「Learn once, write anywhere」，通过 Bridge 调原生控件，UI 本质上是平台原生组件；Flutter 用 Skia 自绘引擎，Dart 直接操纵像素，不依赖任何平台 UI。RN 适合有 React 技术栈的 Web 团队快速上手，Flutter 适合追求跨平台 UI 像素级一致和复杂动画的团队。新架构下 JSI 缩小了通信性能差距，但渲染哲学不同——RN 依赖原生控件，Flutter 自己画一切。

**追问预判**：
- 「为什么 Flutter 不需要 Bridge？」→ Flutter 用 Dart 编写的 Skia 引擎直接渲染像素，所有 UI 逻辑在一个线程中运行，不需要跨语言/跨线程通信；Dart 编译成 ARM 原生代码，性能接近原生。代价是包体更大（~15MB），且无法复用平台原生控件（如 iOS 的毛玻璃效果需要自己画）。
- 「新架构（JSI）能抹平 RN 和 Flutter 的性能差距吗？」→ JSI 解决了 Bridge 的序列化瓶颈，JS 直接调 C++，通信效率接近 Flutter。但渲染层面 RN 仍依赖原生控件，跨平台 UI 一致性不如 Flutter。所以是「性能接近但哲学不同」——选型取决于你对 UI 一致性和原生体验的权重。

**源码在哪**：
- Flutter Engine（Skia 渲染层）：`flutter/engine`（C++ 实现）
- RN 对比基准 C++ 核心：`ReactCommon/`（JSI、Fabric、TurboModules 实现）

**踩过的坑**：选了 RN 但 UI 设计稿要求 iOS 和 Android 像素级一致——RN 的原生控件在不同平台上默认样式不同（TextInput 的边框、阴影、光标样式），需要大量 `Platform.OS` 分支代码抹平差异，反而比 Flutter 更累。**修复**：设计阶段就和设计师对齐——同一套设计适配两个平台时接受合理差异，或者改用 Flutter 追求像素级还原。

**项目选型**：Web 团队已有 React 基础 → RN；追求 UI 一致性和复杂动画 → Flutter；需要频繁与原生硬件交互（蓝牙/摄像头）→ RN（Bridge + 新架构生态更成熟）。

## 常见面试题 ⭐⭐⭐

### Q1: RN Bridge 通信原理，为什么会有性能瓶颈？

**Bridge 通信原理**：React Native 运行在 JS 线程和 Native 线程两套独立环境中，两者通过 Bridge 进行异步通信。JS 侧调用如 `NativeModules.xxx` 时，调用参数被 JSON 序列化为消息放入 Bridge 队列；Native 线程在每帧轮询取出消息、反序列化、执行原生方法，再将返回值 JSON 序列化回传给 JS。这个机制保证了线程安全和跨平台统一，但也引入了性能瓶颈。

**瓶颈原因有三**：第一，**JSON 序列化开销**——所有参数和返回值都要经过 `JSON.stringify` / `JSON.parse`，数据量大时（如图片 base64）开销显著；第二，**异步性造成延迟**——调用不是同步的，JS 线程发出请求后需要等待 Native 处理完才能拿到结果，对实时交互不友好（如手势跟随、动画）；第三，**单队列"堵车"**——所有模块共享一个 Bridge 队列，一个模块的慢调用可能阻塞后续调用。新架构（JSI + Fabric + Turbo Modules）通过让 JS 直接调用 C++ 方法来从根本上解决这些问题。

```tsx
// Bridge 瓶颈示例：高频数据交互
// ❌ 每秒 60 次的 onScroll 回调经 Bridge 序列化，容易丢帧
<ScrollView onScroll={(e) => {
  // e.nativeEvent 需要序列化 → Bridge → JS
  setOffset(e.nativeEvent.contentOffset.y)
}} />

// ✅ 原生驱动动画：动画值变化完全在 Native 侧，不经过 Bridge
const offsetY = useRef(new Animated.Value(0)).current
<Animated.ScrollView
  onScroll={Animated.event(
    [{ nativeEvent: { contentOffset: { y: offsetY } } }],
    { useNativeDriver: true }
  )}
/>
```

### Q2: Hermes 引擎有什么优势？

Hermes 是 Meta 为移动端 React Native 场景专门优化的轻量 JS 引擎。**核心优势**：

1. **AOT 编译**：在构建阶段将 JS 源码预编译为字节码，运行时直接执行字节码，免去 JSC 的源码解析和 JIT 编译步骤，冷启动 TTI（Time To Interactive）提升 30-50%。
2. **内存友好**：Hermes 使用精简的垃圾回收策略，运行时内存占用比 JSC 更低，对低端 Android 设备效果显著。
3. **包体积小**：字节码比纯 JS 源码更紧凑，APK 体积明显减小。
4. **React Native 特化**：Hermes 的设计目标就是"让 RN 更快"，不做 JSC 那样的通用优化（如 JIT），而是聚焦于 RN 最常见的工作负载。

**代价**：不支持 `Proxy`、`Intl`、`eval` 等少数 ES6+ 特性，部分依赖这些特性的库需要 polyfill 或替换方案。

### Q3: RN 如何做热更新？与小程序热更新区别？

**RN 热更新原理**：通过 CodePush 将 JS Bundle 托管到云端，App 启动时比对本地和远程版本，下载新 Bundle 后替换本地文件，重新加载即可生效。由于苹果/安卓审核只限制二进制原生代码的变更，而 JS Bundle 是动态脚本，所以可以绕开审核。

**小程序热更新**：微信/支付宝等平台在宿主 App 内嵌了自己的渲染引擎和 JS 运行时，开发者提交的代码在平台服务器上运行或分发，审核由平台方把控而不是苹果 App Store。本质上，小程序代码完全托管在平台，更新无需经过应用商店，且平台有自己的审核机制。


| 维度 | RN (CodePush) | 小程序 |
|---|---|---|
| 更新粒度 | JS Bundle + 静态资源 | 整个小程序包 |
| 审核方 | 无（苹果禁止改原生，JS 可豁免） | 微信/支付宝平台审核 |
| 生效方式 | 下次启动 / 切回前台 | 下次启动小程序 |
| 回滚机制 | CodePush 自动回滚 | 版本管理后台回退 |
| 原生代码变更 | 不支持，必须走发版 | 不支持，需依赖宿主 App |
| 更新包大小限制 | 无硬性限制，建议 <50MB | 主包 ≤ 2MB，分包 ≤ 20MB |

### Q4: React Navigation 的核心概念？（附）

React Navigation 是 RN 生态的事实标准路由库。核心概念：**Navigator**（导航器，管理路由栈）、**Screen**（屏幕组件，路由目标）、**Params**（路由参数，类型安全传递）、**Navigation Prop**（每个 Screen 自动注入的导航方法）。常用导航器类型：`Stack`（推入/弹出）、`Tab`（底部/顶部标签栏）、`Drawer`（侧边抽屉）。

```tsx
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

type RootStackParamList = {
  Home: undefined
  Detail: { id: string }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: '首页' }}
      />
      <Stack.Screen
        name="Detail"
        component={DetailScreen}
        options={{ title: '详情' }}
      />
    </Stack.Navigator>
  </NavigationContainer>
)

// DetailScreen 中获取路由参数
const DetailScreen = ({ route }) => {
  const { id } = route.params  // ✅ 类型安全
  return <Text>详情 ID: {id}</Text>
}
```

### Q5: 新架构（Fabric + Turbo Modules + JSI）解决了什么问题？

旧架构的核心痛点是 Bridge 的异步序列化瓶颈和所有模块的集中加载。新架构的三大组件：

- **JSI（JavaScript Interface）**：让 JS 直接调用 C++ 宿主对象，跳过 JSON 序列化和异步队列，实现同步调用。
- **Fabric**：新的渲染引擎，Shadow Tree 直接在 C++ 中维护，支持优先级调度（高优先级交互打断低优先级渲染）。
- **Turbo Modules**：原生模块的懒加载，仅在首次调用时初始化，替代了旧架构启动时加载全部模块的方式。

```tsx
// 新架构下，Turbo Module 按需加载
// 旧架构：所有 NativeModule 启动时全部初始化
// 新架构：只在首次 import 时加载
const { TurboCamera } = NativeModules  // ← 此刻才加载
TurboCamera.takePicture()  // JSI 同步调用，无 Bridge 序列化
```



### 💬 面试深度

**标准回答**：RN 面试核心考察四点——Bridge 通信原理（三线程 + JSON 序列化瓶颈）、性能优化策略（Hermes AOT + FlatList 虚拟化 + 减少 Bridge）、热更新机制（CodePush 只能更 JS 不能更原生）、新架构认知（JSI/Fabric/TurboModules 解决什么问题）。能把这四点讲透，基本过一面。

**追问预判**：
- 「如果让你从零搭建 RN 项目，技术栈怎么选？」→ RN 0.76+（新架构默认启用）+ TypeScript + React Navigation v7 + react-native-reanimated + react-native-gesture-handler + FastImage + MMKV（存储），状态管理看团队习惯——Zustand 轻量够用，Redux Toolkit 适合大型协作项目。
- 「RN 和原生混合开发怎么分工？」→ UI 层全用 RN（热更新覆盖），性能敏感模块（音视频编解码、AR、复杂手势）写原生 Module 暴露给 JS；原生和 RN 页面之间通过 Native Stack Navigator 无缝切换。

**源码在哪**（面试高频源码清单）：
- Bridge 核心：`React/Base/RCTBridge.m`、`React/CxxBridge/RCTCxxBridge.mm`
- JSI 接口：`ReactCommon/jsi/jsi/jsi.h`
- JSI Executor：`React/JSIRuntime/RCTJSIExecutor.mm`
- TurboModules：`ReactCommon/turbomodule/core/TurboModule.cpp`
- Fabric 渲染器：`ReactCommon/react/renderer/`
- Android Bridge：`ReactAndroid/src/main/java/com/facebook/react/bridge/CatalystInstanceImpl.java`

**踩过的坑**：面试时被问「你用过新架构吗？」答「用过」但说不清 JSI 和 Bridge 的具体区别——面试官深挖到 JSI HostObject 和 TurboModule 懒加载时机就露馅。**修复**：至少在一个真实项目中开启过新架构，对照旧架构跑一遍启动流程；关键是理解 JSI 让 JS 持有 C++ 对象的 HostObject 引用，调用不再走 JSON 序列化，而是直接的 vtable 调用。

**项目选型**：面大厂重点准备 Bridge + 新架构 + 性能优化体系；面创业公司重点准备快速迭代方案（热更新 + 组件复用 + 原生模块封装）。

