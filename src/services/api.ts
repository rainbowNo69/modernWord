import type { EpisodeList } from '../types';

const API_BASE = '';

// Fetch episode list
export async function fetchEpisodes(): Promise<EpisodeList> {
  const res = await fetch(`${API_BASE}/api/episodes`);
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || '获取剧集列表失败');
  }
  return json.data;
}

// Fetch transcript for an episode
export async function fetchTranscript(season: number, episode: number): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/transcript?season=${season}&episode=${episode}`);
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || '获取剧本失败');
  }
  return json.data;
}
