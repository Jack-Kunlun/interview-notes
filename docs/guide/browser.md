---
title: 浏览器原理
description: 渲染流程、Event Loop、缓存、V8 GC、安全、HTTP/2&3
---

# 浏览器原理

## 必会基础 ⭐⭐⭐

### 渲染流程：HTML 解析 → DOM → CSSOM → Render Tree → Layout → Paint → Composite

浏览器从收到 HTML 到显示画面的关键管道是：解析 HTML 构建 DOM Tree，同时解析 CSS 构建 CSSOM Tree，二者合并生成 Render Tree（只包含可见节点）。Render Tree 经过 Layout 阶段计算每个节点的几何位置与大小，再由 Paint 阶段将像素绘制到图层上，最后由 Composite 阶段通过 GPU 将各图层合成到屏幕。理解这个流水线有助于定位性能瓶颈——每一阶段都可能成为阻塞点。

```
解析 HTML → DOM Tree
解析 CSS  → CSSOM Tree
           ↓ 合并
        Render Tree（只含可见节点）
           ↓
         Layout（计算几何信息）
           ↓
         Paint（绘制像素）
           ↓
       Composite（合成层合并，GPU）
```

### 💬 面试深度

**标准回答**：浏览器渲染的关键流水线是 DOM + CSSOM → Render Tree → Layout → Paint → Composite 三阶段。Layout 计算几何位置开销最大，Paint 生成像素数据，Composite 由 GPU 合成线程将图层拼成最终画面。网页动画性能优化的核心就是把工作推到 Composite 阶段——用 `transform` 和 `opacity` 做动画，因为这两个属性只触发 Composite，由 GPU 合成线程独立完成矩阵变换，完全不占用主线程，页面 JS 再忙也不会掉帧。

**追问预判**：
- *"什么是层爆炸（Layer Explosion）？"* —— 过度使用 `will-change` 或 `translateZ(0)` 强制提升为合成层，每个图层独占一块 GPU 纹理，移动端图层超过几百个时 GPU 内存耗尽。Chrome DevTools → Layers 面板可直观看到图层数量和内存占用，合规的页面图层数量通常控制在两位数以内。
- *"为什么说 `display:none` 不触发重排是误解？"* —— 切换 `display:none` → `display:block` 确实触发完整重排，只是隐藏状态的节点不在 Render Tree 中，所以后续对它的操作不会额外触发重排。更准确的说法是：`display:none` 的节点被移出渲染树，操作它不会产生渲染开销，但显示/隐藏的切换本身代价很大。

**源码在哪**：Chromium Blink 渲染引擎 —— `third_party/blink/renderer/core/paint/FramePainter.cc` 负责绘制调度，`PaintLayerPainter.cc` 执行逐层绘制；合成层逻辑在 `third_party/blink/renderer/platform/graphics/compositing/`；GPU 合成线程入口在 `cc/trees/layer_tree_host_impl.cc`。

**踩过的坑**：移动端用 JS 定时器逐帧修改 `left` 值做横向滚动 Banner，低端机上每帧 Layout→Paint→Composite 全走一遍，帧率掉到 15fps。换成 `transform: translateX()` + CSS `transition` 后，合成线程独立处理矩阵变换，帧率回到 60fps，CPU 占用从 45% 降到 3%。

**项目选型**：动画密集型 H5 活动页统一用 `transform` + `opacity` 驱动，放弃 `left/top/width` 动画——前者走 Composite-only 路径，后者触发重排，在高频更新场景性能差距可达 10 倍以上。

### 重排（Reflow）vs 重绘（Repaint）vs 合成（Composite）的触发条件与性能差异

**重排（Reflow）**：当元素的几何属性（宽高、位置、`display`、`padding`、`margin` 等）发生变化时，浏览器必须重新执行 Layout → Paint → Composite 全流程，开销最大。**重绘（Repaint）**：仅视觉样式改变（`color`、`background`、`box-shadow` 等）但不影响布局，跳过 Layout 直接 Paint → Composite。**合成（Composite）**：只有 `transform` 和 `opacity` 变更时，浏览器可在合成线程独立完成，完全避开主线程的 Layout 和 Paint，性能最优。

| 类型 | 触发属性示例 | 触发阶段 | 性能开销 |
|---|---|---|---|
| 重排 | `width` / `height` / `left` / `display` | Layout → Paint → Composite | 🔴 高 |
| 重绘 | `color` / `background` / `visibility` | Paint → Composite | 🟡 中 |
| 合成 | `transform` / `opacity` | Composite only | 🟢 低 |

**优化目标**：尽量让动画和交互只触发 Composite（多用 `transform` / `opacity`），避免在 JS 中频繁读写布局属性导致强制同步布局。

### 💬 面试深度

**标准回答**：重排（Reflow）是修改了几何属性（宽高、位置、display），浏览器必须重新执行 Layout → Paint → Composite 全流程，代价最大。重绘（Repaint）只改视觉样式（color、background），跳过 Layout。Composite 级别最优——`transform` 和 `opacity` 仅由 GPU 合成线程做矩阵变换，主线程零参与。做动画的铁律就是尽量只改 `transform` 和 `opacity`，把渲染工作推到开销最低的阶段。

**追问预判**：
- *"强制同步布局（Forced Synchronous Layout）怎么定位？"* —— JS 先写布局属性再立即读（如修改 `style.width` 后马上读 `offsetHeight`），浏览器被迫在当前帧同步执行 Layout。Chrome DevTools Performance 面板会标红 "Forced reflow"，火焰图中可以看到 Layout 被 JS 调用栈触发而非正常帧调度。
- *"`will-change` 有什么副作用？"* —— 它会提前将元素提升为独立合成层，确实能优化后续动画；但如果给大量元素加 `will-change: transform`，每个合成层独占 GPU 纹理（一个 1920×1080 的层约 8MB），移动端极易爆 GPU 内存。最佳实践：动画开始前动态添加，结束后移除。

