# 美剧生词采集器 (TV Show Vocab Collector)

## 项目概览

一个全栈 Web 应用，用户搜索并选择任意美剧（数据源 springfieldspringfield.co.uk）的季/集，系统抓取英文剧本、识别生词（含音标、中文释义、考试标签、剧中原句），由用户自行勾选后一键推送到欧路词典生词本或墨墨背单词云词本。搜索不到该剧时给出明确提示。

## 技术栈

- **前端**: React 19 + Vite 6 + TypeScript 5 + Tailwind CSS 3
- **后端**: Express 4 + TypeScript (tsx watch 开发模式)
- **构建**: tsup (服务端打包) + Vite (前端打包)

## 目录结构

```
├── functions/              # Cloudflare Pages Functions（线上后端，与 server/ 对应）
│   └── api/
│       ├── shows.ts        # /api/shows
│       ├── episodes.ts     # /api/episodes
│       ├── transcript.ts   # /api/transcript
│       ├── health.ts       # /api/health
│       └── maimemo/notepads/[[id]].ts  # /api/maimemo/notepads[/:id]
├── lib/upstream.ts         # Pages Functions 共用的抓取/解析（fetch + Cache API）
├── wrangler.toml           # Cloudflare Pages 配置（pages_build_output_dir = dist）
├── scripts/cf-build.mjs    # Pages 构建：vite build + 拷贝 data/*.json
├── server/
│   ├── cache.ts           # 进程内有界 TTL 缓存（内存，不落盘）
│   ├── routes/
│   │   ├── index.ts        # API 路由 (/api/shows, /api/episodes, /api/transcript)
│   │   └── maimemo.ts      # 墨墨 API 代理 (/api/maimemo/*)
│   ├── server.ts           # Express 服务入口
│   └── vite.ts             # Vite 中间件集成
├── src/
│   ├── App.tsx             # 主应用组件（hash 路由分发 + 全局状态）
│   ├── constants.ts        # 推荐剧集（海报路径、配色）
│   ├── main.tsx            # React 入口
│   ├── index.css           # 全局样式 (Tailwind)
│   ├── types.ts            # TypeScript 类型定义
│   ├── pages/
│   │   └── ShowsPage.tsx   # 选剧页（搜索 + 推荐海报）
│   ├── components/
│   │   ├── Settings.tsx    # 设置页 (欧路/墨墨 token 配置)
│   │   ├── EpisodeSelector.tsx  # 当前剧 + 季/集/难度选择
│   │   ├── WordList.tsx    # 生词列表 (搜索/筛选/勾选)
│   │   ├── BottomBar.tsx   # 底部操作栏 (推送到欧路/墨墨)
│   │   └── ResultDialog.tsx # 推送结果弹窗
│   ├── services/
│   │   ├── api.ts          # 后端 API 调用
│   │   ├── dict.ts         # 词典加载与生词识别
│   │   ├── eudic.ts        # 欧路词典 API 对接
│   │   └── maimemo.ts      # 墨墨背单词 API 对接
│   └── hooks/
│       ├── useLocalStorage.ts  # localStorage Hook
│       └── useHashRoute.ts     # 零依赖 hash 路由 (#/shows、#/settings)
├── public/
│   └── posters/            # 推荐剧集海报（自行补图，缺失走渐变占位）
├── data/
│   ├── dict.json           # 精简英汉词典 (~40KB)
│   └── lemma.json          # 词形还原映射 (~109KB)
├── scripts/
│   ├── generate-dict.mjs   # 词典数据生成脚本
│   ├── build.sh            # 构建脚本
│   ├── dev.sh              # 开发环境启动
│   └── start.sh            # 生产环境启动
├── index.html              # 入口 HTML
├── vite.config.ts          # Vite 配置
├── tailwind.config.js      # Tailwind 配置
└── .coze                   # Coze 平台配置
```

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式 (Express + Vite HMR)
pnpm run dev

# 构建生产版本
pnpm run build

# 启动生产服务
pnpm run start

# 类型检查
pnpm run ts-check

