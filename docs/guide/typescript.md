---
title: TypeScript
description: TS 泛型、工具类型、类型体操、tsconfig 配置
---

# TypeScript

## 必会基础 ⭐⭐⭐

### 基础类型 / 联合类型 / 交叉类型 / 字面量类型

TypeScript 在 JS 基础类型之上增加了 `void`、`never`、`unknown`、`enum`、`tuple` 等。联合类型（`|`）表示值可为多种类型之一，交叉类型（`&`）将多个类型合并为一个。字面量类型将具体值作为类型约束，常与联合类型配合实现"枚举式"入参校验。

```ts
// 基础类型
let str: string = "hello"
let num: number = 42
let flag: boolean = true
let arr: number[] = [1, 2, 3]
let tuple: [string, number] = ["age", 18]

// 联合类型 & 字面量类型
type Direction = "left" | "right" | "up" | "down"
function move(dir: Direction) { /* ... */ }

// 交叉类型
type A = { name: string }
type B = { age: number }
type C = A & B // { name: string; age: number }
```

### `interface` vs `type` 的区别与选择

二者都能描述对象形状，核心差异在于：`interface` 支持声明合并（同名 interface 自动合并），适合对外暴露的公共 API；`type` 支持联合/交叉/映射类型，更灵活，适合工具类型和复杂类型组合。日常开发优先 `interface`，需要联合类型或映射类型时用 `type`。

| 对比项 | `interface` | `type` |
|---|---|---|
| 声明合并 | ✅ 支持 | ❌ 不支持 |
| 联合/交叉类型 | ❌ | ✅ |
| 映射类型 | ❌ | ✅ |
| 扩展方式 | `extends` | `&` 交叉类型 |
| 推荐场景 | 对象形状、对外 API | 联合类型、工具类型 |

```ts
// interface 声明合并
interface User { name: string }
interface User { age: number }
// 最终 User = { name: string; age: number }

// type 联合 & 映射
type Status = "loading" | "success" | "error"
type Readonly<T> = { readonly [K in keyof T]: T[K] }
```

### 泛型：函数泛型 / 接口泛型 / `extends` 约束 / 条件类型

泛型让函数、接口、类在定义时不指定具体类型，调用时再传入，实现"类型参数化"。`extends` 可约束泛型参数必须满足某个形状；条件类型 `T extends U ? X : Y` 则根据类型关系分发，是工具类型的底层基石。

```ts
// 函数泛型
function identity<T>(arg: T): T { return arg }

// extends 约束
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length
}

// 接口泛型
interface ApiResponse<T> {
  code: number
  data: T
}

// 条件类型：根据 T 是否 extends U 来决定类型
type IsString<T> = T extends string ? true : false
type A = IsString<"hello"> // true
type B = IsString<42>      // false
```

### `as const` / `satisfies`（TS 4.9+）

`as const`（const 断言）将对象/数组所有字段收窄为只读字面量类型，避免类型拓宽。`satisfies`（TS 4.9）在确保满足某类型的同时保留最精确的字面量推导，解决了"既要约束又要精确类型"的痛点。

```ts
// as const：类型收窄为字面量
const config = { mode: "dark", version: 1 } as const
// config 类型: { readonly mode: "dark"; readonly version: 1 }

// satisfies：校验类型但保留精确推导
type Theme = { mode: "dark" | "light" }
const theme = { mode: "dark" } satisfies Theme
// theme.mode 类型仍是 "dark"，而非 "dark" | "light"
```

### 工具类型：`Partial` / `Required` / `Pick` / `Omit` / `Record`

内置工具类型基于映射类型 + 条件类型实现，用于批量转换对象类型。`Partial` 将所有属性变可选，`Required` 变必填，`Pick`/`Omit` 按需选取或排除键，`Record` 以联合类型为键构建新对象类型。

```ts
type MyPartial<T>    = { [K in keyof T]?: T[K] }
type MyRequired<T>   = { [K in keyof T]-?: T[K] }
type MyPick<T, K extends keyof T> = { [P in K]: T[P] }
type MyOmit<T, K extends keyof T> = { [P in Exclude<keyof T, K>]: T[P] }
type MyRecord<K extends string | number | symbol, V> = { [P in K]: V }

// 使用示例
interface User {
  id: number
  name: string
  email: string
}
type PartialUser = Partial<User>       // 全部可选
type UserPreview = Pick<User, "id" | "name"> // 只取 id + name
type Role = "admin" | "user" | "guest"
type RoleMap = Record<Role, string>    // { admin: string; user: string; guest: string }
```

