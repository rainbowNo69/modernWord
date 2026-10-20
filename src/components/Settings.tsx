import { useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { testEudicConnection } from '../services/eudic';
import { testMaimemoConnection } from '../services/maimemo';
import { LS_KEYS } from '../types';
import type { EudicCategory, MaimemoNotepad } from '../types';

interface SettingsProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Settings({ isOpen, onToggle }: SettingsProps) {
  const [eudicToken, setEudicToken] = useLocalStorage(LS_KEYS.EUDIC_TOKEN, '');
  const [maimemoToken, setMaimemoToken] = useLocalStorage(LS_KEYS.MAIMEMO_TOKEN, '');
  const [eudicCategory, setEudicCategory] = useLocalStorage(LS_KEYS.EUDIC_CATEGORY, '');
  const [maimemoNotepad, setMaimemoNotepad] = useLocalStorage(LS_KEYS.MAIMEMO_NOTEPAD, '');
  const [eudicWithContext, setEudicWithContext] = useLocalStorage(LS_KEYS.EUDIC_WITH_CONTEXT, false);
  const [maimemoMode, setMaimemoMode] = useLocalStorage<'append' | 'overwrite'>(LS_KEYS.MAIMEMO_MODE, 'append');

  const [showEudicToken, setShowEudicToken] = useState(false);
  const [showMaimemoToken, setShowMaimemoToken] = useState(false);
  const [eudicCategories, setEudicCategories] = useState<EudicCategory[]>([]);
  const [maimemoNotepads, setMaimemoNotepads] = useState<MaimemoNotepad[]>([]);
  const [eudicStatus, setEudicStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [maimemoStatus, setMaimemoStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [eudicError, setEudicError] = useState('');
  const [maimemoError, setMaimemoError] = useState('');

  // Auto-test connections on mount if tokens exist
  useEffect(() => {
    if (eudicToken) handleTestEudic();
    if (maimemoToken) handleTestMaimemo();
  }, []);

  const handleTestEudic = async () => {
    if (!eudicToken.trim()) return;
    setEudicStatus('loading');
    setEudicError('');
    try {
      const categories = await testEudicConnection(eudicToken.trim());
      setEudicCategories(categories);
      setEudicStatus('success');
      if (!eudicCategory && categories.length > 0) {
        setEudicCategory(categories[0].id);
      }
    } catch (err) {
      setEudicStatus('error');
      setEudicError(err instanceof Error ? err.message : '连接失败');
    }
  };

  const handleTestMaimemo = async () => {
    if (!maimemoToken.trim()) return;
    setMaimemoStatus('loading');
    setMaimemoError('');
    try {
      const notepads = await testMaimemoConnection(maimemoToken.trim());
      setMaimemoNotepads(notepads);
      setMaimemoStatus('success');
      if (!maimemoNotepad && notepads.length > 0) {
        setMaimemoNotepad(notepads[0].id);
      }
    } catch (err) {
      setMaimemoStatus('error');
      setMaimemoError(err instanceof Error ? err.message : '连接失败');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-stone-50 transition-colors"
      >
        <span className="font-medium text-stone-800 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          设置
        </span>
        <svg
          className={`w-5 h-5 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-6 border-t border-stone-100">
          {/* Eudic Section */}
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-teal-600"></div>
              <h3 className="font-medium text-stone-800">欧路词典</h3>
              <a
                href="https://my.eudic.net/OpenAPI/Authorization"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-teal-600 hover:text-teal-700 ml-auto"
              >
                获取 Token
              </a>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showEudicToken ? 'text' : 'password'}
                    value={eudicToken}
                    onChange={(e) => setEudicToken(e.target.value)}
                    placeholder="输入欧路词典 API Token"
                    className="w-full px-3 py-2 pr-10 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEudicToken(!showEudicToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showEudicToken ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                <button
                  onClick={handleTestEudic}
                  disabled={eudicStatus === 'loading' || !eudicToken.trim()}
                  className="px-3 py-2 text-sm font-medium text-teal-700 bg-teal-50 rounded-md hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {eudicStatus === 'loading' ? '连接中...' : '测试连接'}
                </button>
              </div>

              {eudicStatus === 'success' && (
                <select
                  value={eudicCategory}
                  onChange={(e) => setEudicCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {eudicCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              )}

              {eudicStatus === 'error' && (
                <p className="text-sm text-red-600">{eudicError}</p>
              )}

              <label className="flex items-center gap-2 text-sm text-stone-600">
                <input
                  type="checkbox"
                  checked={eudicWithContext}
                  onChange={(e) => setEudicWithContext(e.target.checked)}
                  className="rounded border-stone-300 text-teal-600 focus:ring-teal-500"
                />
                逐条添加并附带剧中例句（较慢）
              </label>
            </div>
          </div>

          {/* Maimemo Section */}
          <div className="pt-4 border-t border-stone-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-orange-600"></div>
              <h3 className="font-medium text-stone-800">墨墨背单词</h3>
              <a
                href="https://open.maimemo.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-600 hover:text-orange-700 ml-auto"
              >
                获取 Token
              </a>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showMaimemoToken ? 'text' : 'password'}
                    value={maimemoToken}
                    onChange={(e) => setMaimemoToken(e.target.value)}
                    placeholder="输入墨墨 API Token"
                    className="w-full px-3 py-2 pr-10 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMaimemoToken(!showMaimemoToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showMaimemoToken ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                <button
                  onClick={handleTestMaimemo}
                  disabled={maimemoStatus === 'loading' || !maimemoToken.trim()}
                  className="px-3 py-2 text-sm font-medium text-orange-700 bg-orange-50 rounded-md hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {maimemoStatus === 'loading' ? '连接中...' : '测试连接'}
                </button>
              </div>

              {maimemoStatus === 'success' && (
                <select
                  value={maimemoNotepad}
                  onChange={(e) => setMaimemoNotepad(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {maimemoNotepads.map(np => (
                    <option key={np.id} value={np.id}>{np.title}</option>
                  ))}
                </select>
              )}

              {maimemoStatus === 'error' && (
                <p className="text-sm text-red-600">{maimemoError}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-stone-600">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="maimemoMode"
                    checked={maimemoMode === 'append'}
                    onChange={() => setMaimemoMode('append')}
                    className="text-orange-600 focus:ring-orange-500"
                  />
                  追加（自动去重）
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="maimemoMode"
                    checked={maimemoMode === 'overwrite'}
                    onChange={() => setMaimemoMode('overwrite')}
                    className="text-orange-600 focus:ring-orange-500"
                  />
                  覆盖
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
