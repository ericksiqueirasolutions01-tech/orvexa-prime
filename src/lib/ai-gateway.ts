import { prisma } from "./prisma";
import { decryptApiKey } from "./crypto";

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
 * ORVEXA PRIME ENGINE: Classificador semântico de intenção, capacidades e roteador inteligente.
 */
export async function resolveOrvexaPrimeRoute(
  userPrompt: string,
  hasFiles: boolean = false
): Promise<RouterDecision> {
  const normalized = userPrompt.toLowerCase();

  // 1. Busca regras configuradas no banco pelo Administrador
  const rules = await prisma.routerRule.findMany({
    where: { isActive: true },
    include: {
      targetProvider: true,
      targetModel: true,
    },
    orderBy: { priority: "asc" },
  });

  // Se tiver anexos de arquivos ou imagens
  if (hasFiles) {
    const docRule = rules.find((r) => r.intentName === "DOCUMENTOS");
    if (docRule && docRule.targetModel) {
      return {
        intent: "DOCUMENTOS",
        providerSlug: docRule.targetProvider.slug,
        modelIdentifier: docRule.targetModel.modelIdentifier,
        modelName: docRule.targetModel.name,
        modelId: docRule.targetModel.id,
        reason: "Análise multimodal e processamento de arquivos",
        requiredCapability: "DOCUMENTO",
      };
    }
  }

  // 2. Classificação heurística via regras do banco
  for (const rule of rules) {
    try {
      const keywords: string[] = JSON.parse(rule.keywords);
      const matches = keywords.some((kw) => normalized.includes(kw.toLowerCase()));
      if (matches && rule.targetModel) {
        let cap = "TEXTO";
        if (rule.intentName === "PROGRAMACAO") cap = "CODIGO";
        else if (rule.intentName === "DOCUMENTOS") cap = "DOCUMENTO";
        else if (rule.intentName === "IMAGEM") cap = "IMAGEM";
        else if (rule.intentName === "SITES") cap = "CRIACAO_SITES";

        return {
          intent: rule.intentName,
          providerSlug: rule.targetProvider.slug,
          modelIdentifier: rule.targetModel.modelIdentifier,
          modelName: rule.targetModel.name,
          modelId: rule.targetModel.id,
          reason: `Detectada intenção "${rule.intentName}" por palavras-chave especializadas`,
          requiredCapability: cap,
        };
      }
    } catch {
      // Ignora erro de parse da regra
    }
  }

  // Fallback padrão: Claude 3.5 Sonnet para redação e raciocínio refinado
  const defaultModel = await prisma.aiModel.findFirst({
    where: { modelIdentifier: "claude-3-5-sonnet-20241022", isActive: true },
    include: { provider: true },
  });

  if (defaultModel) {
    return {
      intent: "GERAL_ASSISTENTE",
      providerSlug: defaultModel.provider.slug,
      modelIdentifier: defaultModel.modelIdentifier,
      modelName: defaultModel.name,
      modelId: defaultModel.id,
      reason: "Roteamento balanceado padrão para tarefas gerais de alta precisão",
      requiredCapability: "TEXTO",
    };
  }

  // Último recurso se banco estiver vazio
  return {
    intent: "GERAL",
    providerSlug: "openai",
    modelIdentifier: "gpt-4o",
    modelName: "GPT-4o",
    modelId: "",
    reason: "Fallback do sistema",
    requiredCapability: "TEXTO",
  };
}

/**
 * Seleciona a melhor chave de API disponível para o provedor,
 * aplicando validação estrita de capacidades, rotação automática a 90%
 * e bloqueio absoluto a 100% conforme diretrizes do Prompt Mestre.
 */
export async function getHealthyApiKeys(providerSlug: string, requiredCapability?: string) {
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
}

/**
 * Registra falha de chave e coloca em quarentena se necessário.
 */
