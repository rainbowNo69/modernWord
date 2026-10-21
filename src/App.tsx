import { useState, useCallback, useEffect } from 'react';
import Settings from './components/Settings';
import EpisodeSelector from './components/EpisodeSelector';
import WordList from './components/WordList';
import BottomBar from './components/BottomBar';
import ResultDialog from './components/ResultDialog';
import { useLocalStorage } from './hooks/useLocalStorage';
import { loadDictionary, processTranscript } from './services/dict';
import { fetchTranscript } from './services/api';
import { addWordsToEudic } from './services/eudic';
import { updateNotepad } from './services/maimemo';
import { LS_KEYS } from './types';
import type { VocabWord, DifficultyLevel, PushResult } from './types';

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [difficulty, setDifficulty] = useLocalStorage<DifficultyLevel>(LS_KEYS.DIFFICULTY, 'cet4');
  const [eudicToken] = useLocalStorage(LS_KEYS.EUDIC_TOKEN, '');
  const [maimemoToken] = useLocalStorage(LS_KEYS.MAIMEMO_TOKEN, '');
  const [eudicCategory] = useLocalStorage(LS_KEYS.EUDIC_CATEGORY, '');
  const [maimemoNotepad] = useLocalStorage(LS_KEYS.MAIMEMO_NOTEPAD, '');
  const [eudicWithContext] = useLocalStorage(LS_KEYS.EUDIC_WITH_CONTEXT, false);
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

  const handleGenerate = useCallback(async (show: string, season: number, episode: number) => {
    setError('');
    setIsLoading(true);

    try {
      if (!dictLoaded) {
        await loadDictionary();
        setDictLoaded(true);
      }

      const lines = await fetchTranscript(show, season, episode);
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
  }, [dictLoaded, difficulty]);

  // Re-filter when difficulty changes
  const handleDifficultyChange = useCallback((level: DifficultyLevel) => {
    setDifficulty(level);
    // If we have transcript data, re-process would need the lines.
    // For simplicity, we'll just update the difficulty and user needs to regenerate.
    // But we can also store the last transcript and re-process.
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
      const result = await addWordsToEudic(eudicToken, eudicCategory, wordList, eudicWithContext);

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
  }, [eudicToken, eudicCategory, words, selectedWords, eudicWithContext]);

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
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <svg className="w-6 h-6 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                美剧生词采集器
              </h1>
              <p className="text-sm text-stone-500 mt-0.5">
                搜索任意美剧，从剧本中智能识别生词，一键推送到欧路词典 / 墨墨背单词
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Settings Panel */}
        <Settings isOpen={settingsOpen} onToggle={() => setSettingsOpen(!settingsOpen)} />

        {/* Dictionary Loading Status */}
        {dictError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{dictError}</p>
            <p className="text-xs text-red-500 mt-1">请确保已运行词典数据处理脚本</p>
          </div>
        )}

        {/* Episode Selector */}
        <div className="bg-white rounded-lg border border-stone-200 p-4">
          <EpisodeSelector
            onGenerate={handleGenerate}
            difficulty={difficulty}
            onDifficultyChange={handleDifficultyChange}
            isLoading={isLoading}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Word List */}
        <div className="bg-white rounded-lg border border-stone-200 p-4">
          <WordList
            words={words}
            selectedWords={selectedWords}
            onSelectionChange={setSelectedWords}
          />
        </div>
      </main>

      {/* Bottom Action Bar */}
      <BottomBar
        selectedCount={selectedWords.size}
        onPushEudic={handlePushEudic}
        onPushMaimemo={handlePushMaimemo}
        isPushing={isPushing}
        hasEudicToken={!!eudicToken}
        hasMaimemoToken={!!maimemoToken}
      />

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
