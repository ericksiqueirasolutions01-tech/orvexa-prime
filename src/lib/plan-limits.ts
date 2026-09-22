// src/lib/plan-limits.ts
// CONTROLE DE CONSUMO & ENFORCEMENT DE LIMITES POR PLANO — ORVEXA PRIME SAAS
// Gerencia quotas mensais de tokens, limites de armazenamento e acesso a modelos

import { prisma } from "./prisma";

export interface TokenQuotaStatus {
  hasQuota: boolean;
  usedTokens: number;
  maxTokens: number;
  percentageUsed: number;
  quotaExceeded: boolean;
  planName: string;
}

export interface StorageQuotaStatus {
  hasStorage: boolean;
  usedBytes: number;
  maxBytes: number;
  percentageUsed: number;
  storageExceeded: boolean;
}

export interface ModelAccessStatus {
  allowed: boolean;
  allowedModels: string[];
  planName: string;
}

/**
 * Valida a quota de tokens do usuário no ciclo mensal atual
 */
export async function checkUserTokenQuota(userId: string): Promise<TokenQuotaStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true },
  });

  // Administrador possui consumo ilimitado
  if (user?.role === "ADMIN") {
    return {
      hasQuota: true,
      usedTokens: 0,
      maxTokens: Infinity,
      percentageUsed: 0,
      quotaExceeded: false,
      planName: "ADMIN ILIMITADO",
    };
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usageAgg = await prisma.usageLog.aggregate({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
    },
    _sum: { totalTokens: true },
  });

  const usedTokens = usageAgg._sum.totalTokens || 0;
  const maxTokens = user?.plan?.monthlyTokens || 50000; // Padrão 50k tokens se não tiver plano
  const percentageUsed = +Math.min(100, (usedTokens / maxTokens) * 100).toFixed(1);
  const quotaExceeded = usedTokens >= maxTokens;

  return {
    hasQuota: !quotaExceeded,
    usedTokens,
    maxTokens,
    percentageUsed,
    quotaExceeded,
    planName: user?.plan?.name || "GRATUITO",
  };
}

/**
 * Valida a quota de armazenamento de arquivos no workspace
 */
export async function checkUserStorageQuota(
  userId: string,
  additionalBytesToAdd = 0
): Promise<StorageQuotaStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true },
  });

  if (user?.role === "ADMIN") {
    return {
      hasStorage: true,
      usedBytes: 0,
      maxBytes: Infinity,
      percentageUsed: 0,
      storageExceeded: false,
    };
  }

  const storageAgg = await prisma.file.aggregate({
    where: { userId },
    _sum: { fileSizeBytes: true },
  });

  const currentUsedBytes = storageAgg._sum.fileSizeBytes || 0;
  const maxBytes = user?.plan?.storageQuotaBytes || 524288000; // 500 MB padrão
  const projectedBytes = currentUsedBytes + additionalBytesToAdd;
  const storageExceeded = projectedBytes > maxBytes;
  const percentageUsed = +Math.min(100, (currentUsedBytes / maxBytes) * 100).toFixed(1);

  return {
    hasStorage: !storageExceeded,
    usedBytes: currentUsedBytes,
    maxBytes,
    percentageUsed,
    storageExceeded,
  };
}

/**
 * Valida se o plano do usuário permite utilizar o modelo de IA solicitado
 */
export async function checkModelAccess(
  userId: string,
  modelSlug: string
): Promise<ModelAccessStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true },
  });

  if (user?.role === "ADMIN") {
    return {
      allowed: true,
      allowedModels: ["*"],
      planName: "ADMIN",
    };
  }

  let allowedModels: string[] = ["gpt-4o-mini", "claude-3-haiku", "gemini-1.5-flash", "orvexa-prime"];
  if (user?.plan?.allowedModels) {
    try {
      allowedModels = JSON.parse(user.plan.allowedModels);
    } catch {}
  }

  const isAllowed =
    allowedModels.includes("*") ||
    allowedModels.some((m) => m.toLowerCase() === modelSlug.toLowerCase());

  return {
    allowed: isAllowed,
    allowedModels,
    planName: user?.plan?.name || "BÁSICO",
  };
}

