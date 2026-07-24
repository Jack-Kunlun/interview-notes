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

## Redux 持久化（redux-persist）⭐⭐

`redux-persist` 是 Redux 生态中最常用的状态持久化库，将 Redux Store 中的数据自动同步到本地存储（LocalStorage / AsyncStorage），应用刷新或重新打开后自动恢复（rehydrate）之前的状态，常用于保存用户登录态、购物车、表单草稿等场景。

核心流程：`persistReducer` 包装根 reducer 生成具备持久化能力的新 reducer → `persistStore` 创建持久化 store 实例 → `PersistGate` 包裹 App 根组件，在状态恢复完成前展示 loading。

```tsx
// store.ts — 配置 persistReducer 与 persistStore
import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist'
import storage from 'redux-persist/lib/storage' // 默认 localStorage
import rootReducer from './rootReducer'

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'cart'],        // 只持久化 auth 和 cart
  // blacklist: ['transientData'],    // 排除瞬时数据（如 loading 状态）
  // transforms: [myTransform],       // 存入/取出时可对状态做变换
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
})

export const persistor = persistStore(store)
```

```tsx
// App.tsx — PersistGate 包裹根组件
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from './store'

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<div>加载中...</div>} persistor={persistor}>
        <AppRouter />
      </PersistGate>
    </Provider>
  )
}
```

```tsx
// transforms — 存入前加密 / 取出后解密，或只序列化部分字段
import { createTransform } from 'redux-persist'

// 只持久化 user 的 token 字段，忽略其他敏感信息
const userTransform = createTransform(
  // 存入时：只保留 token
  (inboundState: any) => ({ token: inboundState.token }),
  // 取出时：原样返回（hydration 阶段再补全其余字段）
  (outboundState: any) => outboundState,
  { whitelist: ['user'] }
)
```

| 配置项 | 作用 | 典型值 |
|---|---|---|
| `key` | 存储键名前缀 | `'root'` |
| `storage` | 存储引擎 | `localStorage`（Web）/ `AsyncStorage`（RN） |
| `whitelist` | 只持久化这些 reducer key | `['auth', 'cart']` |
| `blacklist` | 排除这些 reducer key | `['loading', 'errors']` |
| `transforms` | 存入/取出时对状态做变换 | 加密、字段筛选、版本迁移 |

### LocalStorage vs AsyncStorage

| | LocalStorage | AsyncStorage |
|---|---|---|
| 运行环境 | 浏览器 | React Native（Android / iOS） |
| API 类型 | 同步 | 异步（Promise） |
| 容量上限 | ~5MB | 无明显上限（各平台不同） |
| 数据类型 | 仅字符串 | 字符串（自动 JSON 序列化） |
| 安装方式 | `redux-persist/lib/storage` | `@react-native-async-storage/async-storage` |

---

## MobX ⭐⭐

MobX 是基于**观察者模式**和**响应式编程**的状态管理库，核心理念是"任何源自应用状态的东西都应该自动获得"。与 Redux 的不可变数据 + reducer 范式不同，MobX 允许直接修改（mutate）可观察状态，由 MobX 自动追踪依赖并触发派生（computed）和副作用（reaction）。

### `observable` / `action` / `computed` 核心 API

- **observable**：将对象/数组/基本值标记为"可观察"，当其变化时自动通知所有观察者
- **action**：修改 observable 状态的唯一入口（strict 模式下强制），内部修改会被批量提交，避免中间态通知
- **computed**：基于 observable 的派生值，自动缓存且仅在依赖变化时重新计算，类似 Vue 的 computed

```tsx
import { makeObservable, observable, action, computed } from 'mobx'

class CounterStore {
  count = 0

  constructor() {
    makeObservable(this, {
      count: observable,
      increment: action,
      decrement: action,
      double: computed,
    })
  }

  increment() { this.count++ }
  decrement() { this.count-- }

  get double() {
    return this.count * 2
  }
}
```

### `makeAutoObservable` 类写法（推荐）

`makeAutoObservable` 自动推断成员类型：所有自有属性 → `observable`，所有方法 → `action`，所有 getter → `computed`。减少样板代码，是 MobX 6+ 的推荐写法。

```tsx
import { makeAutoObservable } from 'mobx'

class TodoStore {
  todos = []
  filter = 'all'

  constructor() {
    makeAutoObservable(this)
  }

  addTodo(text: string) {
    this.todos.push({ id: Date.now(), text, done: false })
  }

  removeTodo(id: number) {
    this.todos = this.todos.filter(t => t.id !== id)
  }

  toggleTodo(id: number) {
    const todo = this.todos.find(t => t.id === id)
    if (todo) todo.done = !todo.done
  }

  get doneCount() {
    return this.todos.filter(t => t.done).length
  }

  get filteredTodos() {
    switch (this.filter) {
      case 'done':  return this.todos.filter(t => t.done)
      case 'undone': return this.todos.filter(t => !t.done)
      default:       return this.todos
    }
  }
}
```