### 💬 面试深度

**标准回答**：TypeScript 的核心价值是"编译时发现问题，而不是运行时炸锅"。泛型是类型系统的"函数"——它让类型参数化，保持类型信息在调用链中不丢失；用 `any` 等于放弃检查，用泛型则每一环都能推导。日常开发中，能用 `interface` 描述对象形状就用 `interface`（支持声明合并、错误提示更友好），需要联合类型或映射类型时切到 `type`。五个常用工具类型——`Partial`、`Required`、`Pick`、`Omit`、`Record`——应该烂熟于心，它们覆盖了 80% 的 DTO 转换场景，用内置工具类型代替手写映射能显著减少维护成本。

**追问预判**：

1. **"泛型和 any 到底差在哪？什么时候必须用泛型？"**——泛型在调用链中保留类型信息：`identity<string>("hello")` 返回 `string`，链式调用时类型一路透传；而 `any` 进来就"失忆"了，后面全变成 `any`，编译器不再帮你检查。当你需要"入参类型和返回值类型有关联"时，就必须用泛型，比如 `axios.get<User[]>()` 让响应 `data` 自动推导为 `User[]`。

2. **"`Pick` 和 `Omit` 什么时候用哪个？"**——原则是"哪个代码少用哪个"：保留的字段少就用 `Pick<User, "id" | "name">`，排除的字段少就用 `Omit<User, "password">`。另外 `Omit` 不会检查你排除的 key 是否真的存在（TS 为了灵活性放弃了这一点），这是常见的坑。

**源码在哪**：`Partial`/`Required`/`Pick`/`Omit`/`Record`/`Exclude`/`Extract`/`NonNullable` 等全部内置工具类型定义在 TypeScript 源码 `src/lib/es5.d.ts` 中（安装后在 `node_modules/typescript/lib/lib.es5.d.ts` 可查看）。

**踩过的坑**：用 `enum` 定义状态枚举——

```ts
enum Status { Loading, Success, Error }
```

编译后产生 IIFE 代码（`var Status; (function(Status){...})(Status || (Status={}))`），既增加包体积又破坏 tree-shaking。更致命的是，`Status[0]` 能反过来拿到 `"Loading"`（双向映射），这在大多数业务场景下是多余的。**修复**：用 `const enum`（编译时内联，零运行时开销）或直接用 union type `type Status = "loading" | "success" | "error"`。`const enum` 的坑是跨库引用时如果关闭了 `isolatedModules` 或用了 babel 编译可能消失，所以库作者建议用 union type。

**项目选型**：为什么 React 项目不用 PropTypes 而用 TypeScript？——PropTypes 只在开发模式运行时抛 warning，用户浏览器里不会报但也不会阻止打包部署；TS 在编译时就拦截错误，根本不让你 build 出来。**编译时检查 > 运行时警告**，前者是安全带，后者是出了车祸才响的警报。

## 进阶考点 ⭐⭐

### `infer` 类型推断：函数返回值、Promise 内部类型

`infer` 只能在条件类型的 `extends` 子句中使用，用于在模式匹配中"捕获"某个位置的类型变量。常见场景：提取函数返回值（`ReturnType`）、Promise 内部类型（`Awaited`）、数组元素类型、函数参数类型等。

```ts
// 提取 Promise 的 resolved 类型
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T

// 提取函数第一个参数
type FirstArg<T extends (...args: any) => any> =
  T extends (first: infer F, ...rest: any) => any ? F : never

// 提取数组元素类型
type ElementType<T> = T extends (infer E)[] ? E : never

// 提取函数返回值
type MyReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : never
```

### 声明文件：`.d.ts` / `declare module` / `declare global`

`.d.ts` 文件为 JS 库提供类型描述，不包含可执行代码。`declare module` 可为第三方模块或无类型模块声明类型；`declare global` 在模块化文件中扩展全局作用域（如给 `Window`、`String` 挂载方法）。

```ts
// 为无类型的 npm 包声明模块
declare module "*.css" {
  const content: Record<string, string>
  export default content
}

// 扩展全局类型（需在模块文件内）
declare global {
  interface Window {
    __APP_VERSION__: string
  }
}

// 扩展已有模块的类型
declare module "vue" {
  interface ComponentCustomProperties {
    $formatDate: (date: Date) => string
  }
}
```

