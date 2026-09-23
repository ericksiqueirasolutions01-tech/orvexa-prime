// src/ai/monitoring/ai-monitor.service.ts
// CENTRAL DE OBSERVABILIDADE, MONITORAMENTO DE APIS E CUSTOS — ORVEXA PRIME DIGITAL

import { prisma } from "@/lib/prisma";
import { decryptApiKey, encryptApiKey } from "@/lib/crypto";
import { AIProviderService } from "@/ai/services/provider.service";

export type ProviderMonitorCategory =
  | "OPENAI_OFFICIAL"
  | "OPENAI_COMPATIBLE"
  | "ANTHROPIC"
  | "GOOGLE";

export type ProviderHealthStatusType =
  | "ONLINE"
  | "OFFLINE"
  | "INVALID_KEY"
  | "EXPIRED"
  | "RATE_LIMIT";

export interface ProviderDefinition {
  slug: string;
  name: string;
  category: ProviderMonitorCategory;
  categoryLabel: string;
  description: string;
  avatar: string;
  defaultBaseUrl?: string;
  primaryModel: string;
}

export const MONITORED_PROVIDERS: ProviderDefinition[] = [
  {
    slug: "openai",
    name: "OpenAI Oficial",
    category: "OPENAI_OFFICIAL",
    categoryLabel: "OpenAI Oficial",
    description: "Modelos GPT-4o, GPT-4o Mini e Codex diretamente da OpenAI.",
    avatar: "🟢",
    primaryModel: "gpt-4o",
  },
  {
    slug: "mirai",
    name: "OpenAI Compatível (Mirai API)",
    category: "OPENAI_COMPATIBLE",
    categoryLabel: "OpenAI Compatível",
    description: "Gateway proxy Mirai API de alto desempenho e latência ultrabaixa.",
    avatar: "⚡",
    defaultBaseUrl: "https://api.miraiapi.com/v1",
    primaryModel: "gpt-5.6-sol",
  },
  {
    slug: "openrouter",
    name: "OpenRouter Gateway",
    category: "OPENAI_COMPATIBLE",
    categoryLabel: "OpenAI Compatível",
    description: "Roteador multimodelo e fallback distribuído compatível com OpenAI.",
    avatar: "🔀",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    primaryModel: "openai/gpt-4o-mini",
  },
  {
    slug: "azure",
    name: "Azure OpenAI Service",
    category: "OPENAI_COMPATIBLE",
    categoryLabel: "OpenAI Compatível",
    description: "Instância corporativa Azure com isolamento e conformidade empresarial.",
    avatar: "☁️",
    primaryModel: "gpt-4o-azure",
  },
  {
    slug: "anthropic",
    name: "Anthropic Claude",
    category: "ANTHROPIC",
    categoryLabel: "Anthropic Claude",
    description: "Família Claude 3.5 Sonnet e Claude Sonnet 5 para documentos e raciocínio profundo.",
    avatar: "🟣",
    primaryModel: "claude-3-5-sonnet-20241022",
  },
  {
    slug: "google",
    name: "Google Gemini",
    category: "GOOGLE",
    categoryLabel: "Google Gemini",
    description: "Gemini 3 Flash e Gemini 1.5 Pro com visão nativa e contexto expandido.",
    avatar: "🔵",
    primaryModel: "gemini-3-flash-preview",
  },
];

// Cotação fixa/configurável para conversão USD -> BRL
export const USD_TO_BRL_RATE = 5.65;

export interface ProviderCardData {
  slug: string;
  name: string;
  category: ProviderMonitorCategory;
  categoryLabel: string;
  description: string;
  avatar: string;
  status: ProviderHealthStatusType;
  statusLabel: string;
  health: {
    lastTestedAt: string;
    latencyMs: number;
    httpStatus: number;
    availability: number; // Porcentagem (0 - 100)
    errorMessage?: string | null;
  };
  consumption: {
    tokensUsedMonth: number;
    tokenLimitMonthly: number;
    tokensRemaining: number;
    percentageConsumed: number;
  };
  costs: {
    estimatedCostUsd: number;
    estimatedCostBrl: number;
    costByModel: Record<string, { tokens: number; costUsd: number; costBrl: number }>;
  };
  models: {
    available: string[];
    active: string[];
    primary: string;
  };
  keys: Array<{
    id: string;
    name: string;
    keyHint: string;
    status: string;
    priority: number;
    tokensUsedMonth: number;
    tokenLimitMonthly: number;
    customBaseUrl?: string | null;
    lastUsedAt?: string | null;
  }>;
}

