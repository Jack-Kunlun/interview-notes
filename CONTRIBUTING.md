# 贡献指南

欢迎为 Frontend Interview Notes 贡献内容！这是一个开放的知识库，任何人都可以通过 Issue 或 Pull Request 参与维护。

---

## 贡献流程

### 方式一：直接 PR（推荐）

1. Fork 本仓库
2. 在对应目录下新建或修改 `.md` 文件
   - 知识点 → `docs/core/` / `docs/framework/` / `docs/engineering/` / `docs/fullstack/`
   - 面试题 → `docs/interview/`
   - 面试准备 → `docs/preparation/`
3. 若新建文件，需在 `docs/.vitepress/config.mts` 的 `sidebar` 中添加对应条目
4. 提交 Pull Request，描述清楚新增内容
5. PR 通过 CI 检查和 Review 后 Merge，GitHub Actions 自动部署，2 分钟内公网可访问

### 方式二：直接在 GitHub 编辑

1. 在 GitHub 仓库页面找到对应 `.md` 文件
2. 点击右上角铅笔图标（Edit this file）
3. 修改内容后提交，GitHub 会自动创建 PR

### 方式三：提 Issue

不确定怎么改？先提一个 Issue：

- [内容错误](https://github.com/Jack-Kunlun/interview-notes/issues/new?template=content-error.yml) — 技术结论错误、API 过时、代码有问题
- [内容请求](https://github.com/Jack-Kunlun/interview-notes/issues/new?template=content-request.yml) — 希望新增某个知识方向

---

## 文件命名规范

- 文件名使用小写英文加连字符：`new-topic.md`
- 每个文件顶部加 frontmatter（可选但推荐）：
  ```md
  ---
  title: 页面标题
  description: 简要描述
  ---
  ```

---

## 目录结构

```
docs/
├── core/         # 编程语言（JS / TS / CSS / 算法）
├── framework/    # 框架生态（Vue / React / 可视化 / SSR / 跨端）
├── engineering/  # 工程体系（构建工具 / 性能 / 调试 / DevOps）
├── fullstack/    # 网络与服务端（浏览器 / 网络 / Node.js / 权限）
├── interview/    # 模拟面试题
└── preparation/  # 面试准备（自我介绍、检查清单等）
```

---

## 内容质量标准

这是一个技术知识库，最大的风险不是 runtime crash，而是**技术内容过时或错误**。因此所有贡献者需要遵循以下标准：

### 必须做到

- **技术结论尽量使用官方文档验证。** 涉及 API 行为、语言特性、框架机制时，引用官方文档或规范。
- **涉及版本差异时注明版本。** 例如 "Vue 2.x 中 `v-model` 语法糖等价于 `:value` + `@input`"，而非笼统说 "Vue 中"。
- **示例代码必须能解释其适用环境。** 如果示例依赖特定 Babel 插件、特定浏览器版本或特定框架版本，需注明。
- **废弃 API 必须标记 deprecated。** 并注明推荐替代方案。

### 不应该做

- **不确定的内容不得写成确定结论。** 如果某个行为在不同浏览器或不同版本中不一致，应说明差异，而非只写一种情况。
- **不要复制粘贴过时博客内容。** 互联网上的前端文章可能基于旧版本，引用前需验证是否仍然适用。
- **不要省略边界条件。** 面试中追问的往往是边界情况，知识库应覆盖常见追问点。

### Review 要点

提交 PR 后，维护者会重点检查：

1. 技术结论是否有依据
2. 示例代码是否正确且可复现
3. 是否标注了版本适用范围
4. 是否存在过时或废弃的 API
5. 目录结构和文件命名是否符合规范

---

## CI 检查

所有 PR 会自动触发 CI（`.github/workflows/ci.yml`），执行：

```bash
pnpm install --frozen-lockfile
pnpm run test:theme:unit
pnpm run test:theme
pnpm run build
```

请在提交前本地确认这些命令可以通过。

## 方式一：直接 PR（推荐）

1. Fork 本仓库
2. 在对应目录下新建或修改 `.md` 文件
   - 知识点 → `docs/core/` / `docs/framework/` / `docs/engineering/` / `docs/fullstack/`
   - 面试题 → `docs/interview/`
   - 面试准备 → `docs/preparation/`
3. 若新建文件，需在 `docs/.vitepress/config.mts` 的 `sidebar` 中添加对应条目
4. 提交 Pull Request，描述清楚新增内容
5. PR 通过 Review 并 Merge 后，GitHub Actions 自动部署，2 分钟内公网可访问

## 方式二：直接在 GitHub 编辑

1. 在 GitHub 仓库页面找到对应 `.md` 文件
2. 点击右上角铅笔图标（Edit this file）
3. 修改内容后提交，GitHub 会自动创建 PR

## 文件命名规范

- 文件名使用小写英文加连字符：`new-topic.md`
- 每个文件顶部加 frontmatter（可选但推荐）：
  ```md
  ---
  title: 页面标题
  description: 简要描述
  ---
  ```

## 目录结构说明

```
docs/
├── core/         # 编程语言（JS / TS / CSS / 算法）
├── framework/    # 框架生态（Vue / React / 可视化 / SSR / 跨端）
├── engineering/  # 工程体系（构建工具 / 性能 / 调试 / DevOps）
├── fullstack/    # 网络与服务端（浏览器 / 网络 / Node.js / 权限）
├── interview/    # 模拟面试题
└── preparation/  # 面试准备（自我介绍、检查清单等）
```
