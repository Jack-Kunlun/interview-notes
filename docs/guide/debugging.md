---
title: 前端调试与错误监控
description: 全面掌握 Chrome DevTools、Source Map、Vue/React DevTools、线上错误监控、移动端调试与常见问题排查方法
---

# 前端调试与错误监控

## Chrome DevTools

Chrome DevTools 是前端开发最核心的调试工具，集成了页面检查、网络分析、性能剖析、存储管理等全套能力。熟练掌握 DevTools 能极大提升开发与排错效率，是每个前端工程师的必备技能。

### Sources：断点调试

Sources 面板用于查看和调试页面加载的所有静态资源，支持设置断点、单步执行、查看调用栈等核心调试操作。

**代码断点（Breakpoint）**：在 JavaScript 代码行号处点击即可添加断点，代码执行到该行时暂停。暂停后可以查看当前作用域内的变量值、调用栈（Call Stack），并通过 Step Over / Step Into / Step Out 控制执行流程。

```js
function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    // 在此行设置断点，观察 item 和 total 的变化
    total += item.price * item.quantity;
  }
  return total;
}

const cart = [
  { name: 'Book', price: 29, quantity: 2 },
  { name: 'Pen', price: 5, quantity: 1 }
];
console.log(calculateTotal(cart));
```

**条件断点（Conditional Breakpoint）**：右键点击行号，选择 "Add conditional breakpoint"，输入表达式。只有当表达式为真时断点才触发，特别适合循环中定位特定迭代的问题。

```js
const users = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `User${i}` }));

// 条件断点：id === 500 —— 只在第 501 次循环时暂停，避免手动跳过 500 次
users.forEach(user => {
  processUser(user);
});
```

**Logpoint**：右键行号选择 "Add logpoint"，输入要打印的表达式。它不会暂停执行，只在控制台输出信息，相当于无需修改源码的 `console.log`。在生产环境下无法使用 DevTools 时特别有用，可以在不修改代码的情况下快速注入日志。

```js
// 在下一行添加 Logpoint："Processing user: " + user.name
// 控制台会输出每条记录的处理信息，但不中断执行
data.forEach(user => saveToDB(user));
```

### Sources：调试面板功能速查

| 功能区域 | 作用 | 快捷键/操作 |
|---------|------|------------|
| Call Stack | 显示当前执行上下文调用链，可点击跳转 | 面板内点击 |
| Scope | 查看 Local / Closure / Global 作用域变量 | 展开 Scope 节点 |
| Watch | 添加自定义监视表达式，实时计算值 | 点击 + 号添加 |
| Breakpoints | 管理所有已设断点，支持批量启用/禁用 | 面板内勾选 |
| XHR/fetch Breakpoints | 在特定 URL 请求发生时自动断点 | 输入 URL 片段匹配 |
| DOM Breakpoints | DOM 节点被修改/移除/属性变化时断点 | Elements 面板右键设置 |

### Network：请求过滤与瀑布图

Network 面板记录页面所有网络请求，包括 XHR、JS、CSS、图片、字体等资源。它能帮助分析加载顺序、资源大小、请求耗时等关键性能指标。

**请求过滤**：顶部 Filter 输入框支持按 URL、资源类型、状态码等条件过滤。也可通过 XHR/JS/CSS/Img/Media/Font/Doc/WS 等按钮快速按类型筛选。常用过滤技巧：

- `domain:api.example.com` 只看某域名请求
- `status-code:200` 只看成功请求
- `larger-than:100K` 只看大于 100KB 的资源
- `-domain:cdn.example.com` 排除 CDN 资源
- `method:POST` 只看 POST 请求

**瀑布图（Waterfall）**：每条请求右侧的条形图展示了请求各阶段耗时。鼠标悬停可以看到详细的时间分解：

| 阶段 | 含义 | 优化方向 |
|------|------|---------|
| Queueing | 浏览器请求排队时间 | 减少同域名并发请求（HTTP/1.1 限制 6 个） |
| Stalled | 等待可用的 TCP 连接 | 使用 HTTP/2 多路复用 |
| DNS Lookup | DNS 解析耗时 | 使用 DNS 预解析 `<link rel="dns-prefetch">` |
| Initial Connection | TCP 握手 + SSL 协商 | 使用持久连接（keep-alive） |
| Request sent | 发送请求数据耗时 | 减少请求体大小 |
| Waiting (TTFB) | 等待服务器响应首字节 | 优化服务端处理逻辑、CDN 加速 |
| Content Download | 下载响应体耗时 | 压缩响应、使用 CDN、启用 gzip/brotli |

```js
// 使用 Performance API 自定义资源加载监控
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    console.table({
      name: entry.name,
      duration: entry.duration.toFixed(2) + 'ms',
      dns: (entry.domainLookupEnd - entry.domainLookupStart).toFixed(2) + 'ms',
      tcp: (entry.connectEnd - entry.connectStart).toFixed(2) + 'ms',
      ttfb: (entry.responseStart - entry.requestStart).toFixed(2) + 'ms',
      download: (entry.responseEnd - entry.responseStart).toFixed(2) + 'ms'
    });
  });
});
observer.observe({ type: 'resource', buffered: true });
```

