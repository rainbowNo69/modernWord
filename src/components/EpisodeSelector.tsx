import { useState, useEffect, useCallback } from 'react';
import type { EpisodeList, Show, DifficultyLevel } from '../types';
import { DIFFICULTY_LABELS, LS_KEYS } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { searchShows, fetchEpisodes } from '../services/api';

interface EpisodeSelectorProps {
  onGenerate: (show: string, season: number, episode: number) => void;
  difficulty: DifficultyLevel;
  onDifficultyChange: (level: DifficultyLevel) => void;
  isLoading: boolean;
}

export default function EpisodeSelector({
  onGenerate,
  difficulty,
  onDifficultyChange,
  isLoading,
}: EpisodeSelectorProps) {
  const [savedShow, setSavedShow] = useLocalStorage<Show | null>(LS_KEYS.SHOW, null);

  const [show, setShow] = useState<Show | null>(savedShow);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Show[]>([]);
  const [notice, setNotice] = useState('');

  const [episodes, setEpisodes] = useState<EpisodeList>({});
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [error, setError] = useState('');

  const loadEpisodes = useCallback(async (target: Show) => {
    setLoadingEpisodes(true);
    setError('');
    try {
      const data = await fetchEpisodes(target.id);
      setEpisodes(data);
      const seasons = Object.keys(data).map(Number).sort((a, b) => a - b);
      setSeason(seasons[0] ?? 1);
      setEpisode(data[seasons[0] ?? 1]?.[0]?.episode ?? 1);
    } catch (err) {
      setEpisodes({});
      setError(err instanceof Error ? err.message : '加载剧集列表失败');
    } finally {
      setLoadingEpisodes(false);
    }
  }, []);

  // 恢复上次选择的剧集
  useEffect(() => {
    if (savedShow) {
      void loadEpisodes(savedShow);
    }
  }, [savedShow, loadEpisodes]);

  const handleSearch = async () => {
    const keyword = query.trim();
    if (keyword.length < 2) {
      setNotice('请输入至少 2 个字符的剧名关键词');
      return;
    }

    setSearching(true);
    setNotice('');
    setResults([]);
    setError('');
    try {
      const found = await searchShows(keyword);
      setResults(found);
      if (found.length === 0) {
        setNotice(`未找到与“${keyword}”相关的美剧，请检查拼写或换个关键词试试`);
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : '搜索失败');
    } finally {
      setSearching(false);
    }
  };

  const handlePickShow = (target: Show) => {
    setShow(target);
    setSavedShow(target);
    setResults([]);
    setNotice('');
    setQuery('');
    // 选中的剧写入 localStorage 后，由上面的 effect 统一加载季/集
  };

  const seasonNumbers = Object.keys(episodes).map(Number).sort((a, b) => a - b);
  const episodeList = episodes[season] || [];

  const handleGenerate = () => {
    if (!show) {
      setError('请先搜索并选择一部美剧');
      return;
    }
    onGenerate(show.id, season, episode);
  };

  const difficulties: DifficultyLevel[] = ['gk', 'cet4', 'ky'];

  return (
    <div className="space-y-4">
      {/* Show search */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSearch();
              }}
              placeholder="搜索美剧，例如 friends / modern family"
              className="w-full pl-10 pr-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            onClick={() => void handleSearch()}
            disabled={searching}
            className="px-4 py-2 bg-stone-800 text-white text-sm font-medium rounded-md hover:bg-stone-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {searching ? '搜索中...' : '搜索'}
          </button>
        </div>

        {show && (
          <p className="text-sm text-stone-600">
            当前剧集：
            <span className="font-medium text-stone-900">{show.title}</span>
            <span className="text-stone-400 ml-1">({show.id})</span>
          </p>
        )}

        {notice && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">{notice}</p>
        )}

        {results.length > 0 && (
          <div className="border border-stone-200 rounded-md divide-y divide-stone-100 max-h-56 overflow-y-auto">
            {results.map(item => (
              <button
                key={item.id}
                onClick={() => handlePickShow(item)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 transition-colors flex items-baseline gap-2"
              >
                <span className="font-medium text-stone-900">{item.title}</span>
                <span className="text-xs text-stone-400">{item.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Episode selection */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-stone-600">季</label>
          <select
            value={season}
            onChange={(e) => {
              const s = parseInt(e.target.value, 10);
              setSeason(s);
              setEpisode(episodes[s]?.[0]?.episode ?? 1);
            }}
            disabled={loadingEpisodes || seasonNumbers.length === 0}
            className="px-3 py-2 border border-stone-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
          >
            {seasonNumbers.length === 0 ? (
              <option value={1}>{loadingEpisodes ? '加载中...' : '请先选剧'}</option>
            ) : (
              seasonNumbers.map(s => (
                <option key={s} value={s}>第 {s} 季</option>
              ))
            )}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-stone-600">集</label>
          <select
            value={episode}
            onChange={(e) => setEpisode(parseInt(e.target.value, 10))}
            disabled={loadingEpisodes || episodeList.length === 0}
            className="px-3 py-2 border border-stone-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 min-w-[200px]"
          >
            {episodeList.length === 0 ? (
              <option value={1}>{loadingEpisodes ? '加载中...' : '第 1 集'}</option>
            ) : (
              episodeList.map(ep => (
                <option key={ep.episode} value={ep.episode}>
                  第 {ep.episode} 集 - {ep.title}
                </option>
              ))
            )}
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading || loadingEpisodes || !show}
          className="px-4 py-2 bg-teal-700 text-white text-sm font-medium rounded-md hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              处理中...
            </>
          ) : (
            '生成生词表'
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Difficulty Switch */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-stone-600">难度：</span>
        <div className="flex rounded-md border border-stone-200 overflow-hidden">
          {difficulties.map(level => (
            <button
              key={level}
              onClick={() => onDifficultyChange(level)}
              className={`px-3 py-1.5 text-sm transition-colors ${
                difficulty === level
                  ? 'bg-teal-700 text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-50'
              }`}
            >
              {DIFFICULTY_LABELS[level]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
