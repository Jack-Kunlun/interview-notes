---
title: React
description: React Hooks、Fiber 架构、React 18/19 新特性复习
---

# React 生态

## 一、核心概念

### 1.1 JSX 本质：`React.createElement` → 虚拟 DOM

JSX 是 `React.createElement(type, props, ...children)` 的语法糖，编译后生成描述 UI 结构的 JS 对象——虚拟 DOM。React 通过对比新旧虚拟 DOM 树（Diff）计算最小 DOM 更新，再批量提交到真实 DOM。

```tsx
// JSX
<div className="box"><span>hello</span></div>

// 编译后 ≈
React.createElement('div', { className: 'box' },
  React.createElement('span', null, 'hello')
)

// 对应的虚拟 DOM 对象
{ type: 'div', props: { className: 'box', children: [...] } }
```

> **💬 面试追问**：React 17 引入新 JSX 转换，编译为 `import { jsx } from 'react/jsx-runtime'`，不再需要手动 `import React from 'react'`，编译产物更小。虚拟 DOM 的价值在于声明式编程体验和跨平台能力（React Native），而非绝对的性能优势——简单场景下直接操作 DOM 反而更快。

---

## 二、Hooks 基础

### 2.1 `useState` — 状态管理

```tsx
const [count, setCount] = useState(0)
setCount(c => c + 1) // 函数式更新，避免依赖过期闭包
```

### 2.2 `useEffect` — 副作用处理

```tsx
useEffect(() => {
  fetchData(id)
  return () => { /* 清理：取消请求 / 清除定时器 / 取消订阅 */ }
}, [id]) // 依赖数组控制执行时机
```

> **💬 踩坑**：`useEffect` 中忘记清理定时器/订阅，组件卸载后仍在执行副作用并报 `Can't perform a React state update on an unmounted component`。修复：返回清理函数。

### 2.3 `useRef` — 跨渲染周期持有引用

修改 `.current` 不触发重渲染。两个典型场景：引用 DOM 节点，以及保存不需要驱动 UI 的最新值（防闭包陷阱）。

```tsx
const inputRef = useRef<HTMLInputElement>(null)
const latestValue = useRef(count)
latestValue.current = count // 每次渲染同步，回调中始终读最新值
```

### 2.4 `useContext` — 跨层级数据注入

配合 `createContext` 实现跨组件数据共享，无需逐层传递 props。常用于主题、语言、用户信息等全局状态。

```tsx
const ThemeContext = createContext('light')

function App() {
  const [theme, setTheme] = useState('light')
  const value = useMemo(() => ({ theme, setTheme }), [theme])
  return (
    <ThemeContext.Provider value={value}>
      <Page />
    </ThemeContext.Provider>
  )
}

function ThemedButton() {
  const { theme, setTheme } = useContext(ThemeContext)
  return <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>{theme}</button>
}
```

> **💬 性能陷阱**：Context value 变化时所有消费者都重渲染，即使只用了 value 中的某个字段。优化：按更新频率拆分 Context（`ThemeValueContext` + `ThemeActionContext`），或用 `useMemo` 包裹 value。

### 2.5 `useReducer` — 复杂状态逻辑

`useReducer` 适合**多个子状态联动**或**下一状态依赖上一状态**的场景，把更新逻辑从组件内抽离到纯函数 `reducer(state, action) → newState`。

```tsx
type State = { count: number; step: number }
type Action = { type: 'increment' } | { type: 'decrement' } | { type: 'setStep'; payload: number }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment': return { ...state, count: state.count + state.step }
    case 'decrement': return { ...state, count: state.count - state.step }
    case 'setStep':   return { ...state, step: action.payload }
    default:          return state
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0, step: 1 })
  return <button onClick={() => dispatch({ type: 'increment' })}>{state.count}</button>
}
```

| | `useState` | `useReducer` |
|---|---|---|
| 状态复杂度 | 简单独立值 | 多个关联值 |
| 更新方式 | `setX(newVal)` | `dispatch({ type, payload })` |
| 可测试性 | 逻辑分散在组件中 | reducer 是纯函数，单测友好 |
| 典型场景 | 表单输入、开关 | 购物车、多步骤表单、复杂筛选 |

