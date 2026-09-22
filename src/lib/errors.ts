// src/lib/errors.ts
// TRATAMENTO DE ERROS PADRONIZADO & RESILIÊNCIA — ORVEXA PRIME SAAS
// Estrutura unificada de respostas de erro sem expor dados sensíveis ou stack traces em produção

import { NextResponse } from "next/server";
import { logger } from "./logger";

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(
    message: string,
    statusCode = 400,
    code = "BAD_REQUEST",
    details?: any
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Helpers de conveniência
export class UnauthorizedError extends AppError {
  constructor(message = "Autenticação necessária para acessar este recurso.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Você não possui permissão para realizar esta ação.") {
    super(message, 403, "FORBIDDEN");
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number) {
    super(
      `Limite de requisições excedido. Tente novamente em ${retryAfterSeconds} segundos.`,
      429,
      "RATE_LIMIT_EXCEEDED",
      { retryAfterSeconds }
    );
  }
}

export class QuotaExceededError extends AppError {
  constructor(message = "Limite de quota de tokens ou armazenamento excedido no seu plano.") {
    super(message, 403, "QUOTA_EXCEEDED");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso solicitado não foi encontrado.") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message = "Dados da requisição inválidos.", details?: any) {
    super(message, 422, "VALIDATION_ERROR", details);
  }
}

/**
 * Trata qualquer erro capturado em uma rota de API e gera resposta JSON padronizada
 */
export function handleApiError(
  error: any,
  options: { route?: string; userId?: string; requestId?: string } = {}
): NextResponse {
  const reqId = options.requestId || `req_${Date.now().toString(36)}`;

  let statusCode = 500;
  let code = "INTERNAL_SERVER_ERROR";
  let message = "Ocorreu um erro interno no servidor. Tente novamente mais tarde.";
  let details = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error?.name === "ZodError") {
    statusCode = 422;
    code = "VALIDATION_ERROR";
    message = "Parâmetros inválidos na requisição.";
    details = error.issues;
  }

  // Registra no logger estruturado
  logger.error(message, {
    requestId: reqId,
    userId: options.userId,
    route: options.route,
    statusCode,
    metadata: {
      code,
      details,
      rawError: process.env.NODE_ENV !== "production" ? error?.stack : undefined,
    },
  });

  return NextResponse.json(
    {
      error: message,
      code,
      statusCode,
      requestId: reqId,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
    },
    { status: statusCode }
  );
}

