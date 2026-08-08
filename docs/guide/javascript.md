---
title: JavaScript 基础
description: 由浅入深——数据类型、类型转换、模块化、作用域闭包、this、原型链、new操作符、继承、深浅拷贝、防抖节流、柯里化、组合、记忆化、Promise、async/await、Proxy、大文件上传、手写实现
---

# JavaScript 基础

> 按知识依赖关系由浅入深排列：**语言基础 → 核心机制 → 实用技巧 → 异步编程 → 进阶特性 → 综合实战 → 文件处理实战**。后一章依赖前一章，建议顺序阅读。

---

## 一、语言基础

万丈高楼平地起。先搞清楚 JS 有哪些数据类型、怎么声明变量、日常写代码最常用的 ES6+ 语法。

### 1.1 数据类型

JavaScript 共有 **7 种基本类型**：`string`、`number`、`boolean`、`null`、`undefined`、`symbol`、`bigint`，按值存储于栈内存。引用类型（`Object`、`Array`、`Function` 等）按引用存储于堆内存，变量持有其地址。`typeof` 是判断基本类型的首选方式，但 `typeof null === 'object'` 是第一版 JS 遗留的著名 bug——`null` 在二进制标记中被识别为对象类型前缀 `000`。

```js
// 基本类型
typeof 'hello'     // 'string'
typeof 42          // 'number'
typeof true        // 'boolean'
typeof undefined   // 'undefined'
typeof Symbol()    // 'symbol'
typeof 123n        // 'bigint'
typeof null        // 'object' ← 历史 bug，JS 从未修复以避免破坏现有代码

// 引用类型
typeof {}          // 'object'
typeof []          // 'object'（须用 Array.isArray 区分）
typeof function(){}// 'function'（函数是特殊的对象）

// 精确判断
Object.prototype.toString.call([])   // '[object Array]'
Object.prototype.toString.call(null) // '[object Null]'
```

### 1.2 变量声明与暂时性死区（TDZ）

`var` 声明的变量会被提升到作用域顶部并初始化为 `undefined`，所以声明前访问不会报错。`let`/`const` 同样有提升，但进入**暂时性死区**（TDZ）——从块开始到声明行之间，变量存在但不可访问，访问会抛出 `ReferenceError`。`const` 额外要求声明时必须初始化且不能重新赋值（引用不可变，但对象属性仍可修改）。

```js
console.log(a)  // undefined（var 提升，初始化为 undefined）
var a = 1

console.log(b)  // ❌ ReferenceError（let 在 TDZ 中，不能访问）
let b = 2

// const 同样有 TDZ，且声明时必须初始化
const c = 3     // ✅
// c = 4        // ❌ TypeError: Assignment to constant variable
const obj = { x: 1 }
obj.x = 2       // ✅ const 限制的是变量绑定，不是值本身
```

### 1.3 ES6+ 常用语法

