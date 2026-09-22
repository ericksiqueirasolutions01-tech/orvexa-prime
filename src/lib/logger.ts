// src/lib/logger.ts
// SISTEMA DE LOGS ESTRUTURADOS & OBSERVABILIDADE — ORVEXA PRIME SAAS
// Rastreamento de requisições, métricas de latência e buffer circular para auditoria

import { sanitizeLogPayload } from "./pii-masker";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "AUDIT";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  latencyMs?: number;
  metadata?: any;
}

// Buffer circular em memória com os últimos 500 logs para monitoramento em tempo real
const MAX_LOG_BUFFER = 500;
const memoryLogBuffer: LogEntry[] = [];

function generateLogId(): string {
  return `log_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

class StructuredLogger {
  private log(
    level: LogLevel,
    message: string,
    context: Partial<Omit<LogEntry, "id" | "timestamp" | "level" | "message">> = {}
  ): LogEntry {
    const entry: LogEntry = {
      id: generateLogId(),
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: context.requestId,
      userId: context.userId,
      route: context.route,
      method: context.method,
      statusCode: context.statusCode,
      latencyMs: context.latencyMs,
      metadata: context.metadata ? sanitizeLogPayload(context.metadata) : undefined,
    };

    // Insere no buffer circular
    memoryLogBuffer.unshift(entry);
    if (memoryLogBuffer.length > MAX_LOG_BUFFER) {
      memoryLogBuffer.pop();
    }

    // Saída estruturada no console do Node.js
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev) {
      const color =
        level === "ERROR"
          ? "\x1b[31m"
          : level === "WARN"
          ? "\x1b[33m"
          : level === "AUDIT"
          ? "\x1b[35m"
          : "\x1b[36m";
      const reset = "\x1b[0m";
      const metaStr = entry.metadata ? ` | ${JSON.stringify(entry.metadata)}` : "";
      console.log(
        `${color}[${entry.level}]${reset} ${entry.timestamp} [${entry.route || "SYS"}] ${entry.message}${metaStr}`
      );
    } else {
      console.log(JSON.stringify(entry));
    }

    return entry;
  }

  public debug(message: string, context?: any) {
    if (process.env.DEBUG === "true" || process.env.NODE_ENV !== "production") {
      return this.log("DEBUG", message, context);
    }
  }

  public info(message: string, context?: any) {
    return this.log("INFO", message, context);
  }

  public warn(message: string, context?: any) {
    return this.log("WARN", message, context);
  }

  public error(message: string, context?: any) {
    return this.log("ERROR", message, context);
  }

  public audit(message: string, context?: any) {
    return this.log("AUDIT", message, context);
  }

  /**
   * Retorna os logs recentes do buffer em memória para o painel administrativo
   */
  public getRecentLogs(limit = 100, level?: LogLevel): LogEntry[] {
    let filtered = memoryLogBuffer;
    if (level) {
      filtered = filtered.filter((l) => l.level === level);
    }
    return filtered.slice(0, Math.min(limit, MAX_LOG_BUFFER));
  }

  public clearBuffer(): void {
    memoryLogBuffer.length = 0;
  }
}

export const logger = new StructuredLogger();