### `tsconfig.json` 核心：`strict` / `paths` / `moduleResolution`

`strict: true` 一次性开启全部严格检查（`strictNullChecks`、`noImplicitAny` 等），是类型安全的基础保障。`paths` 配合 `baseUrl` 实现路径别名映射（如 `@/utils` → `src/utils`）。`moduleResolution` 控制模块解析策略：`node` 模拟 Node.js 查找，`bundler` 适配 Vite/Webpack 等打包器。

```json
{
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "moduleResolution": "bundler",
    "target": "ES2022",
    "module": "ESNext"
  }
}
```

> `strict: true` 包含的子选项：`strictNullChecks`、`strictFunctionTypes`、`strictBindCallApply`、`strictPropertyInitialization`、`noImplicitAny`、`noImplicitThis`、`alwaysStrict`。

### 类型守卫：`is` / `typeof` / `instanceof` / `in`

类型守卫在运行时缩小类型范围，让 TS 在后续分支中自动推导更精确的类型。`typeof` 用于原始类型判断，`instanceof` 用于类实例，`in` 检查属性存在，`is` 关键字定义自定义类型谓词函数。

```ts
// typeof 守卫
function pad(value: string | number) {
  if (typeof value === "number") {
    return value.toFixed(2) // 此处 value: number
  }
  return value.padStart(5)  // 此处 value: string
}

// instanceof 守卫
function handleError(err: Error | string) {
  if (err instanceof Error) {
    console.log(err.message)
  }
}

// 自定义 is 守卫
interface Cat { meow(): void }
interface Dog { bark(): void }
function isCat(animal: Cat | Dog): animal is Cat {
  return "meow" in animal
}
```

### 💬 面试深度

**标准回答**：`infer` 是类型体操的"瑞士军刀"——它在条件类型的模式匹配中占位，让你能把深层嵌套的类型抽出来。比如 `ReturnType` 用 `infer R` 抽出函数返回值，`Awaited` 用递归 `infer` 剥开层层 Promise。类型守卫则是"运行时分岔口"：`typeof`/`instanceof`/`in` 是最常用的三种，自定义 `is` 谓词让你写可复用的类型收窄函数。声明文件是 TS 生态的"粘合剂"——当你引用的 JS 库没有自带类型时，`declare module` 是救命稻草。

**追问预判**：

1. **"条件类型的分配律是什么？`T extends U ? X : Y` 什么时候会'分发'？"**——当 `T` 是一个裸泛型联合类型（如 `T = string | number`，且 `T` 没有被 `[]`、`{}` 等包裹），条件类型会对联合的每个成员分别求值再把结果联合起来。这就是 **distributive conditional types（分配条件类型）**。例如 `string | number extends string ? true : false` 会分发为 `(string extends string ? true : false) | (number extends string ? true : false)` = `true | false` = `boolean`。如果想"阻止分发"，用元组包裹：`[T] extends [string] ? true : false`。这个特性是 `Exclude`、`Extract` 等工具类型的实现基础。

2. **"`declare global` 和 `declare module` 有什么区别？什么时候用哪个？"**——`declare module` 用来声明某个模块的类型（覆盖已有模块或给 .css/.png 等非代码文件声明类型），文件不需要是模块化的。`declare global` 用来扩展全局命名空间（如 `Window`、`String.prototype`），**必须在 `export {}` 存在的模块文件中使用**，否则 TS 会认为文件本身就在全局作用域，`declare global` 就多余了。

**源码在哪**：`ReturnType`、`Awaited`、`Parameters`、`ConstructorParameters`、`InstanceType` 等条件类型工具定义在 `node_modules/typescript/lib/lib.es5.d.ts`；`typeof`/`instanceof`/`in` 类型守卫的逻辑在 TypeScript 编译器源码 `src/compiler/checker.ts` 的 `getNarrowedType` / `narrowTypeByTypeof` 等函数中。

**踩过的坑**：写了一个自定义 `is` 类型守卫，但谓词类型写错了——

```ts
function isString(value: unknown): value is string {
  return typeof value === "string"
}
```

这里没问题，但这个坑常见在：你在守卫里做了类型检查，但谓词声明比实际检查更"宽"——

```ts
function isNonEmpty<T>(arr: T[]): arr is [T, ...T[]] {
  return arr.length > 0  // 运行时正确，但 TS 不会帮你验证谓词是否和逻辑一致
}
```

