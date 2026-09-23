// src/ai/keys/key-management.service.ts
// GERENCIADOR DE CONTRATOS, LIMITES, CRÉDITOS E VALIDADE DE CHAVES — ORVEXA PRIME DIGITAL

import { prisma } from "@/lib/prisma";
import { encryptApiKey, decryptApiKey } from "@/lib/crypto";
import { AIProviderService } from "@/ai/services/provider.service";
import { USD_TO_BRL_RATE } from "@/ai/monitoring/ai-monitor.service";
import { SUPPORTED_KEY_PROVIDERS, KeyProviderConfig } from "./constants";
export { SUPPORTED_KEY_PROVIDERS, type KeyProviderConfig };

export interface KeyContractItem {
  id: string;
  provider: string;
  providerName: string;
  providerAvatar: string;
  name: string;
  keyHint: string;
  status: "ACTIVE" | "WARNING_80" | "WARNING_90" | "EXPIRED" | "INVALID_KEY" | "DISABLED" | "RATE_LIMITED";
  statusLabel: string;
  limits: {
    tokenLimit: number;
    monthlyLimit: number;
    dailyLimit: number;
    initialBalance: number;
    renewalDate: string | null;
    expirationDate: string | null;
  };
  consumption: {
    tokensUsed: number;
    tokensRemaining: number;
    percentageConsumed: number;
    costAccumulatedUsd: number;
    costAccumulatedBrl: number;
  };
  validity: {
    createdAt: string;
    expirationDate: string | null;
    daysRemaining: number | null;
    isExpiringSoon: boolean; // <= 7 dias
    isExpired: boolean;
  };
  diagnostics: {
    lastTestedAt: string | null;
    lastLatencyMs: number;
    detectedModels: string[];
  };
}

export interface KeyAlert {
  id: string;
  keyId: string;
  provider: string;
  keyName: string;
  type: "EXPIRES_IN_7_DAYS" | "CONSUMPTION_OVER_80" | "CONSUMPTION_OVER_90" | "INVALID_KEY";
  severity: "CRITICAL" | "WARNING";
  title: string;
  message: string;
  timestamp: string;
}