### Console：进阶用法

Console 不仅是 `console.log` 的战场，还提供了强大的数据展示和性能测量能力。

**console.table()**：以表格形式展示数组或对象数据，非常适合查看接口返回的列表数据。第二个参数可以指定只展示某些列。

```js
const users = [
  { id: 1, name: 'Alice', role: 'admin', email: 'alice@example.com' },
  { id: 2, name: 'Bob', role: 'editor', email: 'bob@example.com' },
  { id: 3, name: 'Charlie', role: 'viewer', email: 'charlie@example.com' }
];

// 表格展示全部列
console.table(users);

// 只展示 id 和 name 列
console.table(users, ['id', 'name']);
```

**console.group() / console.groupEnd()**：创建可折叠的日志分组，让复杂的日志输出结构化。支持嵌套分组，`console.groupCollapsed()` 默认折叠。

```js
function processOrder(order) {
  console.group(`📦 Order #${order.id}`);
  console.log('Customer:', order.customerName);
  console.log('Items:', order.items.length);

  console.group('💰 Price Breakdown');
  const subtotal = order.items.reduce((s, i) => s + i.price, 0);
  console.log('Subtotal:', subtotal);
  console.log('Tax:', subtotal * 0.1);
  console.log('Total:', subtotal * 1.1);
  console.groupEnd();

  console.groupEnd();
}

processOrder({ id: 1001, customerName: 'Alice', items: [{ name: 'Book', price: 30 }] });
```

**console.time() / console.timeEnd()**：精确测量代码执行时间，适合对比算法性能或定位性能瓶颈。同一个 label 配对使用，支持同时进行多个计时。

```js
function heavyComputation(n) {
  console.time('heavyComputation');
  let result = 0;
  for (let i = 0; i < n * 1000000; i++) {
    result += Math.sqrt(i);
  }
  console.timeEnd('heavyComputation'); // heavyComputation: 234.56ms
  return result;
}

// 对比两种实现
console.time('array-from');
const a = Array.from({ length: 100000 }, (_, i) => i);
console.timeEnd('array-from');

