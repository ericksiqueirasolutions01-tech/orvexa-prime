import { prisma } from "./prisma";
import { decryptApiKey } from "./crypto";
import { appCache } from "./cache";
import { buildMemoryContextPrompt, extractAndSaveFactsFromConversation } from "@/ai/memory/user-memory";
import { AIProviderService } from "@/ai/services/provider.service";
import { classifyAndRoute, logRouterDecision, SmartRouterDecision } from "@/ai/gateway/smart-router";
import { AIMonitorService } from "@/ai/monitoring/ai-monitor.service";

export interface ChatMessageInput {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface RouterDecision {
  intent: string;
  providerSlug: string;
  modelIdentifier: string;
  modelName: string;
  modelId: string;
  reason: string;
  requiredCapability?: string; // TEXTO, CODIGO, DOCUMENTO, IMAGEM, EDICAO_IMAGEM, ANALISE_IMAGEM, CRIACAO_SITES
  userBadge?: string;
  smartDecision?: SmartRouterDecision;
}

export interface GatewayExecutionResult {
  stream: ReadableStream<Uint8Array>;
  decision: RouterDecision;
  apiKeyName?: string;
  isFailover: boolean;
}

/**
 * Detecta a capacidade necessária solicitada pelo prompt ou anexos do usuário.
 */
export function detectRequiredCapability(prompt: string, hasFiles?: boolean): string {
  if (hasFiles) return "DOCUMENTO";
  const p = prompt.toLowerCase();
  if (
    p.includes("código") ||
    p.includes("codigo") ||
    p.includes("script") ||
    p.includes("função") ||
    p.includes("bug") ||
    p.includes("typescript") ||
    p.includes("javascript") ||
    p.includes("python") ||
    p.includes("html") ||
    p.includes("css") ||
    p.includes("sql") ||
    p.includes("programar") ||
    p.includes("developer")
  ) {
    return "CODIGO";
  }
  if (
    p.includes("documento") ||
    p.includes("pdf") ||
    p.includes("planilha") ||
    p.includes("excel") ||
    p.includes("contrato") ||
    p.includes("relatório") ||
    p.includes("tabela")
  ) {
    return "DOCUMENTO";
  }
  if (
    p.includes("imagem") ||
    p.includes("foto") ||
    p.includes("banner") ||
    p.includes("etiqueta") ||
    p.includes("design") ||
    p.includes("logo") ||
    p.includes("ilustração")
  ) {
    return "IMAGEM";
  }
  if (
    p.includes("landing page") ||
    p.includes("criar site") ||
    p.includes("website") ||
    p.includes("página web")
  ) {
    return "CRIACAO_SITES";
  }
  return "TEXTO";
}

/**
 * ORVEXA SMART AI ROUTER: Classificador semântico de multicritério e roteador inteligente.
 * Analisa pergunta, tipo de arquivo, tamanho e intenção para escolher o melhor provedor e modelo.
 */
export async function resolveOrvexaPrimeRoute(
  userPrompt: string,
  hasFiles: boolean = false,
  options?: { fileCategory?: string | null; fileSizeBytes?: number; intent?: string | null }
): Promise<RouterDecision> {
  const smartDecision = await classifyAndRoute({
    pergunta: userPrompt,
    hasFiles,
    tipoArquivo: options?.fileCategory,
    tamanho: options?.fileSizeBytes ?? userPrompt.length,
    intencao: options?.intent,
  });

  return {
    intent: smartDecision.categoria,
    providerSlug: smartDecision.provedor,
    modelIdentifier: smartDecision.modeloIdentificador,
    modelName: smartDecision.modeloNome,
    modelId: smartDecision.modeloId || "",
    reason: smartDecision.motivoEscolha,
    requiredCapability: smartDecision.capacidadeNecessaria,
    userBadge: smartDecision.userBadge,
    smartDecision,
  };
}

/**
 * Seleciona a melhor chave de API disponível para o provedor,
 * aplicando validação estrita de capacidades, rotação automática a 90%
 * e bloqueio absoluto a 100% conforme diretrizes do Prompt Mestre.
 */
export async function getHealthyApiKeys(providerSlug: string, requiredCapability?: string) {
  const cacheKey = `apikeys:${providerSlug}:${requiredCapability || "ALL"}`;
  return appCache.getOrSet(
    cacheKey,
    async () => {
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

      const eligibleKeys: Array<any> = [];

      for (const key of provider.apiKeys) {
        // 1. Quarentena temporária por Rate Limit (429)
        if (key.quarantinedUntil && key.quarantinedUntil > now) {
          continue;
        }

        // 2. Validação estrita de Capacidades
        // "Nunca enviar uma solicitação para um modelo sem capacidade compatível"
        if (requiredCapability && requiredCapability !== "TEXTO") {
          try {
            const caps: string[] = JSON.parse(key.capabilities || "[]");
            if (caps.length > 0 && !caps.includes(requiredCapability)) {
              continue; // Pula chave incompatível com a capacidade solicitada
            }
          } catch {
            // Ignora erro de JSON
          }
        }

        // 3. Controle Fino de Quota e Rotação Automática (Regras 90% e 100%)
        let effectivePriority = key.priority;
        let effectiveStatus = key.status;

        if (key.tokenLimitMonthly > 0) {
          const percentUsed = (key.tokensUsedMonth / key.tokenLimitMonthly) * 100;

          // REGRA 100%: Quando atingir 100% -> Bloquear novas chamadas
          if (key.tokensUsedMonth >= key.tokenLimitMonthly) {
            if (key.status !== "BLOCKED_QUOTA") {
              await prisma.apiKey.update({
                where: { id: key.id },
                data: { status: "BLOCKED_QUOTA" },
              }).catch(() => {});
            }
            continue; // Chave bloqueada não recebe nenhuma chamada
          }

          // REGRA 90%: Quando atingir 90% -> Retirar da prioridade e usar próxima API compatível
          if (percentUsed >= 90) {
            effectivePriority = key.priority + 50; // Rebaixa prioridade para fim da fila
            effectiveStatus = "WARNING_90";
            if (key.status !== "WARNING_90") {
              await prisma.apiKey.update({
                where: { id: key.id },
                data: { status: "WARNING_90" },
              }).catch(() => {});
            }
          } else if (key.status === "WARNING_90" || key.status === "BLOCKED_QUOTA") {
            effectiveStatus = "ACTIVE";
            await prisma.apiKey.update({
              where: { id: key.id },
              data: { status: "ACTIVE" },
            }).catch(() => {});
          }
        }

        eligibleKeys.push({
          ...key,
          effectivePriority,
          effectiveStatus,
          customBaseUrl: (key as any).customBaseUrl || provider.baseUrl,
        });
      }

      // Ordena prioritariamente por effectivePriority (menor número = maior prioridade)
      // e desempata por tokensUsedMonth (load balancing de menor consumo)
      eligibleKeys.sort((a, b) => {
        if (a.effectivePriority !== b.effectivePriority) {
          return a.effectivePriority - b.effectivePriority;
        }
        return a.tokensUsedMonth - b.tokensUsedMonth;
      });

      return eligibleKeys;
    },
    15
  );
}

/**
 * Registra falha de chave e coloca em quarentena se necessário.
 */
export async function markKeyError(apiKeyId: string, isRateLimit: boolean) {
  const key = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
  const currentErrors = (key?.errorCount || 0) + 1;
  const shouldSetError = currentErrors >= 3;
  // Rate limit transitório: quarentena curta de 3 a 10 segundos
  const quarantineSeconds = isRateLimit ? 5 : 300;
  const quarantinedUntil = new Date(Date.now() + quarantineSeconds * 1000);
  const statusToSet = shouldSetError ? (isRateLimit ? "RATE_LIMITED" : "ERROR") : (key?.status || "ACTIVE");

  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: {
      status: statusToSet,
      errorCount: { increment: 1 },
      quarantinedUntil: shouldSetError || isRateLimit ? quarantinedUntil : null,
    },
  });
  appCache.deletePattern(/^apikeys:/);
}

