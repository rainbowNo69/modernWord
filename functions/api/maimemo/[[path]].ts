// ABOUTME: Pages Function 版 /api/maimemo/* —— 墨墨开放平台同源代理（通用转发）
// ABOUTME: Token 只从 X-Maimemo-Token 头读取并转发为 Authorization，服务端不落盘

import { errorMessage, jsonResponse } from '../../../lib/upstream';

const MAIMEMO_BASE = 'https://open.maimemo.com/open/api/v1';
const UPSTREAM_TIMEOUT_MS = 20000;

interface MaimemoContext {
  request: Request;
  params: { path?: string | string[] };
}

async function proxy(context: MaimemoContext): Promise<Response> {
  const { request, params } = context;
  const token = (request.headers.get('X-Maimemo-Token') ?? '').trim();

  if (!token) {
    return jsonResponse({ error: '缺少墨墨 Token（请求头 X-Maimemo-Token）' }, { status: 400 });
  }

  const rawPath = Array.isArray(params.path) ? params.path.join('/') : params.path;
  const target = new URL(`${MAIMEMO_BASE}${rawPath ? `/${rawPath}` : ''}`);
  new URL(request.url).searchParams.forEach((value, key) => target.searchParams.set(key, value));

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      },
      body: hasBody ? await request.text() : undefined,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    // 原样透传上游状态码与 body，前端只关心结构
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error proxying maimemo request:', errorMessage(error));
    return jsonResponse({ error: `墨墨 API 请求失败: ${errorMessage(error)}` }, { status: 502 });
  }
}

export async function onRequestGet(context: MaimemoContext): Promise<Response> {
  return await proxy(context);
}

export async function onRequestPost(context: MaimemoContext): Promise<Response> {
  return await proxy(context);
}