**源码在哪**：Chromium Blink 的 `LocalFrameView::UpdateLayout()` 触发布局计算，`PaintLayer::Paint()` 执行绘制；合成调度器在 `cc/scheduler/scheduler.cc`，负责每帧 vsync 信号到达时按 Layout → Paint → Composite 顺序调度。

**踩过的坑**：列表滚动组件中用 `element.style.top` 逐项偏移定位，每次赋值后读取 `scrollTop` 判断边界，触发了强制同步布局——Performance 面板显示每次滚动帧耗时 30ms+（其中 Layout 占 28ms）。改为用 `transform: translateY()` 并将边界值缓存到变量后，帧耗时降到 2ms 以内。

**项目选型**：拖拽排序组件放弃 `top/left` 实时定位方案，采用 `transform: translate()` 驱动——拖拽过程每帧都在更新位置，Composite-only 路径避免了主线程成为瓶颈，低端机上拖拽流畅度提升明显。

### Event Loop：宏任务（setTimeout / XHR）vs 微任务（Promise.then / MutationObserver）

浏览器端 Event Loop 的核心规则：执行一个宏任务 → 清空当前所有微任务 → 渲染更新（如有需要）→ 取下一个宏任务。宏任务来源包括 `setTimeout`、`setInterval`、I/O、XHR 回调；微任务来源包括 `Promise.then/catch/finally`、`MutationObserver`、`queueMicrotask`。理解这个顺序可以解释为什么 `Promise` 回调总比 `setTimeout` 先执行——微任务在同一次事件循环末尾就被清空，而宏任务要等到下一轮。

```js
console.log('1')                              // 同步
setTimeout(() => console.log('2'), 0)         // 宏任务
Promise.resolve().then(() => console.log('3')) // 微任务
console.log('4')                              // 同步

// 输出：1 4 3 2
// 每次宏任务执行完，清空所有微任务队列，再取下一个宏任务
```

### 💬 面试深度

**标准回答**：浏览器 Event Loop 的核心规则：执行一个宏任务 → 清空当前所有微任务 → 渲染更新 → 取下一个宏任务。宏任务来源有多个独立队列——timer 队列（`setTimeout`/`setInterval`）、I/O 队列、check 队列（Node.js 的 `setImmediate`）等，浏览器按优先级从中取一个执行。微任务只有一个队列，`Promise.then/catch/finally`、`MutationObserver`、`queueMicrotask` 全部往里塞。每轮事件循环会一口气清空微任务队列——这就是为什么 `Promise` 回调总比 `setTimeout` 先执行。

**追问预判**：
- *"`requestAnimationFrame` 在 Event Loop 中的位置？"* —— rAF 在微任务清空之后、Layout/Paint 之前执行，属于渲染阶段，不算宏任务也不算微任务。如果 rAF 回调里又产生微任务，这些微任务会在 rAF 执行完后、Layout 之前被清空。
- *"为什么 Node.js 的 Event Loop 和浏览器不一样？"* —— Node.js 基于 libuv，有 6 个阶段（timers → pending callbacks → idle/prepare → poll → check → close callbacks），每个阶段执行完后再清空 `process.nextTick` 和微任务。浏览器没有阶段划分，只有"宏任务 → 微任务 → 渲染"的简单循环。

**源码在哪**：Chromium 的 Event Loop 调度在 Blink 的 `Scheduler` 中，`cc::Scheduler` 控制每帧内各阶段顺序（微任务 → rAF → Layout → Paint → Composite）；微任务队列实现在 V8 的 `src/execution/microtask-queue.cc`。

**踩过的坑**：在一个循环中递归调用 `Promise.resolve().then(() => { doWork(); /* 继续递归 */ })`，以为微任务清完就会渲染——实际上微任务队列被无限追加新任务，渲染永远得不到执行，页面直接卡死白屏。改为 `setTimeout(doWork, 0)` 让每轮事件循环只执行一次，渲染间隙恢复后页面恢复正常。

**项目选型**：大数据分片处理用 `requestIdleCallback` + `setTimeout(fn, 1000)` 兜底，而非纯 `Promise` 微任务链——确保每批处理之间有渲染间隙，用户交互不被长时间阻塞。

### 浏览器缓存：强缓存（Cache-Control / Expires）vs 协商缓存（ETag / Last-Modified）

强缓存由 `Cache-Control`（HTTP/1.1，相对时间如 `max-age=3600`）或 `Expires`（HTTP/1.0，绝对时间）控制，命中后浏览器直接使用本地缓存，不发起网络请求，状态码显示 200 (from disk/memory cache)。协商缓存在强缓存失效后生效：浏览器携带 `If-None-Match`（对应 `ETag`）或 `If-Modified-Since`（对应 `Last-Modified`）向服务端验证，若资源未变则返回 304 Not Modified，浏览器继续使用本地缓存。实际部署中推荐 `Cache-Control` + `ETag` 组合，兼顾性能与时效性。

| 类型 | 请求头 | 命中时不发请求 | 状态码 |
|---|---|---|---|
| 强缓存 | `Cache-Control: max-age=3600` | ✅ | 200 (from cache) |
| 协商缓存 | `ETag` / `Last-Modified` | ❌（发请求，服务端判断） | 304 Not Modified |

### 💬 面试深度

**标准回答**：浏览器缓存分两级：强缓存命中后不发网络请求，直接拿本地缓存（200 from disk/memory cache）；协商缓存需要发请求到服务端验证，资源未变返回 304。生产环境推荐 `Cache-Control: max-age=xxx` + `ETag` 组合——强缓存保证性能，ETag 保证内容变更时能及时更新。静态资源（JS/CSS/图片）用内容哈希命名 + 长 max-age，文件更新后 URL 变了自然绕过缓存。

