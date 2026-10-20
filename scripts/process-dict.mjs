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
const ECDICT_URL = 'https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv';
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const CSV_PATH = path.join(DATA_DIR, 'ecdict.csv');
const DICT_OUT = path.join(DATA_DIR, 'dict.json');
const LEMMA_OUT = path.join(DATA_DIR, 'lemma.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Download file
function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      const stat = fs.statSync(dest);
      if (stat.size > 1000000) {
        console.log('CSV already downloaded, skipping...');
        resolve();
        return;
      }
    }
    console.log('Downloading ECDICT...');
    const file = fs.createWriteStream(dest);
    const request = (currentUrl) => {
      https.get(currentUrl, { headers: { 'User-Agent': 'Node/18' } }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          request(response.headers.location);
          return;
        }
        if (response.statusCode >= 400) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('Download complete.');
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
  await download(ECDICT_URL, CSV_PATH);
  
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
        const tag = (fields[colIndex['tag']] || '').trim();
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
        
        // Truncate translation to keep size manageable (first 3 meanings)
        const shortTranslation = translation.split('\n').slice(0, 3).join('; ').substring(0, 200);
        
        // Store dictionary entry
        if (!dict[word] || (hasTag && !dict[word].tag)) {
          dict[word] = {
            p: phonetic,
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
            const formList = forms.split(',');
            for (const form of formList) {
              const f = form.trim().toLowerCase();
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
