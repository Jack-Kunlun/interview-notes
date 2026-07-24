---
title: CSS 基础 & 组件库
description: Tailwind CSS、Ant Design Vue、组件封装
---

# CSS 基础 & 组件库

## 必会基础 ⭐⭐⭐

- [ ] Tailwind CSS：utility-first、`@apply` / `@layer` / 主题扩展（`theme.extend`）
- [ ] Ant Design Vue：Form 表单验证、Table 自定义列、Tree / Menu 数据驱动
- [ ] 受控组件封装：`v-model` 透传、`defineProps` + `defineEmits`

## Tailwind CSS 主题配置

```js
// tailwind.config.js
export default {
  content: ['./src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3eaf7c',
        brand: { 50: '#f0fdf4', 500: '#22c55e' }
      }
    }
  }
}
```

## Ant Design Vue Form 核心用法

```vue
<a-form :model="form" :rules="rules" ref="formRef">
  <a-form-item label="用户名" name="username">
    <a-input v-model:value="form.username" />
  </a-form-item>
</a-form>

<script setup>
const rules = {
  username: [
    { required: true, message: '请输入用户名' },
    { min: 3, max: 20, message: '长度 3-20 位' }
  ]
}
const formRef = ref()

// 提交前校验
await formRef.value.validate()
// 重置
formRef.value.resetFields()
</script>
```

## 受控组件封装示例

```vue
<!-- 父组件 -->
<MyInput v-model:value="val" />

<!-- MyInput 内部 -->
<template>
  <input :value="props.value" @input="emit('update:value', $event.target.value)" />
</template>
<script setup>
const props = defineProps(['value'])
const emit = defineEmits(['update:value'])
</script>
```