**追问预判**：
- *"from disk cache 和 from memory cache 有什么区别？"* —— memory cache 存在内存中，访问速度极快但进程退出即消失，一般缓存图片和较小的资源；disk cache 存在硬盘，持久化，缓存 JS/CSS/字体等较大资源。浏览器自动决定缓存层级，开发者无法强制控制。
- *"`no-cache` 和 `no-store` 的区别？"* —— 这是面试经典陷阱。`no-cache` 并非"不缓存"，而是"可以用缓存但每次必须先向服务器验证"（走协商缓存）；`no-store` 才是"完全不缓存，每次都重新请求"。`no-cache` 仍会存储缓存副本，只是每次用之前要 304 验证。

**源码在哪**：Chromium 的 `net/http/http_cache.cc` 实现磁盘缓存层，`net/disk_cache/` 实现底层存储；`net/http/http_response_headers.cc` 解析 Cache-Control 指令；内存缓存逻辑在 `net/http/http_cache_transaction.cc` 的事务处理中。

**踩过的坑**：项目中将 `index.html` 也设了 `max-age=86400` 强缓存，发版后用户看到的永远是旧 HTML——虽然 JS 文件名变了但 HTML 本身没变所以浏览器用缓存，引用不到新 JS 文件。修复：HTML 文件始终用 `Cache-Control: no-cache`（协商缓存），只有带内容哈希的静态资源才用长强缓存。

**项目选型**：静态资源部署选择"文件名哈希 + 一年强缓存"策略而非"短 max-age + 频繁协商"——哈希命名让缓存失效天然精确，零请求开销，CDN 回源率极低。

## 进阶考点 ⭐⭐

### V8 GC：新生代（Scavenge）/ 老生代（Mark-Compact / Incremental Marking）

V8 将堆内存分为新生代和老生代。新生代（约 1-8 MB）存放存活时间短的对象，使用 Scavenge 复制算法——将存活对象从 From 空间复制到 To 空间，然后交换角色，未被复制的直接回收。老生代存放存活时间长的对象，使用 Mark-Sweep（标记清除）回收不可达对象，再用 Mark-Compact（标记整理）解决内存碎片问题。为避免长时间 STW（Stop-The-World），V8 还引入了增量标记（Incremental Marking），将标记过程拆分成小步与 JS 交替执行。

| 区域 | 算法 | 存放对象 |
|---|---|---|
| 新生代（约 1-8 MB） | Scavenge（复制算法）| 存活时间短的对象 |
| 老生代 | Mark-Sweep + Mark-Compact | 存活时间长的对象 |

### 💬 面试深度

**标准回答**：V8 把堆分成新生代和老生代两片。新生代只有 1-8 MB，用 Scavenge 算法——也叫 Cheney 算法，把 From 空间的活跃对象复制到 To 空间，然后整个 From 空间直接释放；存活够久的对象晋升到老生代。老生代用 Mark-Sweep（标记不可达对象后清除）+ Mark-Compact（整理内存碎片避免无法分配连续大对象）。为了避免长时间的 Stop-The-World，V8 引入了增量标记——把标记拆成小步与 JS 交替执行，标记期间新对象通过写屏障追踪。

**追问预判**：
- *"为什么新生代用 Scavenge 而不是 Mark-Sweep？"* —— 新生代中绝大多数对象朝生夕死（存活率通常低于 10%），Scavenge 只复制存活对象，存活越少越快；Mark-Sweep 需要先遍历整个堆标记再清除，在大量短命对象场景效率反而低。Scavenge 的代价是浪费一半空间（To 空间），但新生代本来就很小。
- *"增量标记期间新创建的对象怎么处理？"* —— 通过写屏障（Write Barrier）将新对象标记为活跃，防止在本次 GC 中被误回收。V8 使用 Dijkstra 风格的写屏障，在增量标记阶段所有写入操作都会触发屏障检查。

**源码在哪**：V8 源码 `src/heap/` —— `scavenger.cc`（Scavenge/Cheney 算法实现）、`mark-compact.cc`（Mark-Sweep-Compact 主逻辑）、`incremental-marking.cc`（增量标记调度）、`write-barrier.h`（写屏障）。

**踩过的坑**：Node.js 服务频繁创建 2MB 的 Buffer（每次请求一个），这些大对象直接进入老生代，老生代 GC 越来越频繁，每次 Mark-Compact STW 耗时 50-80ms，P99 延迟恶化为 300ms+。修复：改为对象池复用 Buffer，老生代 GC 频率从每分钟 5 次降到每小时 1 次，P99 回到 30ms。

**项目选型**：实时性要求高的 Node.js 后端中，选择预分配 Buffer 池而非每次动态 `Buffer.alloc`——避免大对象频繁晋升老生代触发 Full GC，保证 P99 延迟稳定在 50ms 以内。

### 内存泄漏排查：全局变量 / 闭包引用 / 未清理的定时器与监听器

常见内存泄漏场景有三类：一是意外创建的全局变量（`this.xxx` 或未声明变量），它们不会被 GC 回收；二是闭包中持有大对象引用且闭包长期存活（如被 `setInterval` 引用）；三是 DOM 节点被移除后，JS 中仍保留对其的引用（Detached DOM）。排查时使用 Chrome DevTools → Memory 面板，通过 Heap Snapshot 对比（观察 Delta 列）定位持续增长的对象，或通过 Allocation Timeline 实时观察分配情况。

```js
// ❌ 泄漏示例 1：意外全局变量
function leak() {
  bar = { huge: new Array(1000000) } // 未声明，挂到 window
}

// ❌ 泄漏示例 2：未清理的定时器持有闭包
let data = { huge: new Array(1000000) }
const timer = setInterval(() => console.log(data.length), 1000)
// 组件卸载时忘了 clearInterval(timer) → data 永远无法回收

// ✅ 清理姿势（React useEffect 为例）
useEffect(() => {
  const id = setInterval(tick, 1000)
  return () => clearInterval(id) // 清理
}, [])
```

### 💬 面试深度

**标准回答**：前端内存泄漏排查三板斧——先用 Chrome DevTools Memory 面板的 Heap Snapshot 对比（观察 Delta 列找持续增长的对象），再用 Allocation Timeline 看实时分配趋势定位高频分配点，最后回溯代码找到 GC Root 引用链。最常见的三类泄漏：意外全局变量、闭包持有大对象且被定时器/事件监听器长期引用、DOM 节点移除后 JS 仍持有引用（Detached DOM）。

