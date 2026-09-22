// src/lib/cache.ts
// MOTOR DE CACHE IN-MEMORY COM TTL — OTIMIZAÇÃO DE ALTA PERFORMANCE
// Reduz leituras repetitivas no banco para configurações, regras e planos

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class InMemoryCache {
  private store = new Map<string, CacheEntry<any>>();
  private hits = 0;
  private misses = 0;

  constructor() {
    // Limpeza periódica de chaves expiradas (a cada 60s)
    if (typeof setInterval !== "undefined") {
      setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
          if (now > entry.expiresAt) {
            this.store.delete(key);
          }
        }
      }, 60 * 1000).unref?.();
    }
  }

  public get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  public set<T>(key: string, value: T, ttlSeconds = 60): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  public delete(key: string): void {
    this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Padrão Cache-Aside: busca no cache ou executa o fetcher e armazena com TTL
   */
  public async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 60
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  public getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? +((this.hits / total) * 100).toFixed(1) : 0;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
    };
  }
}

export const appCache = new InMemoryCache();

