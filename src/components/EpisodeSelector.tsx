import { useEffect, useState } from 'react';
import type { EpisodeList, Show, DifficultyLevel } from '../types';
import { DIFFICULTY_LABELS } from '../types';
import { fetchEpisodes } from '../services/api';

interface EpisodeSelectorProps {
  show: Show | null;
  onPickShow: () => void;
  onGenerate: (season: number, episode: number) => void;
  difficulty: DifficultyLevel;
  onDifficultyChange: (level: DifficultyLevel) => void;
  isLoading: boolean;
}

export default function EpisodeSelector({
  show,
  onPickShow,
  onGenerate,
  difficulty,
  onDifficultyChange,
  isLoading,
}: EpisodeSelectorProps) {
  const [episodes, setEpisodes] = useState<EpisodeList>({});
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [error, setError] = useState('');

  const showId = show?.id ?? '';

  useEffect(() => {
    if (!showId) {
      setEpisodes({});
      setError('');
      return;
    }

    let cancelled = false;
    setLoadingEpisodes(true);
    setError('');

    fetchEpisodes(showId)
      .then(data => {
        if (cancelled) return;
        setEpisodes(data);
        const seasons = Object.keys(data).map(Number).sort((a, b) => a - b);
        const firstSeason = seasons[0] ?? 1;
        setSeason(firstSeason);
        setEpisode(data[firstSeason]?.[0]?.episode ?? 1);
      })
      .catch(err => {
        if (cancelled) return;
        setEpisodes({});
        setError(err instanceof Error ? err.message : '加载剧集列表失败');
      })
      .finally(() => {
        if (!cancelled) setLoadingEpisodes(false);
      });

    return () => { cancelled = true; };
  }, [showId]);

  const seasonNumbers = Object.keys(episodes).map(Number).sort((a, b) => a - b);
  const episodeList = episodes[season] || [];

  const handleGenerate = () => {
    if (!show) {
      onPickShow();
      return;
    }
    onGenerate(season, episode);
  };

  const difficulties: DifficultyLevel[] = ['gk', 'cet4', 'ky'];

  return (
    <div className="space-y-5">
      {/* Current show */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-stone-900 text-white flex items-center justify-center text-sm font-semibold shrink-0">
          {show ? show.title.slice(0, 1) : '?'}
        </div>
        <div className="min-w-0 flex-1">
          {show ? (
            <>
              <p className="font-semibold text-stone-900 truncate">{show.title}</p>
              <p className="text-xs text-stone-400 truncate">{show.id}</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-stone-900">还没有选择美剧</p>
              <p className="text-xs text-stone-400">先挑一部剧，再选季和集</p>
            </>
          )}
        </div>
        <button
          onClick={onPickShow}
          className="px-3.5 py-2 rounded-xl border border-stone-200 text-sm text-stone-600 hover:border-stone-300 hover:bg-stone-50 transition-colors"
        >
          {show ? '更换' : '选择'}
        </button>
      </div>

      {/* Season / episode */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-stone-500">季</label>
          <select
            value={season}
            onChange={(e) => {
              const s = parseInt(e.target.value, 10);
              setSeason(s);
              setEpisode(episodes[s]?.[0]?.episode ?? 1);
            }}
            disabled={loadingEpisodes || seasonNumbers.length === 0}
            className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
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

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <label className="text-sm font-medium text-stone-500">集</label>
          <select
            value={episode}
            onChange={(e) => setEpisode(parseInt(e.target.value, 10))}
            disabled={loadingEpisodes || episodeList.length === 0}
            className="w-full max-w-xs px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
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
          className="px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-medium shadow-sm hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Difficulty */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-stone-500">难度</span>
        <div className="flex rounded-xl border border-stone-200 overflow-hidden bg-white">
          {difficulties.map(level => (
            <button
              key={level}
              onClick={() => onDifficultyChange(level)}
              className={`px-3.5 py-1.5 text-sm transition-colors ${
                difficulty === level
                  ? 'bg-teal-700 text-white'
                  : 'text-stone-600 hover:bg-stone-50'
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
