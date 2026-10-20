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
  added: boolean;
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
  brief: string;
  content: string;
  status: string;
  tags: string[];
}

// Difficulty levels
export type DifficultyLevel = 'gk' | 'cet4' | 'ky';

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  gk: '高考以上',
  cet4: '四六级以上',
  ky: '考研/雅思以上',
};

// Push result
export interface PushResult {
  success: number;
  failed: number;
  failedWords: string[];
  message: string;
}

// LocalStorage keys
export const LS_KEYS = {
  EUDIC_TOKEN: 'mvcc.eudicToken',
  MAIMEMO_TOKEN: 'mvcc.maimemoToken',
  EUDIC_CATEGORY: 'mvcc.eudicCategory',
  MAIMEMO_NOTEPAD: 'mvcc.maimemoNotepad',
  DIFFICULTY: 'mvcc.difficulty',
  EUDIC_WITH_CONTEXT: 'mvcc.eudicWithContext',
  MAIMEMO_MODE: 'mvcc.maimemoMode', // 'append' | 'overwrite'
} as const;