> **💬 追问**：`useReducer` 为什么能避免闭包陷阱？dispatch 引用稳定，reducer 接收的是最新 state 快照而非闭包捕获的旧值。`useState` 本质是预置了 reducer 为"直接替换"的 `useReducer`。

---

## 三、性能优化

### 3.1 `React.memo` / `useMemo` / `useCallback`

| API | 缓存目标 | 何时使用 |
|---|---|---|
| `React.memo` | 整个组件 | props 不变但父组件频繁重渲染 |
| `useMemo` | 计算结果 | 昂贵运算（排序、过滤大数组） |
| `useCallback` | 函数引用 | 传给 `memo` 子组件的回调 |

```tsx
// ❌ 滥用：简单计算不需要 useMemo
const double = useMemo(() => count * 2, [count])

// ✅ 合理：缓存大数组排序结果
const sorted = useMemo(() => [...list].sort(cmp), [list])

// useCallback 缓存函数引用
const handleClick = useCallback(() => doSomething(count), [count])
```

> **💬 关键认知**：三者均有额外开销（内存分配 + 依赖对比）。简单组件用 `memo` 反而浪费，`useCallback(fn, deps)` 等价于 `useMemo(() => fn, deps)`。

### 3.2 闭包陷阱与解决方案

当 `useEffect`/`useCallback` 依赖数组为空或遗漏时，回调捕获的是首次渲染的旧值。

```tsx
// ❌ count 永远为 0
useEffect(() => {
  const timer = setInterval(() => console.log(count), 1000)
  return () => clearInterval(timer)
}, [])

// ✅ 解法一：用 ref 保存最新值
const countRef = useRef(count)
countRef.current = count

// ✅ 解法二：正确声明依赖（副作用随值变化重建）
useEffect(() => { /* ... */ }, [count])

// ✅ 解法三：useReducer（dispatch 稳定 + reducer 收最新 state）
```

> **💬 选型**：需读取最新值但不触发重新执行副作用时用 `useRef`（轮询、WebSocket 回调）；需副作用随值变化重建时用依赖数组。

---

## 四、组件深化

### 4.1 组件通信方式

| 方式 | 适用场景 | 特点 |
|---|---|---|
| props | 父子直接通信 | 单向数据流 |
| Context | 跨层级（主题、语言、鉴权） | 避免 props drilling |
| Zustand | 中小型应用 | 极简 API、TS 友好、组件级订阅 |
| Redux Toolkit | 大型协作项目 | 规范性强、中间件生态、时间旅行 |

> **💬 追问**：什么时候用 Context 什么时候用状态管理库？Context 适合读多写少的全局配置（主题、语言）；状态管理库适合读写频繁的业务数据（购物车、列表筛选），因为 Zustand/Redux 基于订阅实现精准渲染，不会像 Context 那样大范围重渲染。

### 4.2 `forwardRef` + `useImperativeHandle`

`forwardRef` 透传 ref 到子组件，`useImperativeHandle` 自定义暴露的方法集，实现受控的命令式接口。

```tsx
interface FormRef { submit: () => void; reset: () => void }

const Form = forwardRef<FormRef, { onSubmit: (d: any) => void }>((props, ref) => {
  const [data, setData] = useState({ name: '' })
  useImperativeHandle(ref, () => ({
    submit: () => props.onSubmit(data),
    reset: () => setData({ name: '' }),
  }))
  return <input value={data.name} onChange={e => setData({ name: e.target.value })} />
})

// 父组件：
const formRef = useRef<FormRef>(null)
<Form ref={formRef} onSubmit={console.log} />
<button onClick={() => formRef.current?.submit()}>提交</button>
```

### 4.3 错误边界（Error Boundary）