ES6（ES2015）及后续版本引入了大量实用特性。解构让从对象/数组中提取值变得简洁；模板字符串支持多行和 `${}` 插值；箭头函数简化了函数表达式且不绑定自己的 `this`（详见 [this 指向](#_2-2-this-指向)）；可选链 `?.` 安全访问深层属性；空值合并 `??` 只在 `null`/`undefined` 时使用默认值，比 `||` 更精确。

```js
// 解构
const { name, age } = user
const [first, ...rest] = [1, 2, 3, 4]   // first=1, rest=[2,3,4]

// 模板字符串
const msg = `Hello, ${name}. You are ${age} years old.`

// 箭头函数
const add = (a, b) => a + b
const greet = name => `Hi ${name}`

// 可选链 ?.
const city = user?.address?.city          // 任一中间值为 null/undefined 返回 undefined
const method = obj?.method?.()            // 安全调用可能不存在的方法

// 空值合并 ??
const val = input ?? 'default'            // input 为 null 或 undefined 时才用默认值
// vs ||
console.log(0 || 'fallback')             // 'fallback' —— 0 是 falsy
console.log(0 ?? 'fallback')             // 0 —— ?? 只拦截 null/undefined
```


### 💬 面试深度

**标准回答**：ES6（ES2015）及后续版本带来了大量实用特性。`let`/`const` 用块级作用域消除 `var` 的提升陷阱；箭头函数简化语法且从外层继承 `this`；解构让数据提取更简洁；模板字符串支持 `${}` 插值；可选链 `?.` 安全访问深层属性——遇到 `null`/`undefined` 短路返回；空值合并 `??` 只在 `null`/`undefined` 时使用默认值，比 `||` 更精确。这些特性在现代前端框架中已成为默认写法。

**追问预判**：
1. `?.` 和 `&&` 链式判断有什么区别？→ `?.` 精确短路 `null`/`undefined`，对 `0`/`''`/`false` 等合法 falsy 值正常访问；`&&` 对所有 falsy 值短路，语义过宽。另外 `?.` 不能用于赋值左侧（`obj?.key = x` 语法错误），且短路后不执行后续括号内表达式。
2. `??` 和 `||` 如何选择？→ `??` 只拦截 `null`/`undefined`，`||` 拦截所有 falsy 值。当 `0`、`''`、`false` 是合法业务值时必须用 `??`。例如：`count ?? 10`（count 为 0 保留 0），而 `count || 10` 会把 0 错误替换为 10。

**源码在哪**：这些是 ECMAScript 语言规范特性，由各引擎实现。可选链在 V8 解析器 `src/parsing/parser-base.h` 中处理为条件跳转字节码。

**踩过的坑**：用 `||` 给函数参数设默认值，把 `0` 和空字符串当成"未传"触发备用值，导致计算结果错误。修复：改用 `??` 或 ES6 默认参数语法 `function fn(count = 10) {}`——默认参数只对 `undefined` 触发，更精确。

**项目选型**：箭头函数 vs 普通函数 → 需要自己的 `this`（Vue methods、原型方法）用普通函数；不需要 `this` 或需继承外层 `this`（React 回调、数组 map/filter）用箭头函数。团队建议：能用箭头的地方优先箭头——更短、没有 `arguments` 副作用。

### 1.4 隐式类型转换

JS 是弱类型语言，运算符会自动触发类型转换。理解转换规则是避免 `[] == ![]` 这类面试陷阱的前提。

**ToPrimitive 抽象操作**：JS 引擎内部将对象转为原始值时，按以下顺序尝试：
1. 若 `Symbol.toPrimitive` 存在，调用它（优先级最高）
2. 否则根据 hint（`'number'` → `valueOf()` 优先；`'string'` → `toString()` 优先；`'default'` → 同 `'number'`）

```js
const obj = {
  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return 42
    if (hint === 'string') return 'hello'
    return 'default'
  }
}
console.log(+obj)       // 42      （hint='number'）
console.log(`${obj}`)   // 'hello' （hint='string'）
console.log(obj + '')   // 'default'（hint='default'）

// Date 特例：hint 默认 'string'
console.log(+new Date())  // 时间戳（hint='number' → valueOf()）
```

**`==` 比较规则**（面试重灾区）：

| 类型组合 | 转换规则 | 示例 |
|---------|---------|------|
| 对象 vs 非对象 | 对象 → ToPrimitive | `[1] == 1` → `'1' == 1` → `1 == 1` → `true` |
| 字符串 vs 数字 | 字符串 → 数字 | `'5' == 5` → `5 == 5` |
| 布尔 vs 任意 | 布尔 → 数字 | `true == 2` → `1 == 2` → `false` |
| null vs undefined | **互相相等**，不转换 | `null == undefined` → `true`；`null == 0` → `false` |
| 同类型 | 不转换 | `'x' == 'x'` |

```js
// 面试陷阱解析
console.log([] == ![])  // true
// ![] → false（[] 是 truthy）→ [] == false → [] == 0（布尔转数字）
// → '' == 0（[].toString() = ''）→ 0 == 0 → true

console.log([] == 0)           // true
console.log(null == 0)         // false（null 只与 undefined 宽松相等）
console.log(undefined == null) // true
```

**`+` 运算符的特殊性**：任何一端是字符串或对象（先 ToPrimitive）→ 字符串拼接；两端都是数字/布尔 → 数字加法。

```js
console.log(1 + '2')      // '12'   （一端字符串 → 拼接）
console.log(1 + 2 + '3')  // '33'   （先加后拼）
console.log([] + {})      // '[object Object]'
console.log(true + true)  // 2
```

### 1.5 浮点数精度

JS 采用 IEEE 754 双精度浮点数，二进制无法精确表示 0.1 和 0.2（它们是无限循环小数），截断产生舍入误差：

```js
console.log(0.1 + 0.2)          // 0.30000000000000004
console.log(0.1 + 0.2 === 0.3)  // false
```

| 解决方案 | 用法 | 适用场景 |
|---------|------|---------|
| 容差比较 | `Math.abs(a - b) < Number.EPSILON` | 一般计算 |
| 整数化运算 | `(0.1 * 10 + 0.2 * 10) / 10` | 固定小数位 |
| `toFixed` | `+(0.1 + 0.2).toFixed(2)` | 展示用 |
| 第三方库 | `decimal.js` / `big.js` | 金融计算 |

### 1.6 模块化：ESM vs CommonJS

| | ESM（ES Modules） | CommonJS |
|---|---|---|
| 语法 | `import` / `export` | `require()` / `module.exports` |
| 加载时机 | **编译时**静态分析 | **运行时**动态加载 |
| 导出绑定 | **动态绑定**（引用，随源模块变化） | **值拷贝**（导出的是值的副本） |
| Tree Shaking | ✅ | ❌ |
| this 顶层 | `undefined` | 指向 `module.exports` |
| 加载方式 | 异步 | 同步（阻塞） |

```js
// CommonJS：值拷贝 → count 变化不影响导入方
// counter.js
let count = 0
module.exports = { count, increment: () => { count++ } }
// main.js
const { count, increment } = require('./counter')
increment(); console.log(count)  // 0 ← 仍是 0！

// ─── vs ───

// ESM：动态绑定 → 导入方看到实时值
// counter.mjs
export let count = 0
export const increment = () => { count++ }
// main.mjs
import { count, increment } from './counter.mjs'
increment(); console.log(count)  // 1 ← 实时绑定
```

**动态 `import()`**：返回 Promise，支持按需加载和代码分割：

```js
button.onclick = async () => {
  const { default: _ } = await import('lodash')
  console.log(_.chunk([1, 2, 3, 4], 2))
}
```

**循环引用**：CommonJS 返回部分导出（已执行部分，后续属性为 `undefined`）；ESM 通过"模块环境记录"建立动态绑定，执行时自然解析——`import` 拿到的是"活的引用"，不会出现 `undefined`。

---

## 二、核心机制

语法会了还不够——面试真正考察的是你对 JS 运行机理的理解：闭包怎么工作的、`this` 到底指谁、原型链怎么串起来的。

### 2.1 作用域与闭包

**定义**：闭包 = 函数 + 其引用的外层词法环境，即使外层函数已执行完毕，内层函数仍能访问外层变量。ES6 之前只有全局作用域和函数作用域，`let`/`const` 引入了块级作用域。闭包的核心价值在于让变量私有化并保持存活。

```js
function createCounter() {
  let count = 0  // 被内部函数引用，不会被 GC
  return {
    increment: () => ++count,
    get: () => count
  }
}
const c = createCounter()
c.increment()  // 1
c.increment()  // 2
```

**应用**：模块化（IIFE）、柯里化、防抖节流、React 的 `useState` / Vue 的 `ref` 本质都是闭包。

**内存注意**：闭包会让被引用的外层变量无法被 GC 回收，不需要时置 `null` 释放引用。


### 💬 面试深度

**标准回答**：闭包是函数与其词法环境的绑定——即使外层函数已执行完毕并出栈，内层函数仍持有对外层变量的引用，使其不被 GC 回收。JS 引擎在函数创建时保存 `[[Environment]]` 内部属性指向外层词法环境，形成作用域链。闭包的核心价值是数据私有化（模块模式）和状态保持（计数器、缓存），在防抖节流、React Hooks、Vue Composition API 中无处不在。

**追问预判**：
1. 闭包会导致内存泄漏吗？如何排查？→ 会。当闭包引用大对象或已卸载的 DOM，且闭包本身一直存活（如挂全局变量、未清理的定时器），被引用对象将永不被 GC。排查方法：Chrome DevTools → Memory → Heap Snapshot → 在 Summary 视图中搜索 "closure" / "context"，展开即可看到闭包持有的具体变量。也可用 Performance 面板录制内存时间线，观察到持续增长而无回落。
2. 如何主动释放闭包内存？→ 将持有闭包的变量置为 `null` 切断引用链。定时器相关闭包要在不需要时 `clearTimeout`/`clearInterval`。DOM 事件监听器需用 `removeEventListener` 解绑。常见泄漏模式：`el.onclick = function() { /* 引用 el.parentNode... */ }` ——即使 el 被移除，闭包仍通过 parentNode 引用整个 DOM 树。

**源码在哪**：V8 中闭包实现涉及 `Context` 对象（存储变量）和 `Scope` 链，相关代码在 `src/ast/scopes.cc`（编译期作用域分析）和 `src/objects/contexts.cc`（运行期上下文对象）。每个函数对象有一个 `context` 槽位指向其创建的词法环境。

**踩过的坑**：在循环中用 `var` 声明变量并通过 `setTimeout` 闭包引用 `i`，所有闭包共享同一个 `i`（函数作用域），最终全部输出 5（而非 0,1,2,3,4）。根因：`var` 没有块级作用域，循环结束后 `i` 只有一个值。修复：① 改用 `let`（块级作用域，每次迭代创建新绑定）；② 用 IIFE 立即捕获当前值 `(function(j) { setTimeout(() => console.log(j)) })(i)`。

**项目选型**：闭包私有变量 vs ES2020 `#` 私有字段 → 闭包方案兼容性好（ES5），适合库/工具函数；新项目用 `#`——V8 有内联缓存优化，且 TypeScript 有完整的类型检查支持。

### 2.2 this 指向

`this` 的值由**调用方式**决定，不是定义时决定。优先级从高到低：`new` 绑定 > 显式绑定（`call`/`apply`/`bind`）> 隐式绑定（对象方法调用）> 默认绑定（严格模式 `undefined`，非严格 `window`）。箭头函数没有自己的 `this`，直接继承外层词法作用域的 `this`。

| 绑定方式 | 规则 | 示例 |
|---|---|---|
| 默认绑定 | 非严格模式 → `window`，严格模式 → `undefined` | `fn()` |
| 隐式绑定 | 谁调用指向谁 | `obj.fn()` → `this` = `obj` |
| 显式绑定 | `call` / `apply` / `bind` | `fn.call(ctx)` |
| new 绑定 | `new Fn()` → 新创建的对象 | `new Person()` |
| 箭头函数 | 没有自己的 `this`，继承外层词法作用域 | `() => this` |

```js
const obj = {
  name: 'obj',
  fn() { console.log(this.name) },
  arrow: () => console.log(this.name)  // 定义时外层 this（此处为 window）
}
obj.fn()     // 'obj'
obj.arrow()  // undefined（window.name，箭头函数继承外层）
```


### 💬 面试深度

**标准回答**：`this` 的值完全由调用方式决定，与定义位置无关。优先级从高到低：`new` 绑定（创建空对象并绑定）> 显式绑定（`call`/`apply`/`bind`）> 隐式绑定（`obj.fn()` → `obj`）> 默认绑定（严格模式 `undefined`，非严格 `window`）。箭头函数例外——没有自己的 `this`，定义时从外层词法作用域捕获，`call`/`apply`/`bind` 无法改变其 `this`。

**追问预判**：
1. `bind` 返回的绑定函数再用 `new` 调用，`this` 指向谁？→ `new` 优先级高于 `bind`。`new BoundFn()` 会创建一个新对象作为 `this`，忽略 `bind` 绑定的 `this`（但 `bind` 预设的参数仍然生效）。这是 ES 规范 §9.4.1.3 规定的：bound function 被 `[[Construct]]` 调用时，`this` 用 `new` 创建的对象替换。
2. 箭头函数适合做 Vue methods 吗？→ 不适合。Vue 会将 methods 中的函数 `this` 绑定到组件实例，但箭头函数从定义时捕获 `this`（此时可能是 `undefined` 或 `window`），`call`/`apply` 也无法覆盖。Vue 官方文档明确警告：不要用箭头函数定义 methods、computed、watch 等选项。

**源码在哪**：语言规范层面（ECMAScript §8.7），不是特定框架。V8 中 `this` 传递依赖 `CallIC`（内联缓存）和 `Builtins::Call` 的调用约定，实现在 `src/builtins/builtins-call.cc`。

**踩过的坑**：React Class 组件中，将方法作为事件回调传递但忘记 `.bind(this)`。方法内访问 `this.setState` 时报 `TypeError: Cannot read property 'setState' of undefined`——因为 class 内部默认严格模式，未绑定的 `this` 为 `undefined`。修复：构造函数中 `this.handleClick = this.handleClick.bind(this)`，或改用箭头函数类属性 `handleClick = () => { ... }`。

**项目选型**：`call` vs `apply` vs `bind` → 立即执行且参数逐个已知用 `call`；立即执行且参数是数组用 `apply`（如 `Math.max.apply(null, arr)`）；延迟执行/预设参数用 `bind`（如事件回调上下文绑定）。

### 2.3 原型链

每个 JavaScript 对象都有一个内部属性 `[[Prototype]]`（通过 `__proto__` 或 `Object.getPrototypeOf()` 访问），指向其构造函数的 `prototype` 对象。原型链就是沿 `__proto__` 向上查找直到 `null` 的机制——这是 JS 实现继承的基础。

```js
function Person(name) { this.name = name }
Person.prototype.say = function() { return `I'm ${this.name}` }

const p = new Person('fenglan')

// 原型链查找路径：
// p → Person.prototype → Object.prototype → null
p.say()           // 先在 p 自身找 → 没找到 → 沿 __proto__ 找到 Person.prototype
p.toString()      // p → Person.prototype → Object.prototype（找到）
p.xxx             // 沿链到头返回 undefined
```

**`instanceof` 原理**：沿 `__proto__` 链向上找构造函数的 `prototype`。

```js
p instanceof Person  // p.__proto__ === Person.prototype → true
p instanceof Object  // p.__proto__.__proto__ === Object.prototype → true
```


### 💬 面试深度

**标准回答**：原型链是 JavaScript 实现继承的核心机制。每个对象通过 `[[Prototype]]`（即 `__proto__`）指向其构造函数的 `prototype` 对象，属性查找沿这条链逐级向上，直到 `Object.prototype` → `null` 终止。`Object.prototype` 是所有普通对象的根原型，提供 `toString`、`hasOwnProperty` 等公共方法。构造函数上的 `prototype` 属性和实例上的 `__proto__` 是理解原型链的两条关键线索。

**追问预判**：
1. `instanceof` 的原理是什么？→ 沿着 `left.__proto__` 链逐级查找，看是否能匹配 `Right.prototype`。等价伪代码：`while (left = left.__proto__) { if (left === Right.prototype) return true; } return false;`。注意：跨 iframe / 不同 JS 上下文时 `instanceof` 会失效，因为每个上下文有独立的全局对象和 `Object.prototype`。
2. `Object.create(null)` 创建的对象有什么特点？→ 它的 `[[Prototype]]` 是 `null`，不继承 `Object.prototype` 的任何方法（`toString`、`hasOwnProperty`、`isPrototypeOf` 等全部不可用）。这使得它成为理想的"纯字典"——无原型属性污染风险，适合做哈希表、缓存映射。

**源码在哪**：V8 中原型链查找实现在 `src/objects/js-objects.cc` 的 `JSObject::GetProperty` 方法，核心是 `GetPropertyWithReceiver` 沿 prototype 链循环遍历。

**踩过的坑**：用 `for...in` 遍历对象属性做统计，结果多出了 `toString`、`hasOwnProperty` 等原型方法字段。原因：`for...in` 会沿原型链枚举所有可枚举属性（包括继承的）。修复：遍历体内加 `Object.hasOwn(obj, key)` 守卫，或直接改用 `Object.keys()` / `Object.entries()`（只返回自身可枚举属性）。

**项目选型**：原型继承 vs ES6 class → 库/框架底层用原型链（动态灵活、运行时修改、混入 mixin），业务代码用 class（语法清晰、`super` 直白、TypeScript 支持好、符合主流开发习惯）。

### 2.4 new 操作符原理

`new Fn(...)` 做了四件事：

1. 创建一个空对象
2. 将该对象的 `__proto__` 指向构造函数的 `prototype`
3. 以该对象为 `this` 执行构造函数
4. 若构造函数返回对象则用返回值，否则返回该对象

```js
function myNew(Ctor, ...args) {
  const obj = Object.create(Ctor.prototype)   // 1+2：创建对象 + 绑定原型
  const result = Ctor.apply(obj, args)        // 3：以 obj 为 this 执行构造
  return result instanceof Object ? result : obj  // 4：判断返回值
}

function Person(name) { this.name = name }
Person.prototype.say = function() { return this.name }
const p = myNew(Person, 'fenglan')
console.log(p.say())            // 'fenglan'
console.log(p instanceof Person) // true
```

> 面试追问：构造函数里 `return 1` 会怎样？→ 原始值被忽略，仍返回 `this`。只有 `return {}` / `return []` 等对象才替换。ES 规范 §9.2.2：`[[Construct]]` 只对 Object 类型返回值敏感。

### 2.5 ES5 继承方式全景

**原型链继承**：`Child.prototype = new Parent()`——所有实例共享引用属性，一改全改。

```js
function Parent() { this.colors = ['red'] }
function Child() {}
Child.prototype = new Parent()
const c1 = new Child(); c1.colors.push('blue')
const c2 = new Child(); console.log(c2.colors) // ['red', 'blue'] ← 共享了
```

**构造函数继承**：`Parent.call(this)`——解决引用共享，但方法不能复用（每个实例都新建一份）。

**组合继承**：原型链 + 构造函数——最通用，但调了两次 Parent（`call` + `new`）。

**寄生组合继承**（最终方案）：用 `Object.create` 只继承原型，不重复调用父构造函数：

```js
function Parent(name) { this.name = name }
Parent.prototype.say = function() { return this.name }

function Child(name, age) {
  Parent.call(this, name)          // 继承属性
  this.age = age
}
Child.prototype = Object.create(Parent.prototype) // 只继承原型
Child.prototype.constructor = Child               // 修正 constructor

const c = new Child('fenglan', 18)
console.log(c.say())             // 'fenglan'
console.log(c instanceof Parent) // true
```

| 方式 | 属性独立 | 方法复用 | 调父次数 | 推荐度 |
|------|---------|---------|---------|-------|
| 原型链继承 | ❌ 共享 | ✅ | 1 | ❌ |
| 构造函数继承 | ✅ | ❌ 每实例建 | 1 | ❌ |
| 组合继承 | ✅ | ✅ | **2** | ⚠️ |
| 寄生组合继承 | ✅ | ✅ | 1 | ✅✅✅ |

ES6 `class extends` 本质就是寄生组合继承的语法糖，额外处理了静态属性和 `super` 的调用链。

---

## 三、实用技巧

基础语法和核心机制都通了，现在来看看实际开发中最常用的两种工具函数——面试必问，日常必写。

### 3.1 深浅拷贝

浅拷贝只复制对象第一层属性，嵌套引用仍共享；深拷贝递归复制所有层级。`JSON.parse(JSON.stringify(obj))` 最简单但丢失 `undefined`、函数、`Symbol`、`Date`、`RegExp`，且无法处理循环引用。面试中需能手写递归深拷贝，借助 `WeakMap` 解决循环引用。

```js
// 浅拷贝：只复制一层
const shallow = { ...obj }          // 展开运算符
const shallow2 = Object.assign({}, obj)

// 深拷贝：JSON 方式（简单但有局限）
const deep = JSON.parse(JSON.stringify(obj))
// ❌ 丢失：函数、undefined、Symbol、Date、RegExp、循环引用

// 手写递归深拷贝（处理常见类型）
function deepClone(obj, map = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj
  if (map.has(obj)) return map.get(obj)           // 循环引用
  const clone = Array.isArray(obj) ? [] : {}
  map.set(obj, clone)
  for (const key of Object.keys(obj)) {
    clone[key] = deepClone(obj[key], map)
  }
  return clone
}
```

### 3.2 防抖（debounce）vs 节流（throttle）

防抖和节流都是高频事件性能优化手段。防抖在连续触发时只执行最后一次（适合搜索框输入、窗口 resize）；节流固定时间间隔执行一次（适合滚动加载、按钮防重复点击）。

| | 防抖（debounce） | 节流（throttle） |
|---|---|---|
| 行为 | 连续触发只执行最后一次 | 固定间隔执行一次 |
| 场景 | 搜索框输入、窗口 resize | 滚动事件、按钮点击 |

```js
// 防抖：n 秒内再次触发则重新计时
function debounce(fn, delay = 300) {
  let timer
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

// 节流：每 n 秒最多执行一次
function throttle(fn, delay = 300) {
  let last = 0
  return function (...args) {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      fn.apply(this, args)
    }
  }
}
```


### 💬 面试深度

**标准回答**：防抖和节流都是高频事件优化的闭包应用。防抖（debounce）的核心是"等你停下来"——每次触发重置计时器，n 秒无新触发才执行，适合搜索联想、窗口 resize 等关注最终结果的场景。节流（throttle）的核心是"固定节奏"——无论触发多频繁，每 n 秒最多执行一次，适合滚动加载、按钮防重复提交等关注过程的场景。

**追问预判**：
1. 防抖的"首次立即执行"版怎么实现？→ 加 `immediate` 参数控制：首次触发时立即执行 `fn.apply(this, args)`，同时设 `timer` 标记冷却期；冷却期内触发只重置定时器不执行；冷却期结束后重置。Lodash 的 `_.debounce(fn, wait, { leading: true })` 即为此行为。另可选 `trailing: true` 在最后一次触发后补执行。
2. 时间戳版和定时器版节流的区别？→ 时间戳版（`Date.now() - last`）首次立即执行，停止触发后不再执行；定时器版（`setTimeout`）首次延迟执行，停止触发后会再执行一次尾部调用。实际开发常结合两者：`{ leading: true, trailing: true }`，保证首次和最后一次都被处理。

**源码在哪**：Lodash 的 `debounce.js` 和 `throttle.js`，其中 throttle 本质是 `debounce` 设置了 `maxWait` 参数——在 debounce 内部同时跑一个时间戳限制保证最低频率。

**踩过的坑**：移动端滚动加载更多时用节流 300ms，但快速滑动时 `scrollTop` 在节流窗口内已大幅变化，闭包中捕获的旧值导致计算位置偏差，重复请求同一页。修复：在节流回调内重新获取最新 `scrollTop` 而非依赖闭包旧值；或用"标记位 + 请求完成后重置"替代节流。

**项目选型**：debounce vs throttle → 关注"最终结果"（搜索建议、resize 重排）用 debounce；关注"过程可控"（滚动加载进度、滑动百分比上报）用 throttle。不确定时，lodash `_.throttle(fn, wait, { leading: true, trailing: true })` 是安全默认——覆盖头尾。

### 3.3 函数柯里化（Currying）

柯里化把多参函数转为一系列单参函数的链式调用：`f(a, b, c)` → `f(a)(b)(c)`。核心是递归收集参数，攒够了就执行。

```js
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn.apply(this, args)
    return (...more) => curried(...args, ...more)
  }
}

