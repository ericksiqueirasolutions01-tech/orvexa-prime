// src/lib/security.ts
// ORVEXA PRIME DIGITAL — Utilitários de Segurança, Auditoria e Conformidade

import { prisma } from "@/lib/prisma";

export interface LogAuditParams {
  actorId?: string | null;
  action: string;
  resourceType: "USER" | "API_KEY" | "PLAN" | "ROUTER" | "PAYMENT" | "AI_GATEWAY" | "SYSTEM";
  resourceId?: string | null;
  details?: Record<string, any>;
  ipAddress?: string | null;
}

/**
 * Registra um evento de auditoria no banco de dados de forma assíncrona
 */
export async function logAuditEvent(params: LogAuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId || null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error("[Security Audit Log Error]:", error);
  }
}

/**
 * Validação de Assinatura de Webhook (HMAC SHA-256)
 */
export function verifyWebhookSignature(
  payloadString: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  try {
    const crypto = require("crypto");
    const hmac = crypto.createHmac("sha256", secret);
    const digest = hmac.update(payloadString).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