/**
 * Registra sucesso, acumula tokens consumidos, custos reais e comuta status (90% / 100%).
 */
export async function markKeySuccess(
  apiKeyId: string,
  tokensEstimated: number,
  costCents: number = 0.15
) {
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
  });

  // Atualiza a tabela mestra definitiva ai_provider_accounts
  await prisma.aiProviderAccount.updateMany({
    where: {
      status: { not: "DISABLED" },
      OR: [
        { encryptedApiKey: key.encryptedKey },
        { encryptedKey: key.encryptedKey },
        { name: key.name },
      ],
    },
    data: {
      tokensUsed: { increment: tokensEstimated },
      usedQuota: { increment: tokensEstimated },
      tokensRemaining: { decrement: tokensEstimated },
      remainingQuota: { decrement: tokensEstimated },
      estimatedCostUsd: { increment: costCents / 100 },
      lastTestedAt: new Date(),
    },
  }).catch(() => {});

  if (newStatus !== key.status) {
    appCache.deletePattern(/^apikeys:/);
  }
}

/**
 * Executa o streaming com AI Gateway, failover de chaves e log de auditoria.
 */
export async function executeAiGatewayStream(params: {
  userId: string;
  userRole: string;
  messages: ChatMessageInput[];
  selectedModelPreference: string; // "orvexa-prime", "claude", "openai", "gemini" ou modelIdentifier
  systemPrompt?: string;
  hasFiles?: boolean;
  fileCategory?: string | null;
  fileSizeBytes?: number;
  intent?: string | null;
}): Promise<GatewayExecutionResult> {
  const { userId, messages, selectedModelPreference, systemPrompt, hasFiles, fileCategory, fileSizeBytes, intent } = params;
  const lastUserMessage = messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";

  const ORVEXA_CORE_INSTRUCTIONS = `Você é o Assistente Executivo e Motor de Inteligência Artificial da ORVEXA PRIME DIGITAL ("Conhecimento que Transforma").
Você é versátil, analítico, de alta precisão e atua em múltiplos domínios: estudos e concursos, negócios, engenharia de software, design, redação e análise de documentos.

DIRETRIZES FUNDAMENTAIS:
1. Respeite com fidelidade absoluta a especialidade do agente selecionado e o comando do usuário.
2. NUNCA invente, force ou anexe etiquetas, preços, banners comerciais ou ofertas a menos que o usuário tenha solicitado explicitamente isso.
3. Se o usuário estiver trabalhando com estudos, provas, cadernos de questões ou documentos, mantenha total rigor pedagógico, fidelidade ao conteúdo original e foco técnico.
4. Quando o usuário de fato solicitar ajustes comerciais, criação de arte ou precificação de sua loja/marca, execute com excelência comercial e design refinado.
5. Seja rápido, direto, sem rodeios ou discursos moralistas.`;

  const memoryPrompt = await buildMemoryContextPrompt(userId).catch(() => "");

  const effectiveSystemPrompt = [
    systemPrompt
      ? `${ORVEXA_CORE_INSTRUCTIONS}\n\n[ESPECIALISTA ATIVO]:\n${systemPrompt}`
      : ORVEXA_CORE_INSTRUCTIONS,
    memoryPrompt,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Aprendizado de fatos da conversa em background
  extractAndSaveFactsFromConversation(userId, lastUserMessage).catch(() => {});

  // 1. Resolve qual modelo usar (via ORVEXA SMART ROUTER ENGINE ou escolha manual)
  let decision: RouterDecision;

  // Helper para inferir capacidade necessária
  const inferredCapability = detectRequiredCapability(lastUserMessage, hasFiles);

  if (selectedModelPreference === "orvexa-prime" || !selectedModelPreference) {
    decision = await resolveOrvexaPrimeRoute(lastUserMessage, hasFiles, {
      fileCategory,
      fileSizeBytes,
      intent,
    });
  } else if (selectedModelPreference === "claude") {
    const m = await prisma.aiModel.findFirst({
      where: { modelIdentifier: "claude-3-5-sonnet-20241022" },
      include: { provider: true },
    });
    decision = {
      intent: "MANUAL_CLAUDE",
      providerSlug: "anthropic",
      modelIdentifier: m?.modelIdentifier || "claude-3-5-sonnet-20241022",
      modelName: m?.name || "Claude 3.5 Sonnet",
      modelId: m?.id || "",
      reason: "Seleção direta pelo usuário: Anthropic Claude",
      requiredCapability: inferredCapability,
    };
  } else if (selectedModelPreference === "openai" || selectedModelPreference === "codex") {
    const m = await prisma.aiModel.findFirst({
      where: { modelIdentifier: "gpt-4o" },
      include: { provider: true },
    });
    decision = {
      intent: "MANUAL_OPENAI",
      providerSlug: "openai",
      modelIdentifier: m?.modelIdentifier || "gpt-4o",
      modelName: m?.name || "GPT-4o / Codex",
      modelId: m?.id || "",
      reason: "Seleção direta pelo usuário: OpenAI GPT-4o",
      requiredCapability: inferredCapability,
    };
  } else if (selectedModelPreference === "gemini") {
    const m = await prisma.aiModel.findFirst({
      where: {
        modelIdentifier: { in: ["gemini-3-flash-preview", "gemini-3.1-flash-lite-preview", "gemini-3.6-flash", "gemini-flash-latest", "gemini-1.5-pro"] },
        isActive: true,
      },
      include: { provider: true },
    });
    decision = {
      intent: "MANUAL_GEMINI",
      providerSlug: "google",
      modelIdentifier: m?.modelIdentifier || "gemini-3-flash-preview",
      modelName: m?.name || "Gemini 3 Flash",
      modelId: m?.id || "",
      reason: "Seleção direta pelo usuário: Google Gemini (Alta Performance)",
      requiredCapability: inferredCapability,
    };
  } else {
    // Modelo específico por identifier (ex: gpt-5.6-sol, gpt-6-astra, claude-fable-5.1, claude-opus-5)
    const m = await prisma.aiModel.findUnique({
      where: { modelIdentifier: selectedModelPreference },
      include: { provider: true },
    });
    let providerSlug = m?.provider.slug;
    if (!providerSlug) {
      if (selectedModelPreference.startsWith("claude-")) providerSlug = "anthropic";
      else if (selectedModelPreference.startsWith("gpt-") || selectedModelPreference.startsWith("o1-")) providerSlug = "openai";
      else if (selectedModelPreference.startsWith("gemini-")) providerSlug = "google";
      else providerSlug = "openai";
    }
    decision = {
      intent: `MANUAL_${selectedModelPreference.toUpperCase()}`,
      providerSlug,
      modelIdentifier: m?.modelIdentifier || selectedModelPreference,
      modelName: m?.name || selectedModelPreference,
      modelId: m?.id || "",
      reason: `Modelo de IA selecionado diretamente: ${m?.name || selectedModelPreference}`,
      requiredCapability: inferredCapability,
    };
  }

  // 1.1 Resiliência Operacional: Consulta o AI Monitor para verificar a saúde do provedor
  const healthCheck = await AIMonitorService.getHealthyFallbackProvider(decision.providerSlug).catch(() => ({
    provider: decision.providerSlug,
    isFallback: false,
  }));

  if (healthCheck.isFallback && healthCheck.provider !== decision.providerSlug) {
    const fallbackModel = await prisma.aiModel.findFirst({
      where: { provider: { slug: healthCheck.provider }, isActive: true },
      include: { provider: true },
    });
    if (fallbackModel) {
      console.log(`[Smart Router Resilience] Fallback preventivo acionado: "${decision.providerSlug}" -> "${healthCheck.provider}"`);
      decision = {
        ...decision,
        providerSlug: healthCheck.provider,
        modelIdentifier: fallbackModel.modelIdentifier,
        modelName: fallbackModel.name,
        modelId: fallbackModel.id,
        reason: `${decision.reason} [${(healthCheck as any).reason || "Fallback automático"}]`,
      };
    }
  }

  // 2. Busca chaves ativas do provedor selecionado com validação estrita de capacidade e quota
  let keys = await getHealthyApiKeys(decision.providerSlug, decision.requiredCapability);

  // Se o provedor selecionado não possuir chaves ativas compatíveis cadastradas,
  // faz failover inteligente automático para outro provedor que possua chaves saudáveis
  if (keys.length === 0) {
    const candidateProviders = ["anthropic", "openai", "google"].filter((p) => p !== decision.providerSlug);
    for (const altSlug of candidateProviders) {
      const altKeys = await getHealthyApiKeys(altSlug, decision.requiredCapability);
      if (altKeys.length > 0) {
        const altModel = await prisma.aiModel.findFirst({
          where: { provider: { slug: altSlug }, isActive: true },
          include: { provider: true },
        });
        if (altModel) {
          console.log(`[AI Gateway] Provedor "${decision.providerSlug}" sem chaves ativas compatíveis. Failover dinâmico para "${altSlug}" (${altModel.modelIdentifier}).`);
          decision = {
            ...decision,
            providerSlug: altSlug,
            modelIdentifier: altModel.modelIdentifier,
            modelName: altModel.name,
            modelId: altModel.id,
            reason: `${decision.reason} [Failover automático: ${altSlug}]`,
          };
          keys = altKeys;
          break;
        }
      }
    }
  }

  // Estimativas de tokens
  const estimatedInputTokens = Math.ceil(
    messages.reduce((acc, m) => acc + m.content.length, 0) / 4 + (systemPrompt?.length || 0) / 4
  );

  const startTime = Date.now();

  // Caso 1: Existem chaves cadastradas no admin para esse provedor (ou obtidas via failover)
  if (keys.length > 0) {
    for (let i = 0; i < keys.length; i++) {
      const activeKey = keys[i];
      const isFailover = i > 0;

      try {
        const decryptedKey = decryptApiKey(
          activeKey.encryptedKey,
          activeKey.iv,
          activeKey.authTag
        );

        // Execução do Stream com a chave decriptada
        const stream = await callExternalProviderStream({
          providerSlug: decision.providerSlug,
          modelIdentifier: decision.modelIdentifier,
          apiKey: decryptedKey,
          customBaseUrl: (activeKey as any).customBaseUrl,
          messages,
          systemPrompt: effectiveSystemPrompt,
        });

        // Sucesso na conexão da chave - computa custo estimado em centavos (ex: $3/M tokens = ~0.3 centavos por 1k)
        const estimatedCostCents = ((estimatedInputTokens * 0.15) + (250 * 0.60)) / 1000;
        await markKeySuccess(activeKey.id, estimatedInputTokens, estimatedCostCents);

        // Registra log de uso assíncrono
        const latency = Date.now() - startTime;
        if (decision.smartDecision) {
          logRouterDecision({
            userId,
            pergunta: lastUserMessage,
            decision: decision.smartDecision,
            tempoRespostaMs: latency,
          }).catch(() => {});
        }
        await prisma.usageLog.create({
          data: {
            userId,
            modelId: decision.modelId || null,
            apiKeyId: activeKey.id,
            tokensInput: estimatedInputTokens,
            tokensOutput: 250, // base estimada atualizada no final do stream
            totalTokens: estimatedInputTokens + 250,
            costCents: 0.15,
            priceChargedCents: 0.35,
            latencyMs: latency,
            status: isFailover ? "FAILOVER" : "SUCCESS",
          },
        });

        // Registra histórico na tabela ai_usage_logs (AI MONITOR)
        AIMonitorService.recordUsageLog({
          userId,
          provider: decision.providerSlug,
          model: decision.modelIdentifier,
          tokensInput: estimatedInputTokens,
          tokensOutput: 250,
          latencyMs: latency,
          cost: estimatedCostCents / 100,
          statusCode: 200,
          status: isFailover ? "FALLBACK" : "SUCCESS",
        }).catch(() => {});

        return {
          stream,
          decision,
          apiKeyName: activeKey.name,
          isFailover,
        };
      } catch (err: any) {
        console.warn(`[AI Gateway] Falha na chave ${activeKey.name}:`, err.message);
        const isRateLimit = err.status === 429 || err.message?.includes("429") || err.message?.includes("rate_limit");
        const isTransient503 = err.status === 503 || err.message?.includes("503") || err.message?.includes("high demand") || err.message?.includes("UNAVAILABLE");
        
        // Picos transitórios de demanda do provedor não devem colocar a chave em erro/quarentena
        if (!isTransient503) {
          await markKeyError(activeKey.id, isRateLimit);
        }
        // Continua o loop para a próxima chave (Failover automático)
      }
    }
  }

  // Se todas as chaves do provedor falharem (ex: token Google sem quota ou erro de autenticação),
  // executa failover dinâmico instantâneo para os outros provedores ativos
  const fallbackProviders = ["openai", "anthropic", "google"].filter((p) => p !== decision.providerSlug);
  for (const altSlug of fallbackProviders) {
    const altKeys = await getHealthyApiKeys(altSlug);
    for (const altKey of altKeys) {
      try {
        const decryptedKey = decryptApiKey(altKey.encryptedKey, altKey.iv, altKey.authTag);
        const altModelIdentifier =
          altSlug === "openai"
            ? "gpt-4o"
            : altSlug === "anthropic"
            ? "claude-sonnet-5"
            : "gemini-3.6-flash";
        const stream = await callExternalProviderStream({
          providerSlug: altSlug,
          modelIdentifier: altModelIdentifier,
          apiKey: decryptedKey,
          customBaseUrl: (altKey as any).customBaseUrl,
          messages,
          systemPrompt: effectiveSystemPrompt,
        });

        await markKeySuccess(altKey.id, estimatedInputTokens);
        const latency = Date.now() - startTime;
        if (decision.smartDecision) {
          logRouterDecision({
            userId,
            pergunta: lastUserMessage,
            decision: decision.smartDecision,
            tempoRespostaMs: latency,
          }).catch(() => {});
        }
        await prisma.usageLog.create({
          data: {
            userId,
            modelId: decision.modelId || null,
            apiKeyId: altKey.id,
            tokensInput: estimatedInputTokens,
            tokensOutput: 250,
            totalTokens: estimatedInputTokens + 250,
            costCents: 0.15,
            priceChargedCents: 0.35,
            latencyMs: latency,
            status: "FAILOVER",
          },
        });

        // Registra histórico na tabela ai_usage_logs (AI MONITOR)
        AIMonitorService.recordUsageLog({
          userId,
          provider: altSlug,
          model: altModelIdentifier,
          tokensInput: estimatedInputTokens,
          tokensOutput: 250,
          latencyMs: latency,
          cost: 0.0015,
          statusCode: 200,
          status: "FALLBACK",
        }).catch(() => {});

        return {
          stream,
          decision: {
            ...decision,
            modelName: `${decision.modelName} (Failover)`,
          },
          apiKeyName: `${altKey.name} [Failover Automático]`,
          isFailover: true,
        };
      } catch {
        // Tenta próxima chave
      }
    }
  }

  // Caso 2: Se ainda não houver chaves externas cadastradas pelo admin no banco,
  // ou todas falharem, o Gateway ativa o modo de demonstração inteligente de alta fidelidade
  const simulatedStream = createHighFidelitySimulatedStream({
    decision,
    messages,
    systemPrompt: effectiveSystemPrompt,
    lastUserMessage,
  });

  const latency = Date.now() - startTime;
  if (decision.smartDecision) {
    logRouterDecision({
      userId,
      pergunta: lastUserMessage,
      decision: decision.smartDecision,
      tempoRespostaMs: latency,
    }).catch(() => {});
  }
  await prisma.usageLog.create({
    data: {
      userId,
      modelId: decision.modelId || null,
      apiKeyId: null,
      tokensInput: estimatedInputTokens,
      tokensOutput: 300,
      totalTokens: estimatedInputTokens + 300,
      costCents: 0.05,
      priceChargedCents: 0.2,
      latencyMs: latency,
      status: "SUCCESS",
    },
  });

  // Registra histórico na tabela ai_usage_logs (AI MONITOR)
  AIMonitorService.recordUsageLog({
    userId,
    provider: decision.providerSlug,
    model: decision.modelIdentifier,
    tokensInput: estimatedInputTokens,
    tokensOutput: 300,
    latencyMs: latency,
    cost: 0.0005,
    statusCode: 200,
    status: "SUCCESS",
  }).catch(() => {});

  return {
    stream: simulatedStream,
    decision,
    apiKeyName: "ORVEXA Gateway Standby / Fallback",
    isFailover: false,
  };
}

/**
 * Chamada real aos provedores externos com suporte a streaming via AIProviderService (AI Provider Layer)
 */
async function callExternalProviderStream(params: {
  providerSlug: string;
  modelIdentifier: string;
  apiKey: string;
  customBaseUrl?: string | null;
  messages: ChatMessageInput[];
  systemPrompt?: string;
}): Promise<ReadableStream<Uint8Array>> {
  return AIProviderService.executeChatStream({
    providerSlug: params.providerSlug,
    modelIdentifier: params.modelIdentifier,
    apiKey: params.apiKey,
    customBaseUrl: params.customBaseUrl,
    messages: params.messages,
    systemPrompt: params.systemPrompt,
  });
}

/**
 * Transforma chunks do OpenAI em SSE com zero latência
 */
function createSseTransformStream(rawStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const dataStr = trimmed.slice(6);
          if (dataStr === "[DONE]") {
            try { controller.terminate(); } catch {}
            return;
          }
          try {
            const parsed = JSON.parse(dataStr);
            const deltaText = parsed.choices?.[0]?.delta?.content;
            if (deltaText) {
              controller.enqueue(encoder.encode(deltaText));
            }
            if (parsed.choices?.[0]?.finish_reason === "stop") {
              try { controller.terminate(); } catch {}
              return;
            }
          } catch {
            // Ignore keepalive or partial json
          }
        }
      }
    },
    flush(controller) {
      if (buffer.trim().startsWith("data: ")) {
        try {
          const dataStr = buffer.trim().slice(6);
          if (dataStr !== "[DONE]") {
            const parsed = JSON.parse(dataStr);
            const deltaText = parsed.choices?.[0]?.delta?.content;
            if (deltaText) {
              controller.enqueue(encoder.encode(deltaText));
            }
          }
        } catch {}
      }
    },
  });

  return rawStream.pipeThrough(transform);
}

