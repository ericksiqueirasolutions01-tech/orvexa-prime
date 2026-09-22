// src/lib/consumption.ts
// ============================================================================
// MOTOR DE CONTROLE DE CONSUMO & GESTÃO DE PLANOS — ORVEXA PRIME SAAS
// Gerencia quotas dos 5 vetores:
// 1. Quantidade de mensagens
// 2. Arquivos processados
// 3. Geração de imagens
// 4. Uso de agentes especialistas
// 5. Limite de armazenamento
// ============================================================================

import { prisma } from "./prisma";

export interface PlanConfig {
  name: string;
  slug: "free" | "pro" | "business" | "enterprise";
  priceCents: number;
  monthlyMessages: number;
  monthlyFiles: number;
  monthlyImages: number;
  monthlyTokens: number;
  allowedAgents: string[];
  storageQuotaBytes: number;
  features: string[];
  badge?: string;
}

export const PLANS_CONFIG: Record<string, PlanConfig> = {
  free: {
    name: "FREE",
    slug: "free",
    priceCents: 0,
    monthlyMessages: 100,
    monthlyFiles: 5,
    monthlyImages: 10,
    monthlyTokens: 100000,
    allowedAgents: ["orvexa-dev"],
    storageQuotaBytes: 104857600, // 100 MB
    features: [
      "100 mensagens mensais",
      "5 arquivos processados no workspace",
      "10 gerações de imagem",
      "Agente Especialista Dev (Básico)",
      "100 MB de armazenamento em nuvem",
      "Modelos rápidos de alta eficiência",
    ],
  },
  pro: {
    name: "PRO",
    slug: "pro",
    priceCents: 7990, // R$ 79,90
    monthlyMessages: 1500,
    monthlyFiles: 60,
    monthlyImages: 80,
    monthlyTokens: 1500000,
    allowedAgents: [
      "orvexa-dev",
      "orvexa-design",
      "orvexa-marketing",
      "orvexa-edu",
      "orvexa-business",
      "orvexa-analyst",
    ],
    storageQuotaBytes: 5368709120, // 5 GB
    badge: "MAIS ESCOLHIDO",
    features: [
      "1.500 mensagens mensais",
      "60 arquivos com chunking & RAG",
      "80 gerações de imagem HD",
      "Todos os 6 Agentes Oficiais",
      "5 GB de armazenamento seguro",
      "Modelos Top-Tier (Claude 3.5 Sonnet & GPT-4o)",
    ],
  },
  business: {
    name: "BUSINESS",
    slug: "business",
    priceCents: 24990, // R$ 249,90
    monthlyMessages: 6000,
    monthlyFiles: 300,
    monthlyImages: 300,
    monthlyTokens: 5000000,
    allowedAgents: ["ALL"],
    storageQuotaBytes: 26843545600, // 25 GB
    badge: "EMPRESAS",
    features: [
      "6.000 mensagens mensais",
      "300 arquivos corporativos",
      "300 imagens ultra HD",
      "Todos os Agentes + Agentes Customizados",
      "25 GB de armazenamento em nuvem",
      "Prioridade no AI Gateway Failover",
      "Até 5 membros da equipe",
    ],
  },
  enterprise: {
    name: "ENTERPRISE",
    slug: "enterprise",
    priceCents: 79990, // R$ 799,90
    monthlyMessages: 50000,
    monthlyFiles: 2000,
    monthlyImages: 1500,
    monthlyTokens: 20000000,
    allowedAgents: ["ALL"],
    storageQuotaBytes: 107374182400, // 100 GB
    badge: "CORPORATIVO VIP",
    features: [
      "Mensagens ilimitadas (50.000 quota base)",
      "2.000 arquivos processados",
      "1.500 gerações de imagem 4K",
      "Agentes dedicados com memória ilimitada",
      "100 GB de armazenamento corporativo",
      "Chaves de API dedicadas no Gateway",
      "SLA 99.9% e Relatórios LGPD/SOC2",
      "Gerente de conta exclusivo 24/7",
    ],
  },
};

export interface UsageMetric {
  used: number;
  limit: number;
  percentage: number;
  exceeded: boolean;
  warning: boolean;
}

