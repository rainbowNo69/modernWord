import type { PushResult } from '../types';

interface ResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  result: PushResult | null;
  title: string;
}

export default function ResultDialog({ isOpen, onClose, result, title }: ResultDialogProps) {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold tracking-tight text-stone-900 mb-4">{title}</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-stone-600">成功</span>
            <span className="font-semibold text-green-600">{result.success} 词</span>
          </div>

          {result.failed > 0 && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-stone-600">失败</span>
                <span className="font-semibold text-red-600">{result.failed} 词</span>
              </div>

              {result.failedWords.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-stone-500 mb-1">失败单词：</p>
                  <div className="max-h-32 overflow-y-auto bg-stone-50 rounded-xl p-2 scrollbar-thin">
                    <p className="text-sm text-stone-600">
                      {result.failedWords.slice(0, 20).join(', ')}
                      {result.failedWords.length > 20 && ` ...等 ${result.failedWords.length} 个`}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          <p className="text-sm text-stone-500 pt-2 border-t border-stone-100">
            {result.message}
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