错误边界是实现了 `getDerivedStateFromError` 和 `componentDidCatch` 的类组件，捕获子组件渲染阶段的 JS 错误并展示降级 UI。React 18 中与 Suspense 协同：Suspense 处理异步加载态，Error Boundary 兜底渲染错误。

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
```

---

## 五、Fiber 架构与 Diff

### 5.1 Fiber 架构：可中断渲染

Fiber 是 React 16 重构的协调引擎，将渲染拆分为可中断的增量单元（Fiber Node），每个 Fiber 对应一个组件实例，构成可遍历的链表树。

**三大核心机制**：
- **时间切片**：每帧 ~5ms，让出主线程给浏览器
- **优先级调度**：用户交互 > 动画 > 数据更新
- **双缓冲**：current 树 + workInProgress 树，完成后一次切换

```
Fiber 工作循环：
  beginWork (递) → 深度优先遍历子节点
  completeWork (归) → 回溯收集 effect，提交 DOM 变更
  可中断 ←→ 恢复（根据优先级）
```

### 5.2 虚拟 DOM Diff：O(n) 复杂度

React Diff 基于三个假设将复杂度从 O(n³) 降到 O(n)：

1. **同层对比**：只比较同层级节点，不跨层移动
2. **类型不同则重建**：`div → span` 整棵子树销毁重建
3. **key 标识稳定性**：列表节点用唯一 key 复用

```tsx
// ❌ 用 index 作为 key — 列表重排/增删时导致错误复用
{list.map((item, i) => <Item key={i} {...item} />)}

// ✅ 用稳定唯一 ID
{list.map(item => <Item key={item.id} {...item} />)}
```

> **💬 追问**：为什么 Vue 和 React 的 Diff 都是 O(n)？两者都基于同层对比假设，且都有编译时优化手段——Vue 3 的 Block Tree + PatchFlag，React 的编译器自动添加 `memo`/`useMemo`（React 19 编译器实验性支持）。

---

## 六、React 18 并发特性

### 6.1 Concurrent Mode 核心

React 18 的并发模式让渲染可中断，高优先级更新（用户输入、点击）不被低优先级渲染（列表过滤、图表重绘）阻塞。

### 6.2 `useTransition` / `useDeferredValue`

两者都是"区分紧急/非紧急更新"，区别在控制权：

| | `useTransition` | `useDeferredValue` |
|---|---|---|
| 控制对象 | setState（主动标记非紧急） | 接收值的滞后版本（被动延迟） |
| isPending | ✅ 内置 | ❌ 手动对比 `query !== deferredQuery` |
| 适用场景 | 你能控制 setState | 值来自 props / 第三方 Hook |

```tsx
// useTransition — 输入保持响应，搜索延迟渲染
const [isPending, startTransition] = useTransition()
const handleChange = (e) => {
  setQuery(e.target.value)                 // 紧急：输入框立即显示
  startTransition(() => setResults(...))   // 非紧急：搜索结果可被中断
}

// useDeferredValue — 列表过滤：旧列表保持可见，避免闪烁
const deferredQuery = useDeferredValue(query)
const isStale = query !== deferredQuery
const filtered = useMemo(() => items.filter(i => i.name.includes(deferredQuery)), [items, deferredQuery])
```

> **💬 追问**：`useDeferredValue` 和 debounce 的区别？debounce 基于固定时间延迟（如 300ms），期间 UI 完全冻结；`useDeferredValue` 基于 React 并发调度，在浏览器空闲时尽快完成滞后渲染，响应更快且无"等 300ms 突然刷新"的体验断层。不适合 `useTransition` 的场景：需要立即反馈的更新（输入框值本身、按钮 disabled 状态）以及必须完整执行的更新（支付流程）。

### 6.3 自动批处理

React 18 将 setTimeout / Promise / 原生事件中的多次 setState 合并为一次渲染。React 17 只在 React 事件处理函数中批处理。

```tsx
// React 18：自动批处理 ✅
setTimeout(() => {
  setCount(c => c + 1)
  setFlag(f => !f)
}, 1000) // 一次渲染

