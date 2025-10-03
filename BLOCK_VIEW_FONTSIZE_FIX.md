# Block View 组件字号修复 🔧

**问题：** Project, Education, Campus Block View 组件使用了固定字号类（text-xs, text-sm）  
**影响：** 行业、职位等字段在调整字号后不响应  
**状态：** 需要批量修复

---

## 需要修复的文件

### 1. ✅ ExperienceBlockView (已修复)
- `src/components/blocks/experience-block-view.tsx`
- 日期：text-sm → fontSize: '0.875em'
- 公司名称：text-sm → fontSize: '0.875em'
- 职位/行业容器：text-xs → fontSize: '0.75em'
- 输入框：移除 text-sm/text-xs
- 富文本编辑器：移除 text-xs

### 2. ❌ ProjectBlockView (需要修复)
- `src/components/blocks/project-block-view.tsx`
- Line 95: className="... text-sm ..." → 移除 text-sm
- Line 100: className="... text-sm" → style={{ fontSize: '0.875em' }}
- Line 109: className="... text-xs ..." → style={{ fontSize: '0.75em' }}
- Line 118: className="... text-xs" → 移除
- Line 141: className="... text-xs" → 移除
- Line 157: className="text-xs ..." → style={{ fontSize: '0.75em' }}
- Line 189: className="text-xs ..." → 移除

### 3. ❌ EducationBlockView (需要修复)
- `src/components/blocks/education-block-view.tsx`
- Line 88: className="... text-sm ..." → style={{ fontSize: '0.875em' }}
- Line 163: className="... text-xs ..." → style={{ fontSize: '0.75em' }}
- Line 172: className="... text-xs" → 移除
- Line 195: className="... text-xs" → 移除
- Line 217: className="text-xs ..." → 移除

### 4. ❌ CampusBlockView (需要修复)
- `src/components/blocks/campus-block-view.tsx`
- Line 86: className="... text-sm ..." → style={{ fontSize: '0.875em' }}
- Line 95: className="... text-sm" → 移除
- Line 118: className="... text-sm" → 移除
- Line 141: className="... text-sm ..." → 移除
- Line 146: className="... text-sm" → style={{ fontSize: '0.875em' }}
- Line 156: className="text-xs ..." → style={{ fontSize: '0.75em' }}
- Line 187: className="text-xs ..." → 移除

---

## 修复原则

### 显示元素（span, div）
```typescript
// ❌ 错误
className="text-sm text-gray-600"

// ✅ 正确
className="text-gray-600" style={{ fontSize: '0.875em' }}
```

### 输入框（input）
```typescript
// ❌ 错误
className="... text-sm border ..."

// ✅ 正确
className="... border ..."  // 继承父元素字号
```

### 富文本编辑器
```typescript
// ❌ 错误
<InlineEditor className="text-xs leading-relaxed" />

// ✅ 正确
<InlineEditor className="leading-relaxed" />
```

---

## 字号对应表

| Tailwind 类 | 相对单位 | 说明 |
|-------------|---------|------|
| text-xs | 0.75em | 12px @ 16px base |
| text-sm | 0.875em | 14px @ 16px base |
| text-base | 1em | 16px @ 16px base |
| text-lg | 1.125em | 18px @ 16px base |

---

## 快速修复命令

可以使用全局搜索替换（注意备份）：

### 模式 1: 移除输入框的 text-sm/text-xs
```
搜索: className="([^"]*)(text-xs|text-sm)([^"]*)"
     （在 input 元素中）
替换: className="$1$3"
```

### 模式 2: span/div 添加 inline style
需要手动逐个修复，因为需要添加 style 属性。

---

## 验证清单

修复后需要验证：

- [ ] 调整字号到 20px
- [ ] Project Block
  - [ ] 项目名称字号正确
  - [ ] 日期字号正确
  - [ ] 角色字号正确
  - [ ] 内容字号正确
- [ ] Education Block
  - [ ] 学校名称字号正确
  - [ ] 日期字号正确
  - [ ] 专业/学历字号正确
  - [ ] 课程字号正确
- [ ] Campus Block
  - [ ] 日期字号正确
  - [ ] 组织名称字号正确
  - [ ] 职位字号正确
  - [ ] 内容字号正确

---

**下一步：** 修复 ProjectBlockView, EducationBlockView, CampusBlockView