**追问预判**：
- *"WeakMap / WeakRef 能解决内存泄漏吗？"* —— WeakMap 的键是弱引用，键被 GC 回收后值也会自动释放，适合做"DOM 节点关联的元数据存储"（DOM 被移除后关联数据自动回收）。WeakRef 允许持有"可能被回收"的引用，但不推荐用于业务逻辑——GC 时机不确定，`deref()` 可能突然返回 `undefined`，行为不可靠。
- *"React 中哪些写法容易导致内存泄漏？"* —— `useEffect` 中订阅的事件/定时器/WebSocket 未在 cleanup 中清理；异步请求未取消（组件卸载后调用 `setState` 报 Warning）；闭包中持有大 state 对象且被 `useCallback` 缓存为长期引用。

**源码在哪**：Chrome DevTools Memory 面板底层调用 V8 的 `heap_profiler`，实现在 `src/heap-snapshot-generator.cc`，通过遍历堆图生成可序列化的快照；Detached DOM 的检测依靠 `InternalNode::IsDetached()` 判断。

**踩过的坑**：SPA 中某页面 `mounted` 里加了 `window.addEventListener('resize', handler)`，`unmounted` 时忘了 `removeEventListener`。用户来回切换页面 5 次后，Heap Snapshot 显示 5 个 handler 引用未被回收，`resize` 事件触发时所有 handler 一起跑，页面卡顿明显。修复后在 `unmounted` 中对称清理，Snapshot 对比零增长。

**项目选型**：全局状态管理选择 Pinia（Vue）而非自定义闭包缓存——Pinia 的 store 随组件卸载自动解绑引用，闭包方案需要手动管理生命周期，在多人协作项目中很容易遗漏清理导致泄漏。

### requestAnimationFrame vs requestIdleCallback 的调度时机

`requestAnimationFrame`（rAF）在每帧渲染前执行，与屏幕刷新率同步（通常 60fps，即约 16.6ms 一帧），适合做动画和 DOM 批量更新——浏览器会在 rAF 回调后将所有变更统一提交到下一帧。`requestIdleCallback`（rIC）在浏览器空闲时段执行，优先级最低，适合非关键的后台任务（日志上报、数据预取）。注意 rIC 的回调会收到一个 `IdleDeadline` 参数，可通过 `timeRemaining()` 判断剩余空闲时间，避免阻塞用户交互。

| | rAF | rIC |
|---|---|---|
| 执行时机 | 每帧渲染前 | 帧末尾空闲时段 |
| 帧内位置 | Layout/Paint 之前 | 帧剩余时间 |
| 典型场景 | 动画、DOM 批量读写 | 日志上报、预加载 |
| 兼容性 | 全部现代浏览器 | 部分浏览器（Chrome） |

### 💬 面试深度

**标准回答**：`requestAnimationFrame` 在每帧渲染前执行，与屏幕刷新率同步（60Hz 约 16.6ms/帧），适合做动画和批量 DOM 操作——浏览器会把你这一帧内所有 DOM 变更合并后统一提交。`requestIdleCallback` 在帧末尾的空闲时间执行，适合低优先级后台任务。关键差异：rAF 保证每帧执行（只要页面可见），rIC 不保证——如果帧一直很忙，rIC 的回调可能永远不执行，所以必须传 `{ timeout }` 做兜底。

**追问预判**：
- *"如果 rAF 回调耗时超过 16.6ms 会怎样？"* —— 帧预算超支，浏览器跳过本帧渲染直接进入下一帧，表现为掉帧/卡顿。所以 rAF 回调必须在 10ms 内完成（留 6ms 给浏览器的 Layout/Paint/Composite）。长任务应拆分成多个 rAF 或交给 Worker。
- *"为什么 React 18 的 Scheduler 不用 rIC 而用 `MessageChannel`？"* —— rIC 兼容性太差（Safari 完全不支持），且空闲时机的优先级太低导致交互响应变慢。React 自己实现了优先级调度，用 `MessageChannel` 宏任务 + 5ms 时间切片模拟并发渲染，不依赖 rIC。

**源码在哪**：Chromium 的 `Document::RequestAnimationFrame()` 注册回调到全局列表，`cc::Scheduler::BeginMainFrame()` 在每次 vsync 信号到达时依次调用 rAF 回调链，然后进入 Layout → Paint → Composite。

**踩过的坑**：用 `setInterval(fn, 16)` 做 Canvas 动画，在 144Hz 屏幕上帧率被锁在 60fps（`setInterval` 最小间隔 4ms 且不与显示器刷新率同步），出现画面撕裂感。换 `requestAnimationFrame` 后自动匹配 144Hz 刷新率，动画丝滑。

**项目选型**：虚拟滚动长列表中用 rAF 批量读取 DOM 尺寸并一次性更新 DOM，比直接在 `scroll` 事件回调中操作减少 80% 的 Layout 触发次数——因为 rAF 将多次滚动事件合并为一帧内的单次批量操作。

### CORS：预检请求（OPTIONS）/ 简单请求条件 / Access-Control-Allow-\*

跨域资源共享（CORS）的核心是区分简单请求和需预检的请求。简单请求需同时满足：方法为 GET / HEAD / POST，Content-Type 限定为 `text/plain` / `multipart/form-data` / `application/x-www-form-urlencoded`，且无自定义头部。不满足任一条件则触发预检——浏览器先发 OPTIONS 请求询问服务端是否允许，通过后才发实际请求。服务端通过 `Access-Control-Allow-Origin`、`Access-Control-Allow-Methods`、`Access-Control-Allow-Headers` 等响应头告知许可范围；带 Cookie 的跨域还需设置 `Access-Control-Allow-Credentials: true` 且 `Origin` 不能用 `*`。

