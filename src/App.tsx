import { useState, useCallback, useEffect } from 'react';
import Settings from './components/Settings';
import EpisodeSelector from './components/EpisodeSelector';
import WordList from './components/WordList';
import BottomBar from './components/BottomBar';
import ResultDialog from './components/ResultDialog';
import ShowsPage from './pages/ShowsPage';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useHashRoute } from './hooks/useHashRoute';
import { loadDictionary, processTranscript } from './services/dict';
import { fetchTranscript } from './services/api';
import { addWordsToEudic } from './services/eudic';
import { updateNotepad } from './services/maimemo';
import { LS_KEYS } from './types';
import type { Show, VocabWord, DifficultyLevel, PushResult } from './types';

export default function App() {
  const { route, navigate } = useHashRoute();

  const [show, setShow] = useLocalStorage<Show | null>(LS_KEYS.SHOW, null);
  const [difficulty, setDifficulty] = useLocalStorage<DifficultyLevel>(LS_KEYS.DIFFICULTY, 'cet4');
  const [eudicToken] = useLocalStorage(LS_KEYS.EUDIC_TOKEN, '');
  const [maimemoToken] = useLocalStorage(LS_KEYS.MAIMEMO_TOKEN, '');
  const [eudicCategory] = useLocalStorage(LS_KEYS.EUDIC_CATEGORY, '');
  const [maimemoNotepad] = useLocalStorage(LS_KEYS.MAIMEMO_NOTEPAD, '');
  const [maimemoMode] = useLocalStorage<'append' | 'overwrite'>(LS_KEYS.MAIMEMO_MODE, 'append');

  const [words, setWords] = useState<VocabWord[]>([]);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [error, setError] = useState('');
  const [dictLoaded, setDictLoaded] = useState(false);
  const [dictError, setDictError] = useState('');

  const [resultDialog, setResultDialog] = useState<{
    isOpen: boolean;
    result: PushResult | null;
    title: string;
  }>({ isOpen: false, result: null, title: '' });

  // Load dictionary on mount
  useEffect(() => {
    loadDictionary()
      .then(() => setDictLoaded(true))
      .catch(err => {
        setDictError(err instanceof Error ? err.message : '词典加载失败');
      });
  }, []);

  const handleSelectShow = useCallback((next: Show) => {
    setShow(next);
    setWords([]);
    setSelectedWords(new Set());
    setError('');
    navigate('home');
  }, [setShow, navigate]);

  const handleGenerate = useCallback(async (season: number, episode: number) => {
    if (!show) return;

    setError('');
    setIsLoading(true);

    try {
      if (!dictLoaded) {
        await loadDictionary();
        setDictLoaded(true);
      }

      const lines = await fetchTranscript(show.id, season, episode);
      const vocabWords = processTranscript(lines, difficulty);
      setWords(vocabWords);

      // 默认不选中，由用户自己勾选要推送的单词
      setSelectedWords(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成生词表失败');
      setWords([]);
      setSelectedWords(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [dictLoaded, difficulty, show]);

  // Re-filter when difficulty changes
  const handleDifficultyChange = useCallback((level: DifficultyLevel) => {
    setDifficulty(level);
  }, [setDifficulty]);

  const handlePushEudic = useCallback(async () => {
    if (!eudicToken || !eudicCategory) {
      setResultDialog({
        isOpen: true,
        result: { success: 0, failed: 0, failedWords: [], message: '请先在设置中配置欧路词典 Token 并选择生词本' },
        title: '欧路词典',
      });
      return;
    }

    const wordsToPush = words.filter(w => selectedWords.has(w.word) && !w.added);
    if (wordsToPush.length === 0) {
      setResultDialog({
        isOpen: true,
        result: { success: 0, failed: 0, failedWords: [], message: '没有需要添加的单词' },
        title: '欧路词典',
      });
      return;
    }

    setIsPushing(true);
    try {
      const wordList = wordsToPush.map(w => w.word);
      const result = await addWordsToEudic(eudicToken, eudicCategory, wordList);

      // Mark added words
      if (result.success > 0) {
        setWords(prev => prev.map(w =>
          selectedWords.has(w.word) ? { ...w, added: true } : w
        ));
      }

      setResultDialog({ isOpen: true, result, title: '欧路词典' });
    } catch (err) {
      setResultDialog({
        isOpen: true,
        result: {
          success: 0,
          failed: wordsToPush.length,
          failedWords: wordsToPush.map(w => w.word),
          message: err instanceof Error ? err.message : '推送失败',
        },
        title: '欧路词典',
      });
    } finally {
      setIsPushing(false);
    }
  }, [eudicToken, eudicCategory, words, selectedWords]);

  const handlePushMaimemo = useCallback(async () => {
    if (!maimemoToken || !maimemoNotepad) {
      setResultDialog({
        isOpen: true,
        result: { success: 0, failed: 0, failedWords: [], message: '请先在设置中配置墨墨 Token 并选择云词本' },
        title: '墨墨背单词',
      });
      return;
    }

    const wordsToPush = words.filter(w => selectedWords.has(w.word) && !w.added);
    if (wordsToPush.length === 0) {
      setResultDialog({
        isOpen: true,
        result: { success: 0, failed: 0, failedWords: [], message: '没有需要添加的单词' },
        title: '墨墨背单词',
      });
      return;
    }

    setIsPushing(true);
    try {
      const wordList = wordsToPush.map(w => w.word);
      const result = await updateNotepad(maimemoToken, maimemoNotepad, wordList, maimemoMode);

      if (result.success > 0) {
        setWords(prev => prev.map(w =>
          selectedWords.has(w.word) ? { ...w, added: true } : w
        ));
      }

      setResultDialog({ isOpen: true, result, title: '墨墨背单词' });
    } catch (err) {
      setResultDialog({
        isOpen: true,
        result: {
          success: 0,
          failed: wordsToPush.length,
          failedWords: wordsToPush.map(w => w.word),
          message: err instanceof Error ? err.message : '推送失败',
        },
        title: '墨墨背单词',
      });
    } finally {
      setIsPushing(false);
    }
  }, [maimemoToken, maimemoNotepad, words, selectedWords, maimemoMode]);

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Header */}
      <header className="bg-white/85 backdrop-blur border-b border-stone-200/80 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('settings')}
            aria-label="设置"
            title="设置"
            className={`w-10 h-10 rounded-full inline-flex items-center justify-center border transition-colors ${
              route === 'settings'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <button
            onClick={() => navigate('home')}
            className="flex items-center gap-2.5 text-left"
          >
            <span className="w-9 h-9 rounded-xl bg-teal-700 text-white inline-flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </span>
            <span>
              <span className="block text-base font-semibold tracking-tight text-stone-900 leading-tight">
                美剧生词采集器
              </span>
              <span className="block text-xs text-stone-400 leading-tight">看剧学词，一键进生词本</span>
            </span>
          </button>

          {route === 'home' && (
            <button
              onClick={() => navigate('shows')}
              className="ml-auto text-sm text-stone-500 hover:text-stone-900 transition-colors"
            >
              选剧
            </button>
          )}
        </div>
      </header>

      {route === 'shows' && (
        <ShowsPage
          currentShow={show}
          onSelect={handleSelectShow}
          onBack={() => navigate('home')}
        />
      )}

      {route === 'settings' && (
        <Settings onBack={() => navigate('home')} />
      )}

      {route === 'home' && (
        <main className="max-w-5xl mx-auto px-4 py-8 space-y-5">
          {dictError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-sm text-red-700">{dictError}</p>
              <p className="text-xs text-red-500 mt-1">请确保已运行词典数据处理脚本</p>
            </div>
          )}

          {!show && (
            <section className="rounded-2xl border border-stone-200 bg-white shadow-sm p-8 text-center">
              <p className="text-lg font-semibold text-stone-900">先挑一部美剧</p>
              <p className="text-sm text-stone-500 mt-1">支持任意美剧剧本，选好后再挑季和集</p>
              <button
                onClick={() => navigate('shows')}
                className="mt-5 px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-medium shadow-sm hover:bg-teal-800 transition-colors"
              >
                去选剧
              </button>
            </section>
          )}

          <section className="rounded-2xl border border-stone-200 bg-white shadow-sm p-5">
            <EpisodeSelector
              show={show}
              onPickShow={() => navigate('shows')}
              onGenerate={(season, episode) => void handleGenerate(season, episode)}
              difficulty={difficulty}
              onDifficultyChange={handleDifficultyChange}
              isLoading={isLoading}
            />
          </section>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <section className="rounded-2xl border border-stone-200 bg-white shadow-sm p-5">
            <WordList
              words={words}
              selectedWords={selectedWords}
              onSelectionChange={setSelectedWords}
            />
          </section>
        </main>
      )}

      {route === 'home' && (
        <BottomBar
          selectedCount={selectedWords.size}
          onPushEudic={() => void handlePushEudic()}
          onPushMaimemo={() => void handlePushMaimemo()}
          isPushing={isPushing}
          hasEudicToken={!!eudicToken}
          hasMaimemoToken={!!maimemoToken}
        />
      )}

      {/* Result Dialog */}
      <ResultDialog
        isOpen={resultDialog.isOpen}
        onClose={() => setResultDialog({ isOpen: false, result: null, title: '' })}
        result={resultDialog.result}
        title={resultDialog.title}
      />
    </div>
  );
}
