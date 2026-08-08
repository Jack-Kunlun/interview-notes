# 贡献指南

欢迎为面试笔记库贡献内容！以下是添加新知识点或面试题的流程。

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