// 需要立即同步渲染时退出批处理
import { flushSync } from 'react-dom'
flushSync(() => setCount(c => c + 1))
```

---

## 七、React 19 新特性

React 19 于 2024 年 12 月发布，在 RSC、表单处理、DX 三方面大幅升级。

### 7.1 React 18 vs React 19 对比

| 特性 | React 18 | React 19 |
|---|---|---|
| 自动批处理 | 仅 Concurrent Mode | 默认全面启用 |
| Server Components | 实验性 | **正式稳定** |
| Actions API | ❌ | ✅ `useActionState` / `useFormStatus` / `useOptimistic` |
| `use()` hook | ❌ | ✅ 渲染中读取 Promise/Context，支持条件调用 |
| ref as prop | 需 `forwardRef` | ✅ 直接作为 prop 传递 |
| Document Metadata | 需三方库 | ✅ 原生 `<title>` `<meta>` 任意位置 |
| Context.Provider | 必须写 `.Provider` | ✅ 直接用 `<XxxContext>` |
| ref 清理函数 | ❌ | ✅ ref 回调可返回清理函数 |

### 7.2 Actions API：表单处理一体化

一个 Hook 替代 `useState` × 3 + `useTransition` + `e.preventDefault()`。

```tsx
// useActionState — action + state + pending 一体化
async function updateProfile(prevState, formData: FormData) {
  const name = formData.get('name')
  if (!name) return { error: '姓名不能为空' }
  try { await saveProfile(name); return { success: '保存成功' } }
  catch { return { error: '保存失败' } }
}

function ProfileForm() {
  const [state, submitAction, isPending] = useActionState(updateProfile, {})
  return (
    <form action={submitAction}>
      <input name="name" />
      <button disabled={isPending}>保存</button>
      {state.error && <p className="error">{state.error}</p>}
    </form>
  )
}

// useFormStatus — 子组件感知父 form 提交状态（无需 prop drilling）
function SubmitButton() {
  const { pending } = useFormStatus()
  return <button disabled={pending}>{pending ? '提交中...' : '提交'}</button>
}

// useOptimistic — 乐观更新 + 自动回滚
const [optimisticTodos, addOptimisticTodo] = useOptimistic(
  todos,
  (state, newTodo) => [...state, newTodo]
)
```

### 7.3 其他简化

```tsx
// ref 作为 prop — 不再需要 forwardRef！
function MyInput({ ref, placeholder }) {
  return <input ref={ref} placeholder={placeholder} />
}

// use() hook — 渲染中读取 Promise，突破 Hooks 条件调用限制
function UserProfile({ userPromise }) {
  const user = use(userPromise) // 暂停渲染直到 Promise resolve
  return <div>{user.name}</div>
}

// Context 直接用，无需 .Provider
<ThemeContext value="dark"><Page /></ThemeContext>
```

> **💬 升级建议**：新项目直接用 React 19；React 18 项目可放心渐进升级（高度向后兼容）；Next.js 项目升级到 Next.js 15 + React 19 获取完整 RSC + Server Actions 体验。

---

## 八、状态管理

### 8.1 Context 性能陷阱与拆分策略

Context value 变化 → 所有消费者重渲染。解决：

| 问题 | 方案 |
|---|---|
| 全体消费者重渲染 | 拆分多个 Context（`ThemeContext` + `UserContext`） |
| 读/写耦合触发不必要渲染 | 分开 `ThemeValueContext` + `ThemeActionContext` |
| 高频更新 | 换用 Zustand / Redux（基于订阅，精准渲染） |

### 8.2 Zustand

极简 API、无 Provider、TS 友好、组件级订阅（只有用了变化数据的组件才重渲染）。

```tsx
import { create } from 'zustand'

const useStore = create((set) => ({
  count: 0,
  increment: () => set(s => ({ count: s.count + 1 })),
}))

function Counter() {
  const count = useStore(s => s.count) // 精准订阅
  const increment = useStore(s => s.increment)
  return <button onClick={increment}>{count}</button>
}
```

### 8.3 Redux Toolkit

可预测状态容器 + DevTools 时间旅行 + 中间件生态。

```tsx
import { configureStore, createSlice } from '@reduxjs/toolkit'

