---
title: React
description: React Hooks、Fiber 架构、React 18 新特性复习
---

# React 生态

## 必会基础 ⭐⭐⭐

### Hooks 核心：`useState` / `useEffect` / `useCallback` / `useMemo` / `useRef`

React Hooks 是 16.8 引入的函数式 API，让函数组件拥有状态和副作用能力。`useState` 管理状态，`useEffect` 处理副作用，`useCallback` 和 `useMemo` 分别缓存函数引用和计算结果，`useRef` 保存跨渲染周期的可变引用（DOM 节点、最新值容器）。

```tsx
// useState — 函数式更新，避免依赖过期闭包
const [count, setCount] = useState(0)
setCount(c => c + 1)

// useEffect — 依赖数组控制执行时机
useEffect(() => {
  fetchData(id)
}, [id])

// useCallback — 缓存函数引用，配合 React.memo 使用
const handleClick = useCallback(() => doSomething(count), [count])

// useMemo — 缓存计算结果，避免重复昂贵运算
const sorted = useMemo(() => [...data].sort(cmp), [data])

// useRef — 持有可变值，修改不触发重渲染
const inputRef = useRef<HTMLInputElement>(null)
```

### 闭包陷阱与解决方案（`useRef` 保存最新值）

当 `useEffect` 依赖为空数组时，回调捕获的是首次渲染的变量值（闭包），后续更新不会反映到定时器或事件监听中。解决方案是用 `useRef` 保存最新值，每次渲染同步 ref.current，回调中始终读取最新的 ref。

```tsx
// ❌ count 永远是初始值 0（闭包捕获旧值）
useEffect(() => {
  const timer = setInterval(() => console.log(count), 1000)
  return () => clearInterval(timer)
}, [])

// ✅ 解法：用 ref 保存最新值
const countRef = useRef(count)
countRef.current = count
useEffect(() => {
  const timer = setInterval(() => console.log(countRef.current), 1000)
  return () => clearInterval(timer)
}, [])
```

### 组件通信：props / Context / 状态管理（Zustand / Redux Toolkit）

React 组件通信按距离分层：父子间用 props 单向传递（父→子数据，子→父回调）；跨层级用 Context 注入全局主题/语言/用户信息；复杂应用状态用 Zustand（轻量、无 boilerplate）或 Redux Toolkit（可预测状态容器、DevTools 时间旅行调试）。

| 方式 | 适用场景 | 特点 |
|---|---|---|
| props | 父子直接通信 | 简单、单向数据流 |
| Context | 跨层级（主题、语言、鉴权） | 避免 props drilling |
| Zustand | 中小型应用 | 极简 API、TS 友好 |
| Redux Toolkit | 大型/协作应用 | 规范性强、中间件生态 |

### JSX 本质：`React.createElement` → 虚拟 DOM

JSX 是 `React.createElement(type, props, ...children)` 的语法糖，编译后生成描述 UI 结构的 JS 对象（虚拟 DOM）。React 通过对比新旧虚拟 DOM 树（Diff）计算最小 DOM 更新，再批量提交到真实 DOM。

```tsx
// JSX
<div className="box"><span>hello</span></div>

// 编译后 ≈
React.createElement('div', { className: 'box' },
  React.createElement('span', null, 'hello')
)

// 对应的虚拟 DOM 对象结构
{ type: 'div', props: { className: 'box', children: [...] } }
```

## 进阶考点 ⭐⭐

### **Fiber 架构**：可中断渲染、优先级调度、双缓冲树

Fiber 是 React 16 重构的协调引擎，将渲染拆分为可中断的增量单元（Fiber Node），每个 Fiber 对应一个组件实例，构成可遍历的链表树。核心机制：**时间切片**（每帧 ~5ms，让出主线程给浏览器）、**优先级调度**（用户交互 > 动画 > 数据更新）、**双缓冲**（current 树 + workInProgress 树，完成后一次切换）。

