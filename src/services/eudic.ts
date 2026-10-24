// ABOUTME: 欧路词典开放 API 对接（生词本批量/逐条加词，逐条可带原句）
// ABOUTME: Token 失效时抛 TokenExpiredError，由 UI 引导用户重新授权

import type { EudicCategory, PushResult } from '../types';
import { TokenExpiredError } from './errors';

const EUDIC_BASE = 'https://api.frdic.com/api/open/v1';

function getHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `NIS ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
}

function tokenExpiredError(): TokenExpiredError {
  return new TokenExpiredError('欧路 Token 已过期或无效，请到设置页重新填写');
}

// Test connection and list categories
export async function testEudicConnection(token: string): Promise<EudicCategory[]> {
  const res = await fetch(`${EUDIC_BASE}/studylist/category?language=en`, {
    headers: getHeaders(token),
  });

  if (res.status === 401 || res.status === 403) {
    throw tokenExpiredError();
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`欧路 API 错误 (${res.status}): ${text}`);
  }

  const json = await res.json();
  return (json.data || []) as EudicCategory[];
}

// Add a single word, optionally with the sentence it appeared in (context_line)
async function addWord(
  token: string,
  categoryId: string,
  word: string,
  context?: string
): Promise<boolean> {
  const res = await fetch(`${EUDIC_BASE}/studylist/word`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      language: 'en',
      word,
      star: 1,
      ...(context ? { context_line: context } : {}),
      category_ids: [categoryId],
    }),
  });

  if (res.status === 401 || res.status === 403) {
    throw tokenExpiredError();
  }

  return res.ok;
}

/**
 * 批量添加单词到生词本。
 * contextByWord 有内容时改为逐条提交：批量接口不支持语境字段，
 * 只有单条接口能把剧中原句写进单词（欧路里显示为单词语境）。
 */
export async function addWordsToEudic(
  token: string,
  categoryId: string,
  words: string[],
  contextByWord?: Map<string, string>
): Promise<PushResult> {
  if (words.length === 0) {
    return { success: 0, failed: 0, failedWords: [], message: '没有需要添加的单词' };
  }

  const withContext = contextByWord !== undefined && contextByWord.size > 0;

  if (!withContext) {
    return await addWordsBatch(token, categoryId, words);
  }

  let success = 0;
  const failedWords: string[] = [];

  for (const word of words) {
    try {
      const ok = await addWord(token, categoryId, word, contextByWord?.get(word));
      if (ok) {
        success += 1;
      } else {
        failedWords.push(word);
      }
    } catch (err) {
      if (err instanceof TokenExpiredError) throw err;
      failedWords.push(word);
    }
  }

  return {
    success,
    failed: failedWords.length,
    failedWords,
    message: failedWords.length === 0
      ? `成功添加 ${success} 个单词（含剧中原句）到欧路生词本`
      : `成功 ${success} 个，失败 ${failedWords.length} 个`,
  };
}

async function addWordsBatch(
  token: string,
  categoryId: string,
  words: string[]
): Promise<PushResult> {
  const headers = getHeaders(token);
  let successCount = 0;
  let failedCount = 0;
  const failedWords: string[] = [];

  // Process in batches of 1000
  const batchSize = 1000;
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    const items = batch.map(word => ({ word, star: 1 }));

    try {
      const res = await fetch(`${EUDIC_BASE}/studylist/words`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          language: 'en',
          category_id: categoryId,
          items,
        }),
      });

      if (res.status === 401 || res.status === 403) {
        throw tokenExpiredError();
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API 错误: ${text}`);
      }

      successCount += batch.length;
    } catch (err) {
      if (err instanceof TokenExpiredError) throw err;
      failedCount += batch.length;
      failedWords.push(...batch);
      console.error('Batch failed:', err);
    }
  }

  return {
    success: successCount,
    failed: failedCount,
    failedWords,
    message: failedCount === 0
      ? `成功添加 ${successCount} 个单词到欧路生词本`
      : `成功 ${successCount} 个，失败 ${failedCount} 个`,
  };
}