console.time('spread-keys');
const b = [...Array(100000).keys()];
console.timeEnd('spread-keys');
```

**其他实用 Console 方法速查**：

| 方法 | 用途 | 示例 |
|------|------|------|
| `console.assert(cond, msg)` | 条件为 false 时输出错误 | `console.assert(x > 0, 'x must be positive')` |
| `console.trace()` | 打印当前调用栈 | 追踪函数调用来源 |
| `console.dir(obj)` | 以 JSON 树形式输出对象 | 查看 DOM 对象属性 |
| `console.count(label)` | 计数某段代码执行次数 | 检测循环/递归次数 |
| `console.clear()` | 清空控制台 | `Ctrl+L` 快捷键 |

### Application：存储面板

Application 面板用于查看和管理浏览器存储数据，包括 Cookie、LocalStorage、SessionStorage、IndexedDB、Service Worker 等。

**Storage 面板能力速查**：

| 存储类型 | 容量 | 过期策略 | 与服务器通信 | 适用场景 |
|---------|------|---------|-------------|---------|
| Cookie | 4KB | 可设置过期时间 | 每次请求自动携带 | 身份认证 token、用户偏好 |
| LocalStorage | 5-10MB | 永久存储 | 不自动发送 | 主题设置、草稿保存 |
| SessionStorage | 5-10MB | 标签页关闭即清除 | 不自动发送 | 表单临时数据、页面滚动位置 |
| IndexedDB | 浏览器限制（通常>50MB） | 永久存储 | 不自动发送 | 离线数据、大文件缓存 |

**Cookie 调试要点**：Application > Cookies 可查看当前域名所有 Cookie，包括 Name、Value、Domain、Path、Expires、HttpOnly、Secure、SameSite 等属性。HttpOnly 标记的 Cookie 无法被 JS 读取（document.cookie），可有效防御 XSS 窃取。

```js
// Cookie 常用操作封装
const cookieUtil = {
  set(name, value, days = 7) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  },
  get(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  },
  remove(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
};
```

**IndexedDB 调试**：Application > IndexedDB 可以展开查看数据库、对象仓库（Object Store）和索引，双击值可编辑。使用时注意 IndexedDB 的事务机制——所有读写操作必须在事务内完成。

```js
// IndexedDB 基本操作示例
const dbName = 'AppDB', storeName = 'cache';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveData(id, data) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).put({ id, data, timestamp: Date.now() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
```

### Elements：样式调试与事件监听

**样式调试**：Elements 面板右侧 Styles 窗格显示选中元素所有 CSS 规则，按优先级排序。被覆盖的规则会显示删除线，方便定位样式冲突。可在 Styles 窗格中直接修改 CSS 值实时预览，还可以点击 `:hov` 按钮强制触发 `:hover`、`:active`、`:focus`、`:visited` 等伪类状态。

Computed 子面板展示该元素最终计算的样式（经过层叠、继承后的实际值），点击任意属性可追溯到来源 CSS 规则。这一点在排查"样式写了但不生效"问题时至关重要。

**盒模型可视化**：Styles 窗格底部或 Computed 面板中的盒模型图展示了元素 Content、Padding、Border、Margin 的实际像素值，鼠标悬停时页面会高亮对应区域。

**Event Listeners**：Elements 面板右侧 Event Listeners 子面板列出该元素上绑定的所有事件监听器，按事件类型分组。展开可看到处理函数所在文件和行号。勾选 "Ancestors" 可查看祖先元素上的事件（排查事件委托相关问题时非常有用）。

```js
// 演示：在 DevTools 中定位事件监听器
const btn = document.querySelector('#submitBtn');

// 绑定多种事件后，在 Elements > Event Listeners 中可定位到以下代码
btn.addEventListener('click', function handleClick(e) {
  console.log('Button clicked', e.target);
});

// 匿名函数在 Event Listeners 中显示为 anonymous，
// 建议始终使用命名函数以便调试
document.addEventListener('keydown', function onKeyDown(e) {
  if (e.key === 'Escape') closeModal();
});
```

---

## Source Map

### 原理

Source Map 是一个 JSON 文件，建立了压缩/编译后代码与原始源码之间的映射关系。浏览器在开发者工具打开时，会自动加载 Source Map，将压缩后的错误堆栈还原为可读的源码位置。

映射的核心字段是 `mappings`，采用 VLQ（Variable Length Quantity）编码。它记录的信息包括：编译后代码的行列号、原始文件索引、原始行号、原始列号、原始标识符名称索引。每个文件可以包含多个 `sources`（原始文件），`sourcesContent` 字段可选地内嵌源码内容，使 Source Map 文件自包含。

```json
{
  "version": 3,
  "sources": ["src/utils.ts", "src/index.ts"],
  "names": ["add", "a", "b"],
  "mappings": "AAAA,SAASA,IAAIC,EAAGC;IACZ,OAAOD,IAAIC;AACjB",
  "sourcesContent": ["function add(a, b) { return a + b; }"],
  "file": "bundle.min.js"
}
```

Source Map 的加载方式有两种：一是在编译产物末尾添加 `//# sourceMappingURL=bundle.js.map` 注释（内联引用）；二是通过 HTTP 响应头 `SourceMap: /path/to/bundle.js.map`。浏览器仅在 DevTools 打开时才请求 Source Map，不影响普通用户体验。

### webpack devtool 选项对比

webpack 的 `devtool` 配置控制 Source Map 的生成方式，核心权衡在于**构建速度**、**重建速度**和**映射质量**三个维度。

| devtool 选项 | 构建速度 | 重建速度 | 质量 | 生产环境 | 说明 |
|-------------|---------|---------|------|---------|------|
| `eval` | +++ | +++ | 仅行映射 | ❌ | 每个模块用 `eval()` 包裹，末尾带 `//# sourceURL` |
| `eval-cheap-source-map` | + | ++ | 行映射 | ❌ | eval 模式 + 只映射到行（不映射列） |
| `eval-source-map` | -- | + | +++ | ❌ | eval 模式 + 完整 Source Map（行列都映射） |
| `cheap-source-map` | + | - | 行映射 | ❌ | 只映射行、忽略列，不处理 loader 的 Source Map |
| `cheap-module-source-map` | - | - | 行映射 | ✅ | 同上但处理 loader Source Map |
| `source-map` | -- | -- | +++ | ✅ | 独立 .map 文件，完整行列映射 |
| `hidden-source-map` | -- | -- | +++ | ✅ | 生成 .map 但不添加引用注释 |
| `nosources-source-map` | -- | -- | ++ | ✅ | 生成 .map 但不包含 sourcesContent |
| `inline-source-map` | -- | -- | +++ | ❌ | .map 内联为 Data URL，产物体积大 |

```js
// webpack.config.js 典型配置
module.exports = (env, argv) => ({
  // 开发环境：快速重建 + 高质量映射
  devtool: argv.mode === 'development'
    ? 'eval-cheap-module-source-map'
    // 生产环境：安全考虑，隐藏 Source Map
    : 'hidden-source-map',
});
```

**Vite 对应配置**：Vite 使用 Rollup 构建，`build.sourcemap` 选项控制：

```ts
// vite.config.ts
export default defineConfig({
  build: {
    // true: 生成独立 .map 文件
    // 'hidden': 生成但不引用
    // 'inline': 内联为 Data URL
    sourcemap: process.env.SENTRY_AUTH_TOKEN ? 'hidden' : false,
  }
});
```

### 线上 Source Map 安全策略

Source Map 在生产环境若直接公开访问，等于将源码暴露在外。敏感逻辑、API 端点、业务规则一览无余。常见安全策略有三种：

**策略一：隐藏 Source Map**。使用 `hidden-source-map` 或 `nosources-source-map`。前者生成 .map 但不添加引用注释，后者连 sourcesContent 都不包含。服务器可配置 Nginx 规则拒绝 `.map` 文件的外部请求：

```nginx
# 拒绝外部访问 .map 文件
location ~ \.map$ {
    deny all;
}
```

**策略二：上传到错误监控平台**。将 Source Map 上传到 Sentry 等服务，只在需要解析错误堆栈时使用，从不暴露到公网。以 Sentry Webpack 插件为例：

```js
// webpack.config.js
const SentryWebpackPlugin = require('@sentry/webpack-plugin');

module.exports = {
  devtool: 'hidden-source-map',
  plugins: [
    new SentryWebpackPlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: 'my-org',
      project: 'my-project',
      include: './dist',
      ignore: ['node_modules'],
      // 上传后删除本地 .map 文件
      cleanArtifacts: true,
    }),
  ],
};
```

**策略三：内网白名单访问**。将 .map 文件放在内部服务器，仅允许内网 IP 或通过 VPN 访问，生产环境错误堆栈转发到内网解析后再展示。

---

## Vue DevTools

Vue DevTools 是 Vue 官方提供的浏览器扩展，支持 Vue 2 和 Vue 3。安装后在 DevTools 中新增 Vue 面板，提供组件检查、状态管理、性能分析等功能。

### 组件树（Components）

Components 面板以树形结构展示当前页面的 Vue 组件层级。选中组件后，右侧显示该组件的 props、data、computed 属性值，支持双击编辑实时查看响应式变化。

展开组件节点可以看到其子组件以及渲染来源（哪个组件的 template 引用了它）。对于大型应用，顶部的搜索框和 "Select component in the page" 按钮（瞄准镜图标）能快速定位目标组件。

```vue
<!-- 组件树中可清晰看到 Parent > Child > GrandChild 的层级 -->
<script setup>
import { ref, computed } from 'vue';

const count = ref(0);
// 在 DevTools 中双击 count 可直接修改值，页面实时响应
const doubled = computed(() => count.value * 2);
</script>
```

### 事件（Timeline > Events）

Vue DevTools 的 Timeline 面板记录了组件事件、自定义事件和生命周期钩子的触发时间线。可以录制用户操作过程，回放每个事件发生时的快照。

事件的查看有助于排查"某个事件是否被触发"、"emit 的 payload 是否正确"这类问题。点击事件条目可展开 payload 详情。

```vue
<script setup>
const emit = defineEmits(['submit', 'cancel']);

// DevTools Timeline 会记录 emit 的调用及参数
function handleSubmit(form) {
  emit('submit', { id: Date.now(), ...form });
}
</script>
```

### 路由（Routing）

当使用 Vue Router 时，Vue DevTools 的 Routing 面板展示当前路由状态：fullPath、path、params、query、matched 组件链。还可以查看路由导航历史，配合时间线回放路由跳转过程——这对排查导航守卫和路由过渡问题特别有帮助。

### Pinia 状态（Pinia）

如果项目使用 Pinia 进行状态管理，Pinia 面板展示所有 store 及其 state、getters。选中 store 后可以直接在 DevTools 中修改 state 值，观察 UI 响应变化。此外还会记录所有 action 调用历史及其参数和返回值，支持时间旅行调试。

```js
// stores/counter.js
import { defineStore } from 'pinia';

export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0, history: [] }),
  getters: {
    doubleCount: (state) => state.count * 2,
  },
  actions: {
    increment() {
      this.history.push(this.count);
      this.count++;
    }
  }
});
// DevTools Pinia 面板可查看 count、doubleCount 值，
// 并回放 increment 的每次调用
```

### Timeline 性能追踪

Timeline 面板通过录制页面交互，展示组件渲染、事件触发、状态变更的时间线。它可以识别性能瓶颈——例如某个操作触发了不必要的重渲染（可以对比渲染前后的组件快照），以及长任务阻塞主线程的警告。

---

## React DevTools

React DevTools 同样由 Meta 官方维护，提供 Components 和 Profiler 两个核心面板。

### Components

Components 面板展示 React 组件树。选中组件后右侧显示 props、state、hooks、context 等信息。与 Vue DevTools 类似，支持直接编辑 props 和 state 值（双击数值修改）。

React DevTools 的一个重要功能是 **组件高亮**：勾选 "Highlight updates when components render" 后，每次渲染会用彩色边框闪烁标记渲染的组件，直观检测不必要的重渲染。不同颜色代表不同的渲染原因（state 变化、props 变化、父组件渲染、hooks 变化）。

```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchUser(userId).then(data => {
      setUser(data);
      setLoading(false);
    });
  }, [userId]);

  // DevTools Components 面板可查看：
  // - props: { userId }
  // - hooks: State(user), State(loading), Effect
  // - 渲染时高亮边框闪烁

  if (loading) return <Spinner />;
  return <div>{user.name}</div>;
}
```

### Profiler：火焰图分析

Profiler 面板录制页面交互过程中的渲染信息，以火焰图和排序列表两种形式展示：

- **火焰图（Flamegraph）**：横向为时间轴，每个色块代表一次组件渲染，色块宽度 = 渲染耗时，层级 = 组件层级。灰色表示该组件未重新渲染（被 memo 或 shouldComponentUpdate 跳过）。
- **排名列表（Ranked）**：按总渲染耗时从高到低排列组件，快速定位性能瓶颈。

**分析步骤**：

1. 点击录制按钮开始录制
2. 执行需要分析的用户操作
3. 停止录制，得到本次录制的渲染数据
4. 查看火焰图，定位耗时最长的组件
5. 对比多次渲染间的差异（"Why did this render?" 面板告诉你 props/state/hooks 中哪些值变了）

```jsx
// 使用 React.memo + useMemo + useCallback 减少不必要渲染
const ExpensiveList = React.memo(function ExpensiveList({ items, onSelect }) {
  // 仅在 items 或 onSelect 引用变化时重新渲染
  return items.map(item => (
    <ExpensiveItem key={item.id} item={item} onSelect={onSelect} />
  ));
});

function Parent() {
  const [items, setItems] = useState([]);

  // useCallback 稳定函数引用，避免子组件因 props 变化重渲染
  const handleSelect = useCallback((id) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  }, []); // 依赖为空，引用永远不变

  // Profiler 火焰图中，若 ExpensiveList 的色块宽度显著减小，
  // 说明 memo 生效，避免了不必要渲染
  return <ExpensiveList items={items} onSelect={handleSelect} />;
}
```

**Profiler 对比表格**：

| 指标 | 含义 | 优化方向 |
|------|------|---------|
| Render duration | 组件本次渲染的耗时 | 减少计算量、拆分大组件 |
| Commit duration | React 将变更写入 DOM 的耗时 | 减少 DOM 节点变更数 |
| Total render count | 录制期间总渲染次数 | 减少不必要重渲染 |
| Self duration | 组件自身渲染耗时（不含子组件） | 优化组件内部逻辑 |

---

## 线上错误监控

错误监控是前端工程化的关键一环。JS 错误通常发生在用户浏览器端，需要主动上报才能在监控平台感知。根据错误类型的不同，捕获方式也有所区别。

### window.onerror vs addEventListener('error')

两者都能捕获运行时错误，但行为有显著差异：

| 特性 | window.onerror | addEventListener('error') |
|------|---------------|--------------------------|
| 赋值方式 | 属性赋值（只能一个） | 事件监听（支持多个） |
| 捕获 JS 运行时错误 | ✅ | ✅（需设置 `capture: true`） |
| 捕获资源加载错误 | ❌ | ✅（img/script/link 加载失败冒泡到 window） |
| 错误信息详细程度 | message + source + lineno + colno + error | event.error / event.message |
| 被覆盖风险 | 高（后定义的覆盖前定义） | 低（多个 listener 并存） |

```js
// window.onerror —— 只能设一个
window.onerror = function (message, source, lineno, colno, error) {
  reportError({
    type: 'runtime',
    message: message,
    source: source,
    position: `${lineno}:${colno}`,
    stack: error?.stack,
  });
  // 返回 true 阻止浏览器默认错误日志
  return true;
};

// addEventListener('error') —— 推荐方式
window.addEventListener('error', (event) => {
  // 资源加载错误（img/script/link）的 event.error 为 null
  if (event.target !== window) {
    // 静态资源加载失败
    const target = event.target;
    reportError({
      type: 'resource',
      tagName: target.tagName,
      src: target.src || target.href,
    });
    return;
  }
  // JS 运行时错误
  reportError({
    type: 'runtime',
    message: event.message,
    stack: event.error?.stack,
    filename: event.filename,
    position: `${event.lineno}:${event.colno}`,
  });
}, true); // 第三个参数 true = 捕获阶段，确保能捕获到资源加载错误
```

### Promise 未捕获错误（unhandledrejection）

Promise 中未被 `.catch()` 处理的 reject 或 `async` 函数中未 try-catch 的异常，不会被 `window.onerror` 或 `error` 事件捕获，必须通过 `unhandledrejection` 事件单独监听。

```js
window.addEventListener('unhandledrejection', (event) => {
  reportError({
    type: 'unhandledRejection',
    message: event.reason?.message || String(event.reason),
    stack: event.reason?.stack,
  });
  // 可以调用 event.preventDefault() 阻止控制台输出
  event.preventDefault();
});

// 这些错误都能被 unhandledrejection 捕获
async function buggyFetch() {
  const res = await fetch('/api/data'); // 没 try-catch，网络失败直接 unhandled
  return res.json();
}
buggyFetch();

new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Timeout')), 1000);
}); // 没有 .catch()，触发 unhandledrejection
```

**常见 Promise 错误遗漏场景**：

- `fetch()` 不检查 `res.ok`，只捕获网络错误却忽略 HTTP 4xx/5xx
- `.then(onFulfilled)` 只传第一个参数，没传 rejection 处理
- 动态 `import()` 失败未 catch
- `setTimeout`/`setInterval` 中 `throw` 无法被外部 try-catch 捕获

### Sentry 接入示例

Sentry 是业界使用最广泛的前端错误监控平台，支持 Vue、React、Angular 等主流框架。接入后自动捕获未处理异常、Promise 错误，并提供面包屑（Breadcrumbs）追踪用户操作路径。

**React 接入**：

```jsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://example@o0.ingest.sentry.io/0',
  environment: process.env.NODE_ENV,
  release: 'my-app@1.2.3',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // 采样率（性能追踪）
  tracesSampleRate: 0.2,
  // 会话回放采样率
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

function App() {
  return (
    // Sentry.ErrorBoundary 包裹后，组件内错误自动捕获并展示降级 UI
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <MainApp />
    </Sentry.ErrorBoundary>
  );
}
```

**Vue 接入**：

```js
import { createApp } from 'vue';
import * as Sentry from '@sentry/vue';

const app = createApp(App);

Sentry.init({
  app,
  dsn: 'https://example@o0.ingest.sentry.io/0',
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.2,
});

app.mount('#app');
```

### 错误上报 SDK 简化实现

理解错误监控 SDK 的核心原理有助于面试和定制化需求。下面是一个最小化的实现：

```js
class ErrorTracker {
  constructor(options) {
    this.dsn = options.dsn;
    this.batchSize = options.batchSize || 10;
    this.queue = [];
    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    // 捕获 JS 运行时错误
    window.addEventListener('error', (e) => {
      if (e.target !== window) return; // 跳过资源加载错误
      this.captureException(e.error || e.message, { type: 'error', lineno: e.lineno });
    }, true);

    // 捕获 Promise 未处理拒绝
    window.addEventListener('unhandledrejection', (e) => {
      this.captureException(e.reason, { type: 'unhandledRejection' });
    });
  }

  captureException(error, context = {}) {
    const event = {
      timestamp: Date.now(),
      message: error?.message || String(error),
      stack: error?.stack || '',
      context,
      breadcrumbs: this.breadcrumbs || [],
      userAgent: navigator.userAgent,
      url: location.href,
    };
    this.queue.push(event);
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.queue.length === 0) return;
    const events = this.queue.splice(0);
    try {
      await fetch(this.dsn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        // 使用 keepalive 确保页面关闭时也能发送
        keepalive: true,
      });
    } catch (e) {
      // 上报失败，将事件放回队列（可选降级方案如使用 sendBeacon）
      this.queue.unshift(...events);
    }
  }
}

// 使用
const tracker = new ErrorTracker({
  dsn: 'https://api.example.com/errors',
  batchSize: 5,
});

// 手动上报
try {
  riskyOperation();
} catch (err) {
  tracker.captureException(err, { action: 'riskyOperation' });
}
```

---

## 移动端调试

移动端调试比桌面端复杂，因为无法直接在手机上打开 DevTools。以下四种方案覆盖了从简单到复杂的移动端调试需求。

### vConsole

vConsole 是一个轻量级的移动端调试面板（腾讯开源），在页面内注入一个可展开的控制台面板，提供 Log、System、Network、Element、Storage 等 Tab，适合快速在真机上查看日志和网络请求。

```html
<!-- CDN 引入方式（最简单） -->
<script src="https://unpkg.com/vconsole@latest/dist/vconsole.min.js"></script>
<script>
  // 仅在测试环境启用
  if (location.hostname !== 'production.com') {
    const vConsole = new VConsole();
    // 可以调用 vConsole.destroy() 销毁
  }
</script>
```

```js
// NPM 安装方式
import VConsole from 'vconsole';

// 也可通过 URL 参数控制：https://example.com?debug=1
if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  const vConsole = new VConsole();

  // 自定义插件
  const myPlugin = new VConsole.VConsolePlugin('my_plugin', 'My Plugin');
  myPlugin.on('renderTab', (callback) => {
    callback('<div>Custom content here</div>');
  });
  vConsole.addPlugin(myPlugin);
}
```

vConsole 的优势是接入成本极低（一行代码），不需要数据线和电脑。但它会覆盖页面触摸事件（点击右下角按钮展开），测试时需要注意手势交互的兼容性。

### Safari 远程调试 iOS

Safari 的 Web Inspector 可以直接调试 iPhone/iPad 上的 Safari 和 WebView 页面，无需安装额外软件。

**配置步骤**：

1. **iPhone 端**：设置 > Safari > 高级 > 打开「网页检查器」（Web Inspector）
2. **Mac 端**：Safari > 偏好设置 > 高级 > 勾选「在菜单栏中显示"开发"菜单」
3. USB 连接 iPhone 到 Mac（或同一 Wi-Fi 网络）
4. Mac Safari 菜单栏 > 开发 > 选择你的 iPhone > 选择要调试的页面
5. 弹出 Web Inspector 窗口，界面与桌面版 Safari DevTools 一致

**限制与注意事项**：
- 仅限 macOS + iOS 组合（Windows 不支持 Safari）
- 调试 UIWebView/WKWebView 需要 App 开启了调试标志
- iOS 15+ 的 Safari 远程调试体验接近桌面 DevTools

### Chrome 远程调试 Android WebView

Chrome DevTools 通过 USB 连接调试 Android 设备上的 Chrome 标签页和 WebView。

**配置步骤**：

1. **Android 端**：设置 > 开发者选项 > 开启「USB 调试」
2. **Android 端**：Chrome 中打开要调试的页面
3. USB 连接 Android 到电脑
4. **桌面端 Chrome**：地址栏输入 `chrome://inspect`，在 \"Remote Target\" 中找到设备和页面
5. 点击 \"inspect\" 打开 DevTools，可直接操作、断点调试手机上的页面

**WebView 调试**：需要 App 在构建时启用 WebView 调试。Android 端代码：

```java
// Android 原生代码中启用 WebView 调试（仅 Debug 构建）
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
    WebView.setWebContentsDebuggingEnabled(true);
}
```

启用后 WebView 页面同样出现在 `chrome://inspect` 的 Remote Target 列表中。也可以通过端口转发调试非标准端口的本地服务：

```bash
# 将手机的 8080 端口转发到电脑的 8080 端口
adb reverse tcp:8080 tcp:8080
```

### Whistle 抓包代理

Whistle 是 Node.js 实现的跨平台抓包代理工具，比 Charles/Fiddler 更灵活，支持规则配置式的请求拦截、修改和模拟。对于移动端 H5/小程序的接口调试非常实用。

**基本配置流程**：

1. 安装：`npm install -g whistle`，启动：`w2 start`
2. 浏览器打开 `http://127.0.0.1:8899` 进入管理界面
3. 手机设置 Wi-Fi 代理为电脑 IP + 端口 8899
4. 手机安装 Whistle 根证书以解密 HTTPS（设置 > 证书管理 > 下载并安装）

**常用规则示例**：

```
# 将线上 API 代理到本地开发服务器
api.example.com 127.0.0.1:3000

# Mock 接口响应（返回本地 JSON 文件）
api.example.com/user/info file:///Users/me/mock/user.json

# 注入 vConsole 到页面（无需修改代码）
example.com js:///Users/me/scripts/vconsole-inject.js

# 修改响应状态码
api.example.com/status statusCode://500

# 模拟网络延迟（3 秒）
api.example.com reqDelay://3000 resDelay://3000

# 替换线上 JS 为本地文件（调试线上压缩代码）
example.com/app.js file:///Users/me/project/dist/app.js
```

Whistle 的优势在于规则化配置，可以保存为文件版本管理，团队成员共享同一套代理规则。配合 Weinre（Web Inspector Remote）还可以实现类似 Safari/Chrome 远程调试的功能，但更通用（跨平台、跨浏览器）。

---

## 常见排查方法

### 白屏排查流程

页面白屏是最常见的前端事故之一。根本原因是「页面未能正常渲染任何可见内容」。需要按照以下步骤系统排查：

**排查步骤（由快到慢）**：

```text
1. 控制台（Console）—— 是否有 JS 报错？
   ├── 有报错 → 根据错误堆栈定位并修复
   └── 无报错 → 继续排查

2. 网络（Network）—— JS/CSS 资源是否加载成功？
   ├── 4xx/5xx → 检查部署产物是否完整、CDN 是否正常
   ├── 资源 0B → 检查打包配置、路由懒加载
   └── 正常 → 继续排查

3. Elements —— DOM 中是否有内容？
   ├── 空 #app → JS 未执行挂载（检查 main.js 入口、框架初始化）
   ├── 有 DOM 但不可见 → 排查 CSS（display:none / opacity:0 / z-index 遮挡）
   └── 正常 → 继续排查

4. 路由 —— URL 路径是否与路由配置匹配？
   ├── 不匹配 → 检查路由守卫、重定向、base 配置
   └── 匹配 → 检查对应页面组件是否正确导出

5. 兼容性 —— 是否特定浏览器/版本问题？
   ├── Babel/polyfill 配置是否遗漏了目标浏览器
   └── 是否使用了不支持的 API（如旧浏览器不支持 Promise/Proxy）
```

```js
// 在入口文件添加白屏检测代码
window.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app');

  // 3 秒后检测 #app 是否仍为空或有内容但不可见
  setTimeout(() => {
    const hasContent = root && root.children.length > 0;
    const isVisible = root && root.offsetHeight > 0;

    if (!hasContent) {
      reportError({ type: 'whiteScreen', detail: 'No DOM content in #app' });
    } else if (!isVisible) {
      const styles = window.getComputedStyle(root);
      reportError({
        type: 'whiteScreen',
        detail: `#app has content but invisible: display=${styles.display}, height=${styles.height}`,
      });
    }
  }, 3000);
});
```

### 接口报错排查

接口报错排查需要从前端请求、网络链路、后端服务三个层面逐层定位。根据 HTTP 状态码可以快速缩小范围。

**状态码分类排查**：

| 状态码 | 常见原因 | 排查方向 |
|-------|---------|---------|
| 400 Bad Request | 请求参数格式/类型错误 | 对照接口文档检查 query/body 字段 |
| 401 Unauthorized | Token 过期或未携带 | 检查 Authorization header、Cookie |
| 403 Forbidden | 无权限访问 | 检查用户角色、接口权限配置 |
| 404 Not Found | 接口路径错误或资源不存在 | 检查 baseURL、API 路由配置 |
| 405 Method Not Allowed | HTTP 方法错误 | 确认 GET/POST/PUT/DELETE |
| 500 Internal Server Error | 服务端异常 | 查看服务端日志 |
| 502 Bad Gateway | 上游服务无响应 | 检查 Nginx upstream 健康状态 |
| 504 Gateway Timeout | 上游服务响应超时 | 检查超时配置、慢查询 |

**跨域问题（CORS）排查**：

跨域错误表现为请求被浏览器拦截，控制台报 `Access-Control-Allow-Origin` 相关错误。解决方案是在服务端配置 CORS 响应头，而非前端绕过。

```nginx
# Nginx 跨域配置
location /api {
    add_header Access-Control-Allow-Origin $http_origin;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type, Authorization";
    add_header Access-Control-Allow-Credentials "true";

    # 预检请求（OPTIONS）直接返回 204
    if ($request_method = OPTIONS) {
        return 204;
    }

    proxy_pass http://backend:3000;
}
```

**超时排查**：接口超时常见原因包括后端处理慢（慢查询、大量计算）、网络波动、请求未设置超时导致无限等待。

```js
// 前端请求超时控制
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 秒超时

