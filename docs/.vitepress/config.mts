import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '风岚 · 前端面试笔记',
  description: '7年前端经验 | Vue + React 双栈 | 知识复习 & 面试准备',
  base: '/interview-notes/',
  lang: 'zh-CN',

  head: [
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
  ],

  themeConfig: {
    logo: '📚',
    siteTitle: '前端面试笔记',

    // 顶部导航
    nav: [
      { text: '首页', link: '/' },
      {
        text: '知识点',
        items: [
          { text: 'JavaScript 基础', link: '/guide/javascript' },
          { text: 'Vue（2 & 3）', link: '/guide/vue' },
          { text: 'React', link: '/guide/react' },
          { text: 'TypeScript', link: '/guide/typescript' },
          { text: '跨端开发', link: '/guide/cross-platform' },
          { text: '工程化', link: '/guide/engineering' },
          { text: 'CSS 基础 & 组件库', link: '/guide/css' },
          { text: 'CSS 深入', link: '/guide/css-deep' },
          { text: '浏览器原理', link: '/guide/browser' },
          { text: '权限控制 & 架构', link: '/guide/permission' },
          { text: 'Node.js & 数据库', link: '/guide/nodejs' },
          { text: '数据可视化', link: '/guide/visualization' },
        ]
      },
      {
        text: '面试题',
        items: [
          { text: 'A 组：技术基础题', link: '/interview/tech-basics' },
          { text: 'B 组：实践应用题', link: '/interview/practice' },
          { text: 'C 组：情景分析题', link: '/interview/scenario' },
          { text: '行为面试题', link: '/interview/behavioral' },
        ]
      },
      {
        text: '面试准备',
        items: [
          { text: '常见问题 & 自我介绍', link: '/preparation/common-questions' },
          { text: '面试前检查清单', link: '/preparation/checklist' },
          { text: '面试后跟进模板', link: '/preparation/follow-up' },
        ]
      },
      { text: '贡献笔记', link: '/contribute' },
    ],

    // 侧边栏
    sidebar: {
      '/guide/': [
        {
          text: '语言基础',
          collapsed: false,
          items: [
            { text: 'JavaScript 基础', link: '/guide/javascript' },
          ]
        },
        {
          text: '框架与语言',
          collapsed: false,
          items: [
            { text: 'Vue（2 & 3）', link: '/guide/vue' },
            { text: 'React', link: '/guide/react' },
            { text: 'TypeScript', link: '/guide/typescript' },
          ]
        },
        {
          text: '跨端 & 工程化',
          collapsed: false,
          items: [
            { text: '跨端开发（uni-app / RN）', link: '/guide/cross-platform' },
            { text: '工程化（Vite / Webpack）', link: '/guide/engineering' },
          ]
        },
        {
          text: '浏览器 & CSS',
          collapsed: false,
          items: [
            { text: 'CSS 基础 & 组件库', link: '/guide/css' },
            { text: 'CSS 深入（BFC / 层叠）', link: '/guide/css-deep' },
            { text: '浏览器原理', link: '/guide/browser' },
          ]
        },
        {
          text: '后端 & 架构',
          collapsed: false,
          items: [
            { text: '权限控制 & 架构设计', link: '/guide/permission' },
            { text: 'Node.js & 数据库', link: '/guide/nodejs' },
            { text: '数据可视化（ECharts）', link: '/guide/visualization' },
          ]
        },
      ],

      '/interview/': [
        {
          text: '模拟面试题',
          items: [
            { text: 'A 组：技术基础题（10题）', link: '/interview/tech-basics' },
            { text: 'B 组：实践应用题（5题）', link: '/interview/practice' },
            { text: 'C 组：情景分析题（3题）', link: '/interview/scenario' },
            { text: '行为面试题（STAR）', link: '/interview/behavioral' },
          ]
        }
      ],

      '/preparation/': [
        {
          text: '面试准备',
          items: [
            { text: '常见问题 & 自我介绍', link: '/preparation/common-questions' },
            { text: '面试前检查清单', link: '/preparation/checklist' },
            { text: '面试后跟进模板', link: '/preparation/follow-up' },
          ]
        }
      ],
    },

    // 内置全局搜索（Ctrl+K）
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: '搜索', buttonAriaLabel: '搜索文档' },
              modal: {
                noResultsText: '未找到相关结果',
                resetButtonTitle: '清除搜索',
                footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
              }
            }
          }
        }
      }
    },

    // 页面底部
    editLink: {
      pattern: 'https://github.com/Jack-Kunlun/interview-notes/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页'
    },

    lastUpdated: { text: '最后更新' },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Jack-Kunlun/interview-notes' }
    ],

    footer: {
      message: '基于 VitePress 构建 · 内容持续更新',
      copyright: '风岚 · 前端面试笔记'
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    outline: {
      label: '本页目录',
      level: [2, 3]
    },
  }
})
