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


### 💬 面试深度

**标准回答**：React Hooks 让函数组件拥有了状态管理和副作用处理能力。`useState` 用于声明状态变量，`useEffect` 管理副作用（数据请求、订阅、DOM 操作），`useCallback` 和 `useMemo` 分别缓存函数引用和计算结果以配合 `React.memo` 做性能优化，`useRef` 则提供跨渲染周期保持引用的容器。它们的核心价值在于让逻辑复用变得更简单——自定义 Hook 可以封装任何有状态逻辑，这是类组件无法优雅做到的。

**追问预判**：
- Q: "`useCallback` 和 `useMemo` 的区别是什么？" — `useCallback` 缓存函数本身（如 `() => doSomething(a)`），`useMemo` 缓存函数的执行结果（如 `compute(data)`）。`useCallback(fn, deps)` 等价于 `useMemo(() => fn, deps)`。
- Q: "为什么 Hooks 不能放在条件语句中？" — React 依赖 Hook 的调用顺序来关联组件多次渲染之间的状态，条件调用会打乱顺序导致状态错乱。

**源码在哪**：`packages/react/src/ReactHooks.js`（Hook 的 dispatcher 定义），`packages/react-reconciler/src/ReactFiberHooks.js`（Fiber 中 Hook 链表的实现，包括 mount/update 阶段）。

**踩过的坑**：在 `useEffect` 中忘记清理定时器/订阅，导致组件卸载后仍在执行副作用并尝试更新已卸载组件的状态，控制台报 `Can't perform a React state update on an unmounted component` 警告。修复：在 `useEffect` 的回调中返回清理函数 `() => clearInterval(timer)`。

**项目选型**：坚持使用函数组件 + Hooks 而非类组件，因为逻辑复用（自定义 Hook）比 HOC/render props 模式更简洁直观，且团队学习曲线更低。

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


### 💬 面试深度

**标准回答**：React 的闭包陷阱源于函数组件每次渲染都会创建新的闭包，当 `useEffect` 或 `useCallback` 的依赖数组为空或遗漏时，回调中捕获的变量永远是旧值。解决方案有三种：一是正确声明依赖让回调随值更新而重建；二是用 `useRef` 保存最新值，在回调中始终读取 `ref.current`；三是使用 `useReducer` 将状态更新逻辑外置，dispatch 函数本身是稳定的引用。

**追问预判**：
- Q: "`useRef` 解法和正确依赖数组各有什么适用场景？" — 需要读取最新值但不触发重新执行副作用时用 `useRef`（如轮询、WebSocket 回调）；需要副作用随值变化而重新执行时用依赖数组（如根据 ID 重新请求数据）。
- Q: "为什么 `useReducer` 能避免闭包陷阱？" — dispatch 函数在每次渲染时保持引用稳定，且 reducer 接收的是最新 state 快照而非闭包中的旧值，因此不会过期。

**踩过的坑**：用 `useCallback` 包裹回调但忘记声明依赖 `[count]`，结果传给子组件的函数永远引用初始 `count=0`。子组件内部操作看似正常（因为传入了最新 props），但回调中读取的 count 始终为 0，导致提交的数据总是初始值。修复：正确声明依赖数组或使用函数式更新 `setCount(c => c + 1)`。

**项目选型**：面对复杂状态逻辑时倾向 `useReducer` 而非多个 `useState` + `useRef` 组合，因为 reducer 天然规避闭包陷阱且逻辑集中可测试。

### 组件通信：props / Context / 状态管理（Zustand / Redux Toolkit）

React 组件通信按距离分层：父子间用 props 单向传递（父→子数据，子→父回调）；跨层级用 Context 注入全局主题/语言/用户信息；复杂应用状态用 Zustand（轻量、无 boilerplate）或 Redux Toolkit（可预测状态容器、DevTools 时间旅行调试）。

| 方式 | 适用场景 | 特点 |
|---|---|---|
| props | 父子直接通信 | 简单、单向数据流 |
| Context | 跨层级（主题、语言、鉴权） | 避免 props drilling |
| Zustand | 中小型应用 | 极简 API、TS 友好 |
| Redux Toolkit | 大型/协作应用 | 规范性强、中间件生态 |


### 💬 面试深度

**标准回答**：React 组件通信遵循单向数据流原则：父传子用 props，子传父用回调函数。跨层级场景用 Context 避免 props drilling，但 Context 适合低频更新的全局状态（主题、语言、用户信息）。高频更新的复杂状态应使用 Zustand 或 Redux Toolkit，它们基于发布-订阅模式实现精准渲染，不会像 Context 那样导致大范围重渲染。

