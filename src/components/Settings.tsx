import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { testEudicConnection } from '../services/eudic';
import { testMaimemoConnection } from '../services/maimemo';
import { TokenExpiredError } from '../services/errors';
import { LS_KEYS } from '../types';
import type { EudicCategory, MaimemoNotepad } from '../types';

interface SettingsProps {
  onBack: () => void;
}

function TokenInput({ value, onChange, placeholder, accent }: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  accent: 'teal' | 'orange';
}) {
  const [visible, setVisible] = useState(false);
  const focusRing = accent === 'teal' ? 'focus:ring-teal-500' : 'focus:ring-orange-500';

  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 ${focusRing} focus:border-transparent`}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? '隐藏 Token' : '显示 Token'}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
      >
        {visible ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        )}
      </button>
    </div>
  );
}

function SectionCard({ title, dot, accent, checkboxClass, enabled, onToggleEnabled, link, children }: {
  title: string;
  dot: string;
  accent: string;
  checkboxClass: string;
  enabled: boolean;
  onToggleEnabled: (next: boolean) => void;
  link: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section className={`rounded-2xl border bg-white shadow-sm p-5 sm:p-6 transition-opacity ${
      enabled ? 'border-stone-200' : 'border-stone-200/70'
    }`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2 h-2 rounded-full ${enabled ? dot : 'bg-stone-300'}`}></span>
        <h2 className={`font-semibold ${enabled ? 'text-stone-900' : 'text-stone-400'}`}>{title}</h2>
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`ml-auto text-xs font-medium ${accent} hover:opacity-80`}
        >
          {link.label}
        </a>
      </div>

      <label className="flex items-center gap-2 text-sm mb-3.5 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggleEnabled(e.target.checked)}
          className={`rounded border-stone-300 ${checkboxClass}`}
        />
        <span className={enabled ? 'text-stone-700' : 'text-stone-400'}>
          启用（关闭后主页面不再显示推送入口）
        </span>
      </label>

      <div className={`space-y-3.5 ${enabled ? '' : 'opacity-50'}`}>{children}</div>
    </section>
  );
}

