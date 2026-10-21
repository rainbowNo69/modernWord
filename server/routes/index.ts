// ABOUTME: 剧本抓取 API：按剧名搜索任意美剧、抓取季/集目录与单集剧本
// ABOUTME: 上游数据只缓存在进程内存（有界 TTL），不写服务端磁盘

import { Router } from 'express';
import type { Request, Response } from 'express';
import https from 'https';
import maimemoRouter from './maimemo';
import { MemoryCache } from '../cache';

interface ShowSummary {
  id: string;
  title: string;
}

interface Episode {
  season: number;
  episode: number;
  title: string;
  id: string;
}

type EpisodeList = Record<number, Episode[]>;

const router = Router();

const BASE_URL = 'https://www.springfieldspringfield.co.uk';
const DEFAULT_SHOW = 'modern-family';
const SHOW_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,60}$/;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// 全部走内存缓存：容量有上限，进程重启即清空，服务端磁盘不落任何剧本数据
// （剧本本身再配合 Cache-Control 交给浏览器缓存，重复访问不会打到站点）
const showSearchCache = new MemoryCache<ShowSummary[]>(100, ONE_DAY_MS);
const episodeIndexCache = new MemoryCache<EpisodeList>(30, ONE_DAY_MS);
const transcriptCache = new MemoryCache<string[]>(50, ONE_DAY_MS);

// 上游返回的状态码需要区分 404（剧/集不存在）和其它错误
class UpstreamError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'UpstreamError';
  }
}

// Simple HTTP fetch with User-Agent
function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchPage(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
        reject(new UpstreamError(`HTTP ${res.statusCode} for ${url}`, res.statusCode));
        return;
      }
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function normalizeShowId(input: unknown): string | null {
  if (typeof input !== 'string') {
    return null;
  }
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  return SHOW_ID_PATTERN.test(normalized) ? normalized : null;
}