export interface UserConsumptionSummary {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  status: string;
  plan: {
    id?: string;
    name: string;
    slug: string;
    priceCents: number;
    priceFormatted: string;
    features: string[];
    allowedAgents: string[];
  };
  subscription?: {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    gatewayProvider: string;
  } | null;
  cycle: {
    start: string;
    end: string;
    daysRemaining: number;
  };
  metrics: {
    messages: UsageMetric;
    files: UsageMetric;
    images: UsageMetric;
    agents: UsageMetric & { allowedSlugs: string[] };
    storage: UsageMetric & { usedFormatted: string; limitFormatted: string };
    tokens: UsageMetric;
  };
  hasExceededAny: boolean;
  hasWarningAny: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Obtém o resumo consolidado de consumo dos 5 vetores no ciclo mensal
 */
export async function getUserConsumption(userId: string): Promise<UserConsumptionSummary> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      plan: true,
      subscriptions: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!user) {
    throw new Error(`Usuário não encontrado: ${userId}`);
  }

  const activeSub = user.subscriptions[0] || null;

  // Determinar início e fim do ciclo
  let cycleStart = new Date();
  cycleStart.setDate(1);
  cycleStart.setHours(0, 0, 0, 0);

  let cycleEnd = new Date(cycleStart);
  cycleEnd.setMonth(cycleEnd.getMonth() + 1);

  if (activeSub?.currentPeriodStart && activeSub?.currentPeriodEnd) {
    cycleStart = new Date(activeSub.currentPeriodStart);
    cycleEnd = new Date(activeSub.currentPeriodEnd);
  }

  const now = new Date();
  const msRemaining = Math.max(0, cycleEnd.getTime() - now.getTime());
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

  // Quotas do plano (com fallback na config canônica)
  const planSlug = (user.plan?.slug || "free").toLowerCase() as keyof typeof PLANS_CONFIG;
  const planDefaults = PLANS_CONFIG[planSlug] || PLANS_CONFIG["free"];

  const planName = user.plan?.name || planDefaults.name;
  const priceCents = user.plan?.priceCents ?? planDefaults.priceCents;
  const monthlyMessagesLimit = user.plan?.monthlyMessages ?? planDefaults.monthlyMessages;
  const monthlyFilesLimit = user.plan?.monthlyFiles ?? planDefaults.monthlyFiles;
  const monthlyImagesLimit = user.plan?.monthlyImages ?? planDefaults.monthlyImages;
  const monthlyTokensLimit = user.plan?.monthlyTokens ?? planDefaults.monthlyTokens;
  const storageLimitBytes = user.plan?.storageQuotaBytes ?? planDefaults.storageQuotaBytes;

  let allowedAgents: string[] = planDefaults.allowedAgents;
  if (user.plan?.allowedAgents) {
    try {
      allowedAgents = JSON.parse(user.plan.allowedAgents);
    } catch {}
  }

  // Se ADMIN, limites infinitos
  const isAdmin = user.role === "ADMIN";

  // 1. Mensagens enviadas pelo usuário no ciclo
  const messagesUsed = await prisma.message.count({
    where: {
      conversation: { userId },
      role: "USER",
      createdAt: { gte: cycleStart },
    },
  });

  // 2. Arquivos processados no ciclo
  const filesUsed = await prisma.file.count({
    where: {
      userId,
      createdAt: { gte: cycleStart },
    },
  });

  // 3. Imagens geradas no ciclo
  const imagesUsed = await prisma.generatedImage.count({
    where: {
      userId,
      createdAt: { gte: cycleStart },
    },
  });

  // 4. Sessões de agentes especialistas no ciclo
  const agentsUsed = await prisma.conversation.count({
    where: {
      userId,
      agentId: { not: null },
      createdAt: { gte: cycleStart },
    },
  });

  // 5. Armazenamento total consumido (todos os arquivos ativos do usuário)
  const storageAgg = await prisma.file.aggregate({
    where: { userId },
    _sum: { fileSizeBytes: true },
  });
  const storageUsedBytes = storageAgg._sum.fileSizeBytes || 0;

  // Tokens consumidos no ciclo
  const tokensAgg = await prisma.usageLog.aggregate({
    where: {
      userId,
      createdAt: { gte: cycleStart },
    },
    _sum: { totalTokens: true },
  });
  const tokensUsed = tokensAgg._sum.totalTokens || 0;

  // Função auxiliar para métrica
  const buildMetric = (used: number, limit: number): UsageMetric => {
    if (isAdmin) {
      return {
        used,
        limit: Infinity,
        percentage: 0,
        exceeded: false,
        warning: false,
      };
    }
    const percentage = limit > 0 ? +Math.min(100, (used / limit) * 100).toFixed(1) : 100;
    return {
      used,
      limit,
      percentage,
      exceeded: used >= limit,
      warning: percentage >= 80 && used < limit,
    };
  };

  const messagesMetric = buildMetric(messagesUsed, monthlyMessagesLimit);
  const filesMetric = buildMetric(filesUsed, monthlyFilesLimit);
  const imagesMetric = buildMetric(imagesUsed, monthlyImagesLimit);
  const agentsMetric = {
    ...buildMetric(agentsUsed, monthlyMessagesLimit),
    allowedSlugs: allowedAgents,
  };
  const storageMetric = {
    ...buildMetric(storageUsedBytes, storageLimitBytes),
    usedFormatted: formatBytes(storageUsedBytes),
    limitFormatted: isAdmin ? "Ilimitado" : formatBytes(storageLimitBytes),
  };
  const tokensMetric = buildMetric(tokensUsed, monthlyTokensLimit);

  const hasExceededAny =
    messagesMetric.exceeded ||
    filesMetric.exceeded ||
    imagesMetric.exceeded ||
    storageMetric.exceeded;

  const hasWarningAny =
    messagesMetric.warning ||
    filesMetric.warning ||
    imagesMetric.warning ||
    storageMetric.warning;

  let features: string[] = planDefaults.features;
  if (user.plan?.features) {
    try {
      features = JSON.parse(user.plan.features);
    } catch {}
  }

  return {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    role: user.role,
    status: user.status,
    plan: {
      id: user.plan?.id,
      name: planName,
      slug: planSlug,
      priceCents,
      priceFormatted: `R$ ${(priceCents / 100).toFixed(2).replace(".", ",")}`,
      features,
      allowedAgents,
    },
    subscription: activeSub
      ? {
          id: activeSub.id,
          status: activeSub.status,
          currentPeriodStart: activeSub.currentPeriodStart.toISOString(),
          currentPeriodEnd: activeSub.currentPeriodEnd.toISOString(),
          gatewayProvider: activeSub.gatewayProvider,
        }
      : null,
    cycle: {
      start: cycleStart.toISOString(),
      end: cycleEnd.toISOString(),
      daysRemaining,
    },
    metrics: {
      messages: messagesMetric,
      files: filesMetric,
      images: imagesMetric,
      agents: agentsMetric,
      storage: storageMetric,
      tokens: tokensMetric,
    },
    hasExceededAny,
    hasWarningAny,
  };
}