TS 对 `is` 谓词不做校验——你完全可以说 `value is string` 但实际检查的是 `typeof value === "number"`，编译器照单全收。后果是你获得了一个"撒谎"的类型收窄，后续代码按错误类型使用直接崩。**修复**：把 `is` 谓词当"对编译器的承诺"——承诺了就要确保运行时逻辑完全匹配，必要时加单元测试覆盖守卫函数。

**项目选型**：为什么用 `infer` 写递归工具类型而不是手动声明每种情况？——当你需要处理任意嵌套深度（比如 `Promise<Promise<User>>` 剥成 `User`），递归 `infer` + 条件类型是唯一方案。手写 N 层是死路——你永远不知道上游 API 会包几层 Promise。

## 类型体操 ⭐⭐⭐

### 条件类型进阶：分配律、`never` 陷阱、阻止分发

条件类型的核心机制是 **distributive conditional types**：当检查类型是裸泛型参数（`T extends U ? X : Y`，`T` 未被包裹），TS 会将联合类型"分发"到每个成员上。这意味着 `T extends any ? T[] : never` 对 `T = string | number` 的结果是 `string[] | number[]`，而非 `(string | number)[]`。要阻止分发，用元组包裹：`[T] extends [any] ? T[] : never`。

`never` 是联合类型的"零元"：`never | string = string`，所以条件类型中返回 `never` 的成员会被自动过滤——这正是 `Exclude` 的实现原理。

```ts
// 分配律示例
type ToArray<T> = T extends any ? T[] : never
type R1 = ToArray<string | number> // string[] | number[]（分发了）

type ToArrayNoDist<T> = [T] extends [any] ? T[] : never
type R2 = ToArrayNoDist<string | number> // (string | number)[]（未分发）

// never 陷阱
type IsNever<T> = T extends never ? true : false
type R3 = IsNever<never> // never！因为 never 分发时直接消失，什么都不匹配
// 正确写法：阻止分发
type IsNeverSafe<T> = [T] extends [never] ? true : false
type R4 = IsNeverSafe<never> // true ✅
```

### 模板字面量类型 + `infer` 模式匹配

TS 4.1 起模板字面量类型允许在类型层面拼接、拆分字符串。结合 `infer` 和条件类型，可以实现字符串解析、路由参数提取、驼峰/下划线转换等。

```ts
// 提取路由参数
type RouteParams<T extends string> =
  T extends `${string}:${infer P}/${infer Rest}`
    ? { [K in P]: string } & RouteParams<`/${Rest}`>
    : T extends `${string}:${infer P}`
      ? { [K in P]: string }
      : {}

type Params = RouteParams<"/user/:id/post/:postId">
// { id: string } & { postId: string }

// 字符串替换
type Replace<
  S extends string,
  From extends string,
  To extends string
> = From extends ""
  ? S
  : S extends `${infer L}${From}${infer R}`
    ? `${L}${To}${R}`
    : S
type R = Replace<"hello world", "world", "TS"> // "hello TS"
```

### 实战工具类型：`DeepPartial` / `DeepReadonly` / 递归 `Omit`

实际项目中经常需要对嵌套对象递归应用工具类型。`DeepPartial` 将对象所有层级变为可选，`DeepReadonly` 深度只读。关键在于对每个属性判断是否为对象类型，若是则递归。

```ts
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T

type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T

// 递归 Omit（去掉嵌套 key）
type DeepOmit<T, K extends string> = T extends object
  ? Omit<{ [P in keyof T]: DeepOmit<T[P], K> }, K>
  : T

interface Config {
  db: { host: string; port: number; password: string }
  cache: { host: string; ttl: number; password: string }
}
type SafeConfig = DeepOmit<Config, "password">
// password 在所有层级都被移除
```

### 💬 面试深度

**标准回答**：类型体操的核心是"用类型系统表达运行时约束"。三个关键机制：条件类型的分配律（distributive conditional types）——裸泛型联合类型会分发到每个成员；`infer` 模式匹配——像正则捕获组一样从类型中提取子类型；模板字面量类型——在类型层面拼接和解析字符串。这三个组合起来基本能实现任何类型转换需求。实际工作中不需要炫技，能用 `DeepPartial` 处理嵌套配置对象、用模板字面量类型约束路由字符串、用 `Exclude`/`Extract` 做联合类型筛选，就覆盖了绝大多数业务场景。

