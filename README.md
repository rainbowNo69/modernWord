# projects

这是一个基于 Express + Vite + TypeScript + Tailwind CSS 的全栈 Web 应用项目，由扣子编程 CLI 创建。

**核心特性：**
- 🚀 前端：Vite + TypeScript + Tailwind CSS
- 🔧 后端：Express + TypeScript，提供 RESTful API
- 🔥 开发模式：Vite HMR + Express API，单进程启动
- 📦 生产模式：Express 静态服务 + API，高性能部署

## 快速开始

### 启动开发服务器

```bash
pnpm dev
```

启动后，在浏览器中打开 [http://localhost:5000](http://localhost:5000) 查看应用。

开发服务器支持热更新（HMR），修改代码后页面会自动刷新。

### 构建生产版本

```bash
pnpm build
```

构建产物位于 `dist/`（前端）与 `dist-server/`（后端）目录。

### 预览生产版本

```bash
pnpm start
```

以生产模式启动构建产物（Express 静态服务 + API），预览生产构建的效果。

## 常用命令

全部在项目根目录执行，包管理器统一使用 pnpm。

| 命令 | 作用 |
| --- | --- |
| `pnpm install` | 安装依赖（`preinstall` 会拦截 npm/yarn，强制 pnpm） |
| `pnpm dev` | 开发模式：detach 启动 `tsx watch server/server.ts`，Express + Vite HMR 单进程，端口 5000；日志写 `logs/server.log`，PID 写 `logs/server.pid` |
| `pnpm dev:win` | 与 `pnpm dev` 等价的 Windows PowerShell 脚本（`scripts/dev.ps1`），Windows 下推荐 |
| `pnpm kill:port` | 释放端口占用（默认 5000 Express + 24678 旧版 Vite HMR），`/T` 连 pnpm → tsx → node 整个进程树一起杀 |
| `pnpm debug` | 先清端口，再以调试模式启动后端：`node --import tsx --inspect=9229 server/server.ts`，供 IDE 断点调试 |
| `pnpm debug:watch` | 同上，额外带 `--watch` 文件监听热重启，配合 IDE「附加到 9229」使用 |
| `pnpm build` / `pnpm build:win` | 构建前端 `dist/` + 后端 `dist-server/` |
| `pnpm start` / `pnpm start:win` | 以生产模式启动构建产物（Express 静态服务 + API） |
| `pnpm ts-check` | TypeScript 类型检查（`tsc --noEmit`） |
| `pnpm lint` / `pnpm lint:build` | ESLint 全量检查 / 只报错误（`--quiet`） |
| `pnpm lint:style` | stylelint 检查 `src/**/*.css` |
| `pnpm validate` / `pnpm validate:win` | 并行执行类型检查 + ESLint + stylelint |

### 数据与缓存

- 剧本、季/集目录全部来自 springfieldspringfield.co.uk，由后端实时扒取
- **服务端磁盘不缓存任何剧本**：上游数据只放在进程内的有界 LRU + TTL 缓存（`server/cache.ts`，剧本 50 条 / 目录 30 条 / 搜索 100 条，各 24h），进程重启即清空
- 单集剧本响应带 `Cache-Control: public, max-age=86400`，重复查看由浏览器缓存兜底，不会重复回源
- 用户 token、最近选择的剧集等只存在浏览器 localStorage

### 页面与路由

零依赖 hash 路由（`src/hooks/useHashRoute.ts`），URL 可刷新、可分享：

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `#/` | 采集页 | 当前剧 + 季/集/难度 → 生成生词表 → 勾选推送 |
| `#/shows` | 选剧页 | 搜索任意美剧，或点推荐海报《老友记》《摩登家庭》直接选 |
| `#/settings` | 设置页 | 配置欧路 / 墨墨 Token 与目标生词本（不常用，入口在顶栏左上角齿轮） |

推荐海报图片放在 `public/posters/`（`friends.jpg`、`modern-family.jpg`，建议 2:3）。**图片缺失时自动回退为渐变占位卡**，不影响功能；配色与路径在 `src/constants.ts` 的 `RECOMMENDED_SHOWS` 中改。

### 端口说明

- **5000**：Express HTTP 服务，同时承载前端页面、`/api/*` 与 `/data/*` 静态词典，Vite HMR 的 WebSocket 也复用该端口。
- **24678**：Vite 在 middleware 模式下 HMR WebSocket 的默认端口。本项目 `server/vite.ts` 本地开发时通过 `hmr: { server: httpServer }` 把 HMR 挂到 Express 的 http server 上，因此**不再单独监听 24678**（`/@vite/client` 也不会再注入该端口），多实例并存不会互相抢端口；`pnpm kill:port` 保留对它的清理，用于回收旧代码启动的残留进程。
  - 常见报错 `WebSocket server error: Port 24678 is already in use`：旧实例已占用该端口，新实例 HTTP 正常但 HMR 失效，`pnpm kill:port` 后重启即可。
- **6000**：仅在部署平台（`COZE_PROJECT_TYPE` / `COZE_EVAL` 存在）时使用，Vite 按 `vite.config.ts` 里的 `hmr.port` 自建 HMR 服务并由网关代理，本地不受影响。

### 调试后端（断点）

1. 先清掉正在运行的开发服务：`pnpm kill:port`（否则 5000 被占会 `EADDRINUSE` 直接退出）
2. 在 IDE 中打开 `server/**/*.ts`，行号左侧点击下断点（F9）
3. 任选一种方式启动：
   - 直接调试：运行和调试面板选 **「Server: 直接启动后端并调试」** → F5（等价于 `pnpm debug`）
   - 带热重启：终端执行 `pnpm debug:watch`，调试面板选 **「Server: 附加到 9229」** → F5（`restart: true`，重启后自动重连）
4. 触发请求命中断点：浏览器打开 `http://localhost:5000/`，或直接访问 `http://localhost:5000/api/transcript?season=1&episode=1`

配置位于 `.vscode/launch.json`（已在 `.gitignore` 中放行，可随仓库共享）。不想用 IDE 时，也可用 `edge://inspect` / `chrome://inspect` 连接 9229 端口调试。

## 项目结构

```
├── server/                # 后端服务器目录
│   ├── index.ts          # express 服务器入口
│   ├── routes/           # API 路由目录
│   │   └── index.ts      # 路由定义
│   └── vite.ts           # Vite 集成逻辑
├── src/                   # 前端源码目录
│   ├── index.ts          # 前端应用入口（初始化）
│   ├── main.ts           # 前端主逻辑文件
│   └── index.css         # 全局样式（包含 Tailwind 指令）
├── index.html            # HTML 入口文件
├── vite.config.ts        # Vite 配置
├── tailwind.config.ts    # Tailwind CSS 配置
└── tsconfig.json         # TypeScript 配置
```

**目录说明：**

- **`server/`** - 后端服务器代码
  - `server.ts` - 服务器主入口，负责创建和启动 Express 应用
  - `routes/` - API 路由模块，支持按功能拆分路由
  - `vite.ts` - Vite 开发服务器和静态文件服务集成

- **`src/`** - 前端应用代码
  - 所有前端相关代码都在这里

**工作原理：**

- **开发模式** (`pnpm dev`)：
  - 运行 `server/server.ts` 启动 Express 服务器
  - Vite 以 middleware 模式集成到 Express
  - 前端支持 HMR（热模块替换），HMR 的 WebSocket 复用 5000 端口
  - 后端 API 和前端在同一进程，端口 5000

- **生产模式** (`pnpm start`)：
  - `pnpm build` 构建前端 → `dist/` 目录
  - `pnpm build` 构建后端 → `dist-server/index.js` (CommonJS 格式)
  - 运行 `dist-server/index.js` 启动生产服务器
  - Express 服务静态文件 + API 路由
  - 单一 Node.js 进程，轻量高效

## 核心开发规范

### 1. 后端 API 开发

**添加新的 API 路由**

在 `server/routes/index.ts` 中添加路由：

```typescript
// GET 请求示例
router.get('/api/users', (req, res) => {
  res.json({
    users: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ],
  });
});

// POST 请求示例
router.post('/api/users', (req, res) => {
  const userData = req.body;
  // 处理业务逻辑
  res.json({
    success: true,
    user: userData,
  });
});

// 动态路由参数
router.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  res.json({
    id: userId,
    name: 'User ' + userId,
  });
});
```

**拆分路由模块**（推荐）

当路由变多时，可以按功能拆分：

```typescript
// server/routes/users.ts
import { Router } from 'express';

const router = Router();

router.get('/api/users', (req, res) => {
  // 用户列表逻辑
  res.json({ users: [] });
});

router.post('/api/users', (req, res) => {
  // 创建用户逻辑
  res.json({ success: true });
});

export default router;
```

然后在 `server/server.ts` 中注册：

```typescript
import usersRouter from './routes/users';

// 注册路由
app.use(usersRouter);
```

**前端调用 API**

```typescript
// GET 请求
async function getUsers() {
  const response = await fetch('/api/users');
  const data = await response.json();
  console.log(data);
}

// POST 请求
async function createUser(name: string) {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  const data = await response.json();
  console.log(data);
}
```

**API 最佳实践**

- ✅ 所有 API 路由以 `/api` 开头，避免与前端路由冲突
- ✅ 使用 RESTful 设计：GET 查询、POST 创建、PUT 更新、DELETE 删除
- ✅ 返回统一的响应格式：`{ success: boolean, data?: any, error?: string }`
- ✅ 添加错误处理和参数验证

### 2. 样式开发

**使用 Tailwind CSS**

本项目使用 Tailwind CSS 进行样式开发，支持亮色/暗色模式自动切换。

```typescript
// 使用 Tailwind 工具类
app.innerHTML = `
  <div class="flex items-center justify-center min-h-screen bg-white dark:bg-black">
    <h1 class="text-4xl font-bold text-black dark:text-white">
      Hello World
    </h1>
  </div>
`;
```

**主题变量**

主题变量定义在 `src/index.css` 中，支持自动适配系统主题：

```css
:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}
```

**常用 Tailwind 类名**

- 布局：`flex`, `grid`, `container`, `mx-auto`
- 间距：`p-4`, `m-4`, `gap-4`, `space-x-4`
- 颜色：`bg-white`, `text-black`, `dark:bg-black`, `dark:text-white`
- 排版：`text-lg`, `font-bold`, `leading-8`, `tracking-tight`
- 响应式：`sm:`, `md:`, `lg:`, `xl:`

### 2. 依赖管理

**必须使用 pnpm 管理依赖**

```bash
# ✅ 安装依赖
pnpm install

# ✅ 添加新依赖
pnpm add package-name

# ✅ 添加开发依赖
pnpm add -D package-name

# ❌ 禁止使用 npm 或 yarn
# npm install  # 错误！
# yarn add     # 错误！
```

项目已配置 `preinstall` 脚本，使用其他包管理器会报错。

### 3. TypeScript 开发

**类型安全**

充分利用 TypeScript 的类型系统，确保代码质量：

```typescript
// 定义接口
interface User {
  id: number;
  name: string;
  email: string;
}

// 使用类型
function createUser(data: User): void {
  console.log(`Creating user: ${data.name}`);
}

// DOM 操作类型推断
const button = document.querySelector<HTMLButtonElement>('#my-button');
if (button) {
  button.addEventListener('click', () => {
    console.log('Button clicked');
  });
}
```

**避免 any 类型**

尽量避免使用 `any`，使用 `unknown` 或具体类型：

```typescript
// ❌ 不推荐
function process(data: any) { }

// ✅ 推荐
function process(data: unknown) {
  if (typeof data === 'string') {
    console.log(data.toUpperCase());
  }
}
```

## 常见开发场景

### 添加新页面

本项目是单页应用（SPA），如需多页面：

1. 在 `src/` 下创建新的 `.ts` 文件
2. 在 `vite.config.ts` 中配置多入口
3. 创建对应的 `.html` 文件

### DOM 操作

```typescript
// 获取元素
const app = document.getElementById('app');
const button = document.querySelector<HTMLButtonElement>('.my-button');

// 动态创建元素
const div = document.createElement('div');
div.className = 'flex items-center gap-4';
div.textContent = 'Hello World';
app?.appendChild(div);

// 事件监听
button?.addEventListener('click', (e) => {
  console.log('Clicked', e);
});
```

### 数据获取

```typescript
// Fetch API
async function fetchData() {
  try {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }
}

// 使用数据
fetchData().then(data => {
  console.log(data);
});
```

### 环境变量

在 `.env` 文件中定义环境变量（需以 `VITE_` 开头）：

```bash
VITE_API_URL=https://api.example.com
```

在代码中使用：

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
console.log(apiUrl); // https://api.example.com
```

## 技术栈

**前端：**
- **构建工具**: Vite 6.x
- **语言**: TypeScript 5.x
- **样式**: Tailwind CSS 3.x

**后端：**
- **框架**: Express 4.x
- **内置中间件**: express.json(), express.urlencoded(), express.static()

**工具：**
- **包管理器**: pnpm 9+
- **运行时**: Node.js 18+
- **开发工具**: tsx (TypeScript 执行器)

## 参考文档

**前端：**
- [Vite 官方文档](https://cn.vitejs.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/zh/docs/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

**后端：**
- [Express 官方文档](https://expressjs.com/)
- [Express 中文文档](https://expressjs.com/zh-cn/)

## 重要提示

1. **必须使用 pnpm** 作为包管理器
2. **使用 TypeScript** 进行类型安全开发，避免使用 `any`
3. **使用 Tailwind CSS** 进行样式开发，支持响应式和暗色模式
4. **环境变量必须以 `VITE_` 开头** 才能在客户端代码中访问
5. **开发时使用 `pnpm dev`**，支持热更新和快速刷新；调试断点用 `pnpm debug` / `pnpm debug:watch`
6. **API 路由以 `/api` 开头**，避免与前端路由冲突
7. **单进程架构**：开发和生产环境都是前后端在同一进程中运行

## 常见问题

**Q: 如何分离前后端端口？**

如果需要前后端分离部署，可以：
- 前端：使用 `npx vite` 单独启动（默认端口 5173）
- 后端：修改 `server.ts`，移除 Vite middleware，单独启动

**Q: 如何添加数据库？**

```bash
# 安装数据库客户端（以 PostgreSQL 为例）
pnpm add pg
pnpm add -D @types/pg

# 在 server.ts 中使用
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

**Q: 如何部署？**

1. 运行 `pnpm build` 构建前后端
2. 将整个项目上传到服务器
3. 运行 `pnpm install --prod`
4. 运行 `pnpm start` 启动服务