```http
# 服务端典型 CORS 响应头
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400   # 预检结果缓存 24h
```

### XSS 防御：CSP / 输入过滤 / httpOnly Cookie；CSRF 防御：SameSite / Token

**XSS（跨站脚本攻击）** 指攻击者将恶意脚本注入页面执行，分存储型（提交到数据库后展示）、反射型（URL 参数直接拼入页面）和 DOM 型（前端 JS 不安全操作 `innerHTML`）。防御核心：输入输出过滤转义（`<` → `&lt;`）、设置 CSP（Content-Security-Policy）白名单拦截未知脚本来源、关键 Cookie 标记 `httpOnly` 禁止 JS 读取。**CSRF（跨站请求伪造）** 利用用户已登录状态诱导其点击恶意链接发起非自愿请求。防御：Cookie 设置 `SameSite=Lax/Strict`、请求携带 CSRF Token 由服务端验证、关键操作校验 Referer/Origin 头部。

```http
# CSP 示例
Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted.cdn.com

# Cookie 加固
Set-Cookie: session=xxx; HttpOnly; Secure; SameSite=Lax
```

| 攻击类型 | 攻击目标 | 核心防御 |
|---|---|---|
| XSS | 注入脚本，窃取 Cookie / 劫持会话 | CSP + 输入转义 + httpOnly |
| CSRF | 伪造用户请求（改密、转账） | SameSite + Token + Referer 校验 |

## 深入理解 ⭐

### Service Worker 生命周期

```
install → waiting → activate → fetch/message → redundant(销毁)
```

- **install**：首次注册时触发，适合预缓存关键资源（`caches.open + addAll`）
- **activate**：旧 SW 控制的页面全部关闭后激活，适合清理旧缓存
- **fetch**：拦截网络请求（`event.respondWith`），实现离线优先策略
- **scope**：SW 只能控制其所在目录及子目录的页面

**PWA 核心三件套**：SW + Web App Manifest + HTTPS

### 💬 面试深度

**标准回答**：Service Worker 有四个生命周期阶段：install（`event.waitUntil` 预缓存关键资源，`caches.open + addAll`）→ waiting（等待旧 SW 控制的所有页面关闭）→ activate（`event.waitUntil` 清理旧版本缓存）→ fetch（`event.respondWith` 拦截网络请求，实现离线优先策略）。SW 只能控制其所在目录及子目录的页面，必须走 HTTPS（localhost 除外）。SW + Web App Manifest + HTTPS 即构成 PWA 核心三件套。

**追问预判**：
- *"SW 更新后如何让用户立即看到新版本？"* —— 默认情况下浏览器每 24 小时自动检查 SW 文件字节变化，新 SW install 后进入 waiting，旧 SW 控制的页面全部关闭后才 activate。要实现"立即生效"需要在 install 中调用 `self.skipWaiting()` 跳过 waiting，在 activate 中调用 `clients.claim()` 接管所有页面。但要小心——如果新 SW 的缓存策略变了，可能导致正在使用的页面出错。
- *"SW 的缓存策略有哪些，各适用什么场景？"* —— Cache First（缓存优先，适合带哈希的静态资源）；Network First（网络优先，失败时回退缓存，适合 API）；Stale-While-Revalidate（先用缓存同时后台更新，适合平衡体验的场景如资讯列表）；Network Only / Cache Only（极端场景）。

**源码在哪**：Chromium 的 SW 实现主体在 `content/browser/service_worker/`，核心类 `ServiceWorkerVersion` 管理 install→activate 生命周期，`ServiceWorkerFetchDispatcher` 处理 fetch 事件拦截与 `event.respondWith`。

**踩过的坑**：SW 中对 `index.html` 使用 Cache First 策略，上线后所有用户看到旧版页面——因为 HTML 永远从缓存取。修复：HTML 改用 Stale-While-Revalidate（秒开缓存同时后台更新），JS/CSS 文件名带哈希仍用 Cache First。部署后用户首次打开立即看到缓存内容，后台静默更新，下次打开就是新版。

**项目选型**：资讯类 PWA 选择 Stale-While-Revalidate 作为默认策略——用户打开立刻看到缓存内容（零白屏），后台更新缓存，下次访问就是最新数据。比纯 Network First 体验更好（离线也能看），比纯 Cache First 时效性更好。

### HTTP/2 vs HTTP/3 对比

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| 传输层 | TCP | TCP | **QUIC（UDP）** |
| 多路复用 | ❌（队头阻塞） | ✅（流复用，TCP 层仍有队头阻塞） | ✅（流级别独立，无队头阻塞） |
| 头部压缩 | ❌ | HPACK | QPACK |
| 连接建立 | 1 RTT | 1 RTT | **0-RTT**（恢复连接） |
| 安全性 | 可选 | TLS 1.2+ | 内置 TLS 1.3 |

**面试关键**：HTTP/3 最大改进——QUIC 跑在 UDP 上，丢包只影响单个流，不像 TCP 会阻塞所有流。

### 前端性能监控指标

| 指标 | 含义 | 及格线 |
|---|---|---|
| FCP | 首次内容绘制 | < 1.8s |
| LCP | 最大内容绘制（核心 Web Vitals） | < 2.5s |
| FID | 首次输入延迟 | < 100ms |
| CLS | 累积布局偏移（核心 Web Vitals） | < 0.1 |
| TTI | 可交互时间 | < 3.8s |
| TBT | 总阻塞时间 | < 200ms |

---

## 跨域处理深入 ⭐⭐

浏览器的同源策略（协议 + 域名 + 端口三者完全一致）是 Web 安全的基石，但实际开发中跨域需求非常普遍。不同方案在原理、限制、适用场景上差异显著，面试常要求对比多种方案并能手写关键配置。

### 方案总览

