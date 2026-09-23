// src/lib/rate-limiter.ts
// COMPATIBILITY WRAPPER -> REDIRECIONA PARA O MOTOR UNIFICADO EM @/lib/rate-limit
export {
  checkRateLimit,
  getClientIp,
  getRateLimitHeaders,
  RATE_LIMIT_PROFILES,
  type RateLimitResult,
  type RateLimitConfig,
} from "./rate-limit";