try {
  const res = await fetch('/api/data', {
    signal: controller.signal,
  });
  clearTimeout(timeoutId);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
} catch (err) {
  if (err.name === 'AbortError') {
    console.error('请求超时被取消');
    // 可选：显示重试按钮
  } else {
    console.error('请求失败:', err.message);
  }
}
```

### 样式问题排查

样式问题通常比逻辑 Bug 更难排查，因为 CSS 的层叠、继承、优先级机制复杂且静默（不报错）。以下是高效的排查方法和常见陷阱。

**排查工具与技巧**：

1. **Computed 面板溯源**：在 Elements 面板选中元素，切换到 Computed 子面板。找到不生效的属性，点击左侧箭头展开，查看最终生效的值来自哪条 CSS 规则。如果某个属性根本没出现在 Computed 中，说明没有任何规则设置它。

2. **Styles 面板删除线**：Styles 窗格中被覆盖的规则会显示删除线。鼠标悬停可看到提示（如 \"被更具体的选择器覆盖\"）。这直接反映了优先级冲突。

3. **`:hov` 强制伪类**：Styles 窗格顶部有 `:hov` 按钮，可强制触发 `:hover`、`:active`、`:focus`、`:visited`、`:focus-within` 等状态，方便调试交互样式。

```css
/* 常见优先级问题示例 */
/* 优先级：0-0-1 */
p { color: red; }