// ============================================================================
// GUARDS DE CONSUMO COM ASSERTIVIDADE EM TEMPO REAL
// ============================================================================

/**
 * 1. Valida se o usuário pode enviar mensagens de chat
 */
export async function assertCanSendMessage(
  userId: string
): Promise<{ allowed: boolean; reason?: string; usage?: UsageMetric }> {
  const summary = await getUserConsumption(userId);
  if (summary.role === "ADMIN") return { allowed: true };

  if (summary.status !== "ACTIVE" && summary.status !== "PENDING_PAYMENT" && summary.plan.slug !== "free") {
    return {
      allowed: false,
      reason: `Sua conta está com status ${summary.status}. Regularize seu faturamento para continuar enviando mensagens.`,
    };
  }

  if (summary.metrics.messages.exceeded) {
    return {
      allowed: false,
      reason: `Você atingiu o limite de mensagens do seu plano ${summary.plan.name} (${summary.metrics.messages.used}/${summary.metrics.messages.limit} msgs no ciclo). Faça upgrade para continuar conversando.`,
      usage: summary.metrics.messages,
    };
  }

  return { allowed: true, usage: summary.metrics.messages };
}

/**
 * 2. Valida se o usuário pode fazer upload de um novo arquivo
 */
export async function assertCanUploadFile(
  userId: string,
  fileSizeBytes: number
): Promise<{ allowed: boolean; reason?: string }> {
  const summary = await getUserConsumption(userId);
  if (summary.role === "ADMIN") return { allowed: true };

  // Checa quantidade de arquivos
  if (summary.metrics.files.exceeded) {
    return {
      allowed: false,
      reason: `Você atingiu o limite de arquivos processados do plano ${summary.plan.name} (${summary.metrics.files.used}/${summary.metrics.files.limit} arquivos). Faça upgrade para enviar mais documentos.`,
    };
  }

  // Checa espaço de armazenamento com o novo arquivo
  const projectedBytes = summary.metrics.storage.used + fileSizeBytes;
  if (projectedBytes > summary.metrics.storage.limit) {
    return {
      allowed: false,
      reason: `Espaço insuficiente no plano ${summary.plan.name}. Este arquivo de ${formatBytes(fileSizeBytes)} excede seu limite de armazenamento de ${summary.metrics.storage.limitFormatted}.`,
    };
  }

  return { allowed: true };
}

