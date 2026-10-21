// ABOUTME: 进程内有界 TTL 缓存，替代原来的磁盘缓存
// ABOUTME: 容量有上限 + 过期自动失效，避免服务端磁盘堆积剧本文件

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * 简单的 LRU + TTL 缓存。
 *
 * 剧本与剧集目录全部来自第三方站点，之前写在 data/cache 下会随用户点过的剧集
 * 无限增长；改成内存缓存后，服务端磁盘占用恒为 0，进程重启自动清空。
 */
export class MemoryCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
  ) {}

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // 命中后挪到末尾，保持 Map 的插入顺序即 LRU 顺序
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });

    while (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next();
      if (oldestKey.done) {
        break;
      }
      this.store.delete(oldestKey.value);
    }
  }

  get size(): number {
    return this.store.size;
  }
}