| 方案 | 原理 | 适用 |
|---|---|---|
| JSONP | `<script>` 标签的 `src` 不受同源策略限制，服务端返回函数调用包裹的数据 | 仅 GET 请求，老旧方案，现代项目已很少使用 |
| CORS | 服务端设置 `Access-Control-*` 系列响应头，浏览器据此放行跨域请求 | 主流方案，支持所有 HTTP 方法，需后端配合 |
| 代理（DevServer） | 同源服务器接收请求后转发到目标服务器，浏览器始终只与同源代理通信 | 开发环境（webpack-dev-server / vite） |
| Nginx 反向代理 | 利用 `proxy_pass` 将请求转发到目标服务，对浏览器完全透明 | 生产环境，配置简单，性能好 |
| PostMessage | HTML5 提供的跨窗口通信 API，`window.postMessage` + `message` 事件 | 父子窗口、iframe 嵌入页面间通信 |
| WebSocket | `ws://` / `wss://` 协议不受同源策略限制，服务端可校验 `Origin` | 实时推送、聊天、协作编辑等长连接场景 |

### JSONP

利用 `<script>` 标签没有跨域限制的特性。前端动态创建 `<script>` 标签并将回调函数名通过 URL 参数传给服务端；服务端返回一段 JS 代码，调用该回调函数并将数据作为参数传入。缺点是只能发 GET 请求、无法设置自定义请求头、错误处理困难，且存在 XSS 风险（服务端被攻破可注入任意脚本）。现代开发已基本被 CORS 取代。

```html
<!-- 前端：JSONP 请求封装 -->
<script>
function handleData(data) {
  console.log('JSONP 返回:', data)
}

function jsonp(url) {
  const script = document.createElement('script')
  script.src = url + '?callback=handleData'
  document.body.appendChild(script)
  script.onload = () => script.remove() // 用完后移除
}

jsonp('https://api.example.com/user')
</script>
```

```js
// 后端（Node.js / Express）：
app.get('/user', (req, res) => {
  const callback = req.query.callback    // 前端传来的回调名
  const data = { id: 1, name: 'Alice' }
  res.set('Content-Type', 'application/javascript')
  res.send(`${callback}(${JSON.stringify(data)})`)  // → handleData({...})
})
```

### CORS（跨域资源共享）

这是目前最标准的跨域方案。浏览器自动在跨域请求中携带 `Origin` 头，服务端通过 `Access-Control-Allow-Origin` 等响应头声明许可策略。对于非简单请求（如 `PUT`、`DELETE`、带 `Authorization` 头的请求），浏览器会先发自带的 **OPTIONS 预检请求**，通过后再发实际请求。CORS 的灵活性体现在可以精细控制允许的方法、头部、是否携带 Cookie、预检缓存时长等。

```js
// 后端（Node.js / Express）—— 使用 cors 中间件
const cors = require('cors')

// 基础用法：允许所有源
app.use(cors())

// 精细化配置
app.use(cors({
  origin: ['https://example.com', 'https://app.example.com'], // 白名单
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,       // 允许携带 Cookie
  maxAge: 86400            // 预检缓存 24 小时
}))
```

```js
// 手工配置（不用中间件）
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', 'https://example.com')
  res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE')
  res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.set('Access-Control-Allow-Credentials', 'true')
  if (req.method === 'OPTIONS') return res.sendStatus(204) // 预检直接返回
  next()
})
```

### 代理（DevServer Proxy）

开发阶段最常用的方案。webpack-dev-server / Vite 等工具内置代理能力，在本地开发服务器与浏览器之间插入一层——浏览器请求 `localhost:3000/api`，dev server 收到后转发到 `https://api.example.com`，响应原路返回。因为浏览器始终只与 `localhost:3000` 同源通信，所以完全没有跨域问题。注意这仅在开发环境生效，生产部署需要 Nginx 或后端自行处理。

```js
// webpack.config.js
module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'https://api.example.com',
        changeOrigin: true,        // 修改 Host 头为目标地址
        pathRewrite: { '^/api': '' } // 去掉 /api 前缀
      }
    }
  }
}
```

```js
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://api.example.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
```

### Nginx 反向代理

生产环境中通过 Nginx 统一处理跨域——将前端静态资源和后端 API 挂载在同一个域名下，或通过 `proxy_pass` 将 `/api` 路径转发到后端服务。对浏览器而言，所有请求都发往同一个源，完全绕开同源策略。Nginx 还能在同一处统一配置 CORS 头、缓存策略、负载均衡等。

```nginx
server {
    listen 80;
    server_name www.example.com;

    # 前端静态资源
    location / {
        root /var/www/html;
        try_files $uri /index.html;
    }

    # API 反向代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:3000/;   # 去掉 /api 前缀
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # 也可以在这里统一加 CORS 头（后端不处理时）
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET,POST,PUT,DELETE';
    }
}
```

### PostMessage

HTML5 提供的安全跨域通信机制，适用于 iframe 嵌入、`window.open` 打开的子窗口、TAB 页之间的通信。发送方调用 `targetWindow.postMessage(data, targetOrigin)`，接收方监听 `window.addEventListener('message', callback)`。注意 `targetOrigin` 应指定具体域名而非 `'*'`，接收方也必须校验 `event.origin` 以防止恶意消息注入。

```html
<!-- 父页面 (https://parent.com) -->
<iframe id="child" src="https://child.com"></iframe>
<script>
// 向 iframe 发送消息
const childWindow = document.getElementById('child').contentWindow
childWindow.postMessage({ type: 'greeting', text: 'Hello' }, 'https://child.com')

// 接收 iframe 回传
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://child.com') return  // 安全校验
  console.log('收到子页面消息:', event.data)
})
</script>
```

```html
<!-- 子页面 (https://child.com) -->
<script>
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://parent.com') return
  console.log('收到父页消息:', event.data)
  // 回复父页
  event.source.postMessage({ type: 'reply', text: 'Hi back!' }, event.origin)
})
</script>
```

### WebSocket

WebSocket 使用 `ws://`（非加密）或 `wss://`（加密，等同于 HTTPS）协议，与 HTTP 同源策略完全独立——浏览器不会对 WebSocket 连接施加同源限制。不过服务端仍应校验请求的 `Origin` 头来防止跨站 WebSocket 劫持（Cross-Site WebSocket Hijacking）。WebSocket 建立连接后支持全双工实时通信，适合聊天、协作编辑、实时推送等场景。

