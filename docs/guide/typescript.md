---
title: TypeScript
description: TS 泛型、工具类型、类型体操、tsconfig 配置
---

# TypeScript

## 必会基础 ⭐⭐⭐

- [ ] 基础类型 / 联合类型 / 交叉类型 / 字面量类型
- [ ] `interface` vs `type` 的区别与选择
- [ ] 泛型：函数泛型 / 接口泛型 / `extends` 约束 / 条件类型
- [ ] `as const` / `satisfies`（TS 4.9+）
- [ ] 工具类型：`Partial` / `Required` / `Pick` / `Omit` / `Record`

## 进阶考点 ⭐⭐

- [ ] `infer` 类型推断：函数返回值、Promise 内部类型
- [ ] 声明文件：`.d.ts` / `declare module` / `declare global`
- [ ] `tsconfig.json` 核心：`strict` / `paths` / `moduleResolution`
- [ ] 类型守卫：`is` / `typeof` / `instanceof` / `in`

## `interface` vs `type` 速查

| 对比项 | `interface` | `type` |
|---|---|---|
| 声明合并 | ✅ 支持 | ❌ 不支持 |
| 联合/交叉类型 | ❌ | ✅ |
| 映射类型 | ❌ | ✅ |
| 扩展方式 | `extends` | `&` 交叉类型 |
| 推荐场景 | 对象形状、对外 API | 联合类型、工具类型 |

## 常用工具类型实现

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] }
type MyRequired<T> = { [K in keyof T]-?: T[K] }
type MyPick<T, K extends keyof T> = { [P in K]: T[P] }
type MyExclude<T, U> = T extends U ? never : T
type MyReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : never
```

## `infer` 应用示例

```ts
// 提取 Promise 的 resolved 类型
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T

// 提取函数第一个参数
type FirstArg<T extends (...args: any) => any> =
  T extends (first: infer F, ...rest: any) => any ? F : never

// 提取数组元素类型
type ElementType<T> = T extends (infer E)[] ? E : never
```