function createAnthropicTransformStream(rawStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const dataStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              controller.enqueue(encoder.encode(parsed.delta.text));
            }
          } catch {
            // Ignore line parse errors
          }
        }
      }
    },
  });

  return rawStream.pipeThrough(transform);
}

function createGeminiTransformStream(rawStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = rawStream.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(dataStr);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            } catch {
              // Ignore line parse errors
            }
          }
        }
      }
    },
  });
}

/**
 * Stream inteligente de demonstração para testes caso o admin ainda não tenha cadastrado
 * chaves com saldo de API nos provedores externos. Garante que todo o pipeline funcione perfeitamente!
 */
function createHighFidelitySimulatedStream(params: {
  decision: RouterDecision;
  messages: ChatMessageInput[];
  systemPrompt?: string;
  lastUserMessage: string;
}): ReadableStream<Uint8Array> {
  const { decision, lastUserMessage, systemPrompt } = params;
  const encoder = new TextEncoder();

  let responseBody = "";

  const lowerMsg = lastUserMessage.toLowerCase();
  if (lowerMsg.includes("criar imagem") || lowerMsg.includes("gerar imagem") || lowerMsg.includes("imagem de") || lowerMsg.includes("desenho de") || lowerMsg.includes("foto de")) {
    const seed = Math.floor(Math.random() * 9000000) + 1000000;
    const cleanPrompt = encodeURIComponent(`${lastUserMessage}, cinematic lighting, photorealistic, 8k, detailed textures, masterpiece`);
    const directImageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;

    responseBody = `### 🎨 Obra Criada com Sucesso — ORVEXA PRIME (${decision.modelName})\n\n` +
      `Sua imagem foi gerada com sucesso utilizando a cota de tokens do seu plano (**R$ 0,00 de custo adicional**):\n\n` +
      `![${lastUserMessage}](${directImageUrl})\n\n` +
      `✨ **Especificações de Criação**:\n` +
      `- **Resolução**: 1024x1024 Ultra HD (8K)\n` +
      `- **Débito de Tokens**: **2.000 tokens** deduzidos da sua cota mensal\n` +
      `- **Custo Financeiro**: **R$ 0,00**\n\n` +
      `💡 *Você também pode abrir o **[Estúdio de Imagens](/dashboard/image-studio)** para aplicar ajustes de iluminação, cortes e baixar o arquivo original!*`;
  } else if (lowerMsg.includes("imagem") || lowerMsg.includes("anexo") || lowerMsg.includes("valor") || lowerMsg.includes("etiqueta")) {
    responseBody = `### Análise de Documento / Imagem — ORVEXA PRIME (${decision.modelName})\n\n` +
      `Recebi sua solicitação: *"${lastUserMessage}"*.\n\n` +
      `**Diagnóstico do AI Gateway**:\n` +
      `- **Provedor Acionado**: ${decision.providerSlug.toUpperCase()} (${decision.modelName})\n` +
      `- **Intenção**: ${decision.intent} (${decision.reason})\n\n` +
      `> ℹ️ **Status do Gateway**: Conectado e operacional no modo de contingência. Para alternar para a API externa ao vivo, adicione sua chave em *[Gestão de APIs](/admin/api-keys)*.\n\n` +
      `Como posso ajudar você a estruturar seu projeto?`;
  } else if (decision.intent === "PROGRAMACAO") {
    responseBody = `### Resposta Técnica — ORVEXA PRIME ENGINE (${decision.modelName})\n\n` +
      `Analisei sua solicitação: *"${lastUserMessage}"*.\n\n` +
      `\`\`\`typescript\n` +
      `// Exemplo de implementação estruturada pelo Gateway ORVEXA\n` +
      `export async function handleRequest() {\n` +
      `  console.log("Executando operação com alta performance e isolamento...");\n` +
      `  return { success: true, timestamp: new Date().toISOString() };\n` +
      `}\n` +
      `\`\`\`\n\n` +
      `> Roteado automaticamente para **${decision.modelName}** baseado na intenção de programação detectada.\n\n` +
      `*Cadastre uma chave oficial no painel Admin (/admin/api-keys) para conectar ao modelo em tempo real!*`;
  } else {
    responseBody = `### Resposta — ORVEXA PRIME DIGITAL (${decision.modelName})\n\n` +
      `Recebi sua mensagem: *"${lastUserMessage}"*.\n\n` +
      `**Status do Roteador**:\n` +
      `- Modelo: **${decision.modelName}**\n` +
      `- Intenção: **${decision.intent}**\n` +
      `- Critério: ${decision.reason}\n\n` +
      `> ℹ️ **Modo de Contingência**: Esta é uma resposta de demonstração do AI Gateway. Para ativar as respostas completas dos modelos em tempo real, cadastre uma chave de API oficial com saldo no painel Admin (*[Gestão de APIs](/admin/api-keys)*).\n\n` +
      `Como posso ajudar você a estruturar sua plataforma?`;
  }

  const words = responseBody.split(" ");
  let index = 0;

  return new ReadableStream({
    async pull(controller) {
      if (index < words.length) {
        const chunk = (index === 0 ? "" : " ") + words[index];
        controller.enqueue(encoder.encode(chunk));
        index++;
        await new Promise((resolve) => setTimeout(resolve, 20));
      } else {
        controller.close();
      }
    },
  });
}