const counterSlice = createSlice({
  name: 'counter',
  initialState: { count: 0 },
  reducers: {
    increment: s => { s.count += 1 }, // immer 内置，直接"修改"
  },
})

export const store = configureStore({ reducer: { counter: counterSlice.reducer } })
```

### 8.4 Redux 持久化（redux-persist）

将 Redux Store 同步到 localStorage，刷新后自动恢复。核心三元组：`persistReducer` → `persistStore` → `PersistGate`。

```tsx
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'cart'], // 只持久化关键 reducer
}

const persistedReducer = persistReducer(persistConfig, rootReducer)
export const store = configureStore({
  reducer: persistedReducer,
  middleware: gdm => gdm({ serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, ...] } }),
})
export const persistor = persistStore(store)

// App.tsx
<Provider store={store}>
  <PersistGate loading={null} persistor={persistor}>
    <App />
  </PersistGate>
</Provider>
```

> **💬 踩坑**：全量持久化到 localStorage 后上线改 state 结构，旧结构导致 REHYDRATE 后白屏。修复：只 whitelist 必须持久化的字段，其余状态每次启动重取；关键字段用 `createMigrate` + 版本号做迁移。

### 8.5 MobX

基于观察者模式的响应式状态管理，允许直接 mutate 可观察状态，`observer` 包裹组件实现属性级精准重渲染。

```tsx
import { makeAutoObservable } from 'mobx'
import { observer } from 'mobx-react-lite'

class TodoStore {
  todos = []
  constructor() { makeAutoObservable(this) }
  add(text) { this.todos.push({ id: Date.now(), text, done: false }) }
  get doneCount() { return this.todos.filter(t => t.done).length }
}

const TodoList = observer(({ store }) => (
  <p>完成: {store.doneCount} / {store.todos.length}</p>
))
```

| 维度 | MobX | Redux Toolkit |
|---|---|---|
| 范式 | 面向对象 / 响应式 | 函数式 / 不可变 |
| 状态修改 | 直接 mutate | dispatch → reducer 返回新对象 |
| 样板代码 | 极少（`makeAutoObservable`） | 中等（slice + reducers） |
| 适用场景 | 复杂领域模型、大量联动计算 | 大型协作、需严格审计/回溯 |

---

## 九、其他 Hooks

### 9.1 `useEffect` vs `useLayoutEffect`

| | `useEffect` | `useLayoutEffect` |
|---|---|---|
| 执行时机 | 浏览器绘制**之后**（异步） | DOM 更新后、绘制**之前**（同步） |
| 适用场景 | 数据请求、订阅、日志 | 读取/修改 DOM 尺寸、避免闪烁 |
| 性能影响 | 不阻塞渲染 | 阻塞浏览器绘制 |

### 9.2 `useInsertionEffect`

执行时机在 DOM 变更后、`useLayoutEffect` 之前，专为 CSS-in-JS 库设计——在浏览器计算布局前注入样式规则。**业务代码不应使用**。

```tsx
// 执行顺序：useInsertionEffect → useLayoutEffect → useEffect
```

### 9.3 `useId`

生成在客户端和服务端保持一致的唯一 ID，用于无障碍属性（`aria-labelledby`）和表单 label-input 关联。**不要用于列表 key**。

### 9.4 `useSyncExternalStore`

React 18 原生并发安全的外部 Store 订阅方案，能在 Concurrent Mode 下防止"撕裂"（tearing）。

```tsx
function useOnlineStatus() {
  return useSyncExternalStore(
    cb => { window.addEventListener('online', cb); return () => window.removeEventListener('online', cb) },
    () => navigator.onLine,
  )
}
```

### 9.5 `useDebugValue` + 自定义 Hook 设计

`useDebugValue` 为自定义 Hook 在 DevTools 中显示可读标签。

**自定义 Hook 设计原则**：`use` 前缀 → 单一职责 → 清理副作用 → 稳定引用（`useCallback`/`useMemo`）→ 无 UI（只处理逻辑）→ 泛型支持。

```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}
```
