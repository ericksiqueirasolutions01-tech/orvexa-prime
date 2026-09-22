// src/lib/rate-limiter.ts
// ORVEXA PRIME DIGITAL — Algoritmo de Rate Limiting por Janela Deslizante (Sliding Window)

interface RateLimitRecord {
  timestamps: number[];
}

// Armazenamento em memória (Thread-safe no Node.js single-process)
const store = new Map<string, RateLimitRecord>();

// Limpeza periódica de registros antigos a cada 5 minutos
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      // Remove timestamps mais antigos que 15 minutos
      const recent = record.timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
      if (recent.length === 0) {
        store.delete(key);
      } else {
        record.timestamps = recent;
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Valida se a chave (IP ou userId) respeita a quota na janela de tempo especificada.
 * @param key Identificador único (ex: `login:192.168.1.1` ou `ai:user_123`)
 * @param limit Número máximo de requisições permitidas na janela
 * @param windowSeconds Tamanho da janela em segundos (ex: 60 para 1 minuto)
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const cutoff = now - windowMs;

  let record = store.get(key);
  if (!record) {
    record = { timestamps: [] };
    store.set(key, record);
  }

  // Filtra apenas requisições dentro da janela atual
  record.timestamps = record.timestamps.filter((ts) => ts > cutoff);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetInSeconds = Math.ceil((oldest + windowMs - now) / 1000);

    return {
      allowed: false,
      limit,
      remaining: 0,
      resetInSeconds: Math.max(1, resetInSeconds),
    };
  }

  // Registra nova requisição
  record.timestamps.push(now);

  return {
    allowed: true,
    limit,
    remaining: limit - record.timestamps.length,
    resetInSeconds: windowSeconds,
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

