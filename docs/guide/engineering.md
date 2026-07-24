---
title: 工程化
description: Vite、Webpack、Monorepo、Tree Shaking 工程化复习
---

# 工程化（Vite / Webpack / Monorepo）

## 必会基础 ⭐⭐⭐

- [ ] Vite：开发环境 ESBuild + 浏览器原生 ESM，生产环境 Rollup
- [ ] Webpack 核心：entry / output / loader / plugin / module resolution
- [ ] 常用 loader：`babel-loader` / `css-loader` / `ts-loader`
- [ ] ESLint + Prettier + Husky + lint-staged 配置链路

## 进阶考点 ⭐⭐

- [ ] Webpack 构建优化：`splitChunks` / `cache`（filesystem）/ thread-loader
- [ ] Monorepo：pnpm workspace + Turborepo，幽灵依赖问题
- [ ] Tree Shaking：ESM 静态分析，`sideEffects: false` 配置

## Vite vs Webpack 核心差异

| 对比项 | Vite（开发环境） | Webpack |
|---|---|---|
| 冷启动 | 毫秒级（无需打包） | 数十秒 ~ 数分钟 |
| 模块处理 | 浏览器原生 ESM，按需编译 | 全量打包 |
| 预构建 | ESBuild（Go，极快） | Babel（JS） |
| HMR | 只重新请求变更模块 | 重新构建依赖链 |
| 生产构建 | Rollup | 自身打包器 |

## Vite 为什么快？

```
开发模式：
  浏览器请求 import → Vite Server 按需编译 → 返回 ESM
  → 只编译实际用到的模块，无需全量打包

vs Webpack：
  启动时递归遍历所有 import → 全部打包成 bundle → 再开 server
```

## pnpm Monorepo 配置

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// apps/admin/package.json 引用内部包
{
  "dependencies": {
    "@repo/shared": "workspace:*"
  }
}
```
