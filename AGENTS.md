# 美剧生词采集器 (TV Show Vocab Collector)

## 项目概览

一个全栈 Web 应用，用户搜索并选择任意美剧（数据源 springfieldspringfield.co.uk）的季/集，系统抓取英文剧本、识别生词（含音标、中文释义、考试标签、剧中原句），由用户自行勾选后一键推送到欧路词典生词本或墨墨背单词云词本。搜索不到该剧时给出明确提示。

## 技术栈

- **前端**: React 19 + Vite 6 + TypeScript 5 + Tailwind CSS 3
- **后端**: Express 4 + TypeScript (tsx watch 开发模式)
- **构建**: tsup (服务端打包) + Vite (前端打包)

## 目录结构

```
├── server/
│   ├── cache.ts           # 进程内有界 TTL 缓存（内存，不落盘）
│   ├── routes/
│   │   ├── index.ts        # API 路由 (/api/shows, /api/episodes, /api/transcript)
│   │   └── maimemo.ts      # 墨墨 API 代理 (/api/maimemo/*)
│   ├── server.ts           # Express 服务入口
│   └── vite.ts             # Vite 中间件集成
├── src/
│   ├── App.tsx             # 主应用组件
│   ├── main.tsx            # React 入口
│   ├── index.css           # 全局样式 (Tailwind)
│   ├── types.ts            # TypeScript 类型定义
│   ├── components/
│   │   ├── Settings.tsx    # 设置面板 (欧路/墨墨 token 配置)
│   │   ├── EpisodeSelector.tsx  # 季/集选择器
│   │   ├── WordList.tsx    # 生词列表 (搜索/筛选/勾选)
│   │   ├── BottomBar.tsx   # 底部操作栏 (推送到欧路/墨墨)
│   │   └── ResultDialog.tsx # 推送结果弹窗
│   ├── services/
│   │   ├── api.ts          # 后端 API 调用
│   │   ├── dict.ts         # 词典加载与生词识别
│   │   ├── eudic.ts        # 欧路词典 API 对接
│   │   └── maimemo.ts      # 墨墨背单词 API 对接
│   └── hooks/
│       └── useLocalStorage.ts  # localStorage Hook
├── data/
│   ├── dict.json           # 精简英汉词典 (~40KB)
│   ├── lemma.json          # 词形还原映射 (~109KB)
│   └── cache/              # 剧本缓存目录
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
| `/api/maimemo/notepads` | GET / POST | 墨墨云词本列表 / 新建（代理） |
| `/api/maimemo/notepads/:id` | GET / POST | 墨墨云词本详情 / 更新（代理） |
| `/data/dict.json` | GET | 静态词典数据 |
| `/data/lemma.json` | GET | 静态词形还原映射 |

## 核心功能

1. **剧集搜索**: 后端代理 springfieldspringfield.co.uk 的站内搜索，支持任意美剧；搜不到时返回明确提示
2. **剧本抓取**: 季/集目录与单集剧本均从站点实时扒取；缓存只放在进程内存（有界 LRU + TTL）和浏览器 HTTP 缓存，**不写服务端磁盘**
3. **生词识别**: 基于 ECDICT 词典数据，支持词形还原、难度分档（高考/四六级/考研雅思）；生成后默认不勾选，由用户自选
4. **欧路词典对接**: 前端直连 API，支持列生词本、批量加词
5. **墨墨背单词对接**: 经 `/api/maimemo/*` 后端代理，支持列云词本、新建/追加/覆盖写入
6. **本地存储**: 所有 token、上一次选择的剧集和偏好设置仅存于浏览器 localStorage

## 注意事项

- 后端不存储用户 token，所有敏感信息仅在浏览器端
- 剧本/剧集目录**不落服务端磁盘**：原来写在 `data/cache/` 的 JSON 已删除（目录已加入 `.gitignore`），改为 `server/cache.ts` 的有界内存缓存 + 响应头 `Cache-Control`
- 词典数据为内置精简版，覆盖四六级到 GRE 核心词汇
- 欧路 API 支持浏览器直连（预检返回 `Access-Control-Allow-Origin: *` 与 `Access-Control-Allow-Headers: authorization`）
- 墨墨 API **不支持**浏览器直连：对 OPTIONS 预检不返回任何 `Access-Control-*` 头，带 `Authorization` 的请求预检失败、真实请求发不出去；必须走 `/api/maimemo/*` 代理
- 墨墨 token 由前端放在 `X-Maimemo-Token` 头里，后端转成 `Authorization: Bearer <token>` 转发，仅在内存中传递、不落盘