```js
// 前端
const ws = new WebSocket('wss://api.example.com/ws')

ws.onopen = () => {
  console.log('连接已建立')
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'news' }))
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('收到消息:', data)
}

ws.onclose = () => console.log('连接已关闭')
ws.onerror = (err) => console.error('连接错误', err)
```

```js
// 后端（Node.js + ws 库）
const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 3000 })

wss.on('connection', (ws, req) => {
  // 校验 Origin 防止跨站劫持
  const allowedOrigins = ['https://example.com']
  if (!allowedOrigins.includes(req.headers.origin)) {
    return ws.close()
  }

  ws.on('message', (msg) => {
    console.log('收到:', msg.toString())
    ws.send(JSON.stringify({ status: 'ok' }))
  })
})
```

### 跨域方案横向对比

| 维度 | JSONP | CORS | 代理 | Nginx | PostMessage | WebSocket |
|---|---|---|---|---|---|---|
| HTTP 方法 | 仅 GET | 全部 | 全部 | 全部 | 不适用 | 不适用（自有协议） |
| 需要后端配合 | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| 携带 Cookie | ❌ | ✅（credentials） | ✅ | ✅ | ❌ | ❌ |
| 环境 | 浏览器 | 浏览器 | 仅开发 | 生产 | 浏览器 | 浏览器 |
| 双向通信 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅（原生双工） |
| 错误处理 | 弱 | 完善 | 完善 | 完善 | 手动实现 | 事件驱动 |

### 💬 面试深度

**标准回答**：跨域方案按场景选：主流 API 跨域用 CORS（服务端设 `Access-Control-*` 响应头）；开发阶段用 dev server proxy，生产用 Nginx 反向代理——本质上都是让浏览器始终与同源通信，完全绕开同源策略。JSONP 已是历史方案（仅 GET、有 XSS 风险），PostMessage 适合 iframe/窗口间通信，WebSocket 协议本身不受同源限制但服务端应校验 Origin。选择方案的关键判断：是否需要后端配合、是否需要携带 Cookie、是开发还是生产环境。

**追问预判**：
- *"OPTIONS 预检请求什么时候发？"* —— 只要不满足"简单请求"三条件就触发：①方法不是 GET/HEAD/POST；②Content-Type 不是 `text/plain` / `multipart/form-data` / `application/x-www-form-urlencoded` 三者之一；③请求包含自定义头部（如 `Authorization`、`X-Requested-With`）。`application/json` 的 POST 请求会触发预检，这是最常见的"意外预检"场景。预检通过后浏览器按 `Access-Control-Max-Age` 缓存结果，有效期内同 URL 不再预检。
- *"为什么带 Cookie 的 CORS 要同时满足三个条件？"* —— 这是安全设计——如果跨域默认带 Cookie，任意网站都能带着用户的登录态发请求（CSRF 变种）。所以必须三方对齐：前端 `xhr.withCredentials = true`、后端 `Access-Control-Allow-Credentials: true`、且 `Access-Control-Allow-Origin` 必须明确指定域名不能用 `*`。

**源码在哪**：Chromium 的 CORS 校验在 `services/network/cors/cors_url_loader.cc`，预检请求逻辑在 `CorsURLLoader::StartPreflightRequest()`；简单请求判断在 `services/network/cors/cors_url_loader.cc` 的 `CalculateCorsFlag()` 函数。

**踩过的坑**：后端配了 `Access-Control-Allow-Origin: *`，前端用 `axios` 发 `withCredentials: true` 请求，浏览器直接报 `CORS error`——因为 `*` 与 `withCredentials` 互斥。修复：将 `*` 改为请求的 `Origin` 头动态回显（或白名单），同时加 `Access-Control-Allow-Credentials: true`。

**项目选型**：生产环境选择 Nginx 反向代理统一处理跨域，而非在每个微服务上加 CORS 中间件——统一管理减少配置分散，而且对浏览器来说所有请求同源，完全避开了 OPTIONS 预检开销。

---

## HTTPS 原理 ⭐⭐

HTTPS = HTTP + TLS（Transport Layer Security），在 TCP 三次握手之后、HTTP 报文传输之前，插入 TLS 握手来协商加密密钥，之后的通信全部由对称加密保护。HTTPS 解决了 HTTP 明文传输的三大问题：**防窃听**（加密）、**防篡改**（完整性校验）、**防冒充**（身份认证）。

### 对称加密 vs 非对称加密

**对称加密**：通信双方使用**同一个密钥**进行加解密，速度快，适合大量数据传输。问题在于如何安全地把密钥传给对方——如果通过不安全的信道传输，密钥本身就可能被窃取。常见算法：AES、ChaCha20。

**非对称加密**：使用一对数学相关的密钥——**公钥加密的内容只能用私钥解密**，反之亦然。通信时服务端公开公钥，客户端用公钥加密数据后发送，只有持有私钥的服务端能解密。安全性高但计算慢，不适合加密大量数据。常见算法：RSA、ECDHE。

TLS 的精妙之处在于**混合使用**：握手阶段用非对称加密安全交换"会话密钥"，后续数据传输用该会话密钥进行对称加密——兼顾安全与性能。

| 维度 | 对称加密 | 非对称加密 |
|---|---|---|
| 密钥数量 | 1 个（共享） | 2 个（公钥 + 私钥） |
| 加密速度 | 快（适合大量数据） | 慢（计算密集） |
| 密钥分发 | 困难（需安全信道） | 简单（公钥可公开） |
| 典型算法 | AES、ChaCha20 | RSA、ECDHE、Ed25519 |
| TLS 中角色 | 加密实际 HTTP 数据 | 握手阶段交换对称密钥 |

### TLS 1.3 握手流程（4 步简化）

