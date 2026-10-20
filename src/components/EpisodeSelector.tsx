import { useState, useEffect } from 'react';
import type { EpisodeList, DifficultyLevel } from '../types';
import { DIFFICULTY_LABELS } from '../types';
import { fetchEpisodes } from '../services/api';

interface EpisodeSelectorProps {
  onGenerate: (season: number, episode: number) => void;
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
  const [episodes, setEpisodes] = useState<EpisodeList>({});
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEpisodes()
      .then(data => {
        setEpisodes(data);
        setLoadingEpisodes(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : '加载剧集列表失败');
        setLoadingEpisodes(false);
      });
  }, []);

  const seasonNumbers = Object.keys(episodes).map(Number).sort((a, b) => a - b);
  const episodeList = episodes[season] || [];

  const handleGenerate = () => {
    onGenerate(season, episode);
  };

  const difficulties: DifficultyLevel[] = ['gk', 'cet4', 'ky'];

  return (
    <div className="space-y-4">
      {/* Episode Selection */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-stone-600">季</label>
          <select
            value={season}
            onChange={(e) => {
              const s = parseInt(e.target.value, 10);
              setSeason(s);
              setEpisode(1);
            }}
            disabled={loadingEpisodes}
            className="px-3 py-2 border border-stone-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
          >
            {loadingEpisodes ? (
              <option>加载中...</option>
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
            {episodeList.length === 0 && !loadingEpisodes ? (
              <option value={1}>第 1 集</option>
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
          disabled={isLoading || loadingEpisodes}
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