export interface OperationalAlert {
  id: string;
  type: "EXPIRED_KEY" | "NEAR_LIMIT" | "API_ERROR" | "HIGH_LATENCY";
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  message: string;
  provider: string;
  targetId?: string;
  timestamp: string;
}

export interface DashboardOverview {
  totalTokensUsed: number;
  totalCostUsd: number;
  totalCostBrl: number;
  overallAvailability: number;
  activeProvidersCount: number;
  totalProvidersCount: number;
  activeKeysCount: number;
  totalKeysCount: number;
}

export class AIMonitorService {
  /**
   * Executa teste diagnóstico de saúde para um provedor específico.
   */
  public static async checkProviderHealth(providerSlug: string): Promise<{
    status: ProviderHealthStatusType;
    httpStatus: number;
    latencyMs: number;
    availability: number;
    message: string;
  }> {
    const providerDef = MONITORED_PROVIDERS.find((p) => p.slug === providerSlug);
    if (!providerDef) {
      throw new Error(`Provedor desconhecido: ${providerSlug}`);
    }

    const startTime = Date.now();

    // 1. Localiza chaves ativas do provedor
    // Para provedores compatíveis (mirai, openrouter, azure), verifica slug próprio ou openai com customBaseUrl
    const providerRecords = await prisma.aiProvider.findMany({
      where: {
        OR: [
          { slug: providerSlug },
          providerDef.category === "OPENAI_COMPATIBLE" ? { slug: "openai" } : { slug: providerSlug },
        ],
      },
      include: {
        apiKeys: {
          where: { status: { not: "DISABLED" } },
          orderBy: { priority: "asc" },
        },
      },
    });

    let activeKeyRecord: any = null;
    let customBaseUrl = providerDef.defaultBaseUrl || null;

    for (const pr of providerRecords) {
      if (pr.slug === providerSlug && pr.apiKeys.length > 0) {
        activeKeyRecord = pr.apiKeys[0];
        if (pr.baseUrl) customBaseUrl = pr.baseUrl;
        break;
      }
    }

    // Se não encontrou pelo slug exato para compatíveis, busca chaves com customBaseUrl correspondente
    if (!activeKeyRecord && providerDef.category === "OPENAI_COMPATIBLE") {
      const allOpenAiKeys = await prisma.apiKey.findMany({
        where: {
          provider: { slug: "openai" },
          status: { not: "DISABLED" },
        },
      });
      activeKeyRecord = allOpenAiKeys.find((k) =>
        k.customBaseUrl?.includes(providerSlug) ||
        (providerDef.defaultBaseUrl && k.customBaseUrl?.includes(new URL(providerDef.defaultBaseUrl).hostname))
      ) || allOpenAiKeys[0];
    }

    let status: ProviderHealthStatusType = "ONLINE";
    let httpStatus = 200;
    let latencyMs = 0;
    let message = "Conexão e autenticação validadas com sucesso.";

    if (activeKeyRecord) {
      const rawKey = decryptApiKey(activeKeyRecord.encryptedKey, activeKeyRecord.iv, activeKeyRecord.authTag);
      const urlToTest = activeKeyRecord.customBaseUrl || customBaseUrl;

      const testResult = await AIProviderService.testConnection({
        providerSlug: providerDef.category === "ANTHROPIC" ? "anthropic" : providerDef.category === "GOOGLE" ? "google" : "openai",
        apiKey: rawKey,
        customBaseUrl: urlToTest,
        modelIdentifier: providerDef.primaryModel,
      });

      latencyMs = testResult.latencyMs || (Date.now() - startTime);

      if (testResult.success) {
        status = "ONLINE";
        httpStatus = 200;
        message = testResult.message;
      } else {
        const errCode = testResult.errorCode;
        const errStr = `${testResult.message} ${testResult.details || ""}`.toLowerCase();

        if (errCode === 401 || errCode === 403 || errStr.includes("invalid") || errStr.includes("autenticação") || errStr.includes("unauthorized")) {
          status = "INVALID_KEY";
          httpStatus = 401;
        } else if (errCode === 429 || errStr.includes("rate") || errStr.includes("quota") || errStr.includes("limite")) {
          status = "RATE_LIMIT";
          httpStatus = 429;
        } else if (errStr.includes("expired") || errStr.includes("expirada") || errStr.includes("revoked")) {
          status = "EXPIRED";
          httpStatus = 401;
        } else {
          status = "OFFLINE";
          httpStatus = typeof errCode === "number" ? errCode : 503;
        }
        message = testResult.message;
      }
    } else {
      // Se não há chaves cadastradas no banco, verifica se há configuração no ambiente
      const envKey =
        providerSlug === "anthropic"
          ? process.env.ANTHROPIC_API_KEY
          : providerSlug === "google"
          ? process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
          : process.env.OPENAI_API_KEY;

      if (envKey) {
        const testResult = await AIProviderService.testConnection({
          providerSlug: providerDef.category === "ANTHROPIC" ? "anthropic" : providerDef.category === "GOOGLE" ? "google" : "openai",
          apiKey: envKey,
          customBaseUrl,
          modelIdentifier: providerDef.primaryModel,
        });

        latencyMs = testResult.latencyMs;
        if (testResult.success) {
          status = "ONLINE";
          httpStatus = 200;
          message = "Conexão ativa através da chave mestra do ambiente.";
        } else {
          status = testResult.errorCode === 429 ? "RATE_LIMIT" : "OFFLINE";
          httpStatus = typeof testResult.errorCode === "number" ? testResult.errorCode : 500;
          message = testResult.message;
        }
      } else {
        // Nenhuma chave cadastrada
        status = "OFFLINE";
        httpStatus = 404;
        latencyMs = 0;
        message = "Nenhuma chave ativa cadastrada para este provedor.";
      }
    }

    // Calcula disponibilidade recente nos logs de uso
    const recentLogs = await prisma.aiUsageLog.findMany({
      where: {
        provider: providerSlug,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    let availability = 100.0;
    if (recentLogs.length > 0) {
      const successful = recentLogs.filter((l) => l.status === "SUCCESS").length;
      availability = Number(((successful / recentLogs.length) * 100).toFixed(1));
    } else if (status !== "ONLINE") {
      availability = 0.0;
    }

    // Persiste no banco de dados na tabela provider_health
    await prisma.providerHealth.upsert({
      where: { providerSlug },
      update: {
        name: providerDef.name,
        category: providerDef.category,
        status,
        httpStatus,
        latencyMs,
        availability,
        lastTestedAt: new Date(),
        errorMessage: status === "ONLINE" ? null : message,
      },
      create: {
        providerSlug,
        name: providerDef.name,
        category: providerDef.category,
        status,
        httpStatus,
        latencyMs,
        availability,
        lastTestedAt: new Date(),
        errorMessage: status === "ONLINE" ? null : message,
      },
    });

    return {
      status,
      httpStatus,
      latencyMs,
      availability,
      message,
    };
  }

  /**
   * Executa verificação de saúde para todos os provedores em paralelo.
   */
  public static async checkAllProvidersHealth(): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    for (const p of MONITORED_PROVIDERS) {
      try {
        results[p.slug] = await this.checkProviderHealth(p.slug);
      } catch (err: any) {
        results[p.slug] = {
          status: "OFFLINE",
          httpStatus: 500,
          latencyMs: 0,
          availability: 0,
          message: err.message,
        };
      }
    }
    return results;
  }

  /**
   * Obtém a lista consolidada de cards de provedores com todas as métricas detalhadas.
   */
  public static async getProviderCardsData(): Promise<ProviderCardData[]> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Busca dados persistidos de saúde
    const healthRecords = await prisma.providerHealth.findMany();
    const healthMap = new Map(healthRecords.map((h) => [h.providerSlug, h]));

    // 2. Busca modelos cadastrados
    const allModels = await prisma.aiModel.findMany({
      include: { provider: true },
    });

    // 3. Busca chaves de API
    const allKeys = await prisma.apiKey.findMany({
      include: { provider: true },
    });

    // 4. Busca logs de uso do mês atual
    const usageLogsMonth = await prisma.aiUsageLog.findMany({
      where: { createdAt: { gte: firstDayOfMonth } },
    });

    const cards: ProviderCardData[] = [];

    for (const def of MONITORED_PROVIDERS) {
      const health = healthMap.get(def.slug);

      // Modelos vinculados a este ecossistema
      const relevantModels = allModels.filter((m) => {
        if (def.category === "OPENAI_OFFICIAL") return m.provider.slug === "openai" && !m.modelIdentifier.includes("mirai") && !m.modelIdentifier.includes("azure");
        if (def.category === "OPENAI_COMPATIBLE") return m.provider.slug === def.slug || m.provider.slug === "openai";
        if (def.category === "ANTHROPIC") return m.provider.slug === "anthropic";
        if (def.category === "GOOGLE") return m.provider.slug === "google";
        return false;
      });

      const availableModelNames = relevantModels.map((m) => m.name);
      const activeModelNames = relevantModels.filter((m) => m.isActive).map((m) => m.name);

      // Chaves associadas a este provedor
      const relevantKeys = allKeys.filter((k) => {
        if (k.provider.slug === def.slug) return true;
        if (def.category === "OPENAI_COMPATIBLE" && k.provider.slug === "openai" && k.customBaseUrl?.includes(def.slug)) return true;
        if (def.slug === "openai" && k.provider.slug === "openai" && !k.customBaseUrl) return true;
        return false;
      });

      // Cálculo de consumo de tokens
      const providerLogs = usageLogsMonth.filter((l) => l.provider === def.slug);
      const tokensUsedMonth = providerLogs.reduce((acc, l) => acc + l.totalTokens, 0) +
        relevantKeys.reduce((acc, k) => acc + k.tokensUsedMonth, 0);

      const tokenLimitMonthly = relevantKeys.reduce((acc, k) => acc + (k.tokenLimitMonthly || 0), 0);
      const tokensRemaining = tokenLimitMonthly > 0 ? Math.max(0, tokenLimitMonthly - tokensUsedMonth) : 999999999;
      const percentageConsumed = tokenLimitMonthly > 0 ? Math.min(100, Math.round((tokensUsedMonth / tokenLimitMonthly) * 100)) : 0;

      // Cálculo de custos USD e BRL
      const estimatedCostUsd = providerLogs.reduce((acc, l) => acc + l.cost, 0) +
        (tokensUsedMonth > 0 && providerLogs.length === 0 ? (tokensUsedMonth / 1000) * 0.003 : 0);
      const estimatedCostBrl = estimatedCostUsd * USD_TO_BRL_RATE;

      // Custo por modelo
      const costByModel: Record<string, { tokens: number; costUsd: number; costBrl: number }> = {};
      for (const log of providerLogs) {
        const mKey = log.model || "Desconhecido";
        if (!costByModel[mKey]) {
          costByModel[mKey] = { tokens: 0, costUsd: 0, costBrl: 0 };
        }
        costByModel[mKey].tokens += log.totalTokens;
        costByModel[mKey].costUsd += log.cost;
        costByModel[mKey].costBrl += log.costBrl;
      }

      // Status amigável
      const status = (health?.status as ProviderHealthStatusType) || (relevantKeys.length > 0 ? "ONLINE" : "OFFLINE");
      const statusLabels: Record<ProviderHealthStatusType, string> = {
        ONLINE: "Online",
        OFFLINE: "Offline",
        INVALID_KEY: "Chave Inválida",
        EXPIRED: "Expirada",
        RATE_LIMIT: "Rate Limit",
      };

      cards.push({
        slug: def.slug,
        name: def.name,
        category: def.category,
        categoryLabel: def.categoryLabel,
        description: def.description,
        avatar: def.avatar,
        status,
        statusLabel: statusLabels[status] || "Desconhecido",
        health: {
          lastTestedAt: health?.lastTestedAt ? health.lastTestedAt.toISOString() : new Date().toISOString(),
          latencyMs: health?.latencyMs || 0,
          httpStatus: health?.httpStatus || 200,
          availability: health?.availability ?? 100.0,
          errorMessage: health?.errorMessage,
        },
        consumption: {
          tokensUsedMonth,
          tokenLimitMonthly,
          tokensRemaining,
          percentageConsumed,
        },
        costs: {
          estimatedCostUsd: Number(estimatedCostUsd.toFixed(4)),
          estimatedCostBrl: Number(estimatedCostBrl.toFixed(2)),
          costByModel,
        },
        models: {
          available: availableModelNames.length > 0 ? availableModelNames : [def.primaryModel],
          active: activeModelNames.length > 0 ? activeModelNames : [def.primaryModel],
          primary: def.primaryModel,
        },
        keys: relevantKeys.map((k) => ({
          id: k.id,
          name: k.name,
          keyHint: k.keyHint,
          status: k.status,
          priority: k.priority,
          tokensUsedMonth: k.tokensUsedMonth,
          tokenLimitMonthly: k.tokenLimitMonthly,
          customBaseUrl: k.customBaseUrl,
          lastUsedAt: k.lastUsedAt?.toISOString() || null,
        })),
      });
    }

    return cards;
  }

  /**
   * Identifica alertas operacionais em tempo real:
   * - chave expirada;
   * - limite próximo;
   * - erro de API;
   * - latência alta.
   */
  public static async getOperationalAlerts(): Promise<OperationalAlert[]> {
    const alerts: OperationalAlert[] = [];

    // 1. Chaves expiradas ou inválidas
    const problematicKeys = await prisma.apiKey.findMany({
      where: {
        OR: [
          { status: "ERROR" },
          { status: "RATE_LIMITED" },
          { status: "BLOCKED_QUOTA" },
        ],
      },
      include: { provider: true },
    });

    for (const key of problematicKeys) {
      if (key.status === "ERROR") {
        alerts.push({
          id: `alert-key-err-${key.id}`,
          type: "API_ERROR",
          severity: "CRITICAL",
          title: `Falha na Chave de API: ${key.name}`,
          message: `A chave ${key.keyHint} do provedor ${key.provider.name} apresentou erros consecutivos e requer atenção.`,
          provider: key.provider.slug,
          targetId: key.id,
          timestamp: key.updatedAt.toISOString(),
        });
      } else if (key.status === "RATE_LIMITED") {
        alerts.push({
          id: `alert-key-rl-${key.id}`,
          type: "API_ERROR",
          severity: "WARNING",
          title: `Rate Limit Atingido: ${key.name}`,
          message: `O provedor ${key.provider.name} retornou HTTP 429 para a chave ${key.keyHint}. Rotação automática acionada.`,
          provider: key.provider.slug,
          targetId: key.id,
          timestamp: key.updatedAt.toISOString(),
        });
      }
    }

    // 2. Chaves com limite próximo (>= 85%)
    const nearLimitKeys = await prisma.apiKey.findMany({
      where: {
        tokenLimitMonthly: { gt: 0 },
        status: { not: "DISABLED" },
      },
      include: { provider: true },
    });

    for (const key of nearLimitKeys) {
      const percentage = (key.tokensUsedMonth / key.tokenLimitMonthly) * 100;
      if (percentage >= 85) {
        alerts.push({
          id: `alert-near-limit-${key.id}`,
          type: "NEAR_LIMIT",
          severity: percentage >= 95 ? "CRITICAL" : "WARNING",
          title: `Consumo Próximo do Limite: ${key.name}`,
          message: `A chave consumiu ${percentage.toFixed(1)}% da sua quota mensal (${key.tokensUsedMonth.toLocaleString()} / ${key.tokenLimitMonthly.toLocaleString()} tokens).`,
          provider: key.provider.slug,
          targetId: key.id,
          timestamp: key.updatedAt.toISOString(),
        });
      }
    }

    // 3. Provedores com status de alerta ou latência alta
    const healthRecords = await prisma.providerHealth.findMany();
    for (const h of healthRecords) {
      if (h.status === "EXPIRED" || h.status === "INVALID_KEY") {
        alerts.push({
          id: `alert-health-exp-${h.providerSlug}`,
          type: "EXPIRED_KEY",
          severity: "CRITICAL",
          title: `Chave Inválida ou Expirada: ${h.name}`,
          message: `O teste de conexão acusou chave expirada ou credencial revogada para o provedor ${h.name}. Substitua a chave no painel.`,
          provider: h.providerSlug,
          timestamp: h.lastTestedAt.toISOString(),
        });
      } else if (h.status === "OFFLINE") {
        alerts.push({
          id: `alert-health-offline-${h.providerSlug}`,
          type: "API_ERROR",
          severity: "CRITICAL",
          title: `Provedor Indisponível (Offline): ${h.name}`,
          message: `O provedor ${h.name} não respondeu às tentativas de conexão (Status HTTP ${h.httpStatus}). Fallback automático ativo.`,
          provider: h.providerSlug,
          timestamp: h.lastTestedAt.toISOString(),
        });
      }

      if (h.latencyMs >= 2500) {
        alerts.push({
          id: `alert-health-lat-${h.providerSlug}`,
          type: "HIGH_LATENCY",
          severity: "WARNING",
          title: `Latência Alta Detectada: ${h.name}`,
          message: `O tempo de resposta medido foi de ${h.latencyMs}ms, acima do limite operacional recomendado de 2.500ms.`,
          provider: h.providerSlug,
          timestamp: h.lastTestedAt.toISOString(),
        });
      }
    }

    // 4. Erros recentes em requisições de usuários (últimos 30 minutos)
    const recentErrors = await prisma.aiUsageLog.findMany({
      where: {
        status: { in: ["ERROR", "RATE_LIMIT", "TIMEOUT"] },
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    for (const log of recentErrors) {
      alerts.push({
        id: `alert-log-err-${log.id}`,
        type: "API_ERROR",
        severity: "WARNING",
        title: `Erro em Requisição de IA (${log.provider})`,
        message: `Falha no modelo ${log.model} com status ${log.status}: ${log.errorMessage || "Erro na resposta do provedor"}.`,
        provider: log.provider,
        timestamp: log.createdAt.toISOString(),
      });
    }

    return alerts;
  }

  /**
   * Registra log granular de utilização na tabela ai_usage_logs.
   */
  public static async recordUsageLog(params: {
    userId?: string | null;
    provider: string;
    model: string;
    tokensInput: number;
    tokensOutput: number;
    latencyMs: number;
    cost?: number;
    statusCode?: number;
    status?: string;
    errorMessage?: string;
  }) {
    const {
      userId,
      provider,
      model,
      tokensInput,
      tokensOutput,
      latencyMs,
      statusCode = 200,
      status = "SUCCESS",
      errorMessage,
    } = params;

    const totalTokens = tokensInput + tokensOutput;

    // Cálculo de custo estimado caso não fornecido explicitamente
    let costUsd = params.cost ?? 0;
    if (costUsd === 0 && totalTokens > 0) {
      // Modelos Claude Sonnet: ~$3/M entrada, $15/M saída
      if (model.includes("claude-3-5") || model.includes("claude-sonnet")) {
        costUsd = (tokensInput * 0.003 + tokensOutput * 0.015) / 1000;
      }
      // GPT-4o: ~$2.50/M entrada, $10/M saída
      else if (model.includes("gpt-4o") && !model.includes("mini")) {
        costUsd = (tokensInput * 0.0025 + tokensOutput * 0.010) / 1000;
      }
      // Modelos Mini / Flash: ~$0.15/M entrada, $0.60/M saída
      else {
        costUsd = (tokensInput * 0.00015 + tokensOutput * 0.0006) / 1000;
      }
    }

    const costBrl = Number((costUsd * USD_TO_BRL_RATE).toFixed(4));

    try {
      return await prisma.aiUsageLog.create({
        data: {
          userId: userId || null,
          provider: provider.toLowerCase(),
          model,
          tokensInput,
          tokensOutput,
          totalTokens,
          cost: Number(costUsd.toFixed(6)),
          costBrl,
          latencyMs,
          statusCode,
          status,
          errorMessage: errorMessage || null,
        },
      });
    } catch (err: any) {
      console.error("[AIMonitorService] Falha ao registrar log em ai_usage_logs:", err.message);
      return null;
    }
  }

  /**
   * Resiliência do Smart Router: Verifica se o provedor desejado está saudável.
   * Se estiver OFFLINE, RATE_LIMIT ou INVALID_KEY, retorna fallback automático.
   */
  public static async getHealthyFallbackProvider(desiredProvider: string): Promise<{
    provider: string;
    isFallback: boolean;
    reason?: string;
  }> {
    const health = await prisma.providerHealth.findUnique({
      where: { providerSlug: desiredProvider },
    });

    // Se o provedor está online e saudável, segue com ele
    if (!health || health.status === "ONLINE") {
      return { provider: desiredProvider, isFallback: false };
    }

    // Provedor desejado com problemas. Busca alternativa saudável classificada por menor latência
    console.warn(`[AIMonitorService] Provedor "${desiredProvider}" está com status "${health.status}". Acionando fallback automático...`);

    const healthyAlternatives = await prisma.providerHealth.findMany({
      where: {
        providerSlug: { not: desiredProvider },
        status: "ONLINE",
      },
      orderBy: { latencyMs: "asc" },
    });

    if (healthyAlternatives.length > 0) {
      const best = healthyAlternatives[0];
      return {
        provider: best.providerSlug,
        isFallback: true,
        reason: `Provedor original "${desiredProvider}" indisponível (${health.status}). Fallback automático para "${best.name}" (Latência: ${best.latencyMs}ms).`,
      };
    }

    // Se nenhum estiver marcado explicitamente como ONLINE, prioriza openai ou google
    const safeFallback = desiredProvider === "openai" ? "google" : "openai";
    return {
      provider: safeFallback,
      isFallback: true,
      reason: `Fallback de segurança acionado devido à indisponibilidade de ${desiredProvider}.`,
    };
  }

  /**
   * Visão geral de métricas do sistema para o topo do Dashboard.
   */
  public static async getDashboardOverview(): Promise<DashboardOverview> {
    const cards = await this.getProviderCardsData();

    const totalTokensUsed = cards.reduce((acc, c) => acc + c.consumption.tokensUsedMonth, 0);
    const totalCostUsd = cards.reduce((acc, c) => acc + c.costs.estimatedCostUsd, 0);
    const totalCostBrl = cards.reduce((acc, c) => acc + c.costs.estimatedCostBrl, 0);

    const onlineCards = cards.filter((c) => c.status === "ONLINE");
    const activeProvidersCount = onlineCards.length;
    const totalProvidersCount = cards.length;

    const overallAvailability =
      cards.length > 0
        ? Number((cards.reduce((acc, c) => acc + c.health.availability, 0) / cards.length).toFixed(1))
        : 100.0;

    const allKeys = cards.flatMap((c) => c.keys);
    const activeKeysCount = allKeys.filter((k) => k.status === "ACTIVE").length;
    const totalKeysCount = allKeys.length;

    return {
      totalTokensUsed,
      totalCostUsd: Number(totalCostUsd.toFixed(2)),
      totalCostBrl: Number(totalCostBrl.toFixed(2)),
      overallAvailability,
      activeProvidersCount,
      totalProvidersCount,
      activeKeysCount,
      totalKeysCount,
    };
  }
}

