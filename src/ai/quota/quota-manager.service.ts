// src/ai/quota/quota-manager.service.ts
// MOTOR CENTRAL DO AI QUOTA MANAGER — ORVEXA PRIME DIGITAL

import { prisma } from "@/lib/prisma";
import { encryptApiKey, decryptApiKey } from "@/lib/crypto";
import { AIProviderService } from "@/ai/services/provider.service";
import { QUOTA_SUPPORTED_PROVIDERS, USD_TO_BRL_RATE, QuotaProviderConfig } from "./constants";

export interface QuotaAccountItem {
  id: string;
  provider: string;
  providerName: string;
  providerAvatar: string;
  providerColor: string;
  providerAccentHex: string;
  accountName: string;
  apiKeyMasked: string;
  status: "CONNECTED" | "INVALID" | "EXPIRED" | "LIMIT_REACHED";
  statusLabel: string;
  hasDirectBalanceApi: boolean;
  quota: {
    totalQuota: number;
    usedQuota: number;
    remainingQuota: number;
    percentageConsumed: number;
    quotaType: string;
  };
  validity: {
    createdAt: string;
    expirationDate: string | null;
    renewalDate: string | null;
    daysRemaining: number | null;
    isExpiringSoon: boolean; // <= 7 dias
    isExpired: boolean;
  };
  consumption: {
    todayTokens: number;
    monthTokens: number;
    estimatedCostUsd: number;
    estimatedCostBrl: number;
    projectedCostUsd: number;
    projectedCostBrl: number;
  };
  diagnostics: {
    lastSync: string;
    lastLatencyMs: number;
    detectedModels: string[];
  };
}

export interface QuotaAlert {
  id: string;
  accountId: string;
  provider: string;
  accountName: string;
  type: "CONSUMPTION_OVER_80" | "CONSUMPTION_OVER_90" | "EXPIRES_IN_7_DAYS" | "INVALID_KEY" | "LIMIT_REACHED" | "EXPIRED";
  severity: "CRITICAL" | "WARNING";
  title: string;
  message: string;
  timestamp: string;
}

export class AiQuotaManagerService {
  /**
   * Inicializa contas padrão para os 6 provedores caso ainda não existam no banco
   */
  public static async ensureSeedAccounts(): Promise<void> {
    const count = await prisma.aiProviderAccount.count();
    if (count > 0) return;

    const defaultSeedData = [
      {
        provider: "mirai",
        accountName: "Mirai Enterprise Engine",
        apiKeyMasked: "sk-mirai-...8812",
        totalQuota: 5000000,
        usedQuota: 1240000,
        remainingQuota: 3760000,
        quotaType: "TOKENS",
        expirationDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 dias
        renewalDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        status: "CONNECTED",
        customBaseUrl: "https://api.miraiapi.com/v1",
        detectedModels: JSON.stringify(["mirai-gpt-4o", "mirai-claude-3.5", "mirai-deepseek-v3"]),
      },
      {
        provider: "openai",
        accountName: "OpenAI Corporate Tier 4",
        apiKeyMasked: "sk-proj-...2026",
        totalQuota: 10000000,
        usedQuota: 2450000,
        remainingQuota: 7550000,
        quotaType: "TOKENS",
        expirationDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
        renewalDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        status: "CONNECTED",
        customBaseUrl: "https://api.openai.com/v1",
        detectedModels: JSON.stringify(["gpt-4o", "gpt-4o-mini", "gpt-5.6-sol", "o1-preview"]),
      },
      {
        provider: "anthropic",
        accountName: "Anthropic Claude Scale Contrato",
        apiKeyMasked: "sk-ant-...4491",
        totalQuota: 8000000,
        usedQuota: 3100000,
        remainingQuota: 4900000,
        quotaType: "TOKENS",
        expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        renewalDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
        status: "CONNECTED",
        customBaseUrl: "https://api.anthropic.com/v1",
        detectedModels: JSON.stringify(["claude-3-5-sonnet", "claude-sonnet-5", "claude-3-opus"]),
      },
      {
        provider: "google",
        accountName: "Google Gemini Cloud Vertex",
        apiKeyMasked: "AIzaSy...7720",
        totalQuota: 15000000,
        usedQuota: 1850000,
        remainingQuota: 13150000,
        quotaType: "TOKENS",
        expirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "CONNECTED",
        customBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
        detectedModels: JSON.stringify(["gemini-1.5-pro", "gemini-1.5-flash", "gemini-3-flash-preview"]),
      },
      {
        provider: "openrouter",
        accountName: "OpenRouter Multi-Gateway",
        apiKeyMasked: "sk-or-v1-...9901",
        totalQuota: 4000000,
        usedQuota: 950000,
        remainingQuota: 3050000,
        quotaType: "TOKENS",
        expirationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        renewalDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: "CONNECTED",
        customBaseUrl: "https://openrouter.ai/api/v1",
        detectedModels: JSON.stringify(["anthropic/claude-3.5-sonnet", "openai/gpt-4o"]),
      },
      {
        provider: "azure",
        accountName: "Azure OpenAI East US",
        apiKeyMasked: "az-op-...3310",
        totalQuota: 6000000,
        usedQuota: 1420000,
        remainingQuota: 4580000,
        quotaType: "TOKENS",
        expirationDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
        renewalDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
        status: "CONNECTED",
        customBaseUrl: "https://orvexa-ai.openai.azure.com",
        detectedModels: JSON.stringify(["azure-gpt-4o", "azure-gpt-35-turbo"]),
      },
    ];

    for (const item of defaultSeedData) {
      await prisma.aiProviderAccount.create({
        data: item,
      });
    }
  }

