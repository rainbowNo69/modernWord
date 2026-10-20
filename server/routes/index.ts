import { Router } from 'express';
import type { Request, Response } from 'express';
import https from 'https';
import fs from 'fs';
import path from 'path';

const router = Router();

const BASE_URL = 'https://www.springfieldspringfield.co.uk';
const INDEX_URL = `${BASE_URL}/episode_scripts.php?tv-show=modern-family`;
const CACHE_DIR = path.resolve(process.cwd(), 'data', 'cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
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
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
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

// Parse episode index page
function parseEpisodeIndex(html: string): Record<number, Array<{ episode: number; title: string; id: string }>> {
  const result: Record<number, Array<{ episode: number; title: string; id: string }>> = {};
  
  // Match links like: view_episode_scripts.php?tv-show=modern-family&episode=s01e01
  const linkRegex = /view_episode_scripts\.php\?tv-show=modern-family&(?:amp;)?episode=s(\d{2})e(\d{2})/g;
  // Match nearby text for episode title
  const lineRegex = /<a[^>]*href="[^"]*view_episode_scripts\.php\?tv-show=modern-family&(?:amp;)?episode=s(\d{2})e(\d{2})"[^>]*>([^<]*)<\/a>/gi;
  
  let match;
  while ((match = lineRegex.exec(html)) !== null) {
    const season = parseInt(match[1], 10);
    const episode = parseInt(match[2], 10);
    let title = match[3].trim();
    
    // Clean up title - remove extra whitespace and common prefixes
    title = title.replace(/^\s*[\d.]+\s*/, '').trim();
    if (!title) {
      title = `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
    }
    
    if (!result[season]) {
      result[season] = [];
    }
    
    result[season].push({
      episode,
      title,
      id: `s${String(season).padStart(2, '0')}e${String(episode).padStart(2, '0')}`,
    });
  }
  
  return result;
}

// Parse transcript page
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
  content = content
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // Split by lines, trim, remove empty
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  return lines;
}

// Cache helpers
function getCachedEpisodes(): Record<string, unknown> | null {
  const cacheFile = path.join(CACHE_DIR, 'episodes.json');
  if (fs.existsSync(cacheFile)) {
    const stat = fs.statSync(cacheFile);
    // Cache for 24 hours
    if (Date.now() - stat.mtimeMs < 24 * 60 * 60 * 1000) {
      try {
        return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function setCachedEpisodes(data: Record<string, unknown>): void {
  const cacheFile = path.join(CACHE_DIR, 'episodes.json');
  fs.writeFileSync(cacheFile, JSON.stringify(data));
}

function getCachedTranscript(season: number, episode: number): string[] | null {
  const cacheFile = path.join(CACHE_DIR, `transcript_s${String(season).padStart(2, '0')}e${String(episode).padStart(2, '0')}.json`);
  if (fs.existsSync(cacheFile)) {
    try {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

function setCachedTranscript(season: number, episode: number, lines: string[]): void {
  const cacheFile = path.join(CACHE_DIR, `transcript_s${String(season).padStart(2, '0')}e${String(episode).padStart(2, '0')}.json`);
  fs.writeFileSync(cacheFile, JSON.stringify(lines));
}

// GET /api/episodes - Return episode list grouped by season
router.get('/api/episodes', async (_req: Request, res: Response) => {
  try {
    // Check cache first
    const cached = getCachedEpisodes();
    if (cached) {
      res.json({ success: true, data: cached });
      return;
    }
    
    const html = await fetchPage(INDEX_URL);
    const episodes = parseEpisodeIndex(html);
    
    setCachedEpisodes(episodes as unknown as Record<string, unknown>);
    res.json({ success: true, data: episodes });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching episodes:', message);
    res.status(500).json({ success: false, error: `获取剧集列表失败: ${message}` });
  }
});

// GET /api/transcript?season=1&episode=1 - Return transcript lines
router.get('/api/transcript', async (req: Request, res: Response) => {
  try {
    const season = parseInt(req.query.season as string, 10);
    const episode = parseInt(req.query.episode as string, 10);
    
    if (!season || !episode || season < 1 || season > 11 || episode < 1) {
      res.status(400).json({ success: false, error: '无效的季节或集数参数' });
      return;
    }
    
    // Check cache first
    const cached = getCachedTranscript(season, episode);
    if (cached) {
      res.json({ success: true, data: cached });
      return;
    }
    
    const episodeId = `s${String(season).padStart(2, '0')}e${String(episode).padStart(2, '0')}`;
    const url = `${BASE_URL}/view_episode_scripts.php?tv-show=modern-family&episode=${episodeId}`;
    
    const html = await fetchPage(url);
    const lines = parseTranscript(html);
    
    if (lines.length === 0) {
      res.status(404).json({ success: false, error: '未找到该集剧本，请检查季集是否正确' });
      return;
    }
    
    setCachedTranscript(season, episode, lines);
    res.json({ success: true, data: lines });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching transcript:', message);
    res.status(500).json({ success: false, error: `获取剧本失败: ${message}` });
  }
});

// Health check
router.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
