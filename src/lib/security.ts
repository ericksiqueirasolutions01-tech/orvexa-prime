// src/lib/security.ts
// ORVEXA PRIME DIGITAL — Utilitários de Segurança, Auditoria e Conformidade
// Monitoramento ativo de incidentes, sanitização PII e validação criptográfica

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sanitizeLogPayload } from "@/lib/pii-masker";

export interface LogAuditParams {
  actorId?: string | null;
  action: string;
  resourceType: "USER" | "API_KEY" | "PLAN" | "ROUTER" | "PAYMENT" | "AI_GATEWAY" | "SYSTEM" | "SECURITY";
  resourceId?: string | null;
  details?: Record<string, any>;
  ipAddress?: string | null;
}

export type SecuritySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SecurityIncidentParams {
  incidentType:
    | "AUTH_LOGIN_FAILED"
    | "AUTH_RATE_LIMIT_BLOCKED"
    | "UNAUTHORIZED_ADMIN_ACCESS"
    | "UNAUTHORIZED_API_ACCESS"
    | "WEBHOOK_INVALID_SIGNATURE"
    | "MALICIOUS_UPLOAD_ATTEMPT"
    | "PATH_TRAVERSAL_ATTEMPT"
    | "SECURITY_POLICY_VIOLATION";
  actorId?: string | null;
  ipAddress?: string | null;
  severity?: SecuritySeverity;
  details?: Record<string, any>;
}

/**
 * Registra um evento de auditoria no banco de dados de forma assíncrona com mascaramento PII
 */
export async function logAuditEvent(params: LogAuditParams): Promise<void> {
  try {
    const maskedDetails = params.details ? sanitizeLogPayload(params.details) : null;
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId || null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        details: maskedDetails ? JSON.stringify(maskedDetails) : null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error("[Security Audit Log Error]:", error);
  }
}

/**
 * Registra um incidente de segurança formal com severidade e dados forenses
 */
export async function logSecurityIncident(params: SecurityIncidentParams): Promise<void> {
  const { incidentType, actorId, ipAddress, severity = "MEDIUM", details = {} } = params;

  const forensicData = {
    severity,
    timestamp: new Date().toISOString(),
    ...details,
  };

  console.warn(
    `[SECURITY ALERT] [${severity}] Tipo: ${incidentType} | IP: ${ipAddress || "desconhecido"} | Usuário: ${actorId || "anônimo"}`
  );

  await logAuditEvent({
    actorId,
    action: `SEC_INCIDENT:${incidentType}`,
    resourceType: "SECURITY",
    resourceId: incidentType,
    details: forensicData,
    ipAddress,
  });
}

/**
 * Validação de Assinatura de Webhook (HMAC SHA-256 com tempo constante)
 */
export function verifyWebhookSignature(
  payloadString: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || typeof signature !== "string" || !secret) {
    return false;
  }

  try {
    // Normaliza se a assinatura contiver o prefixo v1= ou sha256= (padrão Stripe/GitHub)
    let cleanSignature = signature.trim();
    if (cleanSignature.includes("t=") && cleanSignature.includes("v1=")) {
      const v1Part = cleanSignature.split(",").find((p) => p.trim().startsWith("v1="));
      if (v1Part) {
        cleanSignature = v1Part.replace("v1=", "").trim();
      }
    } else if (cleanSignature.startsWith("sha256=")) {
      cleanSignature = cleanSignature.replace("sha256=", "").trim();
    }

    const hmac = crypto.createHmac("sha256", secret);
    const expectedDigest = hmac.update(payloadString).digest("hex");

    const sigBuffer = Buffer.from(cleanSignature);
    const digestBuffer = Buffer.from(expectedDigest);

    // Proteção contra Timing Attacks com buffers de mesmo tamanho
    if (sigBuffer.length !== digestBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, digestBuffer);
  } catch {
    return false;
  }
}