**追问预判**：

1. **"`never` 在条件类型中有什么特殊行为？为什么 `IsNever<never>` 返回 `never`？"**——因为分配条件类型会把 `never` 当作"空联合类型"对待，分发时直接消失——没有成员可以分发，所以整个条件类型返回 `never`。这就是为什么判断 `never` 必须用 `[T] extends [never]` 阻止分发。另外 `never` 是联合类型的 identity 元素（`never | T = T`），所以 `Exclude<string | never, never>` = `string`，不会多出奇怪的东西。

2. **"什么时候该写递归工具类型，什么时候不该？"**——当你的数据结构深度是可预测且有限的（比如 API 配置对象最多 3-5 层），递归工具类型是合理的。但当深度不确定（比如任意 JSON），TS 的递归深度限制（默认 50 层）会报错，而且深层递归的性能开销不可忽略。实际项目中优先写 2-3 层的显式类型、用泛型默认值设上限，而不是无脑递归到底。

**源码在哪**：TypeScript 编译器处理条件类型分配的核心逻辑在 `src/compiler/checker.ts` 的 `getConditionalType` 函数（约 1000+ 行）；模板字面量类型的推导和拼接由同一文件的 `getTemplateLiteralType` 处理。`lib.es5.d.ts` 里的 `Exclude`/`Extract`/`NonNullable` 是分配条件类型的最佳教材——一共三行代码。

**踩过的坑**：用条件类型给 API 响应写了一个"根据 status 字段推导 data 类型"的工具——

```ts
type Response<T extends { status: string }> =
  T["status"] extends "ok" ? { data: T } : { error: string }
```

本意是根据 `status` 是 `"ok"` 还是其他返回不同结构，但实际上 `T["status"]` 不是裸类型参数，TS **不会对 `T["status"]` 做分配**——所以当 `status` 是 `"ok" | "error"` 时，整个条件类型走的是 `false` 分支。**修复**：把判断挪到裸类型参数上，用两个泛型分步处理——先 `extends { status: "ok" }` 走一个 overload，否则走另一个。复杂条件类型优先用函数重载 + 具体类型匹配，而不是在一个条件类型里套娃。

**项目选型**：为什么写 `DeepPartial` 而不是用 `Partial` 多套几层？——配置对象的嵌套层级可能变化，`Partial<{ db: Partial<{...}> }>` 写死了层级且容易漏掉新增的嵌套字段。`DeepPartial` 一次定义，所有层级自动覆盖，新增字段自动适配。

## TS 配置与工程化 ⭐⭐

### 严格模式逐项拆解

`strict: true` 开启 7 个子选项，每个都有独立的语义：

| 选项 | 检查内容 | 关闭风险 |
|---|---|---|
| `strictNullChecks` | `null`/`undefined` 不能赋值给其他类型 | "Cannot read property of null" 运行时错误 |
| `noImplicitAny` | 禁止自动推导为 `any` | 类型污染扩散，失去检查 |
| `strictFunctionTypes` | 函数参数逆变检查 | 类型安全漏洞 |
| `strictBindCallApply` | `bind`/`call`/`apply` 参数检查 | 误传参数不报错 |
| `strictPropertyInitialization` | 类属性必须在构造函数初始化 | 访问未初始化的属性 |
| `noImplicitThis` | `this` 不能隐式 `any` | 回调中 `this` 指向错误 |
| `alwaysStrict` | 输出 `"use strict"` | 非严格模式的静默错误 |

```ts
// strictNullChecks 关闭时以下代码不报错，但运行时报错
const users = new Map<number, string>()
const name = users.get(1) // string | undefined，但关闭 strictNullChecks 推导为 string
name.toUpperCase() // 💥 运行时 TypeError
```

### 模块解析策略：`node` vs `classic` vs `bundler`

`moduleResolution` 决定 TS 如何找到 `.ts`/`.d.ts` 文件：