/* 优先级：0-1-1 —— 颜色是蓝色 */
.content p { color: blue; }

/* 优先级：0-2-0 —— class 选择器高于元素选择器 */
.content .text { color: green; }

/* 优先级：1-0-0 —— ID 选择器最高（但应尽量避免使用 ID 选择器写样式） */
#main p { color: orange; }

/* 如果以上都不生效，检查是否被 !important 覆盖，
   或者样式是否被内联 style 属性覆盖（最高优先级） */
```

**层叠上下文（Stacking Context）排查**：

`z-index` 不生效的常见原因是元素处于不同的层叠上下文中。`z-index` 只在同一层叠上下文中比较。创建层叠上下文的常见方式：`position: relative/absolute/fixed` + `z-index` 不为 `auto`；`opacity` < 1；`transform`、`filter`、`perspective` 不为 `none`；`will-change` 为上述属性。

```html
<style>
  .parent-a {
    position: relative;
    z-index: 1; /* 创建了层叠上下文 */
  }
  .child-a {
    position: absolute;
    z-index: 9999; /* 无法超越 .parent-b 的 z-index: 2 */
  }
  .parent-b {
    position: relative;
    z-index: 2; /* 在更高层叠上下文中 */
  }
</style>
```

**常见样式排查清单**：

| 现象 | 可能原因 | 排查方法 |
|------|---------|---------|
| 样式完全不生效 | 选择器未匹配 / 样式文件未加载 | Elements 面板检查元素、Network 检查 CSS 加载 |
| 样式被覆盖（有删除线） | 优先级低 / 加载顺序 | 查看 Computed 溯源 |
| `z-index` 无效 | 处于不同层叠上下文 | 检查父元素是否创建了 stacking context |
| 宽/高百分比无效 | 父元素未设置高度 / 未脱离标准流 | 检查父元素 computed height |
| flex/grid 子元素不按预期排列 | 父元素未设置 `display: flex/grid` | Elements 面板查看 computed display 值 |
| `overflow: hidden` 无效 | 子元素 position absolute 脱离流 | 给父容器加 `position: relative` |
| 伪元素内容不显示 | 缺少 `content` 属性 / display 问题 | 检查 `content: ''` 是否设置 |