const add = curry((a, b, c) => a + b + c)
console.log(add(1)(2)(3))    // 6
console.log(add(1, 2)(3))    // 6
console.log(add(1)(2, 3))    // 6
```

**实战场景**：日志函数固定前缀、表单校验规则复用：

```js
const log = curry((level, time, msg) => `[${level}] ${time} ${msg}`)
const errorLog = log('ERROR')(new Date().toISOString())
errorLog('连接超时')  // [ERROR] 2026-08-08T... 连接超时
```

### 3.4 偏函数（Partial Application）

偏函数是柯里化的"懒人版"——预填部分参数，剩下的后面再给。`Function.prototype.bind` 本质上就是偏函数。

```js
function partial(fn, ...preset) {
  return function (...later) {
    return fn.apply(this, [...preset, ...later])
  }
}

const multiply = (a, b, c) => a * b * c
const double = partial(multiply, 2)        // 固定第一个参数为 2
console.log(double(3, 4))                   // 24 (2*3*4)
console.log(double(5, 6))                   // 60 (2*5*6)
```

### 3.5 函数组合（Compose / Pipe）

把多个单参函数串联成一条流水线——上一个函数的输出是下一个的输入。`compose` 从右向左，`pipe` 从左向右。

```js
// compose：从右向左执行
const compose = (...fns) => x => fns.reduceRight((v, fn) => fn(v), x)

