---
title: 权限控制 & 架构设计
description: RBAC、动态路由、多租户、Token 无感刷新
---

# 权限控制 & 架构设计

## 权限模型与路由控制

### RBAC：User → Role → Permission 三层映射

RBAC 通过用户、角色、权限三层解耦实现灵活授权——用户不直接关联权限，角色作为中间桥接，管理员调整角色的权限集合即可批量生效。

| 层 | 说明 | 示例 |
|---|---|---|
| User（用户） | 系统使用者 | 张三、李四 |
| Role（角色） | 权限的集合 | admin、editor、viewer |
| Permission（权限） | 最小操作单元 | `user:create`、`user:delete` |

前端从接口获取角色列表，推导出扁平化权限标识数组，用于路由过滤和按钮显隐。

### 动态路由：`router.addRoute` 按需注册

初始化只注册公共路由（login、404），权限路由在登录后从接口拉取并逐条注入：

```ts
// 登录后从接口获取菜单，动态注册路由
async function setupPermissions(roles: string[]) {
  const menuRoutes = await fetchMenuRoutes(roles)
  menuRoutes.forEach(route => router.addRoute(route))
}
```

注意 `addRoute` 不会覆盖同名路由，切换角色时需先 `removeRoute` 清除旧路由再重新注册。

### 路由守卫：`beforeEach` 验证 Token + 加载权限

```ts
router.beforeEach(async (to, _, next) => {
  const token = useUserStore().token
  if (!token) return next('/login')
  if (!store.rolesLoaded) {
    await setupPermissions(store.roles)
    return next(to.fullPath)  // 权限加载完成后回到目标页
  }
  next()
})
```

### 按钮级权限：`v-permission` 指令

```ts
// directives/permission.ts
app.directive('permission', {
  mounted(el, binding) {
    const userPermissions = useUserStore().permissions
    if (!userPermissions.includes(binding.value)) {
      el.style.display = 'none'  // 用 display:none 保留节点，权限变化时可恢复
    }
  }
})
```

```html
<button v-permission="'user:delete'">删除</button>
```

> RBAC 落地分三层——路由层 `addRoute` 控制能不能进页面，守卫层 `beforeEach` 统一做 Token 校验和权限加载，按钮层 `v-permission` 控制能不能点按钮。刷新后路由丢失问题：pinia store 从 localStorage 恢复 token/roles，`beforeEach` 中检查 `rolesLoaded` 标记，false 则重新拉菜单并 `addRoute`，再 `next(to.fullPath)` 回到目标页，用户无感知。按钮权限恢复问题：如果用 `el.remove()` 物理删除 DOM，切换角色后按钮回不来；改用 `el.style.display = 'none'` 保留节点，配合 `updated` 钩子做动态切换；或者封装 `<PermissionGuard>` 组件用 `v-if`，更符合 Vue 响应式心智。
>
> RBAC 适合绝大多数后台系统；如果业务需要"用户只能看自己部门 + 创建时间在 30 天内"这种带属性的规则，升级到 ABAC，但复杂度高，小项目慎入。

## Token 无感刷新

### 双 Token 方案

Access Token 短期有效（15-30 分钟）降低泄露风险，Refresh Token 长期有效（7-30 天）用于续期：

```
1. 请求 API → 收到 401（Access Token 过期）
2. axios 拦截器：暂停其他请求，用 Refresh Token 换新 Access Token
3. 更新本地 Token，重放失败请求
4. Refresh Token 也过期 → 强制登出
```

实现要点：用 Promise 队列缓存并发请求避免多次刷新；Refresh Token 存 httpOnly Cookie 而非 localStorage。

> 并发刷新问题——同一时间 5 个请求全部 401，用"刷新锁"解决：第一个 401 设 `isRefreshing = true` 并发起刷新，后续 401 发现锁已存在，不重复请求，而是把 resolve/reject 塞进队列，刷新完成后 `queue.forEach(resolve)` 批量重放。Refresh Token 也过期→清空本地存储跳登录页。前端判断 JWT 过期：在 `beforeEach` 解码 token 的 exp 字段，exp < Date.now()/1000 则直接清空 state 跳登录，避免发必然 401 的无意义请求。
>
> 踩坑：早期用 `setTimeout(fn, 25 * 60 * 1000)` 每 25 分钟定时刷新，但 Chrome 对后台 tab 的定时器做节流（最小间隔 1 秒+），切 tab 回来 Token 已静默过期。正确做法：抛弃定时器，完全依赖 axios 响应拦截器被动判断 401 + 刷新锁。

## 多租户与微前端

### 多租户架构

同一套系统服务多个客户，核心差异在隔离粒度：

| 隔离策略 | 前端体现 | 适用场景 |
|---|---|---|
| 子域名隔离 | `{tenant}.example.com`，解析 `location.host` | SaaS 平台，需独立域名 |
| 路径前缀隔离 | `example.com/{tenant}/*`，路由 base 动态设定 | 中小型系统，部署简单 |
| Schema 隔离 | 前端无感知，后端按请求头分流 | 强数据隔离需求 |

前端通过 axios 请求头携带租户标识，或 `beforeEach` 从 URL 提取租户 ID 存 store。

### 微前端权限隔离

主应用负责登录、Token 管理和权限获取，子应用不重复实现鉴权。主应用通过 props 或 qiankun 的 `initGlobalState` 将 token/roles/permissions 下发给子应用，子应用在 `mount` 生命周期接收权限上下文后独立执行自己的路由守卫和按钮权限判断。

> 多租户数据隔离三选一——独立数据库最安全但运维成本高（金融/医疗）；共享数据库 + 独立 Schema 折中；共享表 + `tenant_id` 字段最省钱，但代码必须 100% 覆盖 WHERE 条件，漏一个就是跨租户数据泄露事故（适合内部工具或小体量 SaaS 起步阶段）。
>
> 微前端权限：主应用只负责"你是谁、有什么权限"的判断，子应用负责"怎么用这些权限控制 UI"——二者解耦，子应用权限逻辑自治，不依赖主应用框架。
