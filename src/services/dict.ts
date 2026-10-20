import type { DictEntry, VocabWord, DifficultyLevel } from '../types';

// Compact dict entry stored in data/dict.json
interface CompactEntry {
  p: string; // phonetic
  t: string; // translation
  tag: string; // comma separated: gk,cet4,cet6,ky,ielts,toefl,gre
  frq: number; // frequency rank
}

function toDictEntry(word: string, entry: CompactEntry): DictEntry {
  return {
    word,
    phonetic: entry.p ?? '',
    translation: entry.t ?? '',
    tag: entry.tag ?? '',
    frq: entry.frq ?? 99999,
  };
}

let dictCache: Record<string, CompactEntry> | null = null;
let lemmaCache: Record<string, string> | null = null;
let loadingPromise: Promise<void> | null = null;

// Load dictionary data
export async function loadDictionary(): Promise<void> {
  if (dictCache && lemmaCache) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const [dictRes, lemmaRes] = await Promise.all([
      fetch('/data/dict.json'),
      fetch('/data/lemma.json'),
    ]);

    if (!dictRes.ok || !lemmaRes.ok) {
      throw new Error('词典数据加载失败，请确保已运行词典处理脚本');
    }

    dictCache = (await dictRes.json()) as Record<string, CompactEntry>;
    lemmaCache = (await lemmaRes.json()) as Record<string, string>;
  })();

  return loadingPromise;
}

// ECDICT 收录的变形词（looking / parked / said）大多没有词频数据，会被当成生僻词留在结果里。
// 这里在词表映射缺失时按常见后缀还原，且只接受"有词频数据的原形"，避免把 lens 拆成 len 之类的误判。
const INFLECTION_CANDIDATES: Array<(word: string) => string[]> = [
  w => (w.endsWith('ies') ? [w.slice(0, -3) + 'y'] : []),
  w => (w.endsWith('es') ? [w.slice(0, -2), w.slice(0, -1)] : []),
  w => (w.endsWith('s') ? [w.slice(0, -1)] : []),
  w => (w.endsWith('ing') ? [w.slice(0, -3), w.slice(0, -3) + 'e', w.slice(0, -4)] : []),
  w => (w.endsWith('ed') ? [w.slice(0, -2), w.slice(0, -1), w.slice(0, -3) + 'y'] : []),
  w => (w.endsWith('er') ? [w.slice(0, -2), w.slice(0, -1), w.slice(0, -3) + 'y'] : []),
  w => (w.endsWith('est') ? [w.slice(0, -3), w.slice(0, -2), w.slice(0, -4) + 'y'] : []),
  w => (w.endsWith('ly') ? [w.slice(0, -2)] : []),
];

function matchBaseForm(word: string): string {
  for (const build of INFLECTION_CANDIDATES) {
    for (const candidate of build(word)) {
      if (candidate.length < 2) continue;
      const entry = dictCache?.[candidate];
      if (entry && entry.frq > 0) return candidate;
    }
  }
  return word;
}

function resolveLemma(word: string): string {
  const mapped = lemmaCache?.[word];
  if (mapped) return mapped;

  if (dictCache) {
    const entry = dictCache[word];
    if (entry && entry.frq > 0) return word;
    const base = matchBaseForm(word);
    if (base !== word) return base;
  }

  return word;
}

// Look up a word in the dictionary
// 优先返回原形词条的数据：ECDICT 里 "beaten" 也有独立词条（释义是"beat的过去分词"），
// 而词表里展示的是原形 "beat"，取变形词条的音标和释义会对不上。
export function lookupWord(word: string): DictEntry | null {
  if (!dictCache) return null;

  const lemma = resolveLemma(word);

  // 先查原形
  const lemmaEntry = dictCache[lemma];
  if (lemmaEntry) {
    return toDictEntry(lemma, lemmaEntry);
  }

  // 原形不在词典里时（比如词典只收了变形形式），退回变形词条
  const entry = dictCache[word];
  if (entry) {
    return toDictEntry(word, entry);
  }

  return null;
}

// Get lemma form of a word
export function getLemma(word: string): string {
  return resolveLemma(word);
}

// Check if word is in dictionary
export function isInDictionary(word: string): boolean {
  if (!dictCache) return false;
  if (dictCache[word]) return true;
  if (lemmaCache) {
    const lemma = lemmaCache[word];
    return lemma ? !!dictCache[lemma] : false;
  }
  return false;
}

