// ABOUTME: Express server with Vite integration
// ABOUTME: Handles API routes and serves frontend in dev/prod modes

import { createServer, type Server } from 'http';
import express from 'express';
import path from 'path';
import router from './routes/index';
import { setupVite } from './vite';

const isDev = process.env.COZE_PROJECT_ENV !== 'PROD';
const port = parseInt(process.env.PORT || '5000', 10);
const hostname = process.env.HOSTNAME || 'localhost';
const app = express();
// 使用 http.createServer 包装 Express app，以便支持 WebSocket 等协议升级
const server = createServer(app);

async function startServer(): Promise<Server> {
  // 请求日志（仅开发环境）
  if (isDev) {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const ms = Date.now() - start;
        console.log(`${req.method} ${req.url} - ${ms}ms`);
      });
      next();
    });
  }

  // 添加请求体解析
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve data directory (dictionary files) as static
  // 词典可以被 process-dict.mjs 重新生成，这里不能做强缓存：
  // 之前 maxAge: '1d' 会让浏览器一整天都拿旧词典（重新生成后前端完全无感知）。
  // 改成 no-cache + ETag：每次都校验，内容没变只回 304，不会重复传 2MB。
  app.use('/data', express.static(path.resolve(process.cwd(), 'data'), {
    etag: true,
    lastModified: true,
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache');
    },
  }));

  // 注册 API 路由
  app.use(router);

  // 集成 Vite（开发模式）或静态文件服务（生产模式）
  // 把 http server 交给 Vite，HMR 的 WebSocket 复用 5000 端口，不再另占 24678
  await setupVite(app, server);

  // 全局错误处理
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Server error:', err);
    const status = 'status' in err ? (err as { status?: number }).status ?? 500 : 500;
    res.status(status).json({
      error: err.message || 'Internal server error',
    });
  });

  server.once('error', err => {
    console.error('Server error:', err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`\n✨ Server running at http://${hostname}:${port}`);
    console.log(`📝 Environment: ${isDev ? 'development' : 'production'}\n`);
  });

  return server;
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