### `observer` HOC 连接 React

`observer` 是 `mobx-react-lite` 提供的高阶组件，包裹 React 组件使其自动订阅渲染期间读取的 observable。只有真正被读取的 observable 变化时才会重渲染，粒度极细。

```tsx
import { observer } from 'mobx-react-lite'

const TodoList = observer(({ store }: { store: TodoStore }) => {
  return (
    <div>
      <p>完成: {store.doneCount} / {store.todos.length}</p>
      {store.filteredTodos.map(todo => (
        <div key={todo.id}>
          <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
            {todo.text}
          </span>
          <button onClick={() => store.toggleTodo(todo.id)}>切换</button>
          <button onClick={() => store.removeTodo(todo.id)}>删除</button>
        </div>
      ))}
    </div>
  )
})
```

### MobX vs Redux 对比

| 维度 | MobX | Redux (Toolkit) |
|---|---|---|
| 编程范式 | 面向对象 / 响应式 | 函数式 / 不可变数据 |
| 状态修改 | 直接 mutate（`this.count++`） | dispatch action → reducer 返回新对象 |
| 数据流 | 多 store，各自独立 | 单一 Store（configureStore） |
| 派生值 | `computed` getter，自动缓存 | `createSelector`（reselect） |
| 样板代码 | 极少（`makeAutoObservable`） | 中等（slice + reducers + actions） |
| 不可变要求 | 无，可变数据 | 必须返回新引用（immer 内置） |
| 调试工具 | mobx-devtools | Redux DevTools（时间旅行） |
| 适用场景 | 复杂领域模型、大量联动计算 | 大型协作项目、需严格审计/回溯 |
| TypeScript | 类写法天然友好 | RTK 内置类型推断 |
| 学习曲线 | 中等（响应式概念） | 中等（数据流概念） |

---

## 常用 Hooks 深入 ⭐⭐⭐

### `useContext`：跨层级状态注入

`useContext` 配合 `createContext` 实现跨组件层级的数据共享，无需逐层传递 props。Provider 包裹的子树中任何组件都可以通过 `useContext(MyContext)` 直接消费数据，常用于主题、语言、用户鉴权等全局状态。

**性能注意**：Context value 变化时，**所有**使用该 Context 的消费者组件都会重渲染，即使只消费了 value 中的某个字段。优化手段：① 拆分 Context（ThemeContext + UserContext 而非 GlobalContext）；② 用 `useMemo` 包裹 Provider 的 value，避免每次渲染创建新对象引用；③ 对数据部分和更新函数部分分别创建 Context。

```tsx
// 创建 Context
const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} })

// Provider 组件 — 用 useMemo 稳定 value 引用
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  const value = useMemo(() => ({
    theme,
    toggleTheme: () => setTheme(t => (t === 'light' ? 'dark' : 'light')),
  }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// 消费者组件
function ThemedButton() {
  const { theme, toggleTheme } = useContext(ThemeContext)
  return (
    <button
      onClick={toggleTheme}
      style={{ background: theme === 'dark' ? '#333' : '#fff' }}
    >
      当前: {theme}
    </button>
  )
}

// ✅ 拆分 Context 优化：将读和写分离，减少不必要重渲染
const ThemeValueContext = createContext('light')
const ThemeActionContext = createContext<() => void>(() => {})
```

| 问题 | 解决方案 |
|---|---|
| Context 变化导致全体消费者重渲染 | 拆分多个 Context，或用 `useMemo` 包裹 value |
| Provider 嵌套地狱 | 组合多个 Provider 为一个 AppProvider |
| 高频更新场景 Context 不合适 | 换用 Zustand / Redux（基于订阅，精准渲染） |
| 默认值管理 | `createContext(defaultValue)` 提供 fallback |

### `forwardRef` + `useImperativeHandle`：暴露子组件方法

`forwardRef` 让父组件可以将 ref 透传到子组件内部的 DOM 节点或组件实例。配合 `useImperativeHandle` 可以自定义暴露给父组件的方法/属性集合，而非暴露整个 DOM 节点，实现受控的命令式接口（如表单校验、聚焦、滚动等）。

