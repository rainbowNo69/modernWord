import type { DictEntry, VocabWord, DifficultyLevel } from '../types';

// Compact dict entry: [phonetic, translation, tag, frq]
type CompactEntry = [string, string, string, number];

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

    dictCache = await dictRes.json() as Record<string, CompactEntry>;
    lemmaCache = await lemmaRes.json() as Record<string, string>;
  })();

  return loadingPromise;
}

// Look up a word in the dictionary
export function lookupWord(word: string): DictEntry | null {
  if (!dictCache) return null;

  // Try direct lookup
  const entry = dictCache[word];
  if (entry) {
    return {
      word,
      phonetic: entry[0],
      translation: entry[1],
      tag: entry[2],
      frq: entry[3],
    };
  }

  // Try lemma lookup
  if (lemmaCache) {
    const lemma = lemmaCache[word];
    if (lemma) {
      const lemmaEntry = dictCache[lemma];
      if (lemmaEntry) {
        return {
          word: lemma,
          phonetic: lemmaEntry[0],
          translation: lemmaEntry[1],
          tag: lemmaEntry[2],
          frq: lemmaEntry[3],
        };
      }
    }
  }

  return null;
}

// Get lemma form of a word
export function getLemma(word: string): string {
  if (!lemmaCache) return word;
  return lemmaCache[word] || word;
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

// Filter words based on difficulty level
function passesDifficultyFilter(entry: DictEntry, level: DifficultyLevel): boolean {
  const tags = entry.tag ? entry.tag.split(',').map(t => t.trim()) : [];
  const frq = entry.frq || 99999;

  switch (level) {
    case 'gk': // 高考以上 - filter out only the most basic high-frequency words
      // Keep everything except words that are ONLY tagged gk with very high frequency
      if (tags.length === 0 && frq < 3000) return false;
      return true;

    case 'cet4': // 四六级以上 (default)
      // Filter out basic words (gk-only or very high frequency)
      if (tags.length === 0 && frq < 4000) return false;
      if (tags.length > 0 && tags.every(t => t === 'gk') && frq < 5000) return false;
      return true;

    case 'ky': // 考研/雅思以上
      // Only keep words with ky/ielts/toefl/gre tags, or very low frequency
      if (tags.some(t => ['ky', 'ielts', 'toefl', 'gre'].includes(t))) return true;
      if (tags.length === 0 && frq > 8000) return true;
      return false;
  }
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