// pipe：从左向右执行
const pipe = (...fns) => x => fns.reduce((v, fn) => fn(v), x)

const add5 = x => x + 5
const double = x => x * 2
const square = x => x * x

const process = compose(square, double, add5)
console.log(process(3))  // square(double(add5(3))) = square(double(8)) = square(16) = 256

const process2 = pipe(add5, double, square)
console.log(process2(3)) // 256（结果相同）
```

**实战场景**：Redux 中间件、Lodash 的 `_.flow` / `_.flowRight`、数组/字符串处理链：

```js
const toSlug = pipe(
  s => s.toLowerCase(),
  s => s.replace(/[^a-z0-9]+/g, '-'),
  s => s.replace(/^-|-$/g, '')
)
console.log(toSlug('Hello World!!!'))  // 'hello-world'
```

### 3.6 记忆化（Memoization）

缓存函数计算结果，相同输入直接返回缓存值，避免重复计算。适合纯函数 + 计算昂贵的场景。

```js
function memoize(fn) {
  const cache = new Map()
  return function (...args) {
    const key = JSON.stringify(args)
    if (cache.has(key)) return cache.get(key)
    const result = fn.apply(this, args)
    cache.set(key, result)
    return result
  }
}

// 斐波那契：O(2^n) → O(n)
const fib = memoize(function(n) {
  if (n <= 1) return n
  return fib(n - 1) + fib(n - 2)
})
console.log(fib(40))  // 102334155，瞬间出结果

// 实战：React useMemo / Vue computed 的底层思想就是记忆化
```

> 面试追问：`JSON.stringify(args)` 做 key 有什么隐患？→ ① 参数有循环引用会报错；② `{a:1,b:2}` 和 `{b:2,a:1}` 算不同 key（需排序 key）；③ 大对象序列化慢。优化方案：限制缓存容量（LRU 淘汰）、用 `WeakMap` 对单参数场景做弱引用缓存。

---

## 四、异步编程

JS 是单线程的，但前端 90% 的复杂问题都跟异步有关。从 Promise 入门，到 Generator 理解暂停-恢复，最后到 async/await——这是 JS 异步的三层递进。

### 4.1 Promise

Promise 有三种状态：pending → fulfilled / rejected，状态不可逆。`.then()` 返回新 Promise 实现链式调用。`.catch()` 能捕获链上任意位置的错误。四个并发静态方法各有适用场景，面试高频。

```js
// 链式调用：then 返回新 Promise
fetchUser(id)
  .then(user => fetchOrders(user.id))
  .then(orders => render(orders))
  .catch(err => console.error(err))    // 任一环节出错都会进入 catch

// 并发控制
Promise.all([p1, p2, p3])              // 全部成功 → 结果数组；一个失败 → reject
Promise.allSettled([p1, p2, p3])       // 全部完成（无论成败）→ [{status, value/reason}]
Promise.race([p1, p2, p3])             // 第一个 settle 的结果
Promise.any([p1, p2, p3])              // 第一个 fulfilled；全 reject → AggregateError
```


### 💬 面试深度

**标准回答**：Promise 是 ES6 引入的异步编程核心方案——三态不可逆（pending → fulfilled / rejected），`.then()` 返回新 Promise 实现链式调用，`.catch()` 捕获链上任意位置错误。四个并发静态方法覆盖全部协作场景：`Promise.all`（全成功才成功，fail-fast）、`Promise.allSettled`（等全完成，不论成败）、`Promise.race`（取第一个 settled）、`Promise.any`（取第一个成功）。Promise 的本质是将"回调嵌套"变为"链式声明"，终结了回调地狱。

**追问预判**：
1. `.then(onFulfilled)` 返回一个 thenable 时 Promise 如何处理？→ 进入 Promise Resolution Procedure（`resolvePromise`）：检测返回值 `x`，如果 `x` 是对象/函数且有 `then` 方法，则调用 `x.then(resolve, reject)` 并**递归解析**，直到拿到非 thenable 的最终值。这意味着从 `.then` 返回任意 Promise 库的实例都能正确互操作——thenable 递归解析是 A+ 规范保证所有 Promise 实现兼容的核心设计。
2. `Promise.all` 一个失败全部挂，实际项目怎么办？→ 两个方案：① 改用 `Promise.allSettled`——等全部 settled 后返回 `[{status, value/reason}]`，按 status 分别处理成功和失败；② 给每个 Promise 提前 `.catch(err => ({ error: err }))` 兜底，让 `all` 永远不会 reject。

**源码在哪**：V8 源码在 `src/builtins/promise-all.tq`（PromiseAll）、`src/builtins/promise-race.tq`、`src/builtins/promise-all-element-closure.tq`（逐个收集结果的回调）。Promise/A+ 规范是面试金标准：https://promisesaplus.com/。

**踩过的坑**：批量请求 5 个接口用 `Promise.all`，其中一个因 DNS 解析失败 reject，其余 4 个成功的请求结果全部丢失，页面白屏。根因：`Promise.all` 的 fail-fast 语义——一旦 reject 立即短路，丢弃其余结果。修复：用 `Promise.allSettled`，过滤 `status === 'fulfilled'` 正常渲染，`rejected` 降级提示"部分数据加载失败"。

**项目选型**：`Promise.all` vs `Promise.allSettled` → 需全部成功才继续（多表单校验）用 `all`；允许部分失败（多数据源聚合、批量上报）用 `allSettled`。`Promise.race` 典型场景：`Promise.race([fetch('/api'), timeout(5000)])` 超时竞速。

### 4.2 迭代器与生成器

掌握了 Promise，你还需要理解 Generator——它是 async/await 的底层引擎。

实现了 `Symbol.iterator` 方法的对象就是可迭代对象（iterable），可被 `for...of`、展开运算符等消费。生成器函数（`function*`）返回一个迭代器对象，通过 `yield` 暂停执行，`next()` 恢复并传值——实现双向通信：`yield` 向外输出值，`next(arg)` 将参数作为上一个 `yield` 的返回值传入。

```js
// 迭代器协议
const iterable = {
  *[Symbol.iterator]() {
    yield 1
    yield 2
    yield 3
  }
}
for (const v of iterable) console.log(v)   // 1, 2, 3
console.log([...iterable])                 // [1, 2, 3]

