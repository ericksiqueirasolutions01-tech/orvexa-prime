// src/lib/rate-limit.ts
// MOTOR DE RATE LIMITING PROFISSIONAL (SLIDING WINDOW ALGORITHM)
// Protege a API contra ataques DDoS, abusos de força bruta e sobrecarga de requisições

export interface RateLimitConfig {
  windowMs: number; // Janela de tempo em milissegundos
  maxRequests: number; // Máximo de requisições permitidas na janela
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTimeMs: number;
  retryAfterSeconds: number;
}

// Configurações padrão por perfil de endpoint
export const RATE_LIMIT_PROFILES: Record<string, RateLimitConfig> = {
  // Rotas gerais da API (60 requisições por minuto)
  API_GENERAL: {
    windowMs: 60 * 1000,
    maxRequests: 60,
  },
  // Rotas de geração de IA / Codex (20 requisições por minuto)
  AI_GENERATION: {
    windowMs: 60 * 1000,
    maxRequests: 20,
  },
  // Rotas de autenticação: login / registro (10 tentativas por minuto)
  AUTH: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  // Upload de arquivos (15 uploads por minuto)
  FILE_UPLOAD: {
    windowMs: 60 * 1000,
    maxRequests: 15,
  },
};

// Armazenamento em memória das janelas por chave (IP ou userId + profile)
interface RateLimitBucket {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitBucket>();

// Limpeza periódica de baldes antigos para evitar vazamento de memória (a cada 5 minutos)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of memoryStore.entries()) {
      // Remove timestamps mais velhos que 10 minutos
      bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < 10 * 60 * 1000);
      if (bucket.timestamps.length === 0) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Verifica e aplica o limite de requisições para um identificador e perfil
 */
export function checkRateLimit(
  identifier: string,
  profile: keyof typeof RATE_LIMIT_PROFILES = "API_GENERAL"
): RateLimitResult {
  const config = RATE_LIMIT_PROFILES[profile] || RATE_LIMIT_PROFILES.API_GENERAL;
  const key = `${profile}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let bucket = memoryStore.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    memoryStore.set(key, bucket);
  }

  // Filtra apenas requisições dentro da janela deslizante atual
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart);

  const requestCount = bucket.timestamps.length;
  const allowed = requestCount < config.maxRequests;

  if (allowed) {
    bucket.timestamps.push(now);
  }

  const oldestTimestamp = bucket.timestamps[0] || now;
  const resetTimeMs = oldestTimestamp + config.windowMs;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));
  const remaining = Math.max(0, config.maxRequests - bucket.timestamps.length);

  return {
    allowed,
    limit: config.maxRequests,
    remaining,
    resetTimeMs,
    retryAfterSeconds,
  };
}

/**
 * Converte o resultado de Rate Limit em cabeçalhos HTTP padrão RFC
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetTimeMs / 1000)),
  };

  if (!result.allowed) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }

  return headers;
}
