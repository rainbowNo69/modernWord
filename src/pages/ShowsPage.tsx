import { useState } from 'react';
import type { Show } from '../types';
import { RECOMMENDED_SHOWS } from '../constants';
import type { RecommendedShow } from '../constants';
import { searchShows } from '../services/api';

interface ShowsPageProps {
  currentShow: Show | null;
  onSelect: (show: Show) => void;
  onBack: () => void;
}

function PosterCard({ show, active, onSelect }: {
  show: RecommendedShow;
  active: boolean;
  onSelect: (show: Show) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <button
      onClick={() => onSelect(show)}
      className={`group relative text-left overflow-hidden rounded-2xl border transition-all duration-300 ${
        active
          ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-lg'
          : 'border-stone-200 hover:border-stone-300 hover:shadow-xl hover:-translate-y-1'
      }`}
    >
      <div className="aspect-[2/3] w-full bg-stone-100">
        {imageFailed ? (
          <div className={`w-full h-full bg-gradient-to-br ${show.accent} flex flex-col justify-end p-4`}>
            <p className="text-white/80 text-xs tracking-[0.2em] uppercase">{show.year}</p>
            <p className="text-white text-2xl font-semibold leading-tight mt-1">{show.title}</p>
            <p className="text-white/70 text-xs mt-1">{show.originalTitle}</p>
          </div>
        ) : (
          <img
            src={show.poster}
            alt={show.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-4">
        <p className="text-white font-semibold text-lg leading-tight">{show.title}</p>
        <p className="text-white/70 text-xs mt-0.5">{show.originalTitle} · {show.year}</p>
      </div>

      {active && (
        <span className="absolute right-3 top-3 rounded-full bg-teal-600 px-2 py-0.5 text-[11px] font-medium text-white">
          当前
        </span>
      )}
    </button>
  );
}

export default function ShowsPage({ currentShow, onSelect, onBack }: ShowsPageProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Show[]>([]);
  const [notice, setNotice] = useState('');

  const runSearch = async () => {
    const keyword = query.trim();
    if (keyword.length < 2) {
      setNotice('请输入至少 2 个字符的剧名关键词');
      return;
    }

    setSearching(true);
    setNotice('');
    setResults([]);
    try {
      const found = await searchShows(keyword);
      setResults(found);
      if (found.length === 0) {
        setNotice(`未找到与“${keyword}”相关的美剧，换个拼写试试（例如 friends、modern family）`);
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : '搜索失败，请稍后重试');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回
      </button>

      <header className="mb-8">
        <p className="text-sm font-medium text-teal-700 tracking-wide">STEP 1</p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
          想从哪部美剧学起？
        </h1>
        <p className="mt-2 text-stone-500">
          直接选下面推荐的两部，或搜索任意美剧（数据来自 springfieldspringfield.co.uk）
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void runSearch(); }}
            placeholder="搜索美剧，例如 friends / modern family / the office"
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-stone-200 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => void runSearch()}
          disabled={searching}
          className="px-6 py-3.5 rounded-2xl bg-stone-900 text-white text-sm font-medium shadow-sm hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {searching ? '搜索中...' : '搜索'}
        </button>
      </div>

      {notice && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {notice}
        </p>
      )}

      {results.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-stone-500 mb-3">搜索结果（{results.length}）</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {results.map(item => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className={`rounded-xl border bg-white px-4 py-3 text-left transition-all ${
                  currentShow?.id === item.id
                    ? 'border-teal-500 ring-1 ring-teal-500/30'
                    : 'border-stone-200 hover:border-stone-300 hover:shadow-sm'
                }`}
              >
                <p className="font-medium text-stone-900 truncate">{item.title}</p>
                <p className="text-xs text-stone-400 truncate mt-0.5">{item.id}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-sm font-medium text-stone-500 mb-4">推荐</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {RECOMMENDED_SHOWS.map(show => (
            <PosterCard
              key={show.id}
              show={show}
              active={currentShow?.id === show.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
