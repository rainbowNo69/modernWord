// ABOUTME: 墨墨开放平台 API 的后端代理（浏览器直连会被 CORS 预检拦截）
// ABOUTME: Token 只从 X-Maimemo-Token 头读取并转发，服务端不落盘

import { Router } from 'express';
import type { Request, Response } from 'express';

const MAIMEMO_BASE = 'https://open.maimemo.com/open/api/v1';
const UPSTREAM_TIMEOUT_MS = 20000;

const router = Router();

/**
 * 把请求转发到墨墨开放平台。
 *
 * 为什么还需要代理：open.maimemo.com 对 OPTIONS 预检不返回任何
 * Access-Control-* 头，带 Authorization / Content-Type: application/json 的
 * 跨域请求大概率预检失败。前端会先尝试直连，失败（fetch 抛 TypeError）后
 * 回退到这里的同源转发，保证功能可用。
 */
async function proxyToMaimemo(req: Request, res: Response, upstreamPath: string): Promise<void> {
  const token = (req.header('X-Maimemo-Token') || '').trim();
  if (!token) {
    res.status(400).json({ error: '缺少墨墨 Token（请求头 X-Maimemo-Token）' });
    return;
  }

  const url = new URL(`${MAIMEMO_BASE}${upstreamPath}`);
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      url.searchParams.set(key, value);
    }
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      },
      body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    res.status(upstream.status).send(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error proxying maimemo request:', message);
    res.status(502).json({ error: `墨墨 API 请求失败: ${message}` });
  }
}

// 通用转发：/api/maimemo/<任意路径> -> https://open.maimemo.com/open/api/v1/<任意路径>
// 前端用到的路径：/memo/notepads、/memo/notepads/:id、/memo/vocabulary/query、/memo/phrases
router.all('/*', (req, res) => {
  // Express 4 的通配参数在 req.params[0] 里（@types/express 5 的类型未覆盖，这里显式断言）
  const rest = (req.params as unknown as Record<string, string>)[0] ?? '';
  void proxyToMaimemo(req, res, rest ? `/${rest}` : '');
});

export default router;