- **`node`**：模拟 Node.js 的 `require.resolve`，查找 `node_modules`、自动补全 `.ts`/`.d.ts`、支持 `package.json` 的 `types`/`typings` 字段。
- **`classic`**：TS 原始策略，仅在当前目录和上级目录查找，基本不用。
- **`bundler`**（TS 5.0+）：为 Vite/Webpack/esbuild 等打包器设计，允许省略文件扩展名、支持 `package.json` 的 `exports` 字段，但不要求 TypeScript 扩展名（`.ts`/`.tsx`）显式写出。

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolvePackageJsonExports": true
  }
}
```

> 注意：`bundler` 模式下不能在 `import` 中写 `.ts`/`.tsx` 扩展名，因为打包器会报错；但 `node` 模式下写不写扩展名都行。

### 三斜线指令与 references 项目引用

三斜线指令（`/// <reference path="..." />`）是 TS 早期引入类型声明的方式，现代项目基本用 `import` 替代。但 `/// <reference types="..." />` 仍有使用场景——在 `.d.ts` 文件中引入全局类型包。

项目引用（`tsconfig.json` 中的 `references` 字段）用于 monorepo 中拆分 TS 项目，每个子包有独立 `tsconfig.json`，通过 `references` 建立依赖图，实现增量编译。

```json
// 根 tsconfig.json
{
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/utils" }
  ]
}

// packages/core/tsconfig.json
{
  "compilerOptions": { "composite": true },
  "include": ["src"]
}
```

### 发布与兼容：`declaration` / `declarationMap` / `skipLibCheck`

- **`declaration`**：生成 `.d.ts` 文件，发布 npm 包时的必需选项，否则用户无法获得类型提示。
- **`declarationMap`**：生成 `.d.ts.map`，让 IDE "跳转到定义"时跳转到源码 `.ts` 而不是声明文件。
- **`skipLibCheck`**：跳过 `node_modules` 中所有 `.d.ts` 的类型检查，大幅提升编译速度。风险：如果某个库的类型定义有错误且你依赖了错误部分，编译时不会报错，运行时才暴露。

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "skipLibCheck": true,
    "outDir": "dist"
  }
}
```

### 💬 面试深度

**标准回答**：TS 工程化的三个关键词：严格模式、模块解析、类型产出。`strict: true` 是底线——关掉任何一个子选项都会产生类型盲区，`strictNullChecks` 关了最常见，但也是 "Cannot read property of null" 的头号来源。`moduleResolution: "bundler"` 是 TS 5.0 后 Vite/Webpack 项目的标配，它支持 `package.json` 的 `exports` 字段且不强制 `.ts` 扩展名。发布 npm 包时 `declaration: true` + `declarationMap: true` 是标配，前者给用户类型提示，后者让用户能 Ctrl+Click 跳到你源码。

**追问预判**：

1. **"`skipLibCheck` 该不该开？有什么 trade-off？"**——能开就开，编译速度提升显著（大型项目 30-50%）。但前提是：你的代码不依赖第三方库类型定义中的"错误类型"。如果某个库的类型有 bug 且你的公共 API 暴露了这个类型，`skipLibCheck` 会让你蒙在鼓里。折中方案：CI 里跑一次完整检查，开发时用 `skipLibCheck`。

2. **"project references 和 npm workspace / pnpm workspace 有什么区别？"**——project references 只解决 TS 编译的依赖关系和增量构建，不负责包管理。npm/pnpm workspace 管的是 `node_modules` 安装和包间引用。两者配合使用：workspace 管依赖安装，references 管 TS 编译图，`tsc --build` 按依赖顺序编译且开启增量缓存。

**源码在哪**：`moduleResolution` 的解析逻辑在 TypeScript 源码 `src/compiler/moduleNameResolver.ts`，`bundler` 模式的核心实现也在该文件中；project references 的构建逻辑在 `src/compiler/builder.ts` 和 `src/compiler/tsbuild.ts`。

**踩过的坑**：新建 Vite + TS 项目，`tsconfig.json` 里写了 `"moduleResolution": "node"` 但 Vite 期望 `"bundler"`——结果 `import` 不带 `.ts` 扩展名时 TS 不报错，但 Vite dev server 有时找不到模块。更隐蔽的是，老的 `node` 模式对 `package.json` 的 `exports` 字段支持不完整，导致 `import xxx from "lodash/chunk"` 这样的子路径导入在 TS 检查时报"找不到模块"。**修复**：TS 5.0+ 项目统一用 `"moduleResolution": "bundler"` + `"allowImportingTsExtensions": true`，并确保 `vite-tsconfig-paths` 或类似插件同步路径别名。

**项目选型**：为什么不用 Babel 做 TS 编译而用 `tsc`？——Babel 只剥离类型不做类型检查，等于"假装是 TS 但没享受到核心价值"。标准实践是 `tsc --noEmit` 做类型检查 + esbuild/swc 做实际转译，既快又安全。
