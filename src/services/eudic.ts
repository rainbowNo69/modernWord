import type { EudicCategory, PushResult } from '../types';

const EUDIC_BASE = 'https://api.frdic.com/api/open/v1';

function getHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `NIS ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
}

// Test connection and list categories
export async function testEudicConnection(token: string): Promise<EudicCategory[]> {
  const res = await fetch(`${EUDIC_BASE}/studylist/category?language=en`, {
    headers: getHeaders(token),
  });

  if (res.status === 401) {
    throw new Error('Token 无效，请检查欧路词典 API 授权');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`欧路 API 错误 (${res.status}): ${text}`);
  }

  const json = await res.json();
  return (json.data || []) as EudicCategory[];
}

// Batch add words to a category
export async function addWordsToEudic(
  token: string,
  categoryId: string,
  words: string[],
  withContext: boolean = false
): Promise<PushResult> {
  if (words.length === 0) {
    return { success: 0, failed: 0, failedWords: [], message: '没有需要添加的单词' };
  }

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

      if (res.status === 401) {
        throw new Error('Token 无效');
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API 错误: ${text}`);
      }

      const json = await res.json();
      successCount += batch.length;
      
      if (json.message) {
        console.log('Eudic response:', json.message);
      }
    } catch (err) {
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

// Add single word with context (optional, slower)
export async function addWordWithContext(
  token: string,
  categoryId: string,
  word: string,
  context: string
): Promise<boolean> {
  try {
    const res = await fetch(`${EUDIC_BASE}/studylist/word`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        language: 'en',
        word,
        star: 1,
        context_line: context,
        category_ids: [categoryId],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
