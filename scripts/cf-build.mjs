// ABOUTME: Cloudflare Pages 构建脚本：Vite 打包前端，并把词典 JSON 复制进产物
// ABOUTME: 本地 Node 版由 Express 直接托管 /data，Pages 只能靠静态资源，所以构建时拷进 dist

import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distData = path.join(root, 'dist', 'data');

console.log('▶ vite build');
execSync('npx --no-install vite build', { stdio: 'inherit', cwd: root });

console.log('▶ copy dictionary files into dist/data');
mkdirSync(distData, { recursive: true });

for (const file of ['dict.json', 'lemma.json']) {
  const from = path.join(root, 'data', file);
  if (!existsSync(from)) {
    console.warn(`  ! 缺少 ${file}，跳过（前端会报词典加载失败）`);
    continue;
  }
  copyFileSync(from, path.join(distData, file));
  console.log(`  ✓ ${file}`);
}

console.log('✅ Cloudflare Pages 产物已生成：dist/');