```tsx
import { forwardRef, useImperativeHandle, useRef } from 'react'

// 定义暴露的方法类型
interface FormRef {
  submit: () => void
  reset: () => void
  focus: () => void
}

const Form = forwardRef<FormRef, { onSubmit: (data: any) => void }>((props, ref) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({ name: '' })

  useImperativeHandle(ref, () => ({
    submit: () => {
      props.onSubmit(formData)       // 触发外部提交逻辑
    },
    reset: () => {
      setFormData({ name: '' })      // 内部重置状态
    },
    focus: () => {
      inputRef.current?.focus()      // 聚焦内部 input
    },
  }))

  return (
    <input
      ref={inputRef}
      value={formData.name}
      onChange={e => setFormData({ name: e.target.value })}
    />
  )
})

// 父组件使用
function Parent() {
  const formRef = useRef<FormRef>(null)

  return (
    <>
      <Form ref={formRef} onSubmit={data => console.log(data)} />
      <button onClick={() => formRef.current?.submit()}>提交</button>
      <button onClick={() => formRef.current?.reset()}>重置</button>
    </>
  )
}
```

| Hook | 作用 | 典型场景 |
|---|---|---|
| `forwardRef` | 透传 ref 到子组件 | 封装 UI 组件库、包装原生 DOM |
| `useImperativeHandle` | 限制子组件暴露的方法 | 只暴露 submit/reset，隐藏内部 state |
| 二者组合 | 命令式 API 封装 | 表单校验、动画控制、媒体播放器 |

### `useDeferredValue` / `useTransition`：React 18 并发特性

这两个 Hook 的核心思路都是"区分紧急/非紧急更新"，让高优先级交互（输入、点击）不被低优先级渲染（列表过滤、图表重绘）阻塞。

- **`useTransition`**：返回 `[isPending, startTransition]`，用 `startTransition` 包裹低优先级 setState，React 会在空闲时处理。`isPending` 可用于展示 loading 态。
- **`useDeferredValue`**：接收一个值并返回其"滞后"版本。当原始值变化时，React 先完成紧急渲染，然后在后台用新值重新渲染，效果等同于"对 props 做 debounce，但基于并发调度而非时间"。

```tsx
// useTransition — 搜索场景：输入框保持响应，搜索结果延迟渲染
function SearchPage() {
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // 紧急更新：输入框显示键入内容
    setQuery(e.target.value)
    // 非紧急更新：搜索结果可被中断
    startTransition(() => {
      setSearchResults(filterData(e.target.value))
    })
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <small>搜索中...</small>}
      <SearchResults />
    </>
  )
}

// useDeferredValue — 列表过滤：输入时旧列表保持可见，避免闪烁
function FilteredList({ query, items }: { query: string; items: Item[] }) {
  const deferredQuery = useDeferredValue(query)
  const isStale = query !== deferredQuery       // 还在等待后台渲染

  const filtered = useMemo(
    () => items.filter(i => i.name.includes(deferredQuery)),
    [items, deferredQuery]
  )

  return (
    <div style={{ opacity: isStale ? 0.5 : 1 }}>
      {filtered.map(item => <div key={item.id}>{item.name}</div>)}
    </div>
  )
}
```

| | `useTransition` | `useDeferredValue` |
|---|---|---|
| 控制对象 | 状态更新（`startTransition` 包裹 setState） | 值的滞后版本（传给子组件） |
| isPending | ✅ 内置 `isPending` | ❌ 手动对比 `query !== deferredQuery` |
| 使用场景 | 你能控制 setState 的地方 | 值来自 props / 第三方 Hook，无法控制其 setState |
| 本质 | 降低 setState 的优先级 | 对"收到的值"做延迟快照 |

### `useId`：生成唯一 ID

`useId` 是 React 18 新增的 Hook，生成在客户端和服务端保持一致的稳定唯一 ID，用于无障碍属性（`aria-labelledby`、`aria-describedby`）和表单 label-input 关联。**不要用于列表 key**（key 应来自数据本身）。

```tsx
function EmailField() {
  const id = useId()

  return (
    <>
      <label htmlFor={id}>邮箱</label>
      <input id={id} type="email" aria-describedby={`${id}-hint`} />
      <small id={`${id}-hint`}>请输入公司邮箱</small>
    </>
  )
}

// SSR 场景：服务端和客户端生成 ID 一致，避免 hydration 不匹配
// 多个实例会追加冒号后缀：:r0:, :r1:, :r2: ...
```

### `useSyncExternalStore`：订阅外部 Store

`useSyncExternalStore` 是 React 18 提供的原生并发安全的外部 Store 订阅方案。替代手写 `useEffect` + `useState` 订阅模式，能在 Concurrent Mode 下正确处理"撕裂"（tearing）问题——即同一状态在组件树不同位置读到不同值的 bug。

