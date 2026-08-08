---
title: 工程化概述
description: 前端工程化概念、代码规范、Monorepo 架构
---

# 工程化概述

## 一、什么是前端工程化

前端工程化是用软件工程的方法论解决前端开发中的**效率、质量、协作和维护**问题，核心目标四个字：**降本增效**。具体涵盖：

| 维度 | 解决的问题 | 代表工具 |
|------|-----------|---------|
| **模块化** | 代码组织混乱、全局变量污染 | ESM / CommonJS / AMD |
| **组件化** | UI 复用困难、样式冲突 | Vue SFC / React Component / Web Components |
| **规范化** | 团队代码风格不一致、提交混乱 | ESLint / Prettier / Husky / Commitlint |
| **自动化** | 手动构建、测试、部署低效 | Webpack / Vite / CI/CD |

> 面试时别只说"我知道 Webpack 怎么配置"，要先从这四个维度讲清楚工程化解决了什么问题，再落到具体工具。面试官要的是**工程化思维**，不是工具说明书。

## 二、代码规范与格式化

### ESLint：代码逻辑校验

ESLint 通过静态分析 AST 检查代码中的潜在错误和风格问题。核心配置三要素：**parser**（解析器，如 `@typescript-eslint/parser`）、**rules**（规则集）、**extends**（继承预设）。

```js
// .eslintrc.cjs
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
    'prettier',               // ⚠️ 必须放最后，覆盖冲突规则
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'vue/multi-word-component-names': 'off',
  },
}
```

| 关键点 | 说明 |
|--------|------|
| extends 顺序 | 后面的覆盖前面，`prettier` 必须最后 |
| `root: true` | 阻止向父目录查找配置，避免 CI 环境配置污染 |
| parser 选择 | JS 用默认 espree，TS 用 `@typescript-eslint/parser`，Vue 用 `vue-eslint-parser` |
| 性能优化 | `eslint --cache` 只检查变更文件 |

### Prettier：代码格式化

Prettier 只做格式化不做逻辑检查，与 ESLint 互补。关键配置：

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

用 `eslint-config-prettier` 关闭 ESLint 中与 Prettier 冲突的规则，`eslint-plugin-prettier`（可选）把 Prettier 作为 ESLint 规则运行。

### Husky + lint-staged：Git Hooks 自动化

Husky 在 git 操作前后执行脚本，lint-staged 只对 `git add` 的文件运行 linter，避免全量扫描：

```bash
# 安装
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

```json
// .lintstagedrc.json
{
  "*.{ts,tsx,vue}": ["eslint --fix --cache", "prettier --write"],
  "*.{css,scss,less,json,md}": ["prettier --write"]
}
```

### Commitlint：提交信息规范

强制团队遵循 Conventional Commits 格式（`type(scope): description`），配合 `@commitlint/config-conventional`：

```bash
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

```js
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'refactor', 'docs', 'style', 'test', 'chore', 'perf', 'ci']],
  },
}
```

> **面试追问**：ESLint 和 Prettier 都管格式，冲突了怎么办？两个层面——ESLint 也有格式化规则（如 `max-len`），Prettier 只管纯格式。解决：装 `eslint-config-prettier` 关闭 ESLint 的格式化规则，再装 `eslint-plugin-prettier` 把 Prettier 作为 ESLint 规则运行，这样 `eslint --fix` 一次性完成检查和格式化。Husky 为什么不用 `package.json` 的 `gitHooks`？`gitHooks` 在 npm 7+ 已被废弃，且 `.husky/` 目录方式更直观、更易调试。

## 三、Monorepo 架构

### Multirepo vs Monorepo

| | Multirepo | Monorepo |
|---|---|---|
| 结构 | 每个项目独立仓库 | 多个项目共享一个仓库 |
| 依赖管理 | 各自 `package.json`，版本难统一 | pnpm workspace 统一管理 |
| 代码共享 | 发 npm 包 → 各项目安装 | 直接 `import` 本地包 |
| CI/CD | 各自独立，互不影响 | 需要按变更范围触发构建 |
| 典型场景 | 不相关的独立项目 | 有共享组件的多个应用 |

Monorepo 的核心价值：**原子提交**——一个需求同时改动共享包和应用，一个 commit 全搞定，不用跨多个 PR。

### pnpm workspace

pnpm 通过硬链接 + 符号链接实现严格的依赖隔离，**禁止幽灵依赖**（访问未声明在 `package.json` 中的包）：

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'       # 应用
  - 'packages/*'   # 共享库
  - 'config/*'     # 共享配置（eslint/tsconfig）
```

```json
// packages/shared/package.json
{
  "name": "@myorg/shared",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./utils": "./src/utils/index.ts"   // 子路径导出
  }
}
```

幽灵依赖是 Monorepo 的头号杀手——npm/yarn 的扁平化安装让你能 `require('express')` 即使没声明它（因为另一个包声明了），升级后依赖消失导致项目崩溃。pnpm 从根本解决：只允许访问 `package.json` 中明确声明的依赖。

### Turborepo：任务编排引擎

Turborepo 在 pnpm workspace 基础上提供**增量构建、远程缓存和并行任务编排**：

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],    // 先构建所有依赖包
      "outputs": ["dist/**"]      // 缓存产物
    },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] }
  }
}
```

```
项目结构：
├── apps/
│   ├── web/          # 主站（Next.js）
│   └── admin/        # 后台（Vite + Vue）
├── packages/
│   ├── shared/       # 共享工具、类型
│   └── ui/           # 共享 UI 组件
├── config/
│   └── eslint/       # 共享 ESLint 配置
├── package.json      # 根 package.json（scripts + devDependencies）
└── pnpm-workspace.yaml
```

| Turborepo 能力 | 实现方式 |
|---------------|---------|
| 增量构建 | 比较文件 hash，只构建变更的包及其下游 |
| 本地缓存 | `.turbo/` 目录缓存构建产物，二次构建秒级 |
| 远程缓存 | 团队共享缓存，CI 构建结果人人可用 |
| 并行执行 | 根据 `dependsOn` 自动推断 DAG，最大化并行 |
| 同包并行 | `turbo run lint test --parallel` |

> **面试追问**：为什么用 Turborepo 而不是 Rush/Lerna/Nx？各有所长——Lerna 只做版本管理和发布（现在配合 Nx 使用），Rush 是微软出品、配置复杂但适合超大规模（100+ 包），Nx 功能最全但心智负担重（插件多、概念多），Turborepo 最轻量——只做任务编排和缓存，配置简洁（一个 `turbo.json`），配合 pnpm 使用成本最低。选型看团队规模和项目阶段：小团队起步用 Turborepo + pnpm 最省心，大厂多团队协作考虑 Nx 或 Rush。幽灵依赖的排查：`pnpm why <包名>` 查依赖来源，运行 `pnpm run build` 时 pnpm 默认报错提示未声明依赖。
