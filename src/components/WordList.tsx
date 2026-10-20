import { useState, useMemo } from 'react';
import type { VocabWord } from '../types';
import { filterWords } from '../services/dict';

interface WordListProps {
  words: VocabWord[];
  selectedWords: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
}

const TAG_LABELS: Record<string, string> = {
  gk: '中考',
  cet4: '四级',
  cet6: '六级',
  ky: '考研',
  ielts: '雅思',
  toefl: '托福',
  gre: 'GRE',
};

const TAG_CLASSES: Record<string, string> = {
  gk: 'tag-gk',
  cet4: 'tag-cet4',
  cet6: 'tag-cet6',
  ky: 'tag-ky',
  ielts: 'tag-ielts',
  toefl: 'tag-toefl',
  gre: 'tag-gre',
};

const ALL_TAGS = ['gk', 'cet4', 'cet6', 'ky', 'ielts', 'toefl', 'gre'];

export default function WordList({ words, selectedWords, onSelectionChange }: WordListProps) {
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const filteredWords = useMemo(
    () => filterWords(words, search, tagFilter),
    [words, search, tagFilter]
  );

  const allSelected = filteredWords.length > 0 && filteredWords.every(w => selectedWords.has(w.word));

  const toggleSelectAll = () => {
    if (allSelected) {
      // Deselect all filtered words
      const newSet = new Set(selectedWords);
      filteredWords.forEach(w => newSet.delete(w.word));
      onSelectionChange(newSet);
    } else {
      // Select all filtered words
      const newSet = new Set(selectedWords);
      filteredWords.forEach(w => newSet.add(w.word));
      onSelectionChange(newSet);
    }
  };

  const toggleWord = (word: string) => {
    const newSet = new Set(selectedWords);
    if (newSet.has(word)) {
      newSet.delete(word);
    } else {
      newSet.add(word);
    }
    onSelectionChange(newSet);
  };

  const speak = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const highlightWord = (context: string, word: string) => {
    const idx = context.toLowerCase().indexOf(word.toLowerCase());
    if (idx === -1) return context;
    const before = context.slice(0, idx);
    const match = context.slice(idx, idx + word.length);
    const after = context.slice(idx + word.length);
    return (
      <>
        {before}
        <span className="font-semibold text-teal-700 bg-teal-50 px-0.5 rounded">{match}</span>
        {after}
      </>
    );
  };

  // Get available tags in current word list
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    words.forEach(w => w.tags.forEach(t => tagSet.add(t)));
    return ALL_TAGS.filter(t => tagSet.has(t));
  }, [words]);

  if (words.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        <svg className="w-16 h-16 mx-auto mb-4 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p className="text-lg font-medium">选择一集开始生成生词表</p>
        <p className="text-sm mt-1">选择季和集，点击"生成生词表"按钮</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索单词或释义..."
            className="w-full pl-10 pr-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="rounded border-stone-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-stone-600">全选</span>
        </label>

        <span className="text-sm text-stone-500">
          已选 <span className="font-medium text-teal-700">{selectedWords.size}</span> / {words.length} 词
        </span>
      </div>

      {/* Tag Filter Chips */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTagFilter(null)}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
              tagFilter === null
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            全部
          </button>
          {availableTags.map(tag => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                tagFilter === tag
                  ? 'bg-stone-800 text-white'
                  : TAG_CLASSES[tag] || 'bg-stone-100 text-stone-600'
              } hover:opacity-80`}
            >
              {TAG_LABELS[tag] || tag}
            </button>
          ))}
        </div>
      )}

      {/* Word List */}
      <div className="space-y-2 max-h-[calc(100vh-420px)] overflow-y-auto scrollbar-thin pr-1">
        {filteredWords.map(word => (
          <div
            key={word.word}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm ${
              selectedWords.has(word.word)
                ? 'border-teal-200 bg-teal-50/50'
                : 'border-stone-100 bg-white hover:border-stone-200'
            } ${word.added ? 'opacity-60' : ''}`}
            onClick={() => toggleWord(word.word)}
          >
            <input
              type="checkbox"
              checked={selectedWords.has(word.word)}
              onChange={() => toggleWord(word.word)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-stone-900">{word.word}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(word.word);
                  }}
                  className="text-stone-400 hover:text-teal-600 transition-colors"
                  title="发音"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
                {word.phonetic && (
                  <span className="text-sm text-stone-500">{word.phonetic}</span>
                )}
                {word.tags.map(tag => (
                  <span
                    key={tag}
                    className={`px-1.5 py-0.5 text-xs rounded ${TAG_CLASSES[tag] || 'bg-stone-100 text-stone-600'}`}
                  >
                    {TAG_LABELS[tag] || tag}
                  </span>
                ))}
                {word.added && (
                  <span className="px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700">已添加</span>
                )}
              </div>
              <p className="text-sm text-stone-600 mt-1 leading-relaxed">{word.translation}</p>
              <p className="text-xs text-stone-400 mt-1 italic leading-relaxed">
                {highlightWord(word.context, word.word)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {filteredWords.length === 0 && words.length > 0 && (
        <div className="text-center py-8 text-stone-500">
          <p>没有找到匹配的单词</p>
        </div>
      )}
    </div>
  );
}