/**
 * 3. Valida se o usuário pode gerar uma nova imagem no Image Studio
 */
export async function assertCanGenerateImage(
  userId: string
): Promise<{ allowed: boolean; reason?: string; usage?: UsageMetric }> {
  const summary = await getUserConsumption(userId);
  if (summary.role === "ADMIN") return { allowed: true };

  if (summary.metrics.images.exceeded) {
    return {
      allowed: false,
      reason: `Você atingiu o limite de imagens geradas no plano ${summary.plan.name} (${summary.metrics.images.used}/${summary.metrics.images.limit} imagens no ciclo). Faça upgrade para gerar mais criações visuais.`,
      usage: summary.metrics.images,
    };
  }

  return { allowed: true, usage: summary.metrics.images };
}

/**
 * 4. Valida se o usuário tem permissão para interagir com o agente especificado
 */
export async function assertCanUseAgent(
  userId: string,
  agentSlug: string
): Promise<{ allowed: boolean; reason?: string }> {
  const summary = await getUserConsumption(userId);
  if (summary.role === "ADMIN") return { allowed: true };

  const allowedSlugs = summary.plan.allowedAgents;
  const isAllowed =
    allowedSlugs.includes("ALL") ||
    allowedSlugs.some((s) => s.toLowerCase() === agentSlug.toLowerCase());

  if (!isAllowed) {
    return {
      allowed: false,
      reason: `O agente '${agentSlug}' não está disponível no plano ${summary.plan.name}. Faça upgrade para o plano PRO ou BUSINESS para desbloquear todos os especialistas.`,
    };
  }

  // Checa também limite de mensagens
  if (summary.metrics.messages.exceeded) {
    return {
      allowed: false,
      reason: `Limite de mensagens atingido no plano ${summary.plan.name}. Faça upgrade para continuar interagindo com os agentes.`,
    };
  }

  return { allowed: true };
}

/**
 * Obtém o histórico dos últimos meses de consumo do usuário
 */
export async function getUserConsumptionHistory(
  userId: string,
  monthsCount = 6
): Promise<Array<{ month: string; messages: number; files: number; images: number; tokens: number }>> {
  const history: Array<{ month: string; messages: number; files: number; images: number; tokens: number }> = [];

  for (let i = 0; i < monthsCount; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const monthLabel = start.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });

    const [messages, files, images, tokensAgg] = await Promise.all([
      prisma.message.count({
        where: {
          conversation: { userId },
          role: "USER",
          createdAt: { gte: start, lte: end },
        },
      }),
      prisma.file.count({
        where: {
          userId,
          createdAt: { gte: start, lte: end },
        },
      }),
      prisma.generatedImage.count({
        where: {
          userId,
          createdAt: { gte: start, lte: end },
        },
      }),
      prisma.usageLog.aggregate({
        where: {
          userId,
          createdAt: { gte: start, lte: end },
        },
        _sum: { totalTokens: true },
      }),
    ]);

    history.push({
      month: monthLabel,
      messages,
      files,
      images,
      tokens: tokensAgg._sum.totalTokens || 0,
    });
  }

  return history.reverse();
}

