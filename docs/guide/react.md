---
title: React
description: React Hooks、Fiber 架构、React 18 新特性复习
---

# React 生态

## 必会基础 ⭐⭐⭐

- [ ] Hooks 核心：`useState` / `useEffect` / `useCallback` / `useMemo` / `useRef`
- [ ] 闭包陷阱与解决方案（`useRef` 保存最新值）
- [ ] 组件通信：props / Context / 状态管理（Zustand / Redux Toolkit）
- [ ] JSX 本质：`React.createElement` → 虚拟 DOM

## 进阶考点 ⭐⭐

- [ ] **Fiber 架构**：可中断渲染、优先级调度、双缓冲树
- [ ] **React 18**：Concurrent Mode、`useTransition`、`useDeferredValue`、自动批处理
- [ ] `React.memo` / `useMemo` / `useCallback` 优化原理与滥用风险
- [ ] 虚拟 DOM Diff：同层对比、key 的意义、O(n) 复杂度
- [ ] 错误边界（Error Boundary）与 Suspense 协同

## `useEffect` vs `useLayoutEffect`

| | `useEffect` | `useLayoutEffect` |
|---|---|---|
| 执行时机 | 浏览器绘制**之后**（异步） | DOM 更新后、绘制**之前**（同步） |
| 适用场景 | 数据请求、订阅、日志 | 读取/修改 DOM 尺寸、避免闪烁 |
| 性能 | 不阻塞渲染 | 阻塞浏览器绘制 |

## 闭包陷阱

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

## React 18 自动批处理

```tsx
// React 17：setTimeout 内的两次更新触发两次渲染
// React 18：自动批处理，只触发一次渲染 ✅
setTimeout(() => {
  setCount(c => c + 1)
  setFlag(f => !f)
}, 1000)

// 需要立即渲染时退出批处理
import { flushSync } from 'react-dom'
flushSync(() => setCount(c => c + 1))
```