// 解析站内搜索结果页（tv_show_episode_scripts.php?search=xxx）
function parseShowSearch(html: string): ShowSummary[] {
  const results: ShowSummary[] = [];
  const seen = new Set<string>();
  const linkRegex = /<a\b[^>]*href="[^"]*episode_scripts\.php\?tv-show=([^"&]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    // 页面导航栏里也有一条指向 the-simpsons 的链接，用 script-list-item 标记区分真正的搜索结果
    if (!match[0].includes('script-list-item')) {
      continue;
    }
    const id = decodeURIComponent(match[1]).toLowerCase();
    const title = decodeEntities(match[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (!title || seen.has(id)) {
      continue;
    }
    seen.add(id);
    results.push({ id, title });
  }

  return results;
}

// 解析某部剧的季/集索引页
function parseEpisodeIndex(html: string, showId: string): EpisodeList {
  const result: EpisodeList = {};
  const escapedShow = showId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lineRegex = new RegExp(
    `<a[^>]*href="[^"]*view_episode_scripts\\.php\\?tv-show=${escapedShow}&(?:amp;)?episode=s(\\d+)e(\\d+)"[^>]*>([^<]*)</a>`,
    'gi'
  );

  let match;
  while ((match = lineRegex.exec(html)) !== null) {
    const season = parseInt(match[1], 10);
    const episode = parseInt(match[2], 10);
    let title = decodeEntities(match[3]).trim();

    // Clean up title - remove extra whitespace and common prefixes
    title = title.replace(/^\s*[\d.]+\s*/, '').trim();
    if (!title) {
      title = `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
    }

    if (!result[season]) {
      result[season] = [];
    }

    result[season].push({
      season,
      episode,
      title,
      id: `s${String(season).padStart(2, '0')}e${String(episode).padStart(2, '0')}`,
    });
  }

  return result;
}

// 解析单集剧本页
function parseTranscript(html: string): string[] {
  // Find the scrolling-script-container div
  const containerMatch = html.match(/<div\s+class="scrolling-script-container"[^>]*>([\s\S]*?)<\/div>/i);
  if (!containerMatch) {
    return [];
  }

  let content = containerMatch[1];

  // Replace <br>, <br/>, <br /> with newlines
  content = content.replace(/<br\s*\/?>/gi, '\n');

  // Remove all HTML tags
  content = content.replace(/<[^>]+>/g, '');

  // HTML unescape
  content = decodeEntities(content);

  // Split by lines, trim, remove empty
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

// GET /api/shows?q=friends - 搜索美剧，返回匹配的剧集列表
router.get('/api/shows', async (req: Request, res: Response) => {
  const query = (req.query.q as string | undefined)?.trim() ?? '';

  if (query.length < 2) {
    res.status(400).json({ success: false, error: '请输入至少 2 个字符的剧名关键词' });
    return;
  }

  const cacheKey = query.toLowerCase();
  const cached = showSearchCache.get(cacheKey);
  if (cached) {
    res.json({ success: true, data: cached, message: cached.length === 0 ? `未找到与“${query}”相关的美剧` : undefined });
    return;
  }

  try {
    const url = `${BASE_URL}/tv_show_episode_scripts.php?search=${encodeURIComponent(query)}`;
    const html = await fetchPage(url);
    const shows = parseShowSearch(html);

    showSearchCache.set(cacheKey, shows);

    // 搜不到不算错误：返回空列表 + 提示文案，交给前端展示
    res.json({
      success: true,
      data: shows,
      message: shows.length === 0 ? `未找到与“${query}”相关的美剧，请检查拼写或换个关键词试试` : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error searching shows:', message);
    res.status(500).json({ success: false, error: `搜索剧集失败: ${message}` });
  }
});

// GET /api/episodes?show=modern-family - 返回该剧按季分组的集目录
router.get('/api/episodes', async (req: Request, res: Response) => {
  const showId = normalizeShowId(req.query.show) ?? DEFAULT_SHOW;

  const cached = episodeIndexCache.get(showId);
  if (cached) {
    res.json({ success: true, data: cached, show: showId });
    return;
  }

  try {
    const url = `${BASE_URL}/episode_scripts.php?tv-show=${showId}`;
    const html = await fetchPage(url);
    const episodes = parseEpisodeIndex(html, showId);

    if (Object.keys(episodes).length === 0) {
      res.status(404).json({ success: false, error: `未找到剧集《${showId}》，请检查剧名是否正确` });
      return;
    }

    episodeIndexCache.set(showId, episodes);
    res.json({ success: true, data: episodes, show: showId });
  } catch (error) {
    // 站点对不存在的剧返回 404，这里转成友好提示而不是 500
    if (error instanceof UpstreamError && error.status === 404) {
      res.status(404).json({ success: false, error: `未找到剧集《${showId}》，请检查剧名是否正确` });
      return;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching episodes:', message);
    res.status(500).json({ success: false, error: `获取剧集列表失败: ${message}` });
  }
});

// GET /api/transcript?show=modern-family&season=1&episode=1 - 返回单集对白行数组
router.get('/api/transcript', async (req: Request, res: Response) => {
  const showId = normalizeShowId(req.query.show) ?? DEFAULT_SHOW;
  const season = parseInt(req.query.season as string, 10);
  const episode = parseInt(req.query.episode as string, 10);

  if (!season || !episode || season < 1 || season > 99 || episode < 1 || episode > 999) {
    res.status(400).json({ success: false, error: '无效的季或集参数' });
    return;
  }

  const episodeId = `s${String(season).padStart(2, '0')}e${String(episode).padStart(2, '0')}`;
  const cacheKey = `${showId}:${episodeId}`;

  const cached = transcriptCache.get(cacheKey);
  if (cached) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.json({ success: true, data: cached });
    return;
  }

  try {
    const url = `${BASE_URL}/view_episode_scripts.php?tv-show=${showId}&episode=${episodeId}`;
    const html = await fetchPage(url);
    const lines = parseTranscript(html);

    if (lines.length === 0) {
      res.status(404).json({ success: false, error: `未找到《${showId}》第 ${season} 季第 ${episode} 集的剧本，请确认该剧有这一集` });
      return;
    }

    transcriptCache.set(cacheKey, lines);

    // 剧本内容不会再变，交给浏览器缓存一天，重复查看不再回源
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.json({ success: true, data: lines });
  } catch (error) {
    if (error instanceof UpstreamError && error.status === 404) {
      res.status(404).json({ success: false, error: `未找到《${showId}》第 ${season} 季第 ${episode} 集的剧本，请确认该剧有这一集` });
      return;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching transcript:', message);
    res.status(500).json({ success: false, error: `获取剧本失败: ${message}` });
  }
});

// 墨墨开放平台代理（浏览器直连 CORS 预检会失败，改走同源后端）
router.use('/api/maimemo', maimemoRouter);

// Health check
router.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