**追问预判**：
- Q: "什么时候该用 Context，什么时候该用状态管理库？" — Context 适合读多写少的全局配置（主题、语言、权限），状态管理库适合读写频繁的业务数据（购物车、表单、列表筛选），因为 Context 的 value 一旦变化所有消费者都会重渲染。
- Q: "Zustand 为什么比 Context 更适合高频更新？" — Zustand 基于 `useSyncExternalStore` 实现组件级订阅，只有真正使用了变化数据的组件才会重渲染，而不是整个 Provider 子树。

**踩过的坑**：把用户信息、权限、主题全部塞进一个 `AppContext`，结果任何一个小字段变化（如主题切换）都导致整棵树重渲染，页面出现明显卡顿。修复：拆分为 `AuthContext`、`ThemeContext`、`PermissionContext`，各自独立更新。

**项目选型**：中小型项目用 Zustand 而非 Redux Toolkit，因为 Zustand API 极简（无 Provider 包裹、无 action type 常量、无 reducer 样板），TypeScript 推断也很自然。

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


### 💬 面试深度

**标准回答**：JSX 本质是 `React.createElement(type, props, ...children)` 的语法糖，编译后生成描述 UI 结构的 JS 对象——即虚拟 DOM。React 的协调算法（Reconciliation）通过对比新旧虚拟 DOM 树找到差异，再批量更新真实 DOM。这套机制让开发者用声明式的方式描述 UI，而无需手动操作 DOM。现代 React 项目中，`@babel/preset-react` 或 `@vitejs/plugin-react` 负责在构建时把 JSX 编译为 `React.createElement`（或 React 17+ 的 `jsx`/`jsxs` 运行时）。

**追问预判**：
- Q: "React 17 的 `jsx` 运行时和 `React.createElement` 有什么区别？" — React 17 引入新的 JSX 转换，编译为 `import { jsx } from react/jsx-runtime`，不再需要手动 `import React from react`，且编译产物更小、性能略有提升。
- Q: "虚拟 DOM 一定比真实 DOM 快吗？" — 不一定。虚拟 DOM 的 Diff 有额外开销，简单场景下直接操作 DOM 更快。虚拟 DOM 的价值在于声明式编程体验和跨平台能力（React Native），而非绝对的性能优势。

**源码在哪**：编译侧在 `@babel/plugin-transform-react-jsx` 或 `packages/react/src/jsx/ReactJSXElement.js`（React 17+ 的新 JSX 运行时），虚拟 DOM 创建在 `packages/react/src/ReactElement.js`。

**踩过的坑**：在 JSX 中写了 `class` 而非 `className`，React 不报错但在 DOM 上未生效，因为 `class` 是 JS 保留字。React 会在控制台输出警告但容易漏掉。修复：统一使用 `className`，配置 ESLint 规则 `react/no-unknown-property` 可提前检测。

**项目选型**：选择 React 而非 Vue 的原因是团队在 JSX 的表达能力上更舒适——JSX 是 JS 的超集，不需要额外学习模板指令语法，复杂的条件渲染和逻辑组合更自然。

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


### 💬 面试深度

**标准回答**：`redux-persist` 是 Redux 状态持久化的标准方案，核心是通过 `persistReducer` 拦截 reducer 的输出并同步写入 Storage，应用启动时通过 `REHYDRATE` action 恢复已保存状态。配置上需要关注三点：用 `whitelist` 精确控制持久化的 reducer 避免存储敏感数据；用 `serializableCheck` 忽略 persist 内置 action 防止序列化检查报错；通过 `PersistGate` 确保在状态恢复完成前不渲染可能依赖持久化数据的组件。

**追问预判**：
- Q: "持久化大量数据（>5MB）时怎么办？" — LocalStorage 通常限制 ~5MB，大数据场景应使用 IndexedDB 作为存储引擎（`redux-persist-indexeddb-storage`），或仅持久化关键字段 + 服务端作为主要数据源。
- Q: "如何处理持久化数据的版本迁移？" — 使用 `createMigrate` + 版本号，在 `persistConfig` 中配置 `version` 和 `migrate` 函数，每次发布通过版本号逐步迁移旧数据结构。

