# 快速启动指南

## 开发环境

```bash
# 1. 清除缓存
Remove-Item -Recurse -Force .next

# 2. 启动开发服务器
pnpm run dev

# 3. 访问
# http://localhost:3000
```

## 生产环境

```bash
# 1. 清除缓存
Remove-Item -Recurse -Force .next

# 2. 构建（需要 3-5 分钟）
pnpm run build

# 3. 启动生产服务器
pnpm start

# 4. 访问
# http://localhost:3000
```

## 如果遇到错误

### 错误：Cannot find module './vendor-chunks/@supabase.js'

**解决方案：**
```bash
# 完全清理
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue

# 重新构建
pnpm run build
```

### 错误：Application error

**临时解决：** 刷新浏览器页面（F5）

**永久解决：** 已在代码中修复，重新构建即可

## 优化总结

✅ **已完成的优化：**
- 依赖版本优化
- TypeScript 严格模式
- 类型安全修复（21 个错误）
- 安全响应头
- 性能配置
- 生产环境错误修复

✅ **验证状态：**
- TypeScript: 0 errors
- ESLint: 通过
- 构建: 成功

## 注意事项

1. **构建时间长** - 正常现象，首次构建需要 3-5 分钟
2. **开发环境错误** - 刷新页面即可解决
3. **生产环境** - 已添加错误边界，更稳定

## 文档

- `FINAL_SUMMARY.md` - 完整优化总结
- `PRODUCTION_FIX.md` - 生产环境修复详情
- `TROUBLESHOOTING.md` - 故障排查
- `OPTIMIZATION_SUMMARY.md` - 详细优化说明

## 支持

如有问题，请查看相关文档或提供：
- 浏览器控制台错误
- 终端错误信息
- 具体操作步骤
