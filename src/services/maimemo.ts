// ABOUTME: 墨墨背单词开放平台对接（云词本 + 例句）
// ABOUTME: 先尝试浏览器直连，被 CORS 拦截时自动回退 /api/maimemo 同源代理

import type { MaimemoNotepad, ExamplePushResult } from '../types';
import { TokenExpiredError } from './errors';

// 直连开放平台地址（与 devtools 里抓到的请求一致）
const MAIMEMO_DIRECT_BASE = 'https://open.maimemo.com/open/api/v1';
// 同源后端代理：浏览器跨域被拦截（CORS 预检失败）时回退使用，
// 由 server/routes/maimemo.ts 转发到上面的直连地址
const MAIMEMO_PROXY_BASE = '/api/maimemo';

interface RequestInitWithBody {
  method?: string;
  body?: unknown;
}

// 直连时的请求头：墨墨只认 Authorization
function getDirectHeaders(token: string): Record<string, string> {
  return {
    'accept': 'application/json',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    'authorization': `Bearer ${token}`,
  };
}

// 走代理时的请求头：token 放在自定义头里，由后端转成 Authorization 转发，不落盘
function getProxyHeaders(token: string): Record<string, string> {
  return {
    'X-Maimemo-Token': token,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
}

// Rate limiting: 10s/20, 60s/40, 5h/2000
let requestTimestamps: number[] = [];

async function rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now();

  // Clean old timestamps
  requestTimestamps = requestTimestamps.filter(t => now - t < 5 * 60 * 60 * 1000);

  const last10s = requestTimestamps.filter(t => now - t < 10000).length;
  const last60s = requestTimestamps.filter(t => now - t < 60000).length;

  if (last10s >= 18) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (last60s >= 38) {
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  requestTimestamps.push(now);
  return fetch(url, options);
}

/**
 * 统一发起墨墨请求：path 形如 /memo/notepads。
 * 浏览器直连失败（CORS 预检被拦，fetch 抛 TypeError）时回退同源代理。
 */
async function maimemoRequest(token: string, path: string, init: RequestInitWithBody = {}): Promise<Response> {
  const body = init.body === undefined ? undefined : JSON.stringify(init.body);

  const send = (base: string, headers: Record<string, string>) =>
    rateLimitedFetch(`${base}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body,
    });

  try {
    return await send(MAIMEMO_DIRECT_BASE, getDirectHeaders(token));
  } catch (err) {
    if (!(err instanceof TypeError)) throw err;
    console.warn('[maimemo] 直连被浏览器拦截，改用后端代理:', (err as Error).message);
    return await send(MAIMEMO_PROXY_BASE, getProxyHeaders(token));
  }
}

// 墨墨的 401 既可能体现在状态码，也可能体现在 body 的 errors.code
function isUnauthorized(status: number, body: string): boolean {
  if (status === 401 || status === 403) {
    return true;
  }
  try {
    const json = JSON.parse(body) as { errors?: { code?: string }[] };
    return (json.errors ?? []).some(e => e.code === 'common_unauthorized');
  } catch {
    return false;
  }
}

function tokenExpiredError(): TokenExpiredError {
  return new TokenExpiredError('墨墨 Token 已过期或无效，请到设置页重新填写');
}

// 请求失败时给出可读信息，Token 失效单独抛 TokenExpiredError
async function ensureOk(res: Response, action: string): Promise<void> {
  if (res.ok) {
    return;
  }
  const text = await res.text();
  if (isUnauthorized(res.status, text)) {
    throw tokenExpiredError();
  }
  throw new Error(`${action}失败: ${text || `HTTP ${res.status}`}`);
}

// 墨墨把业务数据包在 data 里：{ data: { notepads: [...] } }，
// 兼容一下平台偶尔直接返回 { notepads: [...] } 的情况
interface NotepadsResponse {
  notepads?: MaimemoNotepad[];
  data?: { notepads?: MaimemoNotepad[] };
}

interface NotepadResponse {
  notepad?: MaimemoNotepad;
  data?: { notepad?: MaimemoNotepad };
}

interface VocabularyResponse {
  voc?: { id: string; spelling: string }[];
  data?: { voc?: { id: string; spelling: string }[] };
}

function unwrapNotepads(json: NotepadsResponse): MaimemoNotepad[] {
  return json.data?.notepads ?? json.notepads ?? [];
}

function unwrapNotepad(json: NotepadResponse): MaimemoNotepad | null {
  return json.data?.notepad ?? json.notepad ?? null;
}

function unwrapVocabulary(json: VocabularyResponse): { id: string; spelling: string }[] {
  return json.data?.voc ?? json.voc ?? [];
}

// Test connection and list notepads（limit 上限为 10）
export async function testMaimemoConnection(token: string): Promise<MaimemoNotepad[]> {
  const res = await maimemoRequest(token, '/memo/notepads?limit=10&offset=0');
  await ensureOk(res, '获取云词本');
  const json = (await res.json()) as NotepadsResponse;
  return unwrapNotepads(json);
}

// Create a new notepad
export async function createNotepad(
  token: string,
  title: string,
  words: string[]
): Promise<string> {
  const res = await maimemoRequest(token, '/memo/notepads', {
    method: 'POST',
    body: {
      notepad: {
        status: 'PUBLISHED',
        content: words.join('\n'),
        title,
        brief: `美剧生词 - ${words.length} 个单词`,
        tags: ['美剧生词'],
      },
    },
  });

  await ensureOk(res, '创建云词本');
  const json = (await res.json()) as NotepadResponse;
  return unwrapNotepad(json)?.id ?? '';
}

// Get notepad content
export async function getNotepad(token: string, notepadId: string): Promise<MaimemoNotepad> {
  const res = await maimemoRequest(token, `/memo/notepads/${encodeURIComponent(notepadId)}`);
  await ensureOk(res, '获取云词本');
  const json = (await res.json()) as NotepadResponse;
  const notepad = unwrapNotepad(json);
  if (!notepad) {
    throw new Error('获取云词本失败：返回内容为空');
  }
  return notepad;
}

// Update notepad (append or overwrite words)
export async function updateNotepad(
  token: string,
  notepadId: string,
  newWords: string[],
  mode: 'append' | 'overwrite' = 'append'
): Promise<MaimemoNotepad> {
  let finalWords: string[];
  let existing: MaimemoNotepad | null = null;

  if (mode === 'append') {
    existing = await getNotepad(token, notepadId);
    const existingWords = (existing.content || '').split('\n').map(w => w.trim()).filter(Boolean);
    finalWords = Array.from(new Set([...existingWords, ...newWords]));
  } else {
    finalWords = Array.from(new Set(newWords));
  }

  if (!existing) {
    existing = await getNotepad(token, notepadId);
  }

  const res = await maimemoRequest(token, `/memo/notepads/${encodeURIComponent(notepadId)}`, {
    method: 'POST',
    body: {
      notepad: {
        status: existing.status || 'PUBLISHED',
        content: finalWords.join('\n'),
        title: existing.title,
        brief: existing.brief || `美剧生词 - ${finalWords.length} 个单词`,
        tags: existing.tags || ['美剧生词'],
      },
    },
  });

  await ensureOk(res, '更新云词本');
  const json = (await res.json()) as NotepadResponse;
  return unwrapNotepad(json) ?? { id: notepadId, title: existing.title };
}

export interface MaimemoExampleInput {
  word: string;
  sentence: string;
  origin: string;
}

// 批量查单词在墨墨词库里的 voc_id（一次最多 1000 个拼写）
async function queryVocabularyIds(
  token: string,
  spellings: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  for (let i = 0; i < spellings.length; i += 500) {
    const batch = spellings.slice(i, i + 500);
    const res = await maimemoRequest(token, '/memo/vocabulary/query', {
      method: 'POST',
      body: { spellings: batch },
    });
    await ensureOk(res, '查询墨墨单词 ID');
    const json = (await res.json()) as VocabularyResponse;
    for (const voc of unwrapVocabulary(json)) {
      result.set(voc.spelling.toLowerCase(), voc.id);
    }
  }

  return result;
}

/**
 * 为单词创建例句（墨墨开放平台的「例句」能力）。
 * 云词本只存单词，例句必须走 /memo/phrases，且需要先把单词拼转换成 voc_id。
 * 平台限制：每天最多创建 600 条内容（例句/助记/释义合并计数）。
 */
export async function addExamples(
  token: string,
  items: MaimemoExampleInput[]
): Promise<ExamplePushResult> {
  const result: ExamplePushResult = { success: 0, failed: 0, failedWords: [] };
  if (items.length === 0) {
    return result;
  }

  const idBySpelling = await queryVocabularyIds(token, items.map(i => i.word));

  for (const item of items) {
    const vocId = idBySpelling.get(item.word.toLowerCase());
    if (!vocId) {
      result.failed += 1;
      result.failedWords.push(item.word);
      continue;
    }

    try {
      const res = await maimemoRequest(token, '/memo/phrases', {
        method: 'POST',
        body: {
          phrase: {
            voc_id: vocId,
            phrase: item.sentence,
            interpretation: '',
            tags: ['美剧'],
            origin: item.origin,
          },
        },
      });

      if (res.status === 401 || res.status === 403) {
        throw tokenExpiredError();
      }

      if (!res.ok) {
        result.failed += 1;
        result.failedWords.push(item.word);
        continue;
      }

      result.success += 1;
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw err;
      }
      result.failed += 1;
      result.failedWords.push(item.word);
    }
  }

  return result;
}
