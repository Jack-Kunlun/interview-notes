# 贡献笔记

欢迎添加新知识点或面试题！流程非常简单。

## 快速上手

### 方式一：在 GitHub 直接编辑（最简单）

1. 进入 [GitHub 仓库](https://github.com/YOUR_USERNAME/interview-notes)
2. 找到对应 `.md` 文件，点击右上角铅笔图标
3. 修改内容 → 提交 → 自动创建 PR
4. Merge 后 2 分钟内公网更新

### 方式二：本地提 PR

```bash
# 1. Fork 并 clone 仓库
git clone https://github.com/YOUR_USERNAME/interview-notes.git
cd interview-notes

# 2. 安装依赖
npm install

# 3. 启动本地预览
npm run dev

# 4. 新建分支
git checkout -b add-xxx-notes

# 5. 添加内容后提交
git add .
git commit -m "docs: 新增 xxx 笔记"
git push origin add-xxx-notes

# 6. 在 GitHub 上提 PR
```

## 新增一篇笔记

1. 在对应目录下新建 `.md` 文件：
   - 知识点 → `docs/guide/`
   - 面试题 → `docs/interview/`
   - 面试准备 → `docs/preparation/`

2. 在 `docs/.vitepress/config.mts` 的 `sidebar` 中添加一行：
   ```ts
   { text: '新笔记标题', link: '/guide/new-topic' }
   ```

3. 提 PR 或直接 push 到 main

## 文件模板

```md
---
title: 你的笔记标题
description: 简要描述
---

# 标题

## 必会基础 ⭐⭐⭐

- [ ] 知识点 1
- [ ] 知识点 2

## 进阶考点 ⭐⭐

- [ ] 高级知识点 1
```
