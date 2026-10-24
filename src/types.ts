// Dictionary entry from processed ECDICT
export interface DictEntry {
  word: string;
  phonetic: string;
  translation: string;
  tag: string; // comma-separated: gk,cet4,cet6,ky,ielts,toefl,gre
  frq: number; // COCA frequency rank (lower = more frequent)
}

// Processed word for display
export interface VocabWord {
  word: string;
  phonetic: string;
  translation: string;
  tags: string[];
  context: string; // original sentence from the script
  // 分别记录已推送到哪本词典，互不影响（同一个词可以再推到另一本）
  addedEudic: boolean;
  addedMaimemo: boolean;
}

// Show (TV series) info from the scripts site
export interface Show {
  id: string; // site slug, e.g. modern-family
  title: string;
}

// Episode info
export interface Episode {
  season: number;
  episode: number;
  title: string;
  id: string; // sXXeYY format
}

// Episode list grouped by season
export interface EpisodeList {
  [season: number]: Episode[];
}

// Eudic API types
export interface EudicCategory {
  id: string;
  name: string;
  language: string;
}

// Maimemo API types
export interface MaimemoNotepad {
  id: string;
  title: string;
  // 列表接口不返回 content/brief 等字段，仅详情接口返回，故设为可选
  brief?: string;
  content?: string;
  status?: string;
  tags?: string[];
}

// Difficulty levels
export type DifficultyLevel = 'gk' | 'cet4' | 'ky';

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  gk: '高考以上',
  cet4: '四六级以上',
  ky: '考研/雅思以上',
};

// 例句写入结果
export interface ExamplePushResult {
  success: number;
  failed: number;
  failedWords: string[];
  // 平台返回的第一条错误，用于在界面上定位失败原因
  error?: string;
}

// Push result
export interface PushResult {
  success: number;
  failed: number;
  failedWords: string[];
  message: string;
  // Token 过期/失效时为 true，UI 会提示去设置页重新授权
  authExpired?: boolean;
  // 附带例句时的写入结果
  examples?: ExamplePushResult;
}

// LocalStorage keys
export const LS_KEYS = {
  SHOW: 'mvcc.show', // 最近一次选择的剧集
  EUDIC_TOKEN: 'mvcc.eudicToken',
  MAIMEMO_TOKEN: 'mvcc.maimemoToken',
  EUDIC_CATEGORY: 'mvcc.eudicCategory',
  MAIMEMO_NOTEPAD: 'mvcc.maimemoNotepad',
  DIFFICULTY: 'mvcc.difficulty',
  MAIMEMO_MODE: 'mvcc.maimemoMode', // 'append' | 'overwrite'
  EUDIC_ENABLED: 'mvcc.eudicEnabled', // 主页面是否显示欧路入口
  MAIMEMO_ENABLED: 'mvcc.maimemoEnabled', // 主页面是否显示墨墨入口
  WATCHED_SHOWS: 'mvcc.watchedShows', // 选剧页「我看过的」：点击过的剧目
  EUDIC_WITH_CONTEXT: 'mvcc.eudicWithContext', // 推送时是否写入剧中原句
  MAIMEMO_WITH_EXAMPLE: 'mvcc.maimemoWithExample', // 推送时是否为单词创建例句
} as const;