export default function Settings({ onBack }: SettingsProps) {
  const [eudicToken, setEudicToken] = useLocalStorage(LS_KEYS.EUDIC_TOKEN, '');
  const [maimemoToken, setMaimemoToken] = useLocalStorage(LS_KEYS.MAIMEMO_TOKEN, '');
  const [eudicCategory, setEudicCategory] = useLocalStorage(LS_KEYS.EUDIC_CATEGORY, '');
  const [maimemoNotepad, setMaimemoNotepad] = useLocalStorage(LS_KEYS.MAIMEMO_NOTEPAD, '');
  const [maimemoMode, setMaimemoMode] = useLocalStorage<'append' | 'overwrite'>(LS_KEYS.MAIMEMO_MODE, 'append');
  const [eudicEnabled, setEudicEnabled] = useLocalStorage<boolean>(LS_KEYS.EUDIC_ENABLED, true);
  const [maimemoEnabled, setMaimemoEnabled] = useLocalStorage<boolean>(LS_KEYS.MAIMEMO_ENABLED, true);
  const [eudicWithContext, setEudicWithContext] = useLocalStorage<boolean>(LS_KEYS.EUDIC_WITH_CONTEXT, true);
  const [maimemoWithExample, setMaimemoWithExample] = useLocalStorage<boolean>(LS_KEYS.MAIMEMO_WITH_EXAMPLE, false);

  const [eudicCategories, setEudicCategories] = useState<EudicCategory[]>([]);
  const [maimemoNotepads, setMaimemoNotepads] = useState<MaimemoNotepad[]>([]);
  const [eudicStatus, setEudicStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [maimemoStatus, setMaimemoStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [eudicError, setEudicError] = useState('');
  const [maimemoError, setMaimemoError] = useState('');
  const [eudicAuthExpired, setEudicAuthExpired] = useState(false);
  const [maimemoAuthExpired, setMaimemoAuthExpired] = useState(false);

  // Auto-test connections on mount if tokens exist
  useEffect(() => {
    if (eudicToken) void handleTestEudic();
    if (maimemoToken) void handleTestMaimemo();
  }, []);

  async function handleTestEudic() {
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
      setEudicAuthExpired(err instanceof TokenExpiredError);
      setEudicError(err instanceof Error ? err.message : '连接失败');
    }
  }

  async function handleTestMaimemo() {
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
      setMaimemoAuthExpired(err instanceof TokenExpiredError);
      setMaimemoError(err instanceof Error ? err.message : '连接失败');
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
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
        <p className="text-sm font-medium text-teal-700 tracking-wide">设置</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900">连接你的生词本</h1>
        <p className="mt-2 text-stone-500">
          Token 只保存在本浏览器（localStorage），后端不存储任何凭证。
        </p>
      </header>

      <div className="space-y-5">
        <SectionCard
          title="欧路词典"
          dot="bg-teal-600"
          accent="text-teal-700"
          checkboxClass="text-teal-600 focus:ring-teal-500"
          enabled={eudicEnabled}
          onToggleEnabled={setEudicEnabled}
          link={{ href: 'https://my.eudic.net/OpenAPI/Authorization', label: '获取 Token' }}
        >
          <div className="flex gap-2">
            <div className="flex-1">
              <TokenInput
                value={eudicToken}
                onChange={setEudicToken}
                placeholder="输入欧路词典 API Token"
                accent="teal"
              />
            </div>
            <button
              onClick={() => void handleTestEudic()}
              disabled={eudicStatus === 'loading' || !eudicToken.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {eudicStatus === 'loading' ? '连接中...' : '测试连接'}
            </button>
          </div>

          {eudicStatus === 'success' && (
            <select
              value={eudicCategory}
              onChange={(e) => setEudicCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {eudicCategories.length === 0 && <option value="">（该账号暂无生词本）</option>}
              {eudicCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          )}

          {eudicStatus === 'success' && (
            <label className="flex items-start gap-2 text-sm text-stone-600 cursor-pointer">
              <input
                type="checkbox"
                checked={eudicWithContext}
                onChange={(e) => setEudicWithContext(e.target.checked)}
                className="mt-0.5 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
              />
              <span>
                添加时写入剧中原句
                <span className="block text-xs text-stone-400">
                  欧路里显示为单词语境；批量接口不支持，会改为逐词提交，单词多时较慢
                </span>
              </span>
            </label>
          )}

          {eudicStatus === 'error' && (
            <p className={`text-sm ${eudicAuthExpired ? 'text-amber-700' : 'text-red-600'}`}>{eudicError}</p>
          )}
        </SectionCard>

        <SectionCard
          title="墨墨背单词"
          dot="bg-orange-600"
          accent="text-orange-700"
          checkboxClass="text-orange-600 focus:ring-orange-500"
          enabled={maimemoEnabled}
          onToggleEnabled={setMaimemoEnabled}
          link={{ href: 'https://open.maimemo.com/', label: '获取 Token' }}
        >
          <div className="flex gap-2">
            <div className="flex-1">
              <TokenInput
                value={maimemoToken}
                onChange={setMaimemoToken}
                placeholder="输入墨墨 API Token"
                accent="orange"
              />
            </div>
            <button
              onClick={() => void handleTestMaimemo()}
              disabled={maimemoStatus === 'loading' || !maimemoToken.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {maimemoStatus === 'loading' ? '连接中...' : '测试连接'}
            </button>
          </div>

          {maimemoStatus === 'success' && (
            <select
              value={maimemoNotepad}
              onChange={(e) => setMaimemoNotepad(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {maimemoNotepads.length === 0 && <option value="">（该账号暂无云词本）</option>}
              {maimemoNotepads.map(np => (
                <option key={np.id} value={np.id}>{np.title}</option>
              ))}
            </select>
          )}

          {maimemoStatus === 'success' && (
            <label className="flex items-start gap-2 text-sm text-stone-600 cursor-pointer">
              <input
                type="checkbox"
                checked={maimemoWithExample}
                onChange={(e) => setMaimemoWithExample(e.target.checked)}
                className="mt-0.5 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
              />
              <span>
                添加时为单词创建例句
                <span className="block text-xs text-stone-400">
                  云词本只存单词，例句走墨墨「例句」接口；平台限制每天最多创建 600 条内容
                </span>
              </span>
            </label>
          )}

          {maimemoStatus === 'error' && (
            <p className={`text-sm ${maimemoAuthExpired ? 'text-amber-700' : 'text-red-600'}`}>{maimemoError}</p>
          )}

          <div className="flex items-center gap-5 text-sm text-stone-600 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="maimemoMode"
                checked={maimemoMode === 'append'}
                onChange={() => setMaimemoMode('append')}
                className="text-orange-600 focus:ring-orange-500"
              />
              追加（自动去重）
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
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
        </SectionCard>
      </div>
    </div>
  );
}