TLS 1.3 相比 1.2 精简了往返次数（从 2-RTT 降到 1-RTT），移除了不安全的加密套件。以下为简化流程：

```
Client                                    Server
  │                                          │
  │──── ① ClientHello ────────────────────→ │
  │     (支持的密码套件、密钥协商参数)         │
  │                                          │
  │←─── ② ServerHello + 证书 + 完成 ────── │
  │     (选定密码套件、证书链、签名验证)       │
  │                                          │
  │──── ③ Client Finish ──────────────────→ │
  │     (验证证书、生成会话密钥、加密完成)      │
  │                                          │
  │←─── ④ Server Finish ────────────────── │
  │     (加密确认，此后全部用对称密钥通信)      │
  │                                          │
  ═══════ 对称加密传输 HTTP 数据 ═══════════
```

**① ClientHello**：客户端发送支持的 TLS 版本、密码套件列表、随机数、密钥协商参数（如 ECDHE 公钥）。

**② ServerHello + 证书**：服务端选定密码套件，返回自己的随机数、密钥协商参数、**证书链**（包含服务端公钥）。客户端拿到证书后向 CA 验证其有效性（域名匹配、未过期、未吊销、CA 可信）。

**③ Client Finish**：客户端验证通过后，双方通过 ECDHE 等算法独立计算出相同的 **会话密钥**（无需在网络上传输密钥本身）。客户端发送加密的 Finished 消息。

**④ Server Finish**：服务端也发送加密的 Finished 消息。此后双方用会话密钥进行对称加密通信，握手完成。

```text
安全要点：
- ECDHE 密钥协商使得即使服务端私钥泄露，历史会话也无法被解密（前向安全性）
- TLS 1.3 要求在 ① 阶段就传递密钥协商参数，减少 1 个 RTT
- 证书链中的每个证书都用上级 CA 的私钥签名，根 CA 自签名并预置在操作系统中
```

### 证书链与 CA

**CA（Certificate Authority，证书颁发机构）** 是 TLS 信任模型的核心。服务端将自己的公钥和域名提交给 CA 申请证书，CA 用自己的私钥对证书内容签名后颁发。浏览器/操作系统内置了受信任的根 CA 列表（如 DigiCert、Let's Encrypt、GlobalSign），TLS 握手时沿证书链逐级验证签名，直到找到信任的根。

**证书链结构**：

```
根 CA 证书（自签名，预置在 OS/浏览器中）
  └─→ 中间 CA 证书（根 CA 签发）
       └─→ 服务端证书（中间 CA 签发，包含域名 + 公钥）
```

验证链路上每一环签名的有效性，任一环节失败则整个链不被信任。面试中常问的"为什么需要中间 CA"——因为根 CA 私钥需离线保管（一旦泄露整个互联网安全崩溃），日常签发由中间 CA 完成，形成层级隔离。

```bash
# 查看某域名的证书链（命令行）
openssl s_client -connect example.com:443 -showcerts </dev/null 2>/dev/null \
  | grep -E "subject=|issuer="
# subject= /CN=example.com        ← 服务端证书
# issuer=  /C=US/O=Let's Encrypt  ← 中间 CA
# （继续往上追到根 CA）
```

| 概念 | 说明 |
|---|---|
| 根 CA | 最高层级，自签名，预置在浏览器/OS 信任库中 |
| 中间 CA | 根 CA 签发，负责日常证书颁发，隔离根 CA 风险 |
| 服务端证书 | 绑定域名与公钥，由中间 CA 签发 |
| 证书链 | 从服务端证书逐级验证到根 CA 的完整签名路径 |
| 吊销检查 | OCSP（在线证书状态协议）或 CRL（证书吊销列表），浏览器会检查证书是否已被吊销 |

### 💬 面试深度

**标准回答**：HTTPS = HTTP + TLS，核心思路是握手阶段用非对称加密（RSA/ECDHE）安全交换会话密钥，后续数据传输用对称加密（AES）——兼顾安全与性能。TLS 1.3 把握手从 2-RTT 降到 1-RTT，且 ECDHE 密钥协商算法提供了前向安全性——即使服务端私钥未来泄露，历史会话也无法被解密。证书链（根 CA → 中间 CA → 服务端证书）是信任的基石，浏览器逐级验证签名直到找到预置的根证书。

**追问预判**：
- *"中间人攻击（MITM）HTTPS 怎么防？"* —— 攻击者伪造服务端证书时，浏览器验证证书链会发现签名不匹配（攻击者没有 CA 私钥），直接显示 `NET::ERR_CERT_AUTHORITY_INVALID` 错误页面阻断连接。前提是用户不手动点击"继续访问"跳过警告——这就是为什么浏览器把跳过 HTTPS 警告的操作藏得很深。
- *"证书透明度（Certificate Transparency）解决什么问题？"* —— CA 可能被攻破或被胁迫签发假证书。CT 要求 CA 将每张签发的证书提交到公共 CT Log（不可篡改的日志系统），浏览器要求证书附带 SCT（Signed Certificate Timestamp）作为签发凭证。Chrome 强制验证 SCT，没有 SCT 的证书即使签名正确也会被标记为不可信。

**源码在哪**：Chromium 的 TLS 栈使用 BoringSSL（Google 维护的 OpenSSL 分支），源码在 `third_party/boringssl/`；证书链验证逻辑在 `net/cert/` 目录，`cert_verify_proc.cc` 负责调用系统信任库验证证书链。

**踩过的坑**：内部测试环境用自签名证书配 HTTPS，后端 curl 能通但前端浏览器全部报 `ERR_CERT_AUTHORITY_INVALID`——排查半天才发现自签 CA 没导入系统信任库。修复：用 `mkcert` 工具生成本地受信证书，`mkcert -install` 将 CA 根证书安装到系统信任库，一键解决。

**项目选型**：生产证书选择 Let's Encrypt + certbot ACME 自动续期，而非手动购买商业证书——免费、90 天短有效期降低泄露风险、全自动续期零人工介入，配合 `--webroot` 模式无需停服。