export class AiKeyManagementService {
  /**
   * Lista todas as chaves e contratos calculando consumo real integrado a ai_usage_logs,
   * dias restantes de validade e status atualizado.
   */
  public static async listKeysWithMetrics(): Promise<{
    keys: KeyContractItem[];
    alerts: KeyAlert[];
    totals: {
      totalContracts: number;
      totalTokensContracted: number;
      totalTokensConsumed: number;
      totalTokensRemaining: number;
      totalCostUsd: number;
      totalCostBrl: number;
    };
  }> {
    const rawKeys = await prisma.aiProviderKey.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 1. Busca consumo real agrupado por provedor na tabela ai_usage_logs
    const usageLogs = await prisma.aiUsageLog.findMany({
      select: {
        provider: true,
        totalTokens: true,
        cost: true,
        costBrl: true,
      },
    });

    const providerUsageMap: Record<string, { tokens: number; costUsd: number; costBrl: number }> = {};
    for (const log of usageLogs) {
      const p = log.provider.toLowerCase();
      if (!providerUsageMap[p]) {
        providerUsageMap[p] = { tokens: 0, costUsd: 0, costBrl: 0 };
      }
      providerUsageMap[p].tokens += log.totalTokens;
      providerUsageMap[p].costUsd += log.cost;
      providerUsageMap[p].costBrl += log.costBrl;
    }

    const now = new Date();
    const formattedKeys: KeyContractItem[] = [];
    const alerts: KeyAlert[] = [];

    let sumTokensContracted = 0;
    let sumTokensConsumed = 0;
    let sumTokensRemaining = 0;
    let sumCostUsd = 0;
    let sumCostBrl = 0;

    for (const k of rawKeys) {
      const pDef = SUPPORTED_KEY_PROVIDERS.find((p) => p.slug === k.provider) || {
        slug: k.provider,
        name: k.provider.toUpperCase(),
        avatar: "🔑",
        category: "OPENAI",
        primaryModel: "default",
      };

      // Consumo real (soma os logs do provedor e tokens gravados da chave)
      const realUsage = providerUsageMap[k.provider.toLowerCase()];
      const tokensConsumed = Math.max(k.tokensUsed, realUsage?.tokens || 0);

      // Limite contratual considerado para percentual
      const effectiveLimit = k.tokenLimit > 0 ? k.tokenLimit : (k.initialBalance > 0 ? k.initialBalance : k.monthlyLimit);
      const tokensRemaining = effectiveLimit > 0 ? Math.max(0, effectiveLimit - tokensConsumed) : (k.tokensRemaining || 999999999);
      const percentageConsumed = effectiveLimit > 0 ? Math.min(100, Math.round((tokensConsumed / effectiveLimit) * 100)) : 0;

      // Custos acumulados
      const costUsd = k.costAccumulated > 0 ? k.costAccumulated : (realUsage?.costUsd || 0);
      const costBrl = costUsd * USD_TO_BRL_RATE;

      // Validade e dias restantes
      let daysRemaining: number | null = null;
      let isExpired = false;
      let isExpiringSoon = false;

      if (k.expirationDate) {
        const diffMs = k.expirationDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 0) {
          isExpired = true;
        } else if (daysRemaining <= 7) {
          isExpiringSoon = true;
        }
      }

      // Determinação de status com precedência
      let status: KeyContractItem["status"] = k.status as any;
      if (k.status !== "DISABLED") {
        if (isExpired) {
          status = "EXPIRED";
        } else if (k.status === "INVALID_KEY" || k.status === "ERROR") {
          status = "INVALID_KEY";
        } else if (percentageConsumed >= 90) {
          status = "WARNING_90";
        } else if (percentageConsumed >= 80) {
          status = "WARNING_80";
        } else {
          status = "ACTIVE";
        }
      }

      const statusLabels: Record<string, string> = {
        ACTIVE: "Ativa",
        WARNING_80: "Consumo > 80%",
        WARNING_90: "Consumo > 90%",
        EXPIRED: "Expirada",
        INVALID_KEY: "Chave Inválida",
        DISABLED: "Desativada",
        RATE_LIMITED: "Rate Limit (429)",
      };

      // Modelos detectados
      let detectedModels: string[] = [];
      if (k.detectedModels) {
        try {
          detectedModels = JSON.parse(k.detectedModels);
        } catch {}
      }

      // Geração de alertas do contrato
      if (isExpiringSoon && !isExpired && status !== "DISABLED") {
        alerts.push({
          id: `alert-exp-${k.id}`,
          keyId: k.id,
          provider: k.provider,
          keyName: k.name,
          type: "EXPIRES_IN_7_DAYS",
          severity: daysRemaining! <= 3 ? "CRITICAL" : "WARNING",
          title: `Chave expira em ${daysRemaining} dia(s)`,
          message: `O contrato "${k.name}" do provedor ${pDef.name} expira em ${k.expirationDate?.toLocaleDateString("pt-BR")}. Renove ou substitua para evitar interrupções.`,
          timestamp: now.toISOString(),
        });
      }

      if (percentageConsumed >= 90 && status !== "DISABLED") {
        alerts.push({
          id: `alert-c90-${k.id}`,
          keyId: k.id,
          provider: k.provider,
          keyName: k.name,
          type: "CONSUMPTION_OVER_90",
          severity: "CRITICAL",
          title: `Consumo Crítico Acima de 90% (${percentageConsumed}%)`,
          message: `A chave "${k.name}" atingiu ${percentageConsumed}% do limite contratado (${tokensConsumed.toLocaleString()} / ${effectiveLimit.toLocaleString()} tokens).`,
          timestamp: now.toISOString(),
        });
      } else if (percentageConsumed >= 80 && status !== "DISABLED") {
        alerts.push({
          id: `alert-c80-${k.id}`,
          keyId: k.id,
          provider: k.provider,
          keyName: k.name,
          type: "CONSUMPTION_OVER_80",
          severity: "WARNING",
          title: `Consumo Alto Acima de 80% (${percentageConsumed}%)`,
          message: `A chave "${k.name}" atingiu ${percentageConsumed}% do limite (${tokensConsumed.toLocaleString()} / ${effectiveLimit.toLocaleString()} tokens).`,
          timestamp: now.toISOString(),
        });
      }

      if (status === "INVALID_KEY") {
        alerts.push({
          id: `alert-inv-${k.id}`,
          keyId: k.id,
          provider: k.provider,
          keyName: k.name,
          type: "INVALID_KEY",
          severity: "CRITICAL",
          title: `Chave Inválida ou Falha de Conexão: ${k.name}`,
          message: `O teste de conexão com o provedor ${pDef.name} falhou. A chave de API precisa ser atualizada.`,
          timestamp: now.toISOString(),
        });
      }

      formattedKeys.push({
        id: k.id,
        provider: k.provider,
        providerName: pDef.name,
        providerAvatar: pDef.avatar,
        name: k.name,
        keyHint: k.keyHint || "...key",
        status,
        statusLabel: statusLabels[status] || status,
        limits: {
          tokenLimit: k.tokenLimit,
          monthlyLimit: k.monthlyLimit,
          dailyLimit: k.dailyLimit,
          initialBalance: k.initialBalance,
          renewalDate: k.renewalDate ? k.renewalDate.toISOString() : null,
          expirationDate: k.expirationDate ? k.expirationDate.toISOString() : null,
        },
        consumption: {
          tokensUsed: tokensConsumed,
          tokensRemaining,
          percentageConsumed,
          costAccumulatedUsd: Number(costUsd.toFixed(4)),
          costAccumulatedBrl: Number(costBrl.toFixed(2)),
        },
        validity: {
          createdAt: k.createdAt.toISOString(),
          expirationDate: k.expirationDate ? k.expirationDate.toISOString() : null,
          daysRemaining,
          isExpiringSoon,
          isExpired,
        },
        diagnostics: {
          lastTestedAt: k.lastTestedAt ? k.lastTestedAt.toISOString() : null,
          lastLatencyMs: k.lastLatencyMs,
          detectedModels,
        },
      });

      sumTokensContracted += effectiveLimit;
      sumTokensConsumed += tokensConsumed;
      sumTokensRemaining += tokensRemaining;
      sumCostUsd += costUsd;
      sumCostBrl += costBrl;
    }