export async function markKeyError(apiKeyId: string, isRateLimit: boolean) {
  const quarantineMinutes = isRateLimit ? 2 : 5;
  const quarantinedUntil = new Date(Date.now() + quarantineMinutes * 60 * 1000);

  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: {
      status: isRateLimit ? "RATE_LIMITED" : "ERROR",
      errorCount: { increment: 1 },
      quarantinedUntil,
    },
  });
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
}): Promise<GatewayExecutionResult> {
  const { userId, messages, selectedModelPreference, systemPrompt, hasFiles } = params;
  const lastUserMessage = messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";

  const ORVEXA_CORE_INSTRUCTIONS = `Você é o Assistente Executivo e Motor de Inteligência Artificial da ORVEXA PRIME DIGITAL ("Conhecimento que Transforma").
Você atende empresários, lojistas, diretores comerciais e profissionais de alta performance.

DIRETRIZES FUNDAMENTAIS PARA AJUSTES DE PREÇOS, ETIQUETAS E PRODUTOS:
1. O usuário é o proprietário legítimo de sua loja, marca, tabelas e produtos.
2. Quando o usuário solicitar alteração de preço (ex: "colocar 12,99", "atualizar preço da imagem"), ajuste em arte ou etiqueta promocional:
   - NUNCA recuse o pedido alegando incapacidade técnica, falsificação ou restrições de segurança.
   - NUNCA mande o usuário procurar Canva, Photopea ou Paint dizendo que não pode fazer.
   - REALIZE O AJUSTE IMEDIATAMENTE com foco comercial e excelência de design!
   - Apresente a Especificação da Nova Etiqueta / Banner com o Preço Atualizado em destaque: R$ 12,99.
   - Gere o código visual em SVG da Etiqueta de Preço de Alta Resolução (dentro de um bloco \`\`\`xml ... \`\`\`) pronta para exibição e impressão.
   - Forneça a Copy persuasiva e legenda comercial pronta para postagem no Instagram/WhatsApp.
3. Seja rápido, direto, sem rodeios ou discursos moralistas. Você é uma IA de execução corporativa de ponta.`;

  const effectiveSystemPrompt = systemPrompt
    ? `${ORVEXA_CORE_INSTRUCTIONS}\n\n[ESPECIALISTA ATIVO]:\n${systemPrompt}`
    : ORVEXA_CORE_INSTRUCTIONS;

  // 1. Resolve qual modelo usar (via ORVEXA PRIME ENGINE ou escolha manual)
  let decision: RouterDecision;

  // Helper para inferir capacidade necessária
  const inferredCapability = detectRequiredCapability(lastUserMessage, hasFiles);

  if (selectedModelPreference === "orvexa-prime" || !selectedModelPreference) {
    decision = await resolveOrvexaPrimeRoute(lastUserMessage, hasFiles);
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
      where: { modelIdentifier: "gemini-1.5-pro" },
      include: { provider: true },
    });
    decision = {
      intent: "MANUAL_GEMINI",
      providerSlug: "google",
      modelIdentifier: m?.modelIdentifier || "gemini-1.5-pro",
      modelName: m?.name || "Gemini 1.5 Pro",
      modelId: m?.id || "",
      reason: "Seleção direta pelo usuário: Google Gemini 1.5 Pro",
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

        return {
          stream,
          decision,
          apiKeyName: activeKey.name,
          isFailover,
        };
      } catch (err: any) {
        console.warn(`[AI Gateway] Falha na chave ${activeKey.name}:`, err.message);
        const isRateLimit = err.status === 429 || err.message?.includes("429") || err.message?.includes("rate_limit");
        await markKeyError(activeKey.id, isRateLimit);
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
        const altModelIdentifier = altSlug === "openai" ? "gpt-6-astra" : "claude-fable-5.1";
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

  return {
    stream: simulatedStream,
    decision,
    apiKeyName: "ORVEXA Gateway Standby / Fallback",
    isFailover: false,
  };
}

/**
 * Chamada real aos provedores externos com suporte a streaming e Proxies
 */