// 生成器双向通信
function* gen() {
  const a = yield 'first'     // 先 yield 'first'，next('A') 将 'A' 赋给 a
  const b = yield a + ' second'
  return b
}
const g = gen()
console.log(g.next())         // { value: 'first', done: false }
console.log(g.next('A'))      // { value: 'A second', done: false }
console.log(g.next('B'))      // { value: 'B', done: true }
```

Generator 天然适合描述异步流程：用 `yield` 暂停等异步结果，拿到结果后继续执行。但每次都要手动调用 `.next()` 太麻烦——所以需要**自动执行器**，这正是下一节 async/await 的本质。

### 4.3 async/await

`async/await` 是 Generator + 自动执行器的语法糖，让异步代码看起来像同步代码。`async` 函数始终返回 Promise；`await` 暂停执行直到 Promise settled。错误处理用 `try/catch` 包裹 `await` 表达式，比 `.catch()` 更符合直觉。

```js
async function load() {
  try {
    const user = await fetchUser()      // 等待 Promise resolve
    const orders = await fetchOrders(user.id)
    return orders
  } catch (err) {
    // 捕获 await 中任意 reject
    console.error(err)
  }
}
// async 函数始终返回 Promise
```

**本质**：`async/await` 可以手动用 Generator 模拟——`yield` 代替 `await`，通过自动执行器（co）递归调用 `next()` 并将 value（Promise）resolve 后传回，实现暂停-恢复的执行流。完整的 co 实现见 [手写 async/await](#_6-2-手写-async-await)。

| 特性 | Generator + co | async/await |
|---|---|---|
| 暂停方式 | `yield promise` | `await promise` |
| 返回值 | co 返回 Promise | async 函数返回 Promise |
| 错误处理 | `try/catch` 捕获 `g.throw()` | `try/catch` 原生支持 |
| 执行器 | 手动引入 co 库 | JS 引擎内置 |
| 调度时机 | Promise.then 链 | 内置微任务队列，更精确 |


### 💬 面试深度

**标准回答**：`async/await` 本质是 Generator + 自动执行器（co）的语法糖。Generator 通过 `yield` 暂停执行，`next()` 恢复并将参数传回作为 `yield` 的返回值，实现双向通信。自动执行器递归调用 `next()`，当 `yield` 的 value 是 Promise 时等待其 resolve 后将值传回 Generator，实现"等待"效果。`async` 函数始终返回 Promise，`await` 等价于 `yield`，`try/catch` 通过 `g.throw(err)` 将 reject 抛入 Generator。引擎内置的 async/await 在微任务调度上比 co（Promise.then 链）更精确。

**追问预判**：
1. `await` 后面的代码在微任务中执行吗？→ 是的。`await xxx` 等价于 `Promise.resolve(xxx).then(res => { /* await 后面的代码 */ })`，await 恢复后的代码总是在微任务队列中执行——本轮事件循环的同步代码之后、下一个宏任务之前。
2. co 执行器的时间复杂度？→ 递归 `next()` 调用链 O(n)，n 为 `yield` 数量。每次 `next()` 追加一个 `.then()`，10 个 `await` 产生 10 层 Promise 嵌套。引擎层面的原生 async/await 做了微任务扁平化优化，不同于简单 polyfill。

**源码在哪**：V8 中 async/await 实现在 `src/builtins/builtins-async-gen.cc` 和 `src/builtins/builtins-async-function.cc`，核心是将 async 函数转换为内置执行器驱动的 Generator。co 库源码见 `tj/co`（GitHub 已归档）。

**踩过的坑**：在 `forEach` 回调中使用 `await`，以为会串行执行，结果所有请求同时发出，服务器瞬时被打爆。根因：`forEach(cb)` 内部同步调用 `cb()`，不等待 Promise——5 个请求并发而非期望的串行。修复：改用 `for...of`（原生支持 await 串行），或用 `await Promise.all(arr.map(async ...))` 显式表达并发意图。

**项目选型**：`async/await` vs `.then()` 链 → 多步顺序依赖、需清晰错误处理的场景用 `async/await`（一个 `try/catch` 包多个 `await`）；纯并发的简单场景用 `Promise.all().then()` 同样简洁。团队统一推荐 `async/await` + `try/catch` 风格。

---

## 五、进阶特性

基础扎实了，来看看 JS 中两个高级但实用的特性——Proxy 是 Vue 3 响应式的底层，WeakMap 是避免内存泄漏的利器。

### 5.1 Proxy 与 Reflect

`Proxy` 可拦截对目标对象的 13 种底层操作，包括 `get`、`set`、`has`、`deleteProperty`、`apply`、`construct` 等，是 Vue 3 响应式系统的底层基础。`Reflect` 提供与 Proxy trap 一一对应的默认行为方法，让代理内部转发操作更优雅，同时将命令式操作（如 `delete obj[key]`）转为函数式（`Reflect.deleteProperty(obj, key)`）。

```js
// Proxy 常见拦截
const handler = {
  get(target, key, receiver) {
    console.log(`读取 ${String(key)}`)
    return Reflect.get(target, key, receiver)   // 推荐用 Reflect 转发默认行为
  },
  set(target, key, value, receiver) {
    if (key === 'age' && typeof value !== 'number') {
      throw new TypeError('age 必须是数字')
    }
    return Reflect.set(target, key, value, receiver)
  }
}
const user = new Proxy({ name: 'fenglan', age: 18 }, handler)
user.name     // 触发 get → 输出 "读取 name"
user.age = 20 // 触发 set → 校验通过
// user.age = 'x' // ❌ TypeError

// 13 种 trap 一览：get, set, has, deleteProperty, ownKeys, getOwnPropertyDescriptor,
// defineProperty, preventExtensions, getPrototypeOf, setPrototypeOf, isExtensible,
// apply, construct
```

### 5.2 WeakMap 与 WeakSet

`WeakMap` 的键必须是对象，且对键的引用是**弱引用**——不计入 GC 引用计数。当键对象没有其他引用时，GC 可以回收它，`WeakMap` 中对应条目自动移除。这使其成为存储对象私有数据、缓存元信息的理想选择。`WeakSet` 同理，只能存对象且是弱引用。

```js
// WeakMap：键弱引用 → GC 友好
const wm = new WeakMap()
let obj = { id: 1 }
wm.set(obj, 'metadata')
obj = null  // 没有其他引用指向 { id: 1 } → GC 可回收，wm 中条目自动消失

// 典型场景：DOM 节点关联数据
// const nodeData = new WeakMap()
// nodeData.set(domElement, { clicks: 0 })
// 当 DOM 元素被移除且没有其他引用 → 数据自动 GC，无内存泄漏

