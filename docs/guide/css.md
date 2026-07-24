---
title: CSS 基础 & 组件库
description: Tailwind CSS、Ant Design Vue、组件封装
---

# CSS 基础 & 组件库

## 必会基础 ⭐⭐⭐

### Tailwind CSS：utility-first、`@apply` / `@layer` / 主题扩展（`theme.extend`）

Tailwind CSS 采用 **utility-first**（原子化）设计理念，通过直接在 HTML 中组合大量单一用途的 class 来构建界面，避免手写自定义 CSS。`@apply` 指令用于将一组工具类抽取为可复用的 CSS 规则，减少模板中重复的 class 组合。`@layer` 用于控制样式优先级（`base` → `components` → `utilities`），配合 `theme.extend` 可在不覆盖默认主题的前提下扩展品牌色、间距、字体等设计令牌。

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

```css
/* @apply / @layer 示例 */
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-primary text-white rounded-lg hover:bg-brand-500;
  }
}
```

### Ant Design Vue：Form 表单验证、Table 自定义列、Tree / Menu 数据驱动

Ant Design Vue 的 **Form** 组件通过 `rules` 声明式配置校验规则，`a-form-item` 的 `name` 属性绑定字段路径，调用 `formRef.validate()` 即可触发全量校验。**Table** 的列通过 `columns` 数组定义，支持 `customRender` / `slots` 实现自定义单元格渲染（如操作按钮、状态标签）。**Tree / Menu** 均采用 `tree-data` 数据驱动模式，传入嵌套的 `children` 数组即可递归渲染，选中态由 `v-model:selectedKeys` 双向绑定控制。

```vue
<!-- Form 表单验证 -->
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

```vue
<!-- Table 自定义列（插槽方式） -->
<a-table :columns="columns" :data-source="data">
  <template #bodyCell="{ column, record }">
    <template v-if="column.key === 'action'">
      <a-button type="link" @click="handleEdit(record)">编辑</a-button>
    </template>
  </template>
</a-table>

<script setup>
const columns = [
  { title: '姓名', dataIndex: 'name', key: 'name' },
  { title: '操作', key: 'action', width: 120 }
]
</script>
```

```vue
<!-- Tree / Menu 数据驱动 -->
<a-tree
  :tree-data="treeData"
  v-model:selectedKeys="selectedKeys"
  :field-names="{ children: 'children', title: 'label', key: 'id' }"
/>

<script setup>
const treeData = [
  { id: '1', label: '根节点', children: [{ id: '1-1', label: '子节点' }] }
]
</script>
```

### 受控组件封装：`v-model` 透传、`defineProps` + `defineEmits`

封装受控组件的核心是利用 Vue 3 的 `v-model` 语法糖：父组件通过 `v-model:value` 传入 prop，子组件通过 `defineProps` 接收、`defineEmits('update:value')` 触发更新，实现数据的单向流动和双向绑定。对于多个 `v-model` 场景，可指定不同的参数名（如 `v-model:visible`），每个参数对应独立的 prop 和 emit 事件。封装时注意 `inheritAttrs: false` 配合 `useAttrs()` 可避免非 prop 属性自动继承到根元素。

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
