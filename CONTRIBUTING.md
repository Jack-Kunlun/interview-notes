# 贡献指南

欢迎为面试笔记库贡献内容！以下是添加新知识点或面试题的流程。

## 方式一：直接 PR（推荐）

1. Fork 本仓库
2. 在对应目录下新建或修改 `.md` 文件
   - 知识点 → `docs/guide/`
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
├── guide/        # 知识点复习清单（按技术栈分类）
├── interview/    # 模拟面试题（按题型分类）
└── preparation/  # 面试准备（自我介绍、检查清单等）
```