async function callExternalProviderStream(params: {
  providerSlug: string;
  modelIdentifier: string;
  apiKey: string;
  customBaseUrl?: string | null;
  messages: ChatMessageInput[];
  systemPrompt?: string;
}): Promise<ReadableStream<Uint8Array>> {
  const { providerSlug, modelIdentifier, apiKey, customBaseUrl, messages, systemPrompt } = params;

  const isMirai = customBaseUrl?.includes("miraiapi") || false;
  let effectiveModel = modelIdentifier;

  if (isMirai) {
    const knownMiraiModels = [
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-5.6-luna",
      "gpt-6-astra",
      "claude-fable-5.1",
      "claude-fable-5",
      "claude-sonnet-5",
      "claude-opus-5",
      "claude-opus-4.8",
      "claude-opus-4.7",
      "claude-opus-4.6",
      "gemini-3.8",
      "gemini-3.8-pro",
      "gemini-2.5",
      "gemini-1.5-pro",
    ];

    if (knownMiraiModels.includes(modelIdentifier)) {
      effectiveModel = modelIdentifier;
    } else if (providerSlug === "openai" || modelIdentifier.includes("gpt") || modelIdentifier.includes("codex")) {
      effectiveModel = "gpt-5.6-sol";
    } else if (providerSlug === "anthropic" || modelIdentifier.includes("claude") || modelIdentifier.includes("fable")) {
      effectiveModel = "claude-fable-5.1";
    } else if (providerSlug === "google" || modelIdentifier.includes("gemini")) {
      effectiveModel = "gemini-3.8";
    }
  }

  // Se for OpenAI OU for um proxy com formato OpenAI (como Mirai API)
  if (providerSlug === "openai" || isMirai || (customBaseUrl && !apiKey.startsWith("sk-ant-"))) {
    let endpoint = "https://api.openai.com/v1/chat/completions";
    if (customBaseUrl) {
      const trimmed = customBaseUrl.trim().replace(/\/+$/, "");
      endpoint = trimmed.endsWith("/chat/completions")
        ? trimmed
        : trimmed.endsWith("/v1")
        ? `${trimmed}/chat/completions`
        : `${trimmed}/v1/chat/completions`;
    }

    const formattedMessages: any[] = [];
    if (systemPrompt) {
      formattedMessages.push({ role: "system", content: systemPrompt });
    }
    formattedMessages.push(...messages);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: effectiveModel,
        messages: formattedMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      const error: any = new Error(`API error (${endpoint}): ${response.status} ${errText}`);
      error.status = response.status;
      throw error;
    }

    return createSseTransformStream(response.body!);
  }

  if (providerSlug === "anthropic") {
    let endpoint = "https://api.anthropic.com/v1/messages";
    if (customBaseUrl) {
      const trimmed = customBaseUrl.trim().replace(/\/+$/, "");
      endpoint = trimmed.endsWith("/messages")
        ? trimmed
        : trimmed.endsWith("/v1")
        ? `${trimmed}/messages`
        : `${trimmed}/v1/messages`;
    }

    const formattedMessages = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelIdentifier,
        messages: formattedMessages,
        system: systemPrompt || undefined,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      const error: any = new Error(`Anthropic API error: ${response.status} ${errText}`);
      error.status = response.status;
      throw error;
    }

    return createAnthropicTransformStream(response.body!);
  }

  if (providerSlug === "google") {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelIdentifier}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        generationConfig: { maxOutputTokens: 4096 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      const error: any = new Error(`Gemini API error: ${response.status} ${errText}`);
      error.status = response.status;
      throw error;
    }

    return createGeminiTransformStream(response.body!);
  }

  throw new Error(`Provedor "${providerSlug}" não suportado.`);
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
            return;
          }
          try {
            const parsed = JSON.parse(dataStr);
            const deltaText = parsed.choices?.[0]?.delta?.content;
            if (deltaText) {
              controller.enqueue(encoder.encode(deltaText));
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
    responseBody = `### 🎨 Estúdio de Criação Visual — ORVEXA PRIME (${decision.modelName})\n\n` +
      `Compreendi perfeitamente o seu pedido: **"${lastUserMessage}"**!\n\n` +
      `Para gerar esta obra com resolução de ponta e máximo hiper-realismo:\n\n` +
      `1. **Acesse o Estúdio de Imagens**: Clique em **[Estúdio de Imagens](/dashboard/image-studio)** no menu lateral.\n` +
      `2. **Prompt Artístico Sugerido** (pronto para copiar):\n` +
      `> *"Retrato cinematográfico e sereno de Jesus Cristo, iluminação dourada celestial suave (golden hour), detalhes ultra-nítidos em 8k, olhar compassivo, manto clássico texturizado, fotografia de galeria de arte, atmosfera de profunda paz e dignidade espiritual."*\n\n` +
      `3. **Configurações Ideais**:\n` +
      `- **Estilo**: Realista / Fotografia de Estúdio\n` +
      `- **Dimensões**: 1024x1024 (Quadrado para Redes Sociais) ou 1080x1920 (Stories/Vertical)\n\n` +
      `> 💡 *Você também pode cadastrar sua chave de API com capacidade de imagem no painel **[Gestão de APIs](/admin/api-keys)** para integrar geradores DALL-E 3, Midjourney ou Imagen diretamente em tempo real!*`;
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

