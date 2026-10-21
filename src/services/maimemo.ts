import type { MaimemoNotepad, PushResult } from '../types';

// 走同源后端代理：墨墨 API 不支持浏览器跨域（预检不返回 CORS 头），
// 由 server/routes/maimemo.ts 转发到 https://open.maimemo.com/open/api/v1
const MAIMEMO_BASE = '/api/maimemo';

function getHeaders(token: string): Record<string, string> {
  return {
    // token 通过自定义头传给后端，后端转成 Authorization: Bearer 转发，不落盘
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

// Test connection and list notepads
export async function testMaimemoConnection(token: string): Promise<MaimemoNotepad[]> {
  const res = await rateLimitedFetch(`${MAIMEMO_BASE}/notepads?limit=100&offset=0`, {
    headers: getHeaders(token),
  });

  if (res.status === 401) {
    throw new Error('Token 无效，请检查墨墨 API 授权');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`墨墨 API 错误 (${res.status}): ${text}`);
  }

  const json = await res.json();
  return (json.notepads || []) as MaimemoNotepad[];
}

// Create a new notepad
export async function createNotepad(
  token: string,
  title: string,
  words: string[]
): Promise<string> {
  const content = words.join('\n');
  
  const res = await rateLimitedFetch(`${MAIMEMO_BASE}/notepads`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      notepad: {
        status: 'PUBLISHED',
        content,
        title,
        brief: `摩登家庭生词 - ${words.length} 个单词`,
        tags: ['摩登家庭'],
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`创建云词本失败: ${text}`);
  }

  const json = await res.json();
  return json.notepad?.id || json.id || '';
}

// Get notepad content
export async function getNotepad(token: string, notepadId: string): Promise<MaimemoNotepad> {
  const res = await rateLimitedFetch(`${MAIMEMO_BASE}/notepads/${notepadId}`, {
    headers: getHeaders(token),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`获取云词本失败: ${text}`);
  }

  const json = await res.json();
  return json.notepad || json;
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
    
    const res = await rateLimitedFetch(`${MAIMEMO_BASE}/notepads/${notepadId}`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        notepad: {
          status: existing.status || 'PUBLISHED',
          content: finalWords.join('\n'),
          title: existing.title,
          brief: existing.brief || `摩登家庭生词 - ${finalWords.length} 个单词`,
          tags: existing.tags || ['摩登家庭'],
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
