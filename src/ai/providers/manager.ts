// src/ai/providers/manager.ts
// GERENCIADOR CENTRAL DE PROVEDORES E CHAVES — ORVEXA PRIME DIGITAL

import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";
import { callOpenAiStream } from "./openai";
import { callClaudeStream } from "./claude";
import { callGoogleStream } from "./google";
import { normalizeModelIdentifier } from "../models/registry";
import { AIProviderService } from "../services/provider.service";

export interface HealthyKey {
  id: string;
  name: string;
  providerId: string;
  providerSlug: string;
  encryptedKey: string;
  iv: string;
  authTag: string;
  priority: number;
  effectivePriority: number;
  tokenLimitMonthly: number;
  tokensUsedMonth: number;
  customBaseUrl?: string | null;
  status: string;
}

/**
 * Busca chaves saudáveis no banco aplicando rotação a 90% e bloqueio a 100%
 */
export async function getHealthyApiKeys(providerSlug: string, requiredCapability?: string): Promise<HealthyKey[]> {
  const now = new Date();
  const provider = await prisma.aiProvider.findUnique({
    where: { slug: providerSlug },
    include: {
      apiKeys: {
        where: {
          status: { not: "DISABLED" },
        },
      },
    },
  });

  if (!provider || provider.apiKeys.length === 0) {
    return [];
  }

  const eligibleKeys: HealthyKey[] = [];

  for (const key of provider.apiKeys) {
    // 1. Quarentena temporária
    if (key.quarantinedUntil && key.quarantinedUntil > now) {
      continue;
    }

    // 2. Validação de capacidade
    if (requiredCapability && requiredCapability !== "TEXTO") {
      try {
        const caps: string[] = JSON.parse(key.capabilities || "[]");
        if (caps.length > 0 && !caps.includes(requiredCapability)) {
          continue;
        }
      } catch {
        // Ignora erro de parse
      }
    }

    // 3. Controle de Quota (Regras 90% e 100%)
    let effectivePriority = key.priority;
    let effectiveStatus = key.status;

    if (key.tokenLimitMonthly > 0) {
      const percentUsed = (key.tokensUsedMonth / key.tokenLimitMonthly) * 100;

      if (key.tokensUsedMonth >= key.tokenLimitMonthly) {
        if (key.status !== "BLOCKED_QUOTA") {
          await prisma.apiKey.update({
            where: { id: key.id },
            data: { status: "BLOCKED_QUOTA" },
          }).catch(() => {});
        }
        continue; // Chave bloqueada
      }

      if (percentUsed >= 90) {
        effectivePriority = key.priority + 50;
        effectiveStatus = "WARNING_90";
      } else if (key.status === "WARNING_90" || key.status === "BLOCKED_QUOTA") {
        effectiveStatus = "ACTIVE";
      }
    }

    eligibleKeys.push({
      id: key.id,
      name: key.name,
      providerId: key.providerId,
      providerSlug: provider.slug,
      encryptedKey: key.encryptedKey,
      iv: key.iv,
      authTag: key.authTag,
      priority: key.priority,
      effectivePriority,
      tokenLimitMonthly: key.tokenLimitMonthly,
      tokensUsedMonth: key.tokensUsedMonth,
      customBaseUrl: key.customBaseUrl || provider.baseUrl,
      status: effectiveStatus,
    });
  }

  // Ordena por prioridade efetiva (menor número = maior prioridade) e desempata por menor consumo
  eligibleKeys.sort((a, b) => {
    if (a.effectivePriority !== b.effectivePriority) {
      return a.effectivePriority - b.effectivePriority;
    }
    return a.tokensUsedMonth - b.tokensUsedMonth;
  });

  return eligibleKeys;
}

/**
 * Registra falha de chave com tolerância de 3 erros consecutivos
 */
export async function markKeyError(apiKeyId: string, isRateLimit: boolean) {
  const quarantineMinutes = isRateLimit ? 2 : 5;
  const quarantinedUntil = new Date(Date.now() + quarantineMinutes * 60 * 1000);

  const key = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
  const currentErrors = (key?.errorCount || 0) + 1;
  const shouldSetError = currentErrors >= 3;
  const statusToSet = isRateLimit ? "RATE_LIMITED" : (shouldSetError ? "ERROR" : (key?.status || "ACTIVE"));

  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: {
      status: statusToSet,
      errorCount: { increment: 1 },
      quarantinedUntil: shouldSetError || isRateLimit ? quarantinedUntil : null,
    },
  }).catch(() => {});
}

/**
 * Registra sucesso na chave e atualiza custos
 */
export async function markKeySuccess(apiKeyId: string, tokensEstimated: number, costCents: number = 0.15) {
  const key = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
  if (!key) return;

  const newUsed = key.tokensUsedMonth + tokensEstimated;
  let newStatus = key.status;

  if (key.tokenLimitMonthly > 0) {
    if (newUsed >= key.tokenLimitMonthly) {
      newStatus = "BLOCKED_QUOTA";
    } else if (newUsed >= key.tokenLimitMonthly * 0.9) {
      newStatus = "WARNING_90";
    } else if (key.status === "WARNING_90" || key.status === "BLOCKED_QUOTA") {
      newStatus = "ACTIVE";
    }
  }

  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: {
      tokensUsedMonth: { increment: tokensEstimated },
      costAccumulatedCents: { increment: costCents },
      status: newStatus,
      errorCount: 0,
      quarantinedUntil: null,
      lastUsedAt: new Date(),
    },
  }).catch(() => {});
}

/**
 * Despacha chamada para o provedor correto
 */
export async function dispatchProviderStream(params: {
  providerSlug: string;
  modelIdentifier: string;
  apiKey: string;
  customBaseUrl?: string | null;
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
}): Promise<ReadableStream<Uint8Array>> {
  return AIProviderService.executeChatStream({
    providerSlug: params.providerSlug,
    modelIdentifier: params.modelIdentifier,
    apiKey: params.apiKey,
    customBaseUrl: params.customBaseUrl,
    messages: params.messages as any,
    systemPrompt: params.systemPrompt,
  });
}