```
Fiber 工作循环：
  beginWork (递) → 深度优先遍历子节点
  completeWork (归) → 回溯收集 effect，提交 DOM 变更
  可中断 ←→ 恢复（根据优先级）
```

### **React 18**：Concurrent Mode、`useTransition`、`useDeferredValue`、自动批处理

React 18 引入并发特性：Concurrent Mode 让渲染可中断，`useTransition` 标记低优先级更新以保持 UI 响应，`useDeferredValue` 延迟非关键值的更新。自动批处理将 setTimeout / Promise / 原生事件中的多次 setState 合并为一次渲染。

```tsx
// useTransition — 区分紧急/非紧急更新
const [isPending, startTransition] = useTransition()
startTransition(() => setQuery(q)) // 非紧急，可被中断

// useDeferredValue — 滞后非关键值，减少重渲染
const deferredQuery = useDeferredValue(query)

// React 17：setTimeout 内的两次更新触发两次渲染
// React 18：自动批处理，只触发一次渲染 ✅
setTimeout(() => {
  setCount(c => c + 1)
  setFlag(f => !f)
}, 1000)

// 需要立即同步渲染时退出批处理
import { flushSync } from 'react-dom'
flushSync(() => setCount(c => c + 1))
```

### `React.memo` / `useMemo` / `useCallback` 优化原理与滥用风险

`React.memo` 对 props 浅比较避免无效渲染，`useMemo` 缓存昂贵计算结果，`useCallback` 缓存函数引用防止子组件不必要重渲染。但三者均有额外开销：简单组件用 memo 反而浪费内存；依赖数组遗漏会引入过期闭包 bug；不加区分地使用让代码膨胀却无实际性能收益。

| API | 缓存目标 | 何时使用 |
|---|---|---|
| `React.memo` | 整个组件 | props 不变但父组件频繁重渲染 |
| `useMemo` | 计算结果 | 昂贵运算（排序、过滤大数组） |
| `useCallback` | 函数引用 | 传给 memo 子组件的回调 |

```tsx
// ❌ 滥用：简单计算不需要 useMemo
const double = useMemo(() => count * 2, [count]) // 乘法极快，缓存开销反而更大

// ✅ 合理：缓存大数组排序结果
const sorted = useMemo(() => [...list].sort(cmp), [list])
```

### 虚拟 DOM Diff：同层对比、key 的意义、O(n) 复杂度

React Diff 基于三个假设将复杂度从 O(n³) 降到 O(n)：**同层对比**（只比较同层级节点，不跨层移动）、**类型不同则重建**（div → span 整棵子树销毁重建）、**key 标识稳定性**（列表节点用 key 复用而非错误匹配）。

```tsx
// ❌ 用 index 作为 key — 列表重排/增删时导致错误复用和状态错乱
{list.map((item, i) => <Item key={i} {...item} />)}

// ✅ 用稳定唯一 ID
{list.map(item => <Item key={item.id} {...item} />)}
```

### 错误边界（Error Boundary）与 Suspense 协同

错误边界是实现了 `static getDerivedStateFromError` 和 `componentDidCatch` 的类组件，捕获子组件渲染阶段的 JS 错误并展示降级 UI。React 18 中 Suspense 与 Error Boundary 协同：Suspense 处理异步加载态（fallback），Error Boundary 兜底渲染错误。

```tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error, info) { console.error(error, info) }
  render() {
    if (this.state.hasError) return <h1>出错了</h1>
    return this.props.children
  }
}

// Suspense + ErrorBoundary 组合使用
<ErrorBoundary>
  <Suspense fallback={<Spinner />}>
    <AsyncComponent />
  </Suspense>
</ErrorBoundary>
```

## `useEffect` vs `useLayoutEffect`

| | `useEffect` | `useLayoutEffect` |
|---|---|---|
| 执行时机 | 浏览器绘制**之后**（异步） | DOM 更新后、绘制**之前**（同步） |
| 适用场景 | 数据请求、订阅、日志 | 读取/修改 DOM 尺寸、避免闪烁 |
| 性能 | 不阻塞渲染 | 阻塞浏览器绘制 |
