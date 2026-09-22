// src/lib/audit.ts
// SERVIÇO DE AUDITORIA CONTÍNUA & SEGURANÇA — ORVEXA PRIME SAAS
// Registra ações administrativas, alterações de privilégios e eventos críticos

import { prisma } from "./prisma";
import { logger } from "./logger";
import { sanitizeLogPayload } from "./pii-masker";

export interface AuditEventInput {
  actorId?: string | null;
  action: string; // Ex: USER_LOGIN, USER_BLOCKED, API_KEY_CREATED, PLAN_CHANGED, MEMORY_DELETED
  resourceType: "USER" | "API_KEY" | "PLAN" | "ROUTER" | "PAYMENT" | "MEMORY" | "FILE" | "SECURITY";
  resourceId?: string | null;
  details?: Record<string, any> | string;
  ipAddress?: string | null;
}

/**
 * Registra um evento de auditoria no banco de dados e no logger estruturado
 */
export async function recordAuditEvent(input: AuditEventInput) {
  try {
    const cleanDetails =
      typeof input.details === "object"
        ? JSON.stringify(sanitizeLogPayload(input.details))
        : input.details || null;

    const auditEntry = await prisma.auditLog.create({
      data: {
        actorId: input.actorId || null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId || null,
        details: cleanDetails,
        ipAddress: input.ipAddress || null,
      },
    });

    // Registra simultaneamente no logger estruturado com nível AUDIT
    logger.audit(`[AUDIT] ${input.action} em ${input.resourceType}${input.resourceId ? `:${input.resourceId}` : ""}`, {
      userId: input.actorId || undefined,
      metadata: {
        auditId: auditEntry.id,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        ipAddress: input.ipAddress,
      },
    });

    return auditEntry;
  } catch (err: any) {
    logger.error(`Falha ao registrar evento de auditoria: ${err.message}`, {
      metadata: { action: input.action, resourceType: input.resourceType },
    });
    return null;
  }
}

/**
 * Consulta registros de auditoria com paginação e filtros
 */
export async function getAuditRecords(options: {
  page?: number;
  limit?: number;
  action?: string;
  resourceType?: string;
  actorId?: string;
}) {
  const { page = 1, limit = 50, action, resourceType, actorId } = options;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (action && action !== "ALL") where.action = action;
  if (resourceType && resourceType !== "ALL") where.resourceType = resourceType;
  if (actorId) where.actorId = actorId;

  const [records, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    records,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
