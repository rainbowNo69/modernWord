import type { EpisodeList, Show } from '../types';

const API_BASE = '';

// Search TV shows by keyword
export async function searchShows(query: string): Promise<Show[]> {
  const res = await fetch(`${API_BASE}/api/shows?q=${encodeURIComponent(query)}`);
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || '搜索剧集失败');
  }
  return json.data as Show[];
}

// Fetch episode list of a show
export async function fetchEpisodes(show: string): Promise<EpisodeList> {
  const res = await fetch(`${API_BASE}/api/episodes?show=${encodeURIComponent(show)}`);
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || '获取剧集列表失败');
  }
  return json.data as EpisodeList;
}

// Fetch transcript of one episode
export async function fetchTranscript(show: string, season: number, episode: number): Promise<string[]> {
  const res = await fetch(
    `${API_BASE}/api/transcript?show=${encodeURIComponent(show)}&season=${season}&episode=${episode}`
  );
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || '获取剧本失败');
  }
  return json.data as string[];
}