# 代码检查
pnpm run lint
```

## API 接口

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/shows?q=friends` | GET | 按关键词搜索美剧，返回 `[{ id, title }]`；无匹配时 `data: []` 并附带提示文案 |
| `/api/episodes?show=modern-family` | GET | 获取该剧按季分组的集目录；剧不存在返回 404 + 提示 |
| `/api/transcript?show=modern-family&season=1&episode=1` | GET | 获取指定集剧本对白行数组（响应带 `Cache-Control: public, max-age=86400`） |
| `/api/maimemo/*` | GET / POST / 其它 | 墨墨开放平台通用转发：`<任意路径>` → `https://open.maimemo.com/open/api/v1/<任意路径>`（前端用到 `memo/notepads`、`memo/vocabulary/query`、`memo/phrases`） |
| `/data/dict.json` | GET | 静态词典数据 |
| `/data/lemma.json` | GET | 静态词形还原映射 |

## 核心功能

1. **剧集搜索**: 后端代理 springfieldspringfield.co.uk 的站内搜索，支持任意美剧；搜不到时返回明确提示
2. **剧本抓取**: 季/集目录与单集剧本均从站点实时扒取；缓存只放在进程内存（有界 LRU + TTL）和浏览器 HTTP 缓存，**不写服务端磁盘**
3. **生词识别**: 基于 ECDICT 词典数据，支持词形还原、难度分档（高考/四六级/考研雅思）；生成后默认不勾选，由用户自选
4. **欧路词典对接**: 前端直连 API，默认批量加词；开启「写入剧中原句」时改为逐条调 `/studylist/word` 传 `context_line`（批量接口不支持语境字段）
5. **墨墨背单词对接**: 云词本列表/写入走直连（`limit ≤ 10`，被 CORS 拦截时回退 `/api/maimemo/*` 代理）；例句走 `/memo/phrases`，需先用 `/memo/vocabulary/query` 把拼写换成 `voc_id`（平台限制：每天最多创建 600 条内容）
6. **词典启用开关**: 设置页可分别关闭欧路/墨墨，关闭后主页不再显示该推送入口；同一批单词可分别重复推送，已推送状态按词典分别记录（`addedEudic` / `addedMaimemo`）
7. **本地存储**: 所有 token、上一次选择的剧集和偏好设置仅存于浏览器 localStorage

## 注意事项

- 后端不存储用户 token，所有敏感信息仅在浏览器端
- **部署在 Cloudflare Pages**：`functions/` 是线上后端，`server/` 是本地开发后端，两者接口一致但实现不同（Express + 内存缓存 vs Pages Functions + Cache API）。改抓取/解析逻辑请同步两边，`lib/upstream.ts` 只被 Functions 使用
- 剧本/剧集目录**不落服务端磁盘**：原来写在 `data/cache/` 的 JSON 已删除（目录已加入 `.gitignore`），改为 `server/cache.ts` 的有界内存缓存 + 响应头 `Cache-Control`
- 词典数据为内置精简版，覆盖四六级到 GRE 核心词汇
- 欧路 API 支持浏览器直连（预检返回 `Access-Control-Allow-Origin: *` 与 `Access-Control-Allow-Headers: authorization`）
- Token 失效统一抛 `TokenExpiredError`（`src/services/errors.ts`）：墨墨按 401 或 `errors.code === 'common_unauthorized'` 判定，欧路按 401/403 判定；UI 会提示"已过期，请到设置页重新填写"并给跳转按钮
- **墨墨开放平台的 CORS 支持不稳定**：实测（2026-10）其 OPTIONS 预检返回 204 但**不带任何 `Access-Control-*` 头**，401/GET 响应同样没有 `Access-Control-Allow-Origin`，因此带 `Authorization` 的直连在浏览器里通常会在预检阶段失败
  - 代码里的处理：先直连，捕获 `TypeError` 后回退 `/api/maimemo/*` 代理；若哪天平台放开 CORS，直连即自动生效，无需改代码
- 墨墨 token 走代理时由前端放在 `X-Maimemo-Token` 头里，后端转成 `Authorization: Bearer <token>` 转发，仅在内存中传递、不落盘