// Common function words to filter out
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'i', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours',
  'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers',
  'it', 'its', 'they', 'them', 'their', 'theirs',
  'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'whose',
  'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither',
  'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'of', 'about',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
  'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
  'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'only', 'own',
  'same', 'than', 'too', 'very', 'just', 'because', 'as', 'until', 'while',
  'if', 'though', 'although', 'even', 'also', 'really', 'well', 'oh', 'ah',
  'um', 'uh', 'hmm', 'hey', 'hi', 'hello', 'yes', 'yeah', 'nope', 'okay', 'ok',
  'gonna', 'wanna', 'gotta', 'kinda', 'sorta',
]);

// Extract words from transcript lines
function extractWords(lines: string[]): Array<{ word: string; line: string; position: number }> {
  const results: Array<{ word: string; line: string; position: number }> = [];
  // Regex to match English words, including hyphenated and contractions
  const wordRegex = /[a-zA-Z](?:[a-zA-Z'-]*[a-zA-Z])?/g;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    let match;
    while ((match = wordRegex.exec(line)) !== null) {
      const raw = match[0];
      // Skip single letters
      if (raw.length < 2) continue;
      // Skip pure numbers
      if (/^\d+$/.test(raw)) continue;

      const word = raw.toLowerCase().replace(/['']$/g, '');
      if (word.length < 2) continue;

      results.push({
        word,
        line: line.trim(),
        position: lineIdx * 10000 + match.index,
      });
    }
  }

  return results;
}

// Check if a word looks like a proper noun
function isProperNoun(word: string, line: string): boolean {
  // Check if the word appears capitalized in the line but not at the start
  const idx = line.toLowerCase().indexOf(word);
  if (idx <= 0) return false;
  const charBefore = line[idx - 1];
  const charAt = line[idx];
  // If preceded by space/punctuation and capitalized
  if ((charBefore === ' ' || charBefore === '"' || charBefore === '(') &&
      charAt === charAt.toUpperCase() && charAt !== charAt.toLowerCase()) {
    // Check if it's in the dictionary as a common word
    if (dictCache && dictCache[word]) {
      return false; // It's in the dictionary, so it's a common word
    }
    return true;
  }
  return false;
}

// frq 是词频排名（越小越常用），没有排名数据的按生僻词处理。
// 考试标签在 ECDICT 里是累积的（连 get 都带 ielts 标签），不适合用来分档，
// 所以三档难度直接用词频排名切分。
const DIFFICULTY_MIN_RANK: Record<DifficultyLevel, number> = {
  gk: 2000, // 高考以上：剔除最常用的基础词
  cet4: 4000, // 四六级以上
  ky: 8000, // 考研/雅思以上
};

// Filter words based on difficulty level
function passesDifficultyFilter(entry: DictEntry, level: DifficultyLevel): boolean {
  const rank = entry.frq || 99999;
  return rank >= DIFFICULTY_MIN_RANK[level];
}

// Main function: process transcript lines into vocab words
export function processTranscript(lines: string[], difficulty: DifficultyLevel): VocabWord[] {
  if (!dictCache || !lemmaCache) {
    throw new Error('词典未加载');
  }

  const allWords = extractWords(lines);
  const seen = new Map<string, VocabWord>(); // word -> VocabWord (first occurrence)
  const seenLemmas = new Set<string>();

  for (const { word, line } of allWords) {
    // Skip stop words
    if (STOP_WORDS.has(word)) continue;

    // Skip proper nouns
    if (isProperNoun(word, line)) continue;

    // Get lemma form
    const lemma = getLemma(word);

    // Skip if already seen this lemma
    if (seenLemmas.has(lemma)) continue;

    // Look up in dictionary
    const entry = lookupWord(word);
    if (!entry) continue;

    // Apply difficulty filter
    if (!passesDifficultyFilter(entry, difficulty)) continue;

    seenLemmas.add(lemma);

    const tags = entry.tag ? entry.tag.split(',').map(t => t.trim()).filter(Boolean) : [];

    seen.set(lemma, {
      word: lemma,
      phonetic: entry.phonetic,
      translation: entry.translation,
      tags,
      context: line,
      added: false,
    });
  }

  return Array.from(seen.values());
}

// Search/filter words
export function filterWords(
  words: VocabWord[],
  search: string,
  tagFilter: string | null
): VocabWord[] {
  let result = words;

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(w =>
      w.word.includes(q) ||
      w.translation.toLowerCase().includes(q)
    );
  }

  if (tagFilter) {
    result = result.filter(w => w.tags.includes(tagFilter));
  }

  return result;
}
