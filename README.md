# 餐饮连锁供应链协同系统

## 部署步骤

### 第一步：配置 Supabase

1. 注册 https://supabase.com 并新建项目
2. 进入 SQL Editor，依次执行 `supabase/schema.sql` 中的所有 SQL
3. 进入 Storage，创建两个 Bucket：
   - `delivery-photos`（私有）
   - `payment-proofs`（私有）
4. 进入 Settings → API，复制以下三个值：
   - Project URL
   - anon public key
   - service_role key

### 第二步：配置环境变量

复制 `.env.example` 为 `.env.local`，填入 Supabase 的三个值：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 第三步：本地运行

```bash
npm install
npm run dev
```

打开 http://localhost:3000

### 第四步：部署到 Vercel

1. 把代码推到 GitHub
2. 登录 https://vercel.com
3. Import 仓库
4. 填入环境变量（同 .env.local 的内容）
5. 点击 Deploy

## 用户角色说明

| 角色 | 权限 |
|------|------|
| boss（老板） | 查看全部数据、管理账号 |
| store_manager（店长） | 确认/驳回送货单 |
| supplier（供应商） | 创建送货单、查看付款状态 |
| finance（财务） | 标记付款、查看统计 |

## 技术栈

- Next.js 16 (App Router)
- TypeScript
- TailwindCSS + shadcn/ui
- Supabase (数据库 + 认证 + 存储)
- Vercel (部署)

---

**最后更新：** 2026-05-02
