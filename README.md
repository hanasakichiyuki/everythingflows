# 万物流转 · Everything Flows

个人站点 [flows.xin](https://flows.xin) — 博客为主，预留工具与 AI 扩展。

仓库：[github.com/hanasakichiyuki/everythingflows](https://github.com/hanasakichiyuki/everythingflows)

## 功能

| 功能 | 实现 |
|------|------|
| 写文章 | `/admin` 富文本 → 发布到 **Supabase** |
| 标签 / 归档 / 搜索 | 从 Supabase 查询 |
| B 站视频 | 旧 MDX 文章仍支持 `<Bilibili />`；新文章可嵌入 iframe |
| 评论 | Giscus（`site.config.json`） |
| 暗色模式 | next-themes |
| 网易云音乐 | MetingJS + APlayer（`site.config.json`） |
| 多语言 | next-intl（中/英） |

## 技术栈

- **前端**: Next.js 14, React 18, Tailwind CSS, TypeScript
- **内容**: Supabase PostgreSQL（`DATA_PROVIDER=supabase`）
- **备选**: `DATA_PROVIDER=filesystem` 时仍可读 `content/blog/*.mdx`
- **评论**: Giscus
- **部署**: Vercel（推荐）

## 快速开始

```bash
npm install
cp .env.example .env.local
# 编辑 .env.local：填入 Supabase URL、keys、ADMIN_SECRET
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## Supabase 配置

1. 在 [Supabase Dashboard](https://supabase.com/dashboard) 创建项目。
2. 在 **SQL Editor** 执行仓库内 [`supabase/schema.sql`](supabase/schema.sql)。
3. `.env.local` 示例：

```env
DATA_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_SECRET=your-long-secret
```

4. 访问 `/admin`，填写管理密钥（与 `ADMIN_SECRET` 一致），写作后点击 **发布**。

详见 [`src/lib/api/supabase/README.md`](src/lib/api/supabase/README.md)。

## 其他配置

1. **`site.config.json`** — 站点名、头像、GitHub、网易云、Giscus
2. **头像** — `public/avatar/avatar.png`
3. **评论** — [giscus.app](https://giscus.app) 配置 `repoId` / `categoryId`

## 部署 Vercel

1. 导入 [GitHub 仓库](https://github.com/hanasakichiyuki/everythingflows)
2. 环境变量：`.env.example` 中 Supabase 与 `ADMIN_SECRET` 全部填入
3. `NEXT_PUBLIC_SITE_URL=https://flows.xin`
4. 域名 CNAME 到 Vercel

## 目录结构

```
supabase/schema.sql    # 数据库表
site.config.json
src/
  app/[locale]/        # 页面（i18n）
  app/actions/         # 发布 Server Action
  app/api/             # REST API
  lib/api/supabase/    # Supabase 数据层
  components/admin/    # 富文本编辑器
messages/
```

## 许可证

MIT