**踩过的坑**：把整个 `rootReducer` 全量持久化到 localStorage，结果某次上线改了 state 结构，用户浏览器里的旧结构导致 `REHYDRATE` 后应用白屏（类型不匹配）。修复：只 `whitelist: ['auth']` 持久化 token，其余状态每次启动从服务端重新获取；关键字段用版本号做迁移。

**项目选型**：选择 `redux-persist` 而非手写 `localStorage.setItem` 的原因是它自动处理序列化/反序列化、与 Redux 中间件集成、提供 `PersistGate` 延迟渲染和迁移机制——手写容易遗漏边界情况。

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


### 💬 面试深度

**标准回答**：MobX 是基于观察者模式的响应式状态管理库，核心理念是任何源自应用状态的东西都应自动获得。通过 `makeAutoObservable` 声明可观察状态，`computed` 自动缓存派生值，`observer` 包裹 React 组件实现精准重渲染——只有组件渲染期间实际读取的 observable 变化才会触发更新。与 Redux 的不可变范式不同，MobX 允许直接 mutate 状态，更接近 Vue 的响应式模型。

**追问预判**：
- Q: "MobX 的 `observer` 如何知道该重渲染哪个组件？" — `observer` 会在组件渲染时追踪哪些 observable 被读取（依赖收集），当这些 observable 变化时 MobX 精准通知对应组件，粒度细到属性级别。这比 Redux 的 selector + 浅比较更高效。
- Q: "MobX 的项目为什么不流行了？" — React 18 的并发特性（useTransition 等）与 MobX 的 mutable 数据模型存在兼容风险；同时 Redux Toolkit + RTK Query 大幅降低了 Redux 的样板代码，弥补了最大短板；此外 Zustand 等更轻量的方案也在蚕食 MobX 的市场。

**源码在哪**：核心在 `mobx` 包的 `src/core/observable.ts`、`src/core/derivation.ts`（computed），React 绑定在 `mobx-react-lite` 的 `src/observer.ts`。

**踩过的坑**：在 MobX strict 模式下忘记用 `action` 包裹异步回调中的状态修改，导致报错。MobX 默认要求所有 observable 修改必须在 action 内完成以保证变更可追踪和批量提交。修复：对异步回调中的赋值也用 `runInAction(() => { this.data = data })` 包裹。

**项目选型**：当项目有复杂的领域模型和大量派生计算（如仪表盘、实时数据看板）时选 MobX 而非 Redux，因为 computed 的自动依赖追踪和缓存比手动写 reselect selector 更自然高效。

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


### 💬 面试深度

**标准回答**：`useContext` 解决跨层级数据传递问题，但有一个关键性能陷阱——Provider value 变化会导致所有消费者重渲染，即使该消费者只用到了 value 中的某一个字段。解决方案是拆分 Context（如 ThemeContext + UserContext）或将 value 用 `useMemo` 包一层。`forwardRef` 配合 `useImperativeHandle` 则用于暴露子组件的命令式 API，比如表单校验、焦点控制——这在封装 UI 组件库时非常常见。

**追问预判**：
- Q: "Context 拆分到什么粒度算合适？" — 按更新频率和职责拆分：频繁变化的数据（如当前选中项）和基本不变的数据（如主题）不应放在同一个 Context；同时读操作和写操作也可以拆分为两个 Context（如 `ThemeValueContext` + `ThemeActionContext`），这样只需要写操作而不需要读最新值的组件就不会被写操作触发重渲染。
- Q: "`useImperativeHandle` 是否违背了 React 的数据流理念？" — 有一定程度，但它是逃生舱——当声明式方式无法满足需求时（如表单校验、滚动到某个位置、视频播放控制），用命令式 API 是必要的。关键是不滥用：能用 props/state 解决的优先声明式。

**源码在哪**：`useContext` 在 `packages/react-reconciler/src/ReactFiberHooks.js` 的 `readContext` 函数，`forwardRef` 在 `packages/react/src/ReactForwardRef.js`，`useImperativeHandle` 在 `packages/react-reconciler/src/ReactFiberHooks.js`。

**踩过的坑**：在一个大型表单中把整个表单状态（几十个字段）放进一个 Context，每次输入一个字符整个表单树 30+ 个字段组件全部重渲染，输入明显卡顿。修复：将表单拆分为多个子 Context（基本信息 Context、地址 Context、附件 Context），各自独立更新。

**项目选型**：对于跨组件表单校验需求，选择 `forwardRef` + `useImperativeHandle` 暴露校验方法而非全局状态管理——因为校验是命令式操作（submit 时触发一次），不需要作为状态驱动 UI 渲染。

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


