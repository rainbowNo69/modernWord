// ABOUTME: Pages Function 版 /api/health —— 部署存活检查

import { jsonResponse } from '../../lib/upstream';

export async function onRequestGet(): Promise<Response> {
  return jsonResponse({
    status: 'ok',
    runtime: 'cloudflare-pages',
    timestamp: new Date().toISOString(),
  });
}
