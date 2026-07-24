---
title: A 组：技术基础题
description: 10 道技术基础模拟面试题及参考答案
---

# A 组：技术基础题（10 题）

## Q1：Vue 3 相比 Vue 2 的核心改进是什么？

**参考答案**：

1. **响应式系统**：从 `Object.defineProperty` 改为 `Proxy`，可以检测属性新增/删除，支持数组索引修改
2. **Composition API**：逻辑复用从 Mixin 改为 `composables`，避免命名冲突与来源不清晰
3. **性能优化**：静态标记（PatchFlag）跳过不变节点；静态提升减少 VNode 创建；Block Tree 减少 Diff 范围
4. **TypeScript**：Composition API 对 TS 类型推导更友好
5. **Tree-shaking**：全局 API 改为命名导出，未使用的功能不打包

---

## Q2：解释 JavaScript 中的原型链和继承

**参考答案**：

- 每个对象有 `__proto__` 指向其构造函数的 `prototype`，形成原型链
- 属性查找沿链向上，直到 `null`（`Object.prototype.__proto__`）
- ES6 `class` 是语法糖，底层仍是原型链

```js
class Animal { speak() { return 'sound' } }
class Dog extends Animal { speak() { return 'woof' } }
const d = new Dog()
// d.__proto__ === Dog.prototype
// Dog.prototype.__proto__ === Animal.prototype
```

---

## Q3：描述 Promise、async/await 的工作原理及错误处理

**参考答案**：

- Promise 有三种状态：pending / fulfilled / rejected，状态不可逆
- `async/await` 是 Promise 的语法糖，底层是生成器 + 自动执行器
- 错误处理：`try/catch` 包裹 `await`，或在 Promise 链末尾加 `.catch()`
- `Promise.all` 并发（一个失败全失败）/ `Promise.allSettled` 并发（等全部结束）

---

## Q4：Webpack 和 Vite 各自的打包原理及优缺点

见 [工程化 → Vite vs Webpack 核心差异](/guide/engineering)

---

## Q5：React Hooks 解决了什么问题？

**参考答案**：

- 解决了 Class 组件的三个痛点：复杂的生命周期逻辑分散、this 绑定困惑、逻辑复用（HOC/Mixin 的嵌套地狱）
- `useState` / `useEffect` / `useContext` 让函数组件拥有状态与副作用能力
- 自定义 Hook（`useXxx`）实现逻辑复用，干净且可组合

---

## Q6：从输入 URL 到页面渲染全过程

**参考答案**：

1. **DNS 解析**：域名 → IP（浏览器缓存 → 系统缓存 → DNS 服务器）
2. **TCP 握手**：三次握手建立连接（HTTPS 还需 TLS 握手）
3. **HTTP 请求**：发送 GET 请求，服务器返回 HTML
4. **HTML 解析**：构建 DOM 树；遇到 CSS 阻塞 → 构建 CSSOM；遇到 `<script>` 阻塞（除非 `defer`/`async`）
5. **渲染树**：DOM + CSSOM → Render Tree → Layout → Paint → Composite
6. **资源加载**：图片、JS、CSS 并行请求（HTTP/2 多路复用）

---

## Q7：什么是 BFC，有哪些实际应用？

**参考答案**：

BFC（块级格式化上下文）是一个独立渲染区域，内部元素布局不影响外部。

**触发条件**：`display: flow-root`（推荐）/ `overflow: hidden` / `float` / `position: absolute/fixed`

**应用场景**：
1. 清除浮动（父容器塌陷问题）
2. 防止 margin 塌陷（兄弟/父子 margin 合并）
3. 多栏布局防止重叠

---

## Q8：解释 JavaScript 的事件循环机制

**参考答案**：

JS 单线程，通过 Event Loop 处理异步：
1. 执行同步代码（调用栈）
2. 同步执行完毕，取出一个**宏任务**（setTimeout / setInterval）执行
3. 宏任务执行完，**清空所有微任务**（Promise.then / MutationObserver）
4. 浏览器渲染（UI 更新）
5. 回到步骤 2

```js
console.log('1')
setTimeout(() => console.log('2'), 0)
Promise.resolve().then(() => console.log('3'))
console.log('4')
// 输出：1 → 4 → 3 → 2
```

---

## Q9：浏览器重排和重绘的区别，如何优化？

**参考答案**：

| | 重排（Reflow） | 重绘（Repaint） | 合成（Composite） |
|---|---|---|---|
| 触发 | 几何属性变化（宽高、位置） | 颜色/背景变化 | transform / opacity |
| 开销 | 最大 | 中等 | 最小（GPU） |

**优化策略**：
- 批量修改 DOM（`DocumentFragment` / 先离线修改再插入）
- 使用 `transform` 代替 `top/left` 做动画
- 避免逐个读取会触发重排的属性（`offsetWidth`），改用变量缓存
- `will-change: transform` 提升为合成层

---

## Q10：Node.js 的 `process.nextTick` vs `setImmediate` 的区别

见 [Node.js & 数据库 → nextTick vs setImmediate](/guide/nodejs)