### 💬 面试深度

**标准回答**：`useTransition` 和 `useDeferredValue` 都是 React 18 并发特性的核心 API，解决同一类问题——让高优先级更新（如用户输入）不被低优先级更新（如搜索结果渲染）阻塞。关键区别在控制权：`useTransition` 让你主动标记这个 setState 是非紧急的，适合你能直接控制状态更新的场景；`useDeferredValue` 则被动接收一个值并返回其滞后版本，适合值来自 props 或第三方 Hook 你无法控制其 setState 的场景。

**追问预判**：
- Q: "`useDeferredValue` 和 debounce/throttle 有什么区别？" — debounce 基于固定时间延迟（如 300ms），在延迟期间 UI 完全冻结不更新；`useDeferredValue` 基于 React 的并发调度，会在浏览器空闲时尽快完成滞后渲染，理论上响应更快且不会出现等 300ms 突然刷新的体验断层。
- Q: "什么场景不适合用 `useTransition`？" — 需要立即反馈的更新不应包裹在 `startTransition` 中（如输入框的值本身、按钮的 disabled 状态）；此外，`useTransition` 标记的更新仍会被更高优先级更新打断，如果你的非紧急更新必须完整执行（如支付流程），应使用 `flushSync`。

**源码在哪**：`useTransition` 在 `packages/react/src/ReactHooks.js` 的 dispatcher 中定义，实际调度逻辑在 `packages/react-reconciler/src/ReactFiberHooks.js` 和 `packages/scheduler/src/forks/Scheduler.js`（优先级调度）。

**踩过的坑**：在搜索场景中用 `useTransition` 包裹了 `setQuery`（输入框的值更新），导致输入框中文字显示延迟，用户感觉输入卡顿。正确做法：只把 `setSearchResults` 放在 `startTransition` 里，`setQuery` 保持同步更新。

**项目选型**：当搜索结果渲染耗时较大（>100ms）且有自己控制的搜索状态时用 `useTransition`（有 `isPending` 方便展示 loading）；当搜索关键词来自第三方组件（如 URL 参数、上层传入的 props）时用 `useDeferredValue`。

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


### 💬 面试深度

**标准回答**：React 19 的核心升级可以归纳为三点：一是 Server Components（RSC）正式稳定，让组件可以在服务端渲染并序列化后发送到客户端，大幅减少客户端 JS 体积；二是 Actions API（`useActionState`、`useFormStatus`、`useOptimistic`）让表单处理、loading 状态、乐观更新一体化为声明式写法；三是 DX 层面的简化——ref 可以直接作为 prop 传递不再需要 `forwardRef`，Context 可以直接用作 Provider 无需写 `.Provider`，`use()` hook 支持在渲染中直接读取 Promise 且可以条件调用。

**追问预判**：
- Q: "React 19 的 `use()` hook 和 `await` 有什么区别？" — `use()` 可以在组件渲染函数体中直接调用（类似 Hook），它会暂停组件渲染直到 Promise resolve，但 React 可以在此期间继续渲染其他组件。`await` 只能在 async 函数中使用，且会让整个 async 组件函数暂停。`use()` 还能条件调用，突破了传统 Hook 的限制。
- Q: "React 19 的 Server Components 是否意味着无需 CSR？" — 不是。RSC 和 CSR 是互补的：RSC 处理数据获取和静态内容渲染（在服务端），客户端组件负责交互（`onClick`、`useState` 等）。最佳实践是尽量把组件放在服务端，只在需要交互时添加 `use client` 指令。

**源码在哪**：React 19 的 `use()` 在 `packages/react/src/ReactHooks.js` 和 `packages/react-reconciler/src/ReactFiberHooks.js`；Server Components 在 `packages/react-server-dom-webpack` 和 `packages/react-server-dom-turbopack`。

**踩过的坑**：升级 React 19 后旧代码中大量的 `forwardRef` 虽仍能工作，但新加入的开发者看到文档说 ref 可以直接作为 prop 后混用了两种写法，导致代码风格不一致，Code Review 时出现混淆。修复：团队达成协议——新组件统一使用 ref prop 直传，旧组件逐步迁移；配置 ESLint 规则 `react/no-forward-ref`（warn 级别）提醒逐步消除。

**项目选型**：新项目直接选 React 19 而非停留在 18，因为 Actions API 和 `use()` 大幅简化了表单和异步数据处理代码，且向后兼容性良好，迁移成本极低。