  /**
   * Lista todas as contas com métricas de quota, consumo diário/mensal e alertas
   */
  public static async listAccountsWithMetrics(): Promise<{
    accounts: QuotaAccountItem[];
    alerts: QuotaAlert[];
    totals: {
      totalAccounts: number;
      totalQuotaTokens: number;
      totalUsedTokens: number;
      totalRemainingTokens: number;
      overallPercentageUsed: number;
      totalCostUsd: number;
      totalCostBrl: number;
      totalProjectedUsd: number;
      totalProjectedBrl: number;
      connectedCount: number;
      warningCount: number;
      criticalCount: number;
    };
  }> {
    await this.ensureSeedAccounts();

    const rawAccounts = await prisma.aiProviderAccount.findMany({
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayOfMonth = now.getDate();
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const accounts: QuotaAccountItem[] = [];
    const alerts: QuotaAlert[] = [];

    let totalQuotaAll = 0;
    let totalUsedAll = 0;
    let totalCostAll = 0;
    let totalProjectedAll = 0;
    let connectedCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    for (const acc of rawAccounts) {
      const cfg = QUOTA_SUPPORTED_PROVIDERS[acc.provider] || {
        slug: acc.provider,
        name: acc.accountName,
        category: "OPENAI_OFFICIAL",
        defaultBaseUrl: acc.customBaseUrl || "",
        avatar: "🤖",
        color: "from-slate-500/20 to-slate-700/20 border-slate-500/30 text-slate-300",
        accentHex: "#94A3B8",
        hasDirectBalanceApi: false,
        defaultModels: [],
        pricing: { inputPer1kUsd: 0.002, outputPer1kUsd: 0.008 },
      };

      // 1. Agregação real de logs de consumo (ai_usage_logs)
      let todayTokens = acc.todayTokens;
      let monthTokens = acc.monthTokens;
      let calculatedCostUsd = acc.estimatedCostUsd;

      try {
        const usageLogsMonth = await prisma.aiUsageLog.findMany({
          where: {
            provider: acc.provider,
            createdAt: { gte: startOfMonth },
          },
          select: {
            tokensInput: true,
            tokensOutput: true,
            totalTokens: true,
            cost: true,
            createdAt: true,
          },
        });

        if (usageLogsMonth.length > 0) {
          monthTokens = usageLogsMonth.reduce((acc, log) => acc + (log.totalTokens || log.tokensInput + log.tokensOutput), 0);
          calculatedCostUsd = usageLogsMonth.reduce((acc, log) => acc + (log.cost || 0), 0);

          const usageToday = usageLogsMonth.filter((l) => new Date(l.createdAt) >= startOfToday);
          todayTokens = usageToday.reduce((acc, log) => acc + (log.totalTokens || log.tokensInput + log.tokensOutput), 0);
        }
      } catch (err) {
        // Fallback para valores prévios
      }

      // Se for provedor sem endpoint direto, sincroniza usedQuota com monthTokens ou logs
      let usedQuota = acc.usedQuota;
      if (!cfg.hasDirectBalanceApi && monthTokens > 0) {
        usedQuota = Math.max(acc.usedQuota, monthTokens);
      }

      const totalQuota = acc.totalQuota || 0;
      const remainingQuota = Math.max(0, totalQuota - usedQuota);
      const percentageConsumed = totalQuota > 0 ? Math.min(100, Math.round((usedQuota / totalQuota) * 100)) : 0;

      // 2. Projeção de Custo até o Fim do Ciclo
      const avgDailyTokens = dayOfMonth > 0 ? monthTokens / dayOfMonth : monthTokens;
      const projectedMonthTokens = Math.round(avgDailyTokens * daysInCurrentMonth);
      const projectedCostUsd =
        monthTokens > 0 && calculatedCostUsd > 0
          ? Number(((calculatedCostUsd / monthTokens) * projectedMonthTokens).toFixed(4))
          : Number((projectedMonthTokens * ((cfg.pricing.inputPer1kUsd + cfg.pricing.outputPer1kUsd) / 2000)).toFixed(4));

      // 3. Validade & Dias Restantes
      let daysRemaining: number | null = null;
      let isExpired = false;
      let isExpiringSoon = false;

      if (acc.expirationDate) {
        const diffMs = new Date(acc.expirationDate).getTime() - now.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 0) {
          isExpired = true;
          daysRemaining = 0;
        } else if (daysRemaining <= 7) {
          isExpiringSoon = true;
        }
      }

      // 4. Determinação de Status Consistente
      let currentStatus: "CONNECTED" | "INVALID" | "EXPIRED" | "LIMIT_REACHED" = "CONNECTED";
      if (acc.status === "INVALID") {
        currentStatus = "INVALID";
      } else if (isExpired) {
        currentStatus = "EXPIRED";
      } else if (remainingQuota <= 0 && totalQuota > 0) {
        currentStatus = "LIMIT_REACHED";
      } else {
        currentStatus = "CONNECTED";
      }

      const statusLabels = {
        CONNECTED: "Conectado",
        INVALID: "Chave Inválida",
        EXPIRED: "Expirado",
        LIMIT_REACHED: "Limite Atingido",
      };

      // 5. Geração de Alertas Preditivos
      if (currentStatus === "INVALID") {
        alerts.push({
          id: `alert-inv-${acc.id}`,
          accountId: acc.id,
          provider: acc.provider,
          accountName: acc.accountName,
          type: "INVALID_KEY",
          severity: "CRITICAL",
          title: "Chave de API Inválida",
          message: `A conta "${acc.accountName}" do provedor ${cfg.name} falhou na validação de credenciais. Atualize a chave para evitar falhas.`,
          timestamp: new Date().toISOString(),
        });
        criticalCount++;
      } else if (currentStatus === "EXPIRED") {
        alerts.push({
          id: `alert-exp-${acc.id}`,
          accountId: acc.id,
          provider: acc.provider,
          accountName: acc.accountName,
          type: "EXPIRED",
          severity: "CRITICAL",
          title: "Chave de API Expirada",
          message: `O contrato "${acc.accountName}" expirou. É necessário renovar para restabelecer as operações.`,
          timestamp: new Date().toISOString(),
        });
        criticalCount++;
      } else if (currentStatus === "LIMIT_REACHED") {
        alerts.push({
          id: `alert-lim-${acc.id}`,
          accountId: acc.id,
          provider: acc.provider,
          accountName: acc.accountName,
          type: "LIMIT_REACHED",
          severity: "CRITICAL",
          title: "Limite de Quota Atingido (100%)",
          message: `A conta "${acc.accountName}" consumiu todos os ${totalQuota.toLocaleString("pt-BR")} tokens contratados.`,
          timestamp: new Date().toISOString(),
        });
        criticalCount++;
      } else if (percentageConsumed >= 90) {
        alerts.push({
          id: `alert-90-${acc.id}`,
          accountId: acc.id,
          provider: acc.provider,
          accountName: acc.accountName,
          type: "CONSUMPTION_OVER_90",
          severity: "CRITICAL",
          title: `Consumo Crítico em ${percentageConsumed}%`,
          message: `A conta "${acc.accountName}" ultrapassou 90% da quota contratada. Restam apenas ${remainingQuota.toLocaleString("pt-BR")} tokens.`,
          timestamp: new Date().toISOString(),
        });
        criticalCount++;
      } else if (percentageConsumed >= 80) {
        alerts.push({
          id: `alert-80-${acc.id}`,
          accountId: acc.id,
          provider: acc.provider,
          accountName: acc.accountName,
          type: "CONSUMPTION_OVER_80",
          severity: "WARNING",
          title: `Atenção: Consumo em ${percentageConsumed}%`,
          message: `A conta "${acc.accountName}" atingiu 80% do limite contratado.`,
          timestamp: new Date().toISOString(),
        });
        warningCount++;
      }

      if (isExpiringSoon && currentStatus !== "EXPIRED") {
        alerts.push({
          id: `alert-exp7-${acc.id}`,
          accountId: acc.id,
          provider: acc.provider,
          accountName: acc.accountName,
          type: "EXPIRES_IN_7_DAYS",
          severity: "WARNING",
          title: `Vencimento Próximo (${daysRemaining} dias)`,
          message: `A conta "${acc.accountName}" expira em ${daysRemaining} dia(s). Renove o contrato preventivamente.`,
          timestamp: new Date().toISOString(),
        });
        warningCount++;
      }

      let detectedModels: string[] = cfg.defaultModels;
      try {
        if (acc.detectedModels) detectedModels = JSON.parse(acc.detectedModels);
      } catch {}

      accounts.push({
        id: acc.id,
        provider: acc.provider,
        providerName: cfg.name,
        providerAvatar: cfg.avatar,
        providerColor: cfg.color,
        providerAccentHex: cfg.accentHex,
        accountName: acc.accountName,
        apiKeyMasked: acc.apiKeyMasked || "sk-...****",
        status: currentStatus,
        statusLabel: statusLabels[currentStatus],
        hasDirectBalanceApi: cfg.hasDirectBalanceApi,
        quota: {
          totalQuota,
          usedQuota,
          remainingQuota,
          percentageConsumed,
          quotaType: acc.quotaType || "TOKENS",
        },
        validity: {
          createdAt: acc.createdAt.toISOString(),
          expirationDate: acc.expirationDate ? acc.expirationDate.toISOString() : null,
          renewalDate: acc.renewalDate ? acc.renewalDate.toISOString() : null,
          daysRemaining,
          isExpiringSoon,
          isExpired,
        },
        consumption: {
          todayTokens,
          monthTokens,
          estimatedCostUsd: Number(calculatedCostUsd.toFixed(4)),
          estimatedCostBrl: Number((calculatedCostUsd * USD_TO_BRL_RATE).toFixed(2)),
          projectedCostUsd: Number(projectedCostUsd.toFixed(4)),
          projectedCostBrl: Number((projectedCostUsd * USD_TO_BRL_RATE).toFixed(2)),
        },
        diagnostics: {
          lastSync: acc.lastSync.toISOString(),
          lastLatencyMs: acc.lastLatencyMs || 0,
          detectedModels,
        },
      });

      totalQuotaAll += totalQuota;
      totalUsedAll += usedQuota;
      totalCostAll += calculatedCostUsd;
      totalProjectedAll += projectedCostUsd;
      if (currentStatus === "CONNECTED") connectedCount++;
    }

    const totalRemainingAll = Math.max(0, totalQuotaAll - totalUsedAll);
    const overallPercentageUsed = totalQuotaAll > 0 ? Math.round((totalUsedAll / totalQuotaAll) * 100) : 0;

    return {
      accounts,
      alerts,
      totals: {
        totalAccounts: accounts.length,
        totalQuotaTokens: totalQuotaAll,
        totalUsedTokens: totalUsedAll,
        totalRemainingTokens: totalRemainingAll,
        overallPercentageUsed,
        totalCostUsd: Number(totalCostAll.toFixed(4)),
        totalCostBrl: Number((totalCostAll * USD_TO_BRL_RATE).toFixed(2)),
        totalProjectedUsd: Number(totalProjectedAll.toFixed(4)),
        totalProjectedBrl: Number((totalProjectedAll * USD_TO_BRL_RATE).toFixed(2)),
        connectedCount,
        warningCount,
        criticalCount,
      },
    };
  }

  /**
   * Sincroniza uma conta de IA:
   * 1. Consulta API remota caso suporte saldo (OpenRouter, Mirai).
   * 2. Calcula através de ai_usage_logs caso não possua endpoint público de saldo.
   */
  public static async syncAccount(accountId: string): Promise<QuotaAccountItem> {
    const account = await prisma.aiProviderAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error("Conta de API não encontrada.");
    }

    const cfg = QUOTA_SUPPORTED_PROVIDERS[account.provider];
    let syncedUsedQuota = account.usedQuota;
    let syncedTotalQuota = account.totalQuota;
    let latencyMs = account.lastLatencyMs;
    let newStatus = account.status;

    const startTime = Date.now();

    // 1. Sincronização via API Direta (OpenRouter / Mirai)
    if (cfg?.hasDirectBalanceApi && account.encryptedKey && account.iv && account.authTag) {
      try {
        const rawKey = decryptApiKey(account.encryptedKey, account.iv, account.authTag);

        if (account.provider === "openrouter") {
          const resp = await fetch("https://openrouter.ai/api/v1/auth/key", {
            headers: { Authorization: `Bearer ${rawKey}` },
          });
          latencyMs = Date.now() - startTime;

          if (resp.ok) {
            const data = await resp.json();
            if (data?.data) {
              const usageUsd = data.data.usage || 0;
              const limitUsd = data.data.limit || 0;
              // Converte USD para tokens aproximados ou armazena
              if (limitUsd > 0) {
                syncedTotalQuota = Math.round((limitUsd / cfg.pricing.outputPer1kUsd) * 1000);
                syncedUsedQuota = Math.round((usageUsd / cfg.pricing.outputPer1kUsd) * 1000);
              }
              newStatus = "CONNECTED";
            }
          } else if (resp.status === 401 || resp.status === 403) {
            newStatus = "INVALID";
          }
        } else if (account.provider === "mirai") {
          // Endpoint de saldo Mirai / OpenAI compatível
          const baseUrl = account.customBaseUrl || cfg.defaultBaseUrl;
          const resp = await fetch(`${baseUrl}/dashboard/billing/credit_grants`, {
            headers: { Authorization: `Bearer ${rawKey}` },
          });
          latencyMs = Date.now() - startTime;

          if (resp.ok) {
            const data = await resp.json();
            if (data?.total_granted) {
              syncedTotalQuota = Math.round(data.total_granted * 100000);
              syncedUsedQuota = Math.round((data.total_used || 0) * 100000);
              newStatus = "CONNECTED";
            }
          }
        }
      } catch (err) {
        // Fallback para cálculo via logs
      }
    }

    // 2. Cálculo via ai_usage_logs (obrigatório para provedores sem endpoint ou como consolidador)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthLogs = await prisma.aiUsageLog.findMany({
      where: {
        provider: account.provider,
        createdAt: { gte: startOfMonth },
      },
      select: {
        tokensInput: true,
        tokensOutput: true,
        totalTokens: true,
        cost: true,
        createdAt: true,
      },
    });

    const monthTokens = monthLogs.reduce((acc, log) => acc + (log.totalTokens || log.tokensInput + log.tokensOutput), 0);
    const estimatedCostUsd = monthLogs.reduce((acc, log) => acc + (log.cost || 0), 0);
    const todayTokens = monthLogs
      .filter((l) => new Date(l.createdAt) >= startOfToday)
      .reduce((acc, log) => acc + (log.totalTokens || log.tokensInput + log.tokensOutput), 0);

    // Ajusta o usedQuota sincronizado
    syncedUsedQuota = Math.max(syncedUsedQuota, monthTokens);
    const remainingQuota = Math.max(0, syncedTotalQuota - syncedUsedQuota);

    // Atualiza status se limite foi atingido
    if (remainingQuota <= 0 && syncedTotalQuota > 0 && newStatus !== "INVALID") {
      newStatus = "LIMIT_REACHED";
    }

    // Atualiza registro no banco de dados
    await prisma.aiProviderAccount.update({
      where: { id: accountId },
      data: {
        usedQuota: syncedUsedQuota,
        totalQuota: syncedTotalQuota,
        remainingQuota,
        todayTokens,
        monthTokens,
        estimatedCostUsd,
        lastLatencyMs: latencyMs,
        lastSync: new Date(),
        status: newStatus,
      },
    });

    const metrics = await this.listAccountsWithMetrics();
    const updated = metrics.accounts.find((a) => a.id === accountId);
    if (!updated) throw new Error("Falha ao recuperar conta sincronizada.");

    return updated;
  }

  /**
   * Sincroniza todas as contas de API registradas
   */
  public static async syncAllAccounts(): Promise<{
    syncedCount: number;
    accounts: QuotaAccountItem[];
  }> {
    await this.ensureSeedAccounts();
    const accounts = await prisma.aiProviderAccount.findMany({
      select: { id: true },
    });

    let count = 0;
    for (const acc of accounts) {
      try {
        await this.syncAccount(acc.id);
        count++;
      } catch (err) {
        console.error(`[Sync Account Error ${acc.id}]`, err);
      }
    }

    const result = await this.listAccountsWithMetrics();
    return {
      syncedCount: count,
      accounts: result.accounts,
    };
  }

  /**
   * Cadastra ou atualiza uma conta de provedor
   */
  public static async saveAccount(payload: {
    id?: string;
    provider: string;
    accountName: string;
    rawKey?: string;
    totalQuota?: number;
    quotaType?: string;
    expirationDate?: string | null;
    renewalDate?: string | null;
    customBaseUrl?: string;
    status?: string;
  }): Promise<QuotaAccountItem> {
    const {
      id,
      provider,
      accountName,
      rawKey,
      totalQuota = 1000000,
      quotaType = "TOKENS",
      expirationDate,
      renewalDate,
      customBaseUrl,
      status = "CONNECTED",
    } = payload;

    let encryptedData: { cipherText: string; iv: string; authTag: string; keyHint: string } | null = null;
    let apiKeyMasked: string | undefined = undefined;

    if (rawKey && rawKey.trim()) {
      encryptedData = encryptApiKey(rawKey.trim());
      const cleanKey = rawKey.trim();
      apiKeyMasked = cleanKey.length > 8 ? `${cleanKey.slice(0, 4)}...${cleanKey.slice(-4)}` : "sk-...****";
    }

    const expDate = expirationDate ? new Date(expirationDate) : null;
    const renDate = renewalDate ? new Date(renewalDate) : null;

    let recordId = id;

    if (id) {
      const updateData: any = {
        provider,
        accountName,
        totalQuota,
        quotaType,
        expirationDate: expDate,
        renewalDate: renDate,
        customBaseUrl,
        status,
        lastSync: new Date(),
      };
      if (encryptedData) {
        updateData.encryptedKey = encryptedData.cipherText;
        updateData.iv = encryptedData.iv;
        updateData.authTag = encryptedData.authTag;
        updateData.apiKeyMasked = apiKeyMasked;
      }
      await prisma.aiProviderAccount.update({
        where: { id },
        data: updateData,
      });
    } else {
      const initialRemaining = totalQuota;
      const created = await prisma.aiProviderAccount.create({
        data: {
          provider,
          accountName,
          apiKeyMasked: apiKeyMasked || "sk-...****",
          encryptedKey: encryptedData?.cipherText || null,
          iv: encryptedData?.iv || null,
          authTag: encryptedData?.authTag || null,
          totalQuota,
          usedQuota: 0,
          remainingQuota: initialRemaining,
          quotaType,
          expirationDate: expDate,
          renewalDate: renDate,
          customBaseUrl,
          status,
          lastSync: new Date(),
        },
      });
      recordId = created.id;
    }

    if (recordId) {
      await this.syncAccount(recordId);
    }

    const metrics = await this.listAccountsWithMetrics();
    const saved = metrics.accounts.find((a) => a.id === recordId);
    if (!saved) throw new Error("Erro ao carregar conta salva.");
    return saved;
  }

  /**
   * Executa teste de conexão com a chave da conta
   */
  public static async testAccountConnection(accountId: string): Promise<{
    status: "CONNECTED" | "INVALID" | "LIMIT_REACHED" | "EXPIRED";
    latencyMs: number;
    httpStatus: number;
    detectedModels: string[];
    message: string;
  }> {
    const account = await prisma.aiProviderAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) throw new Error("Conta não encontrada.");

    let rawKey = "";
    if (account.encryptedKey && account.iv && account.authTag) {
      rawKey = decryptApiKey(account.encryptedKey, account.iv, account.authTag);
    }

    const cfg = QUOTA_SUPPORTED_PROVIDERS[account.provider];
    const baseUrl = account.customBaseUrl || cfg?.defaultBaseUrl || "";

    const testRes = await AIProviderService.testConnection({
      providerSlug: account.provider,
      apiKey: rawKey,
      customBaseUrl: baseUrl,
    });
    const latency = testRes.latencyMs || 100;
    const httpStatus = testRes.success ? 200 : (typeof testRes.errorCode === "number" ? testRes.errorCode : 401);

    let newStatus: "CONNECTED" | "INVALID" | "LIMIT_REACHED" | "EXPIRED" = "CONNECTED";
    if (!testRes.success || testRes.errorCode === 401 || testRes.errorCode === 403 || testRes.errorCode === "INVALID_KEY") {
      newStatus = "INVALID";
    } else if (account.expirationDate && new Date(account.expirationDate) <= new Date()) {
      newStatus = "EXPIRED";
    } else if (account.remainingQuota <= 0 && account.totalQuota > 0) {
      newStatus = "LIMIT_REACHED";
    } else {
      newStatus = "CONNECTED";
    }

    await prisma.aiProviderAccount.update({
      where: { id: accountId },
      data: {
        status: newStatus,
        lastLatencyMs: latency,
        detectedModels: JSON.stringify(testRes.detectedModels || cfg?.defaultModels || []),
        lastSync: new Date(),
      },
    });

    return {
      status: newStatus,
      latencyMs: latency,
      httpStatus,
      detectedModels: testRes.detectedModels || cfg?.defaultModels || [],
      message: testRes.message,
    };
  }

  /**
   * Remove uma conta do Quota Manager
   */
  public static async deleteAccount(accountId: string): Promise<boolean> {
    await prisma.aiProviderAccount.delete({
      where: { id: accountId },
    });
    return true;
  }

  /**
   * Helper de Resiliência para o Smart AI Router:
   * Verifica se o provedor possui contas com saldo e dentro da validade
   */
  public static async checkProviderAvailability(providerSlug: string): Promise<{
    available: boolean;
    reason?: string;
    remainingQuota: number;
    status: string;
  }> {
    try {
      const accounts = await prisma.aiProviderAccount.findMany({
        where: { provider: providerSlug },
      });

      if (accounts.length === 0) {
        return { available: true, remainingQuota: 9999999, status: "NO_ACCOUNT_RESTRICTION" };
      }

      const activeAccounts = accounts.filter(
        (a) => a.status === "CONNECTED" && a.remainingQuota > 0 && (!a.expirationDate || new Date(a.expirationDate) > new Date())
      );

      if (activeAccounts.length === 0) {
        const primary = accounts[0];
        let reason = "Provedor indisponível no AI Quota Manager.";
        if (primary.status === "INVALID") reason = "Chave da conta está inválida.";
        else if (primary.status === "EXPIRED" || (primary.expirationDate && new Date(primary.expirationDate) <= new Date())) reason = "Contrato da conta está expirado.";
        else if (primary.remainingQuota <= 0) reason = "Limite total de tokens da conta foi atingido (100%).";

        return {
          available: false,
          reason,
          remainingQuota: 0,
          status: primary.status,
        };
      }

      const totalRemaining = activeAccounts.reduce((sum, a) => sum + a.remainingQuota, 0);
      return {
        available: true,
        remainingQuota: totalRemaining,
        status: "CONNECTED",
      };
    } catch {
      return { available: true, remainingQuota: 9999999, status: "FALLBACK_ALLOW" };
    }
  }
}
