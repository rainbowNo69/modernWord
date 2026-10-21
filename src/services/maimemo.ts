import type { MaimemoNotepad, PushResult } from '../types';

// 开放平台直连地址：浏览器直接调用（与 devtools 里抓到的请求一致）
const MAIMEMO_DIRECT_BASE = 'https://open.maimemo.com/open/api/v1';
// 同源后端代理：浏览器跨域被拦截（CORS 预检失败）时回退使用，
// 由 server/routes/maimemo.ts 转发到上面的直连地址
const MAIMEMO_PROXY_BASE = '/api/maimemo';

// 直连时的请求头：墨墨只认 Authorization，Accept-Language 与业务无关但保持一致
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

// 墨墨开放平台把业务数据包在 data 里：{ data: { notepads: [...] } }，
// 兼容一下平台偶尔直接返回 { notepads: [...] } 的情况
interface NotepadsResponse {
  notepads?: MaimemoNotepad[];
  data?: { notepads?: MaimemoNotepad[] };
}

interface NotepadResponse {
  notepad?: MaimemoNotepad;
  data?: { notepad?: MaimemoNotepad };
}

function unwrapNotepads(json: NotepadsResponse): MaimemoNotepad[] {
  return json.data?.notepads ?? json.notepads ?? [];
}

function unwrapNotepad(json: NotepadResponse): MaimemoNotepad | null {
  return json.data?.notepad ?? json.notepad ?? null;
}

// Rate limiting: 10s/20, 60s/40, 5h/2000
let requestTimestamps: number[] = [];

async function rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now();
  
  // Clean old timestamps
  requestTimestamps = requestTimestamps.filter(t => now - t < 5 * 60 * 60 * 1000);
  
  // Check limits
  const last10s = requestTimestamps.filter(t => now - t < 10000).length;
  const last60s = requestTimestamps.filter(t => now - t < 60000).length;
  
  if (last10s >= 18) {
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (last60s >= 38) {
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  requestTimestamps.push(now);
  return fetch(url, options);
}

// 直连开放平台获取云词本列表，limit 上限为 10
async function listNotepadsDirect(token: string): Promise<MaimemoNotepad[]> {  const res = await rateLimitedFetch(
    `${MAIMEMO_DIRECT_BASE}/memo/notepads?limit=10&offset=0`,
    {
      method: 'GET',
      headers: getDirectHeaders(token),
    }
  );

  if (res.status === 401) {
    throw new Error('Token 无效，请检查墨墨 API 授权');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`墨墨 API 错误 (${res.status}): ${text}`);
  }

  const json = (await res.json()) as NotepadsResponse;
  return unwrapNotepads(json);
}

// 经同源后端代理获取（直连被 CORS 拦截时使用）
async function listNotepadsViaProxy(token: string): Promise<MaimemoNotepad[]> {
  const res = await rateLimitedFetch(`${MAIMEMO_PROXY_BASE}/notepads?limit=10&offset=0`, {
    headers: getProxyHeaders(token),
  });

  if (res.status === 401) {
    throw new Error('Token 无效，请检查墨墨 API 授权');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`墨墨 API 错误 (${res.status}): ${text}`);
  }

  const json = (await res.json()) as NotepadsResponse;
  return unwrapNotepads(json);
}

// Test connection and list notepads
export async function testMaimemoConnection(token: string): Promise<MaimemoNotepad[]> {
  try {
    return await listNotepadsDirect(token);
  } catch (err) {
    // 浏览器端跨域失败（CORS 预检被拦）时 fetch 抛 TypeError，此时回退到后端代理
    if (!(err instanceof TypeError)) throw err;
    console.warn('[maimemo] 直连被浏览器拦截，改用后端代理:', err.message);
    return await listNotepadsViaProxy(token);
  }
}

// Create a new notepad
export async function createNotepad(
  token: string,
  title: string,
  words: string[]
): Promise<string> {
  const content = words.join('\n');
  
  const res = await rateLimitedFetch(`${MAIMEMO_PROXY_BASE}/notepads`, {
    method: 'POST',
    headers: getProxyHeaders(token),
    body: JSON.stringify({
      notepad: {
        status: 'PUBLISHED',
        content,
        title,
        brief: `美剧生词 - ${words.length} 个单词`,
        tags: ['美剧生词'],
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`创建云词本失败: ${text}`);
  }

  const json = (await res.json()) as NotepadResponse;
  return unwrapNotepad(json)?.id ?? '';
}

// Get notepad content
export async function getNotepad(token: string, notepadId: string): Promise<MaimemoNotepad> {
  const res = await rateLimitedFetch(`${MAIMEMO_PROXY_BASE}/notepads/${notepadId}`, {
    headers: getProxyHeaders(token),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`获取云词本失败: ${text}`);
  }

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
): Promise<PushResult> {
  try {
    let finalWords: string[];
    
    if (mode === 'append') {
      // Get existing content
      const existing = await getNotepad(token, notepadId);
      const existingWords = (existing.content || '').split('\n').map(w => w.trim()).filter(Boolean);
      
      // Merge and deduplicate
      const wordSet = new Set([...existingWords, ...newWords]);
      finalWords = Array.from(wordSet);
    } else {
      finalWords = [...new Set(newWords)];
    }

    // Get existing notepad to preserve metadata
    const existing = await getNotepad(token, notepadId);
    
    const res = await rateLimitedFetch(`${MAIMEMO_PROXY_BASE}/notepads/${notepadId}`, {
      method: 'POST',
      headers: getProxyHeaders(token),
      body: JSON.stringify({
        notepad: {
          status: existing.status || 'PUBLISHED',
          content: finalWords.join('\n'),
          title: existing.title,
          brief: existing.brief || `美剧生词 - ${finalWords.length} 个单词`,
          tags: existing.tags || ['美剧生词'],
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`更新云词本失败: ${text}`);
    }

    return {
      success: newWords.length,
      failed: 0,
      failedWords: [],
      message: `成功${mode === 'append' ? '追加' : '覆盖'} ${newWords.length} 个单词到墨墨云词本`,
    };
  } catch (err) {
    return {
      success: 0,
      failed: newWords.length,
      failedWords: newWords,
      message: err instanceof Error ? err.message : '推送失败',
    };
  }
}