    return {
      keys: formattedKeys,
      alerts,
      totals: {
        totalContracts: formattedKeys.length,
        totalTokensContracted: sumTokensContracted,
        totalTokensConsumed: sumTokensConsumed,
        totalTokensRemaining: sumTokensRemaining,
        totalCostUsd: Number(sumCostUsd.toFixed(2)),
        totalCostBrl: Number(sumCostBrl.toFixed(2)),
      },
    };
  }

  /**
   * Cadastra ou atualiza um contrato/chave com criptografia e limites configuráveis.
   */
  public static async saveKeyContract(params: {
    id?: string;
    provider: string;
    name: string;
    rawKey?: string;
    tokenLimit?: number;
    monthlyLimit?: number;
    dailyLimit?: number;
    initialBalance?: number;
    expirationDate?: string | null;
    renewalDate?: string | null;
    customBaseUrl?: string | null;
    status?: string;
  }) {
    const {
      id,
      provider,
      name,
      rawKey,
      tokenLimit = 0,
      monthlyLimit = 0,
      dailyLimit = 0,
      initialBalance = 0,
      expirationDate,
      renewalDate,
      customBaseUrl,
      status = "ACTIVE",
    } = params;

    let encryptedData: { cipherText: string; iv: string; authTag: string; keyHint: string } | null = null;
    if (rawKey && rawKey.trim()) {
      encryptedData = encryptApiKey(rawKey.trim());
    }

    const expDate = expirationDate ? new Date(expirationDate) : null;
    const renDate = renewalDate ? new Date(renewalDate) : null;

    if (id) {
      // Atualização de contrato existente
      const updateData: any = {
        name,
        provider: provider.toLowerCase(),
        tokenLimit: Number(tokenLimit),
        monthlyLimit: Number(monthlyLimit),
        dailyLimit: Number(dailyLimit),
        initialBalance: Number(initialBalance),
        expirationDate: expDate,
        renewalDate: renDate,
        customBaseUrl: customBaseUrl || null,
        status,
      };

      if (encryptedData) {
        updateData.encryptedKey = encryptedData.cipherText;
        updateData.iv = encryptedData.iv;
        updateData.authTag = encryptedData.authTag;
        updateData.keyHint = encryptedData.keyHint;
      }

      return await prisma.aiProviderKey.update({
        where: { id },
        data: updateData,
      });
    }

    // Criação de nova chave de contrato
    if (!encryptedData) {
      throw new Error("A chave de API é obrigatória para o cadastro inicial.");
    }

    const initialTokensRemaining = tokenLimit > 0 ? tokenLimit : (initialBalance > 0 ? initialBalance : 0);

    return await prisma.aiProviderKey.create({
      data: {
        provider: provider.toLowerCase(),
        name,
        encryptedKey: encryptedData.cipherText,
        iv: encryptedData.iv,
        authTag: encryptedData.authTag,
        keyHint: encryptedData.keyHint,
        tokenLimit: Number(tokenLimit),
        monthlyLimit: Number(monthlyLimit),
        dailyLimit: Number(dailyLimit),
        initialBalance: Number(initialBalance),
        tokensUsed: 0,
        tokensRemaining: initialTokensRemaining,
        expirationDate: expDate,
        renewalDate: renDate,
        customBaseUrl: customBaseUrl || null,
        status,
      },
    });
  }

  /**
   * Executa teste diagnóstico de conexão na chave (Botão: 🧪 Testar conexão).
   */
  public static async testKeyConnection(keyId: string): Promise<{
    success: boolean;
    status: string;
    latencyMs: number;
    detectedModels: string[];
    message: string;
    errorCode?: string | number;
  }> {
    const key = await prisma.aiProviderKey.findUnique({
      where: { id: keyId },
    });

    if (!key) {
      throw new Error("Chave não encontrada.");
    }

    const decrypted = decryptApiKey(key.encryptedKey, key.iv || "", key.authTag || "");
    const providerDef = SUPPORTED_KEY_PROVIDERS.find((p) => p.slug === key.provider);

    const testResult = await AIProviderService.testConnection({
      providerSlug: key.provider === "mirai" || key.provider === "openrouter" || key.provider === "azure" ? "openai" : key.provider,
      apiKey: decrypted,
      customBaseUrl: key.customBaseUrl || providerDef?.defaultBaseUrl || null,
      modelIdentifier: providerDef?.primaryModel,
    });

    const updatedStatus = testResult.success
      ? "ACTIVE"
      : testResult.errorCode === 429
      ? "RATE_LIMITED"
      : (testResult.errorCode === 401 || testResult.errorCode === 403 ? "INVALID_KEY" : "ERROR");

    const detectedModels = testResult.detectedModels || (providerDef ? [providerDef.primaryModel] : []);

    await prisma.aiProviderKey.update({
      where: { id: keyId },
      data: {
        status: updatedStatus,
        lastTestedAt: new Date(),
        lastLatencyMs: testResult.latencyMs,
        detectedModels: JSON.stringify(detectedModels),
      },
    });

    return {
      success: testResult.success,
      status: updatedStatus,
      latencyMs: testResult.latencyMs,
      detectedModels,
      message: testResult.message,
      errorCode: testResult.errorCode,
    };
  }

  /**
   * Exclui um contrato/chave.
   */
  public static async deleteKey(keyId: string): Promise<boolean> {
    await prisma.aiProviderKey.delete({
      where: { id: keyId },
    });
    return true;
  }
}
