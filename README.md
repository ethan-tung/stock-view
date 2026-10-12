# 股票查看 Stock View

基于 Next.js + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query + Lightweight Charts
构建的股票行情查看站点。支持 A股 / 港股 / 美股搜索、报价、分时图、K线图、自选股（localStorage）、
市场指数、暗色模式与响应式布局。

> 数据源为腾讯免费行情接口（覆盖 A股/港股/美股，无需 Key），通过 Next.js API Routes 代理；
> 也可以用 `DATA_SOURCE=mock` 切回内置模拟数据。

## 功能

- 🔍 股票搜索：按代码或名称，支持 A股/港股/美股筛选（防抖）
- 📈 实时报价：价格、涨跌幅、今开/昨收/最高/最低、成交量/成交额（15s 轮询）
- 📊 分时图：价格面积图 + 均价线 + 昨收参考线
- 🕯️ K线图：日K蜡烛图 + 成交量，1M/3M/6M/1Y 切换
- ⭐ 自选股：localStorage 持久化，首页批量报价（30s 轮询）
- 🌍 市场指数：上证/深证/创业板/恒生/纳斯达克/标普500/道琼斯
- 🌗 暗色模式：跟随系统，可手动切换
- 📱 响应式布局：手机 / 平板 / 桌面自适应

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 复制环境变量（可选，默认即为 mock 数据源）
cp .env.example .env.local

# 3. 启动开发服务器
npm run dev
```

浏览器打开 http://localhost:3000。

```bash
# 生产构建
npm run build
npm start
```

## 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `DATA_SOURCE` | 数据源 id：`tencent`（默认，实时行情）/ `mock`（模拟数据） | `tencent` |
| `NEXT_PUBLIC_DATA_SOURCE_LABEL` | 首页徽标显示的数据源名称（公开） | `实时行情` |
| `TWELVEDATA_API_KEY` | 真实数据源示例 Key（仅服务端使用） | — |

## 项目结构

```
app/
  page.tsx                 首页（指数 + 搜索 + 自选股）
  stock/[symbol]/page.tsx  股票详情页（报价 + 分时/K线）
  api/
    search/route.ts        代理：股票搜索
    quote/route.ts         代理：实时报价
    intraday/route.ts      代理：分时数据
    klines/route.ts        代理：K线数据
    indices/route.ts       代理：市场指数
components/
  ui/                      shadcn/ui 风格基础组件
  charts/                  分时图 / K线图（Lightweight Charts）
  search-bar.tsx indices-bar.tsx watchlist-button.tsx ...
hooks/
  use-market-data.ts       TanStack Query 数据 hooks
  use-watchlist.ts         自选股（localStorage）
lib/
  types.ts                 类型定义
  data-source.ts           MarketDataSource 接口
  sources/
    mock.ts                Mock 数据源实现
    registry.ts            数据源注册表（按 DATA_SOURCE 切换）
  format.ts utils.ts
```

## 架构说明：为什么经过 API Routes

前端不直接请求第三方行情接口，而是走 Next.js API Routes 代理：

1. **隐藏 API Key**：Key 只存在于服务端环境变量，浏览器 Network 面板看不到
2. **数据源可切换**：`MarketDataSource` 接口 + `registry.ts` 注册表，加新源只需实现接口
3. **统一收口**：鉴权、限流、缓存以后都在这一层加

## 数据源说明

默认数据源 `tencent`（`lib/sources/tencent.ts`）基于腾讯公开行情接口，已实测字段：

| 接口 | 用途 |
|---|---|
| `qt.gtimg.cn/q=` | 实时报价（A/港/美字段位置分别适配） |
| `smartbox.gtimg.cn/s3/` | 股票搜索（代码/名称/拼音） |
| `ifzq.gtimg.cn/appstock/app/minute/query` | 分时数据（A股/港股） |
| `ifzq.gtimg.cn/appstock/app/fqkline/get` | 日K（前复权，A股/港股） |
| Yahoo Finance chart | 美股分时/日K（腾讯美股历史数据不全） |

免费接口存在一定延迟，页面上会标注「延迟行情」。`mock` 数据源保留用于离线开发。

## 接入其他数据源

1. 在 `lib/sources/` 下新建文件实现 `MarketDataSource` 接口，例如 `twelvedata.ts`
2. 在 `lib/sources/registry.ts` 的 `registry` 中注册：`twelvedata: twelveDataSource`
3. `.env.local` 中设置 `DATA_SOURCE=twelvedata`，Key 只在服务端用 `process.env.XXX` 读取
4. 前端代码无需任何改动

参考：
- 美股：[TwelveData](https://twelvedata.com/)（有免费额度，需 Key）
- A股/港股：新浪 `hq.sinajs.cn` / 腾讯 `qt.gtimg.cn` 免费接口（无 Key，注意跨域——走 API Routes 代理正好解决）

## 部署

### Vercel（推荐）

1. 将代码推送到 GitHub
2. 在 [vercel.com](https://vercel.com) 导入仓库，一路默认即可
3. 如需环境变量，在 Project Settings → Environment Variables 中添加
4. 每次 push 自动构建部署

### Docker

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

配合 `next.config.ts` 中设置 `output: "standalone"` 使用。

### 自有服务器

```bash
npm ci && npm run build
npm start -- -p 3000
# 建议用 pm2 / systemd 托管，Nginx 反向代理
```

## 说明

- 行情数据仅供学习演示，不构成投资建议
- 腾讯免费接口有调用频率限制，请勿高频刷新；报价轮询已设为 15s/30s