// WeakSet：存对象引用，防重复 + 弱引用
const ws = new WeakSet()
let a = {}
ws.add(a)
ws.has(a)   // true
a = null    // GC 可回收
```

| 特性 | Map / Set | WeakMap / WeakSet |
|---|---|---|
| 键类型 | 任意值 | 仅对象 |
| 引用类型 | 强引用 | 弱引用（不影响 GC） |
| 可迭代 | ✅ `forEach`、`for...of` | ❌ 不可迭代（条目可能随时消失） |
| `size` 属性 | ✅ | ❌ |
| 典型场景 | 通用键值存储 | 对象元数据、私有属性、DOM 关联 |

---

## 六、综合实战

前面所有知识点的终点——手写 Promise 和 async/await。这是面试的终极考题，考察你是否真正理解了异步、状态机、链式调用和 Generator。

### 6.1 手写 MyPromise

手写 Promise 是面试极高频考点，考察对异步流程、状态管理、链式调用和微任务机制的深层理解。完整的 MyPromise 需要实现：三种状态管理、`then` 链式调用（then 必须返回新 Promise 以支持链式）、`catch`、异步执行（用 setTimeout 模拟微任务）、以及 `Promise.resolve` / `Promise.reject` / `Promise.all` / `Promise.race` 四个静态方法。

#### 三种状态（pending / fulfilled / rejected）

Promise 的核心是状态机：初始为 `pending`，成功调用 `resolve` 转为 `fulfilled`，失败调用 `reject` 转为 `rejected`。**状态一旦转换就不可逆**（pending → fulfilled 或 pending → rejected），这是 Promise 可靠性的基础。`resolve` 和 `reject` 内部需要判断当前状态是否为 `pending`，防止重复调用改变结果。

#### then 链式调用（返回新 Promise）

`.then(onFulfilled, onRejected)` 必须返回一个**新的 Promise**，这正是链式调用的根基——每个 `.then()` 返回新 Promise，下一个 `.then()` 注册在新 Promise 上。`then` 的回调返回值有三种情况需要处理：返回普通值（直接 resolve）、返回 Promise（等待其 settled 再 resolve/reject）、抛出异常（reject）。

#### 异步执行（setTimeout 模拟微任务）

规范要求 `onFulfilled` / `onRejected` 在微任务中执行，但手写实现无法直接创建微任务（`queueMicrotask` 在旧环境不可用），通常用 `setTimeout(fn, 0)` 模拟。核心思路：在 `then` 中将所有回调延迟到下一轮事件循环执行，保证即使 Promise 已 settled，回调也异步执行。

#### catch

`catch(onRejected)` 本质是 `.then(null, onRejected)` 的语法糖——只注册失败回调，不处理成功。实现时直接复用 `then` 方法即可。

#### Promise.resolve / Promise.reject

`Promise.resolve(value)` 将任意值包装为 resolved 的 Promise；如果传入的已经是 Promise 则直接返回。`Promise.reject(reason)` 返回一个 rejected 的 Promise，不管传入什么值都作为拒绝原因。

#### Promise.all / Promise.race

`Promise.all`：接收可迭代对象，全部 fulfilled 时 resolve 结果数组（保持输入顺序），任一 rejected 则立即 reject 第一个错误。`Promise.race`：接收可迭代对象，第一个 settled 的 Promise 直接决定最终状态。

| 静态方法 | 触发 resolve | 触发 reject | 适用场景 |
|---|---|---|---|
| `Promise.all` | 全部 fulfilled | 任一 rejected | 并行请求，全部成功才继续 |
| `Promise.race` | 第一个 settled | 第一个 settled | 超时竞速、多个数据源取最快 |
| `Promise.allSettled` | 全部 settled（不论成败） | 永不 reject | 批量请求不因个别失败中断 |
| `Promise.any` | 第一个 fulfilled | 全部 rejected | 多个备用源取第一个成功 |

#### 完整实现代码

```js
// ========== 状态常量 ==========
const PENDING   = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED  = 'rejected'

class MyPromise {
  constructor(executor) {
    this.state = PENDING          // 当前状态
    this.value = undefined        // resolve 值 / reject 原因
    this.onFulfilledCallbacks = [] // 成功回调队列
    this.onRejectedCallbacks  = [] // 失败回调队列

    const resolve = (value) => {
      // 只有 pending 才可转换状态（状态不可逆）
      if (this.state !== PENDING) return
      this.state = FULFILLED
      this.value = value
      // 依次执行所有已注册的成功回调
      this.onFulfilledCallbacks.forEach(fn => fn())
    }

    const reject = (reason) => {
      if (this.state !== PENDING) return
      this.state = REJECTED
      this.value = reason
      this.onRejectedCallbacks.forEach(fn => fn())
    }

    try {
      executor(resolve, reject)   // 立即执行 executor
    } catch (err) {
      reject(err)                 // executor 同步抛错 → reject
    }
  }

  // ----- then：返回新 Promise，实现链式调用 -----
  then(onFulfilled, onRejected) {
    // 值穿透：如果未传回调，提供默认透传函数
    onFulfilled = typeof onFulfilled === 'function'
      ? onFulfilled
      : value => value
    onRejected = typeof onRejected === 'function'
      ? onRejected
      : reason => { throw reason }

    // then 必须返回新 Promise
    const promise2 = new MyPromise((resolve, reject) => {

      // 包装回调：根据返回值 x 决定 promise2 的状态
      const handleFulfilled = () => {
        // setTimeout 模拟微任务异步执行
        setTimeout(() => {
          try {
            const x = onFulfilled(this.value)
            // 根据 x 的类型决定如何 settle promise2
            resolvePromise(promise2, x, resolve, reject)
          } catch (err) {
            reject(err)
          }
        }, 0)
      }

      const handleRejected = () => {
        setTimeout(() => {
          try {
            const x = onRejected(this.value)
            resolvePromise(promise2, x, resolve, reject)
          } catch (err) {
            reject(err)
          }
        }, 0)
      }

      // 根据当前状态决定注册还是立即执行
      if (this.state === FULFILLED) {
        handleFulfilled()
      } else if (this.state === REJECTED) {
        handleRejected()
      } else {
        // pending：将回调入队，等 resolve/reject 时再执行
        this.onFulfilledCallbacks.push(handleFulfilled)
        this.onRejectedCallbacks.push(handleRejected)
      }
    })

    return promise2
  }

  // ----- catch：语法糖，等同于 then(null, onRejected) -----
  catch(onRejected) {
    return this.then(null, onRejected)
  }

  // ----- finally：无论成功失败都执行（ES2018）-----
  finally(onFinally) {
    return this.then(
      value  => MyPromise.resolve(onFinally()).then(() => value),
      reason => MyPromise.resolve(onFinally()).then(() => { throw reason })
    )
  }

  // ========== 静态方法 ==========

  static resolve(value) {
    // 如果已经是 MyPromise 实例，直接返回
    if (value instanceof MyPromise) return value
    return new MyPromise(resolve => resolve(value))
  }

  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason))
  }

  static all(promises) {
    return new MyPromise((resolve, reject) => {
      const results = []
      let count = 0
      const arr = Array.from(promises) // 兼容可迭代对象

      if (arr.length === 0) return resolve([]) // 空数组直接 resolve

      arr.forEach((p, index) => {
        // 非 Promise 值用 resolve 包裹
        MyPromise.resolve(p).then(
          value => {
            results[index] = value // 按原顺序存放
            count++
            if (count === arr.length) resolve(results)
          },
          reason => reject(reason) // 任一失败立即 reject
        )
      })
    })
  }

  static race(promises) {
    return new MyPromise((resolve, reject) => {
      Array.from(promises).forEach(p => {
        MyPromise.resolve(p).then(resolve, reject)
        // 第一个 settled 的 Promise 直接调用 resolve/reject
        // 后续调用无效（状态已锁定）
      })
    })
  }

  static allSettled(promises) {
    return new MyPromise((resolve) => {
      const results = []
      let count = 0
      const arr = Array.from(promises)
      if (arr.length === 0) return resolve([])

      arr.forEach((p, index) => {
        MyPromise.resolve(p).then(
          value => { results[index] = { status: 'fulfilled', value };   count++; if (count === arr.length) resolve(results) },
          reason => { results[index] = { status: 'rejected', reason }; count++; if (count === arr.length) resolve(results) }
        )
      })
    })
  }
}

