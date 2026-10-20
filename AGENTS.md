# 摩登家庭生词采集器 (Modern Family Vocab Collector)

## 项目概览

一个全栈 Web 应用，用户选择《摩登家庭》季/集，系统自动抓取英文剧本，识别生词（含音标、中文释义、考试标签、剧中原句），支持一键推送到欧路词典生词本或墨墨背单词云词本。

## 技术栈

- **前端**: React 19 + Vite 6 + TypeScript 5 + Tailwind CSS 3
- **后端**: Express 4 + TypeScript (tsx watch 开发模式)
- **构建**: tsup (服务端打包) + Vite (前端打包)

## 目录结构

```
├── server/
│   ├── routes/
│   │   └── index.ts        # API 路由 (/api/episodes, /api/transcript)
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
| `/api/episodes` | GET | 获取全 11 季剧集目录 |
| `/api/transcript?season=1&episode=1` | GET | 获取指定集剧本对白行数组 |
| `/data/dict.json` | GET | 静态词典数据 |
| `/data/lemma.json` | GET | 静态词形还原映射 |

## 核心功能

1. **剧本抓取**: 后端代理抓取 springfieldspringfield.co.uk，服务端缓存避免重复请求
2. **生词识别**: 基于 ECDICT 词典数据，支持词形还原、难度分档（高考/四六级/考研雅思）
3. **欧路词典对接**: 前端直连 API，支持列生词本、批量加词、逐条附带例句
4. **墨墨背单词对接**: 前端直连 API，支持列云词本、新建/追加/覆盖写入
5. **本地存储**: 所有 token 和偏好设置仅存于浏览器 localStorage

## 注意事项

- 后端不存储用户 token，所有敏感信息仅在浏览器端
- 词典数据为内置精简版，覆盖四六级到 GRE 核心词汇
- 欧路/墨墨 API 均支持浏览器直接跨域调用
