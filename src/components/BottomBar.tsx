interface BottomBarProps {
  selectedCount: number;
  onPushEudic: () => void;
  onPushMaimemo: () => void;
  onGoSettings: () => void;
  isPushing: boolean;
  hasEudicToken: boolean;
  hasMaimemoToken: boolean;
  eudicEnabled: boolean;
  maimemoEnabled: boolean;
}

export default function BottomBar({
  selectedCount,
  onPushEudic,
  onPushMaimemo,
  onGoSettings,
  isPushing,
  hasEudicToken,
  hasMaimemoToken,
  eudicEnabled,
  maimemoEnabled,
}: BottomBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-stone-200/80 z-40">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="text-sm text-stone-500">
          已选择 <span className="font-semibold text-teal-700 text-lg">{selectedCount}</span> 个单词
        </div>

        {!eudicEnabled && !maimemoEnabled ? (
          <button
            onClick={onGoSettings}
            className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
          >
            两本词典都已在设置中关闭，点此启用
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            {eudicEnabled && (
              <button
                onClick={onPushEudic}
                disabled={selectedCount === 0 || isPushing || !hasEudicToken}
                title={!hasEudicToken ? '请先在设置中配置欧路词典 Token' : ''}
                className="px-4 py-2.5 bg-teal-700 text-white text-sm font-medium rounded-xl shadow-sm hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                加入欧路生词本
              </button>
            )}

            {maimemoEnabled && (
              <button
                onClick={onPushMaimemo}
                disabled={selectedCount === 0 || isPushing || !hasMaimemoToken}
                title={!hasMaimemoToken ? '请先在设置中配置墨墨 Token' : ''}
                className="px-4 py-2.5 bg-orange-600 text-white text-sm font-medium rounded-xl shadow-sm hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                加入墨墨云词本
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