```tsx
import { useSyncExternalStore } from 'react'

// 订阅浏览器网络状态（原生 API 即 external store）
function useOnlineStatus() {
  return useSyncExternalStore(
    // subscribe — 注册回调，返回取消函数
    (callback) => {
      window.addEventListener('online', callback)
      window.addEventListener('offline', callback)
      return () => {
        window.removeEventListener('online', callback)
        window.removeEventListener('offline', callback)
      }
    },
    // getSnapshot — 返回当前状态快照
    () => navigator.onLine,
    // getServerSnapshot — SSR 时的快照值（可选）
    () => true
  )
}

function NetworkBanner() {
  const isOnline = useOnlineStatus()
  return isOnline ? null : <div className="banner">当前处于离线状态</div>
}
```

| 场景 | 方案 |
|---|---|
| 订阅 Redux / Zustand | 直接用其官方 React binding（内部已处理并发安全） |
| 订阅自定义 Store / 浏览器 API | `useSyncExternalStore` |
| 简单的一次性数据获取 | `useEffect` + `useState` 即可 |

---

## React 18 vs React 19 ⭐⭐⭐

React 19 于 2024 年 12 月正式发布，在 React 18 基础上进一步强化服务端渲染、开发者体验和性能。以下对比覆盖核心差异：

| 特性 | React 18 | React 19 |
|---|---|---|
| 自动批处理 | 仅 Concurrent Mode 下全面批处理 | 默认启用，覆盖所有场景 |
| Suspense | 仅支持 lazy 代码分割 + 数据获取（实验性） | 正式支持异步数据流，Suspense 更稳定 |
| Server Components | 实验性（Next.js App Router 率先集成） | **正式稳定**，原生 RSC 支持 |
| Actions API | ❌ 不存在 | ✅ `useActionState` / `useFormStatus` / `useOptimistic` |
| `use()` hook | ❌ 不存在 | ✅ 在渲染中读取 Promise / Context，支持条件调用 |
| ref as prop | 需 `forwardRef` 包裹 | ✅ ref 可直接作为 prop 传递 |
| Document Metadata | 需 `react-helmet` 等三方库 | ✅ 原生 `<title>` `<meta>` `<link>` 任意位置 |
| Context.Provider | 必须写 `<XxxContext.Provider>` | ✅ 直接用 `<XxxContext>` 即可 |
| Hydration 错误 | 报错信息不够清晰 | 单个错误不阻塞整页，错误信息更详细 |
| `ref` 清理函数 | ❌ 不支持 | ✅ ref 回调可返回清理函数 |
| 自定义元素 | 部分属性不传递 | ✅ 完整支持 Web Components |

```tsx
// ==================== React 19 新特性示例 ====================

// 1. ref 作为 prop — 不再需要 forwardRef！
function MyInput({ ref, placeholder }: { ref: Ref<HTMLInputElement>; placeholder: string }) {
  return <input ref={ref} placeholder={placeholder} />
}

// 2. use() hook — 在渲染中读取 Promise 或 Context（条件调用！）
async function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise)  // 暂停渲染直到 Promise resolve
  return <div>{user.name}</div>
}

// 也可以条件调用 use() — 突破了 Hooks 的限制
function ConditionalData({ shouldFetch, dataPromise }) {
  if (!shouldFetch) return <div>跳过</div>
  const data = use(dataPromise) // 条件分支内调用，合法！
  return <div>{data}</div>
}

// 3. Actions API — 表单处理一体化
function EditForm({ updateUser }) {
  const [state, formAction, isPending] = useActionState(updateUser, { error: null })

  return (
    <form action={formAction}>
      <input name="name" />
      <SubmitButton />
      {state.error && <p className="error">{state.error}</p>}
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus() // 读取父级 <form> 的提交状态
  return <button disabled={pending}>{pending ? '提交中...' : '提交'}</button>
}

// 4. Document Metadata — 组件内直接写
function BlogPost({ post }: { post: Post }) {
  return (
    <article>
      <title>{post.title} - 我的博客</title>
      <meta name="description" content={post.excerpt} />
      <link rel="canonical" href={`/posts/${post.slug}`} />
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  )
}

// 5. Context 简化 — 不再需要 .Provider
const ThemeContext = createContext('light')

function App() {
  return (
    <ThemeContext value="dark">  {/* 直接用 Context 替代 Context.Provider */}
      <Page />
    </ThemeContext>
  )
}

// 6. ref 清理函数
<input ref={(el) => {
  // 当元素从 DOM 移除时自动调用清理函数
  setupObserver(el)
  return () => cleanupObserver(el)
}} />
```

### 升级建议

| 项目类型 | 建议 |
|---|---|
| 新项目 | 直接用 React 19，享受 Actions / use() / RSC |
| React 18 中型项目 | 逐步迁移（React 19 保持高度向后兼容） |
| 重度依赖 `forwardRef` 的组件库 | 可放心升级，`forwardRef` 仍可用，新代码可直接用 ref prop |
| Next.js 项目 | 升级到 Next.js 15 + React 19 获取完整 RSC + Server Actions 体验 |