// ========== Promise 解析过程（then 回调返回值的处理）==========
function resolvePromise(promise2, x, resolve, reject) {
  // 如果 x 和 promise2 是同一个引用 → 循环引用错误
  if (promise2 === x) {
    return reject(new TypeError('Chaining cycle detected'))
  }

  // 如果 x 是 MyPromise 实例，沿用其状态
  if (x instanceof MyPromise) {
    return x.then(resolve, reject)
  }

  // 如果 x 是对象或函数（thenable 检测）
  if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    let called = false // 防止 resolve/reject 被多次调用
    try {
      const then = x.then
      if (typeof then === 'function') {
        then.call(x,
          y => {
            if (called) return
            called = true
            resolvePromise(promise2, y, resolve, reject) // 递归解析
          },
          r => {
            if (called) return
            called = true
            reject(r)
          }
        )
      } else {
        resolve(x) // 普通对象，直接 resolve
      }
    } catch (err) {
      if (called) return
      called = true
      reject(err)
    }
  } else {
    // 普通值：直接 resolve
    resolve(x)
  }
}
```

#### 关键设计要点

| 设计点 | 说明 |
|---|---|
| 状态不可逆 | `resolve` / `reject` 内部先检查 `state === PENDING` |
| 回调队列 | pending 时 `.then()` 的回调存入数组，状态变更后批量执行 |
| then 返回新 Promise | 链式调用的根基，每个 `.then()` 都创建新的 MyPromise |
| `resolvePromise` | 处理 then 回调返回值 x 的完整逻辑：循环引用检测 → MyPromise 识别 → thenable 识别 → 普通值 |
| `called` 防重入 | thenable 中防止 `resolve` / `reject` 被调用多次 |
| 值穿透 | `then()` 未传回调时提供默认函数，值沿链透传 |
| 异步执行 | `setTimeout(fn, 0)` 模拟微任务，保证回调异步执行 |


### 💬 面试深度

**标准回答**：手写 Promise 考察对 Promise/A+ 规范的深度理解。核心三要素：① 状态机三态不可逆（pending → fulfilled / rejected）；② `then()` 必须返回新 Promise——每个 `.then()` 创建新的 MyPromise、注册回调到新实例上，这是链式调用的根基；③ `resolvePromise` 处理 thenable 递归解析——检测返回值 `x`，递归展开 thenable 直到拿到普通值，是 A+ 规范最复杂也是最体现设计深度的部分。`Promise.all` 通过计数器 + 按索引存储保证顺序；`Promise.race` 利用状态不可逆保证只取第一个 settle。

**追问预判**：
1. 时间复杂度分析？→ `then` 链调用 O(n)——每个 `.then()` 追加一个 Promise 对象和回调。`Promise.all` 整体 O(n)——遍历输入数组，每个 Promise 注册一个 `.then()`，结果按索引存储（数组随机访问 O(1)）。`Promise.race` 也是 O(n) 单次遍历。`Promise.allSettled` 同 `all` 为 O(n)。空间复杂度：`Promise.all/allSettled` 需 O(n) 结果数组；pending 状态下 `.then()` 的回调队列在最坏情况下也需 O(n) 空间（全部 then 注册在 pending 时）。
2. `resolvePromise` 中 `called` 标志位为什么必要？→ 防止 thenable 对象的 `then` 方法不规范，同时调用 `resolve` 和 `reject`（A+ 规范 §2.3.3.3.3 要求只取第一次调用）。如果不用 `called`，恶意或错误的 thenable 可能导致 Promise 状态反复翻转，破坏不可逆约定。这也考察你是否读过规范全文而不只是代码。

**源码在哪**：本文件 `## 六、综合实战` 节即为完整实现（对应规范 A+）。V8 中真实 Promise 实现在 `src/builtins/promise-all.tq`、`promise-race.tq`、`promise-all-element-closure.tq` 等文件（Torque 语言）。

**踩过的坑**：`Promise.all` 一个接口超时 reject，其余 4 个成功结果全部丢失。同时手写实现时忘了处理 `Promise.all([])` 空数组边界——规范要求空数组直接 resolve `[]`，漏掉这个细节面试官一眼看出对规范不熟。修复：业务层用 `allSettled`；手写时在 `all` 开头加 `if (arr.length === 0) return resolve([])`。

**项目选型**：手写 Promise vs 原生 Promise → 生产环境永远用原生 Promise（V8 深度优化、微任务调度精确、DevTools 调试支持），手写仅用于面试和理解异步原理。需要取消/超时能力时推荐 `AbortController` + `fetch`。

### 6.2 手写 async/await

`async/await` 是 JavaScript 异步编程的终极方案，本质是 **Generator + 自动执行器** 的语法糖。理解其原理需要掌握三块知识：Generator 函数的暂停/恢复机制、自动执行器（co）如何递归驱动 Generator、以及 async/await 如何在这两者之上提供更简洁的语法。

#### Generator 函数基础

Generator（`function*`）是能中途暂停并恢复执行的函数。调用 `function*` 不执行函数体，而是返回一个迭代器对象。调用迭代器的 `.next()` 执行到下一个 `yield` 并暂停，返回 `{ value, done }`；再次 `.next(arg)` 恢复执行，`arg` 会成为上一个 `yield` 的返回值——这是双向通信的关键。

Generator 天然适合描述异步流程：用 `yield` 暂停等异步结果，拿到结果后继续执行。但问题是：每次都要手动调用 `.next()`，如果有 10 个 `yield` 就要写 10 次 `.next()`——所以需要**自动执行器**。

#### 自动执行器 co 实现

自动执行器的核心思路：递归调用 `.next()`，每次拿到 `{ value, done }`，如果 `value` 是 Promise 就等它 resolve 后再 `.next(result)` 把值传回去；如果 `done === true` 则结束。这个模式就是著名的 **co** 库的实现原理。

co 做了几件事：① 执行 Generator 拿到迭代器；② 递归调用 `next`，每次将 Promise 结果传回作为上一个 `yield` 的返回值；③ 遇到 reject 则抛出错误（Generator 内部可用 `try/catch` 捕获）。

#### async/await = Generator + 自动执行器

`async function` 等价于 `co(function* () { ... })`。`async` 函数始终返回 Promise（co 返回 Promise）；`await xxx` 等价于 `yield xxx`（等待 Promise settle 后拿值继续）。区别在于 async/await 是语言级支持，内置微任务调度，而 Generator + co 是 polyfill 方案。

#### 完整实现代码

```js
// ============================================================
// 第一部分：Generator 基础演示
// ============================================================
function* simpleGen() {
  console.log('1. 开始执行')
  const a = yield '第一次暂停'   // yield 向外输出，next(arg) 将 arg 赋给 a
  console.log(`2. 收到参数: ${a}`)
  const b = yield '第二次暂停'
  console.log(`3. 收到参数: ${b}`)
  return 'done'
}

const sg = simpleGen()
console.log(sg.next())         // { value: '第一次暂停', done: false }
console.log(sg.next('hello'))  // { value: '第二次暂停', done: false }
console.log(sg.next('world'))  // { value: 'done', done: true }


// ============================================================
// 第二部分：模拟异步场景 — Generator + 手动执行
// ============================================================
function fetchData(id) {
  return new Promise(resolve => {
    setTimeout(() => resolve(`数据-${id}`), 500)
  })
}

function* fetchFlow() {
  const data1 = yield fetchData(1)   // yield 一个 Promise
  console.log('拿到:', data1)
  const data2 = yield fetchData(2)
  console.log('拿到:', data2)
  return data1 + ' + ' + data2
}

// 手动执行（繁琐）
const ff = fetchFlow()
ff.next().value.then(d1 => {
  ff.next(d1).value.then(d2 => {
    console.log('手动执行结果:', ff.next(d2).value)
  })
})


// ============================================================
// 第三部分：自动执行器 co 实现
// ============================================================
function co(gen, ...args) {
  return new Promise((resolve, reject) => {
    const g = gen(...args) // 执行 Generator，拿到迭代器

    // 递归的 next 函数：驱动 Generator 自动前进
    function next(lastValue) {
      let result
      try {
        result = g.next(lastValue) // 推进到下一个 yield
      } catch (err) {
        return reject(err)
      }

      const { value, done } = result

      if (done) {
        // Generator 执行完毕，resolve 最终值
        return resolve(value)
      }

      // 否则 value 应该是一个 Promise（或 thenable）
      // 等它 resolve 后把结果传回 Generator
      Promise.resolve(value).then(
        res => next(res),  // 递归：用 Promise 结果驱动下一步
        err => g.throw(err) // Promise reject → 抛入 Generator 供 try/catch 捕获
      )
    }

    next() // 启动执行器
  })
}

// 使用 co 改写 fetchFlow
co(fetchFlow).then(result => {
  console.log('co 自动执行结果:', result)
  // 输出：
  // 拿到: 数据-1
  // 拿到: 数据-2
  // co 自动执行结果: 数据-1 + 数据-2
})


// ============================================================
// 第四部分：async/await — Generator + co 的语法糖
// ============================================================
// 上面的 fetchFlow + co(fetchFlow) 等价于：

async function asyncFlow() {
  const data1 = await fetchData(1)  // await ≡ yield
  console.log('async 拿到:', data1)
  const data2 = await fetchData(2)
  console.log('async 拿到:', data2)
  return data1 + ' + ' + data2      // async 函数自动返回 Promise
}

// asyncFlow() 等价于 co(fetchFlow)


// ============================================================
// 第五部分：带错误处理的完整示例
// ============================================================
function* flowWithError() {
  try {
    const data = yield Promise.reject(new Error('请求失败'))
    console.log(data) // 不会执行
  } catch (err) {
    console.log('Generator 内部捕获:', err.message)
    return '降级数据'
  }
}

co(flowWithError).then(console.log)
// 输出：
// Generator 内部捕获: 请求失败
// 降级数据

// async/await 等价写法
async function asyncWithError() {
  try {
    const data = await Promise.reject(new Error('请求失败'))
    console.log(data)
  } catch (err) {
    console.log('async 内部捕获:', err.message)
    return '降级数据'
  }
}
```

