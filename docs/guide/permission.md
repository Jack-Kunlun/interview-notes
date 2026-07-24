---
title: 权限控制 & 架构设计
description: RBAC、动态路由、多租户、Token 无感刷新
---

# 权限控制 & 架构设计

## 必会基础 ⭐⭐⭐

- [ ] RBAC 模型：User → Role → Permission 三层映射
- [ ] 前端动态路由：从接口获取权限菜单 → `router.addRoute` 动态注册
- [ ] 路由守卫：`beforeEach` 中验证 Token + 权限检查
- [ ] 按钮级权限：自定义指令 `v-permission` / `v-has-role`

## 进阶考点 ⭐⭐

- [ ] Token 无感刷新：双 Token 方案（Access Token + Refresh Token）
- [ ] 多租户架构：子域名隔离 / 路径前缀隔离 / 数据库 Schema 隔离
- [ ] 微前端权限隔离：主应用统一鉴权，子应用接收权限上下文

## 动态路由实现

```ts
// router/index.ts
const router = createRouter({ ... })

// 登录后从接口获取菜单，动态注册路由
async function setupPermissions(roles: string[]) {
  const menuRoutes = await fetchMenuRoutes(roles)
  menuRoutes.forEach(route => router.addRoute(route))
}

// 路由守卫
router.beforeEach(async (to, _, next) => {
  const token = useUserStore().token
  if (!token) return next('/login')
  if (!store.rolesLoaded) {
    await setupPermissions(store.roles)
    return next(to.fullPath)  // 重定向到原目标
  }
  next()
})
```

## 按钮级权限指令

```ts
// directives/permission.ts
app.directive('permission', {
  mounted(el, binding) {
    const userPermissions = useUserStore().permissions
    if (!userPermissions.includes(binding.value)) {
      el.remove()  // 或 el.style.display = 'none'
    }
  }
})
```

```html
<button v-permission="'user:delete'">删除</button>
```

## Token 无感刷新流程

```
1. 请求 API → 收到 401（Access Token 过期）
2. axios 拦截器：暂停其他请求，用 Refresh Token 换新 Access Token
3. 更新本地 Token，重新发送刚才失败的请求
4. 若 Refresh Token 也过期 → 强制登出
```
