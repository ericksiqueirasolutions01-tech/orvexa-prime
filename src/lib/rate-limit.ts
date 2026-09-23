// src/lib/rate-limit.ts
// MOTOR DE RATE LIMITING PROFISSIONAL UNIFICADO (SLIDING WINDOW ALGORITHM)
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
  resetInSeconds: number; // Alias para compatibilidade
}

// Configurações padrão por perfil de endpoint
export const RATE_LIMIT_PROFILES = {
  // Rotas gerais da API (120 requisições por minuto)
  API_GENERAL: {
    windowMs: 60 * 1000,
    maxRequests: 120,
  },
  // Rotas de geração de IA / Codex / Chat (30 requisições por minuto)
  AI_GENERATION: {
    windowMs: 60 * 1000,
    maxRequests: 30,
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
  // Rotas administrativas (60 requisições por minuto)
  ADMIN: {
    windowMs: 60 * 1000,
    maxRequests: 60,
  },
} as const;

export type RateLimitProfileName = keyof typeof RATE_LIMIT_PROFILES;

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
      // Remove timestamps mais velhos que 15 minutos
      bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
      if (bucket.timestamps.length === 0) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Sobrecarga 1: Verifica por Perfil Predefinido
 */
export function checkRateLimit(
  identifier: string,
  profile?: RateLimitProfileName
): RateLimitResult;

/**
 * Sobrecarga 2: Verifica por Limite Numérico e Janela em Segundos
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): RateLimitResult;

/**
 * Implementação Unificada
 */
export function checkRateLimit(
  identifier: string,
  arg2?: RateLimitProfileName | number,
  arg3?: number
): RateLimitResult {
  let windowMs: number;
  let maxRequests: number;
  let bucketKey: string;

  if (typeof arg2 === "number" && typeof arg3 === "number") {
    // Modo numérico (compatibilidade com rate-limiter.ts)
    maxRequests = arg2;
    windowMs = arg3 * 1000;
    bucketKey = `custom:${identifier}`;
  } else {
    // Modo de perfil
    const profile = (arg2 as RateLimitProfileName) || "API_GENERAL";
    const config = RATE_LIMIT_PROFILES[profile] || RATE_LIMIT_PROFILES.API_GENERAL;
    maxRequests = config.maxRequests;
    windowMs = config.windowMs;
    bucketKey = `${profile}:${identifier}`;
  }

  const now = Date.now();
  const windowStart = now - windowMs;

  let bucket = memoryStore.get(bucketKey);
  if (!bucket) {
    if (memoryStore.size >= 10000) {
      const oldestKey = memoryStore.keys().next().value;
      if (oldestKey) memoryStore.delete(oldestKey);
    }
    bucket = { timestamps: [] };
    memoryStore.set(bucketKey, bucket);
  }

  // Filtra apenas requisições dentro da janela deslizante atual
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart);

  const requestCount = bucket.timestamps.length;
  const allowed = requestCount < maxRequests;

  if (allowed) {
    bucket.timestamps.push(now);
  }

  const oldestTimestamp = bucket.timestamps[0] || now;
  const resetTimeMs = oldestTimestamp + windowMs;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));
  const remaining = Math.max(0, maxRequests - bucket.timestamps.length);

  return {
    allowed,
    limit: maxRequests,
    remaining,
    resetTimeMs,
    retryAfterSeconds,
    resetInSeconds: retryAfterSeconds,
  };
}

/**
 * Extrai o IP real do cliente a partir dos cabeçalhos HTTP
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
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