#### co 执行流程图解

```
co(generator) 调用
  │
  ▼
const g = generator()          ← 拿到迭代器
  │
  ▼
next()                         ← 首次调用
  │
  ├─ g.next(undefined)         ← 推进到第一个 yield
  │    │
  │    ├─ done === true?  ───→ resolve(value)  ← Generator 结束
  │    │
  │    └─ done === false  ← value 是 Promise
  │           │
  │           ▼
  │    Promise.resolve(value).then(
  │      res => next(res),      ← 递归，res 成为下一个 yield 的返回值
  │      err => g.throw(err)    ← Promise reject → Generator 内部抛错
  │    )
  │           │
  │           └──→ 回到 next() 循环
  ▼
```

#### 核心理解总结

| 概念 | 角色 |
|---|---|
| Generator（`function*`） | 提供"暂停 + 恢复"的执行能力，`yield` 暂停，`next()` 恢复 |
| co 自动执行器 | 递归调用 `next()`，自动等待 Promise resolve 后传值回 Generator |
| async/await | Generator + co 的语言级实现，`await` = `yield`，引擎内置执行器 |
| 错误处理 | co 通过 `g.throw(err)` 将 Promise reject 抛入 Generator，`try/catch` 可捕获 |
| 返回值 | co 和 async 都返回 Promise，Generator `return` 的值成为 Promise resolve 值 |

**一句话总结**：`async/await` 让异步代码写起来像同步，底层是 Generator 暂停-恢复 + Promise 异步等待的融合——Generator 负责"同步感"（暂停等结果），自动执行器负责"自动推进"（不等你手动 next），Promise 负责"异步"（不阻塞主线程）。


### 💬 面试深度

**标准回答**：`async/await` 本质是 Generator + 自动执行器（co）的语法糖。Generator 通过 `yield` 暂停执行，`next()` 恢复并将参数传回作为 `yield` 的返回值，实现双向通信。自动执行器递归调用 `next()`，当 `yield` 的 value 是 Promise 时等待其 resolve 后将值传回 Generator，实现"等待"效果。`async` 函数始终返回 Promise，`await` 等价于 `yield`，`try/catch` 通过 `g.throw(err)` 将 reject 抛入 Generator。引擎内置的 async/await 在微任务调度上比 co（Promise.then 链）更精确。

**追问预判**：
1. `await` 后面的代码在微任务中执行吗？→ 是的。`await xxx` 等价于 `Promise.resolve(xxx).then(res => { /* await 后面的代码 */ })`，await 恢复后的代码总是在微任务队列中执行——本轮事件循环的同步代码之后、下一个宏任务之前。
2. co 执行器的时间复杂度？→ 递归 `next()` 调用链 O(n)，n 为 `yield` 数量。每次 `next()` 追加一个 `.then()`，10 个 `await` 产生 10 层 Promise 嵌套。引擎层面的原生 async/await 做了微任务扁平化优化，不同于简单 polyfill。

**源码在哪**：V8 中 async/await 实现在 `src/builtins/builtins-async-gen.cc` 和 `src/builtins/builtins-async-function.cc`，核心是将 async 函数转换为内置执行器驱动的 Generator。co 库源码见 `tj/co`（GitHub 已归档）。

**踩过的坑**：在 `forEach` 回调中使用 `await`，以为会串行执行，结果所有请求同时发出，服务器瞬时被打爆。根因：`forEach(cb)` 内部同步调用 `cb()`，不等待 Promise——5 个请求并发而非期望的串行。修复：改用 `for...of`（原生支持 await 串行），或用 `await Promise.all(arr.map(async ...))` 显式表达并发意图。

**项目选型**：`async/await` vs `.then()` 链 → 多步顺序依赖、需清晰错误处理的场景用 `async/await`（一个 `try/catch` 包多个 `await`）；纯并发的简单场景用 `Promise.all().then()` 同样简洁。团队统一推荐 `async/await` + `try/catch` 风格。

---

## 七、文件处理实战

### 7.1 大文件上传

面试高频场景题，考察 File API、并发控制、错误恢复的全局设计能力。核心流程：

```
用户选文件 → 计算文件 hash → 询问服务端已传分片（秒传/断点）
→ 只传未完成的分片 → 全部传完 → 通知服务端合并
```

**分片切割**：用 `Blob.slice()` 切成固定大小块（通常 1-5MB）：

```js
function createChunks(file, chunkSize = 2 * 1024 * 1024) {
  const chunks = []
  let start = 0
  while (start < file.size) {
    chunks.push(file.slice(start, start + chunkSize))
    start += chunkSize
  }
  return chunks
}
```

**文件 Hash**（秒传和断点续传的根基）：用 `SparkMD5` 或 Web Crypto API 算文件指纹：

```js
const chunk = file.slice(start, end)
const buffer = await chunk.arrayBuffer()
const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
const hash = Array.from(new Uint8Array(hashBuffer))
  .map(b => b.toString(16).padStart(2, '0')).join('')
```

**并发上传 + 断点续传**：

```js
async function uploadChunks(chunks, fileHash, onProgress) {
  // 1. 询问服务端已传了哪些分片（断点续传）
  const uploaded = await fetch(`/api/check?hash=${fileHash}`).then(r => r.json())
  // 2. 只构建未传分片的上传任务
  const tasks = chunks.map((chunk, i) => {
    if (uploaded.includes(i)) return null
    const form = new FormData()
    form.append('chunk', chunk)
    form.append('hash', fileHash)
    form.append('index', i)
    form.append('total', chunks.length)
    return () => fetch('/api/upload', { method: 'POST', body: form })
  })
  // 3. 并发控制（3 个并行，避免浏览器连接数耗尽）
  await parallelLimit(tasks.filter(Boolean), 3, onProgress)
  // 4. 通知服务端合并分片
  await fetch('/api/merge', {
    method: 'POST',
    body: JSON.stringify({ hash: fileHash, total: chunks.length }),
    headers: { 'Content-Type': 'application/json' }
  })
}
```

**并发控制工具函数**：

```js
async function parallelLimit(tasks, limit, onProgress) {
  let completed = 0
  const running = new Set()
  for (const task of tasks) {
    const p = task().then(res => {
      running.delete(p); completed++; onProgress?.(completed, tasks.length); return res
    })
    running.add(p)
    if (running.size >= limit) await Promise.race(running) // 等最快完成再推下一个
  }
  await Promise.all(running) // 等剩余的全部完成
}
```

| 关键点 | 方案 |
|--------|------|
| 秒传 | 文件 hash 命中 → 直接返回成功，零流量 |
| 断点续传 | 从服务端拿已传分片列表，跳过已完成的 |
| 并发控制 | 限制 3-5 个并行，避免浏览器连接数耗尽（同域 6 个上限） |
| 进度 | `(已完成 / 总分片) * 100`，分片粒度即进度粒度 |
| 失败重试 | 单分片失败重试 3 次，整体失败则降级串行 |
| 大文件 hash | Web Worker 中计算，避免卡主线程；或用 `file.stream()` 增量 hash |
| 内存 | `Blob.slice()` 不复制数据，零额外内存开销 |

### 7.2 文件下载与 Blob

```js
// 下载后端返回的二进制数据
async function download(url, filename) {
  const res = await fetch(url)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)  // ⚠️ 必须释放，否则 blob: URL 常驻内存
}

// 纯前端生成并下载
const csv = 'name,age\nfenglan,18'
const blob = new Blob([csv], { type: 'text/csv' })
const url = URL.createObjectURL(blob)
// 同上：创建 <a> 触发下载 → revokeObjectURL
```

`URL.createObjectURL()` 创建指向 Blob/File 的临时 URL（格式 `blob:https://...`），**用完必须 `revokeObjectURL()`**，否则 Blob 不会被 GC，持续泄漏内存。
