#!/usr/bin/env node
/**
 * ECDICT Processing Script
 * Downloads and processes ECDICT into compact JSON for the vocab collector.
 * 
 * Output:
 * - data/dict.json: Dictionary entries keyed by word
 * - data/lemma.json: Lemmatization map (inflected form -> base word)
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// GitHub 直连在国内常被墙，这里给出镜像列表，按顺序逐个尝试。
// 也可以直接用 ECDICT_URL 环境变量指定地址。
const ECDICT_SOURCES = [
  process.env.ECDICT_URL,
  'https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv',
  'https://ghproxy.net/https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv',
  'https://gh-proxy.com/https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv',
].filter(Boolean);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const CSV_PATH = path.join(DATA_DIR, 'ecdict.csv');
const DICT_OUT = path.join(DATA_DIR, 'dict.json');
const LEMMA_OUT = path.join(DATA_DIR, 'lemma.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Download file（依次尝试各个源）
async function download(dest) {
  if (fs.existsSync(dest)) {
    const stat = fs.statSync(dest);
    if (stat.size > 1000000) {
      console.log('CSV already downloaded, skipping...');
      return;
    }
  }

  for (const url of ECDICT_SOURCES) {
    console.log(`Downloading ECDICT from ${new URL(url).host}...`);
    try {
      await downloadOnce(url, dest);
      console.log('Download complete.');
      return;
    } catch (err) {
      console.log(`  failed: ${err.message}`);
      if (fs.existsSync(dest)) {
        fs.rmSync(dest, { force: true });
      }
    }
  }

  throw new Error('所有下载源均失败');
}

function downloadOnce(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (currentUrl) => {
      https.get(currentUrl, { headers: { 'User-Agent': 'Node/18' } }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          request(response.headers.location);
          return;
        }
        if (response.statusCode >= 400) {
          file.close();
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', reject);
    };
    request(url);
  });
}

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// ECDICT 存的是 DJ 音标（如 "'brekfәst"），里面混了西里尔字母和一些遗留符号，
// 统一成 /xxx/ 的显示形式："^" 是遗留的 ɡ，"'" 是重音位置。
function normalizePhonetic(phonetic) {
  if (!phonetic) return '';
  const cleaned = phonetic
    .replace(/\^/g, 'ɡ')
    .replace(/ә/g, 'ə')
    .replace(/є/g, 'ɛ')
    .replace(/'/g, 'ˈ')
    .replace(/[@?\\]/g, '')
    .trim();
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}/`;
}

// Read CSV header
function readCSVHeader(csvPath) {
  const fd = fs.openSync(csvPath, 'r');
  const buf = Buffer.alloc(4096);
  const bytesRead = fs.readSync(fd, buf, 0, 4096, 0);
  fs.closeSync(fd);
  const firstLine = buf.toString('utf-8', 0, bytesRead).split('\n')[0].trim();
  return parseCSVLine(firstLine);
}

// Main processing
async function run() {
  // Download CSV
  await download(CSV_PATH);
  
  // Read header to get column indices
  const header = readCSVHeader(CSV_PATH);
  const colIndex = {};
  header.forEach((h, i) => { colIndex[h.trim().toLowerCase()] = i; });
  
  console.log('CSV columns:', header.join(', '));
  console.log('Processing entries...');
  
  // Process CSV line by line using streaming
  const dict = {}; // word -> {p, t, tag, frq}
  const lemmaMap = {}; // inflected form -> base word
  
  let lineCount = 0;
  let keptCount = 0;
  let lemmaCount = 0;
  
  const stream = createReadStream(CSV_PATH, { encoding: 'utf-8' });
  let buffer = '';
  let isFirstLine = true;
  
  await new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (isFirstLine) {
          isFirstLine = false;
          continue; // Skip header
        }
        
        lineCount++;
        if (lineCount % 100000 === 0) {
          console.log(`Processed ${lineCount} lines...`);
        }
        
        const fields = parseCSVLine(line.trim());
        if (fields.length < 5) continue;
        
        const word = (fields[colIndex['word']] || '').trim().toLowerCase();
        const phonetic = (fields[colIndex['phonetic']] || '').trim();
        const translation = (fields[colIndex['translation']] || '').trim();
        // ECDICT 的 tag 是空格分隔的（如 "zk gk cet4"），前端按逗号切分，这里先统一成逗号分隔
        const tag = (fields[colIndex['tag']] || '').trim().split(/\s+/).filter(Boolean).join(',');
        const bnc = parseInt(fields[colIndex['bnc']] || '0', 10) || 0;
        const frq = parseInt(fields[colIndex['frq']] || '0', 10) || 0;
        const exchange = (fields[colIndex['exchange']] || '').trim();
        
        if (!word || word.length < 2) continue;
        // Skip phrases (containing spaces)
        if (word.includes(' ')) continue;
        // Skip non-alphabetic
        if (!/^[a-z]+$/.test(word)) continue;
        
        // Filter: keep if has exam tag OR is a common word (frq/bnc < 15000)
        const hasTag = tag.length > 0;
        const isCommon = (frq > 0 && frq <= 15000) || (bnc > 0 && bnc <= 15000);
        
        if (!hasTag && !isCommon) continue;
        
        // ECDICT 的多个义项用字面量 "\n"（两个字符）分隔，这里转成 "；" 便于展示
        const shortTranslation = translation
          .split(/\\n|\n/)
          .map(s => s.trim())
          .filter(Boolean)
          .slice(0, 3)
          .join('; ')
          .substring(0, 200);
        
        // Store dictionary entry
        if (!dict[word] || (hasTag && !dict[word].tag)) {
          dict[word] = {
            p: normalizePhonetic(phonetic),
            t: shortTranslation,
            tag: tag,
            frq: frq || bnc,
          };
        }
        
        // Build lemma map from exchange
        if (exchange) {
          const parts = exchange.split('/');
          for (const part of parts) {
            const [type, forms] = part.split(':');
            if (!forms) continue;
            const formList = forms.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

            // 类型 0 表示"当前词条的原形"（如 looking 的 exchange 是 0:look），
            // 方向要反过来，否则会生成 look -> looking 这种反过来的映射。
            if (type === '0') {
              const base = formList[0];
              if (base && base !== word && !lemmaMap[word]) {
                lemmaMap[word] = base;
                lemmaCount++;
              }
              continue;
            }

            for (const f of formList) {
              if (f && f !== word && !lemmaMap[f]) {
                lemmaMap[f] = word;
                lemmaCount++;
              }
            }
          }
        }
        
        keptCount++;
      }
    });
    
    stream.on('end', resolve);
    stream.on('error', reject);
  });
  
  console.log(`\nProcessing complete:`);
  console.log(`  Total lines: ${lineCount}`);
  console.log(`  Kept entries: ${keptCount}`);
  console.log(`  Lemma mappings: ${lemmaCount}`);
  console.log(`  Dict size: ${Object.keys(dict).length}`);
  
  // Write output files
  console.log('\nWriting dict.json...');
  fs.writeFileSync(DICT_OUT, JSON.stringify(dict));
  const dictSize = (fs.statSync(DICT_OUT).size / 1024 / 1024).toFixed(2);
  console.log(`  dict.json: ${dictSize} MB`);
  
  console.log('Writing lemma.json...');
  fs.writeFileSync(LEMMA_OUT, JSON.stringify(lemmaMap));
  const lemmaSize = (fs.statSync(LEMMA_OUT).size / 1024 / 1024).toFixed(2);
  console.log(`  lemma.json: ${lemmaSize} MB`);
  
  console.log('\nDone!');
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
