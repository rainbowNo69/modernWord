// ABOUTME: Vite integration for Express server
// ABOUTME: Handles dev middleware and production static file serving

import type { Application, Request, Response } from 'express';
import type { Server } from 'http';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const isDev = process.env.COZE_PROJECT_ENV !== 'PROD';
// 部署平台（Coze）上 HMR 走 vite.config.ts 里配置的独立 6000 端口 + 网关代理，
// 这种场景必须保持 Vite 自建 WS 服务；本地才把 Express 的 server 交给 Vite 复用 5000。
const onHostingPlatform = Boolean(process.env.COZE_PROJECT_TYPE || process.env.COZE_EVAL);

/**
 * 集成 Vite 开发服务器（中间件模式）
 *
 * 注意：这里不能再把 vite.config 展开传进来。Vite 默认会自动加载根目录的
 * vite.config.ts，展开后 react 插件会在 plugins 里出现两次，导致 React Refresh
 * 前缀被注入两遍，源文件编译报 "The symbol has already been declared"。
 * 因此只传中间件模式相关配置，其余交给 Vite 自行读取配置文件。
 *
 * httpServer 是 Express 的 http.Server：本地开发时通过 hmr.server 交给 Vite，
 * HMR 的 WebSocket 才会挂在 5000 端口上（否则 Vite 会用默认的 24678 单独监听，
 * 多个实例并存时只打印 "Port 24678 is already in use"，HMR 静默失效）。
 * 注意 middlewareMode 的 { server } 对象形式在 Vite 6 里只影响 proxy，不影响 HMR。
 */
export async function setupViteMiddleware(app: Application, httpServer: Server) {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      // 部署平台依赖 vite.config.ts 里 hmr.port=6000 的独立 WS 服务，不接管
      ...(onHostingPlatform ? {} : { hmr: { server: httpServer } }),
    },
    appType: 'spa',
  });

  // 使用 Vite middleware
  app.use(vite.middlewares);

  console.log('🚀 Vite dev server initialized');
}

/**
 * 设置生产环境静态文件服务
 */
export function setupStaticServer(app: Application) {
  const distPath = path.resolve(process.cwd(), 'dist');

  if (!fs.existsSync(distPath)) {
    console.error('❌ dist folder not found. Please run "pnpm build" first.');
    process.exit(1);
  }

  // 1. 服务静态文件（如果存在对应文件则直接返回）
  app.use(express.static(distPath));

  // 2. SPA fallback - 所有未处理的请求返回 index.html
  // 到达这里的请求说明：
  //   - 不是 API 请求（已被前面注册的路由处理）
  //   - 不是静态文件（express.static 未找到对应文件）
  //   - 需要返回 index.html 让前端路由处理
  app.use((_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  console.log('📦 Serving static files from dist/');
}

/**
 * 根据环境设置 Vite
 */
export async function setupVite(app: Application, httpServer: Server) {
  if (isDev) {
    await setupViteMiddleware(app, httpServer);
  } else {
    setupStaticServer(app);
  }
}
