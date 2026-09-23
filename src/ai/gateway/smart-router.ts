import { prisma } from "@/lib/prisma";
import { appCache } from "@/lib/cache";
import { AiQuotaManagerService } from "@/ai/quota/quota-manager.service";

export type RouterCategory =
  | "TEXTO_LONGO_DOCUMENTO"
  | "CODIGO"
  | "MATEMATICA"
  | "IMAGEM"
  | "PERGUNTA_SIMPLES"
  | "GERAL";

export interface SmartRouterInput {
  pergunta: string;
  tipoArquivo?: string | null;
  tamanho?: number; // Tamanho em caracteres do prompt ou bytes do arquivo
  intencao?: string | null;
  hasFiles?: boolean;
}

export interface SmartRouterDecision {
  categoria: RouterCategory;
  provedor: "anthropic" | "openai" | "google";
  modeloIdentificador: string;
  modeloNome: string;
  modeloId?: string;
  motivoEscolha: string;
  capacidadeNecessaria: "TEXTO" | "CODIGO" | "DOCUMENTO" | "IMAGEM";
  userBadge: string;
  tempoClassificacaoMs: number;
}

export interface LogRouterDecisionParams {
  userId?: string | null;
  pergunta: string;
  decision: SmartRouterDecision;
  tempoRespostaMs: number;
}

/**
 * Normaliza o texto removendo acentos para correspondência precisa.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Verifica ocorrência de palavras-chave com correspondência exata de termos (evitando falsos positivos).
 */
function hasKeyword(normalizedText: string, keywords: string[]): boolean {
  return keywords.some((kw) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i");
    return regex.test(normalizedText);
  });
}

/**
 * Detecta se a entrada trata de imagens ou visão computacional.
 * Prioridade: Gemini (Google)
 */
function isImageTask(input: SmartRouterInput, normalized: string): boolean {
  if (input.tipoArquivo) {
    const fileLower = input.tipoArquivo.toLowerCase();
    const imageExts = [
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
      ".svg",
      ".gif",
      ".bmp",
      ".tiff",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
      "image/gif",
    ];
    if (imageExts.some((ext) => fileLower.includes(ext))) {
      return true;
    }
  }

  const imageKeywords = [
    "imagem",
    "gerar imagem",
    "crie uma imagem",
    "cria uma imagem",
    "gere uma imagem",
    "foto",
    "foto realista",
    "banner",
    "ilustracao",
    "desenho",
    "desenhe",
    "logo",
    "visao computacional",
    "analise a imagem",
    "analisar imagem",
    "descreva a foto",
    "leia a imagem",
    "ocr",
    "infografico",
    "diagrama visual",
  ];

  return hasKeyword(normalized, imageKeywords);
}

/**
 * Detecta se a entrada trata de desenvolvimento de software e programação.
 * Prioridade: GPT (OpenAI)
 */
function isCodeTask(input: SmartRouterInput, normalized: string): boolean {
  if (input.tipoArquivo) {
    const fileLower = input.tipoArquivo.toLowerCase();
    const codeExts = [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".py",
      ".java",
      ".cpp",
      ".c",
      ".cs",
      ".php",
      ".rb",
      ".go",
      ".rs",
      ".sql",
      ".html",
      ".css",
      ".json",
      ".yaml",
      ".yml",
      ".sh",
      ".bash",
      ".dockerfile",
    ];
    if (codeExts.some((ext) => fileLower.endsWith(ext)) || fileLower.includes("code")) {
      return true;
    }
  }

  // Se o prompt possui blocos de código markdown ```
  if (input.pergunta.includes("```")) {
    return true;
  }

  const codeKeywords = [
    "codigo",
    "script",
    "funcao",
    "algoritmo",
    "typescript",
    "javascript",
    "python",
    "react",
    "next.js",
    "nextjs",
    "node.js",
    "nodejs",
    "tailwind",
    "html",
    "css",
    "sql",
    "query",
    "banco de dados",
    "prisma",
    "api rest",
    "endpoint",
    "bug",
    "debug",
    "refatorar",
    "refatoracao",
    "exception",
    "stack trace",
    "compiler",
    "compilador",
    "git",
    "docker",
    "backend",
    "frontend",
    "programar",
    "desenvolva uma api",
    "crie uma classe",
    "componente react",
  ];

  return hasKeyword(normalized, codeKeywords);
}

/**
 * Detecta se a entrada trata de raciocínio matemático, lógica quantitativa ou cálculos.
 * Prioridade: GPT (OpenAI)
 */
function isMathTask(normalized: string, rawPrompt: string): boolean {
  const mathKeywords = [
    "calculo",
    "calcule",
    "calcular",
    "equacao",
    "integral",
    "derivada",
    "probabilidade",
    "estatistica",
    "algebra",
    "geometria",
    "trigonometria",
    "teorema",
    "matematica",
    "aritmetica",
    "juros compostos",
    "desvio padrao",
    "media ponderada",
    "regressao",
    "porcentagem",
    "matriz",
    "determinante",
    "logaritmo",
    "raiz quadrada",
    "fracao",
    "raciocinio logico",
    "problema de logica",
  ];

  if (hasKeyword(normalized, mathKeywords)) {
    return true;
  }

  // Padrões de fórmulas matemáticas
  const mathPatterns = [
    /f\([a-z]\)\s*=/i,
    /\b\d+\s*[\+\-\*\/]\s*\d+\b/,
    /\b\d+x\s*[\+\-]/i,
    /x\^2|y\^2/i,
    /\b(lim|sen|cos|tan|log|ln)\s*\(/i,
  ];

  return mathPatterns.some((pattern) => pattern.test(rawPrompt));
}

/**
 * Detecta se a entrada trata de texto longo, documentos ou análises contratuais/extensas.
 * Prioridade: Claude (Anthropic)
 */
function isLongTextOrDocumentTask(input: SmartRouterInput, normalized: string): boolean {
  // Arquivo anexado que seja documento ou planilha
  if (input.tipoArquivo) {
    const fileLower = input.tipoArquivo.toLowerCase();
    const docExts = [".pdf", ".docx", ".doc", ".txt", ".rtf", ".odt", ".csv", ".xlsx", ".xls"];
    if (
      docExts.some((ext) => fileLower.endsWith(ext)) ||
      fileLower.includes("document") ||
      fileLower.includes("sheet") ||
      fileLower.includes("pdf")
    ) {
      return true;
    }
  }

  // Se foram anexados arquivos e não foram classificados como imagem/código
  if (input.hasFiles) {
    return true;
  }

  // Texto longo: acima de 800 caracteres ou mais de 120 palavras
  const charLength = input.tamanho ?? input.pergunta.length;
  const wordCount = input.pergunta.trim().split(/\s+/).length;
  if (charLength >= 800 || wordCount >= 120) {
    return true;
  }

  const docKeywords = [
    "contrato",
    "documento",
    "relatorio",
    "clausula",
    "auditoria juridica",
    "parecer",
    "artigo academico",
    "redacao",
    "resumo de texto",
    "resuma o documento",
    "analise o texto",
    "traduza o texto longo",
    "edital",
    "peticao",
    "laudo",
    "termo de compromisso",
    "politica de privacidade",
    "termos de servico",
  ];

  return hasKeyword(normalized, docKeywords);
}

/**
 * Detecta se a entrada é uma pergunta simples, direta ou saudação.
 * Prioridade: Modelo Econômico (gpt-4o-mini / gemini-3.1-flash-lite)
 */
function isSimpleQuestion(input: SmartRouterInput, normalized: string): boolean {
  // Não pode ter arquivos anexados
  if (input.hasFiles || input.tipoArquivo) return false;

  const charLength = input.tamanho ?? input.pergunta.length;
  const wordCount = input.pergunta.trim().split(/\s+/).length;

  // Perguntas curtas com menos de 120 caracteres e menos de 25 palavras
  if (charLength <= 120 && wordCount <= 25) {
    return true;
  }

  // Saudações e interações básicas
  const greetingPhrases = [
    "ola",
    "oi",
    "bom dia",
    "boa tarde",
    "boa noite",
    "tudo bem",
    "quem e voce",
    "qual seu nome",
    "obrigado",
    "valeu",
  ];

  if (greetingPhrases.some((g) => normalized === g || normalized.startsWith(`${g} `))) {
    return true;
  }

  return false;
}

/**
 * Busca metadados de modelo no banco respeitando a prioridade estrita de candidatos
 */
async function resolveModelRecord(
  identifierCandidate: string,
  providerSlug: "anthropic" | "openai" | "google",
  fallbackCandidates: string[] = []
) {
  const allCandidates = [identifierCandidate, ...fallbackCandidates];

  try {
    const cached = await appCache.getOrSet(
      `model:info:${identifierCandidate}`,
      async () => {
        const models = await prisma.aiModel.findMany({
          where: {
            modelIdentifier: { in: allCandidates },
            isActive: true,
          },
          include: { provider: true },
        });

        if (models.length === 0) return null;

        // Ordena estritamente pela prioridade definida em allCandidates
        models.sort(
          (a, b) => allCandidates.indexOf(a.modelIdentifier) - allCandidates.indexOf(b.modelIdentifier)
        );

        return models[0];
      },
      120
    );

    if (cached) {
      return {
        id: cached.id,
        name: cached.name,
        identifier: cached.modelIdentifier,
        provider: cached.provider.slug as "anthropic" | "openai" | "google",
      };
    }
  } catch {
    // Continua para fallback estático
  }

  const namesMap: Record<string, string> = {
    "gpt-6-sol": "GPT-6 Sol",
    "gpt-5.6-sol": "GPT-5.6 Sol (Codex)",
    "gpt-5.6-terra": "GPT-5.6 Terra",
    "gpt-5.6-luna": "GPT-5.6 Luna",
    "gpt-6-astra": "GPT-6 Astra",
    "claude-sonnet-5": "Claude Sonnet 5",
    "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet",
    "gpt-4o": "GPT-4o",
    "gpt-4o-mini": "GPT-4o Mini",
    "gemini-3-flash-preview": "Gemini 3 Flash",
    "gemini-1.5-pro": "Gemini 1.5 Pro",
    "gemini-3.1-flash-lite-preview": "Gemini 3.1 Flash Lite",
  };

  return {
    id: "",
    name: namesMap[identifierCandidate] || identifierCandidate,
    identifier: identifierCandidate,
    provider: providerSlug,
  };
}

/**
 * MOTOR DE ROTEAMENTO INTELIGENTE — ORVEXA AUTO
 *
 * Avalia as 5 categorias e retorna a decisão ideal com justificativa interna.
 */
export async function classifyAndRoute(input: SmartRouterInput): Promise<SmartRouterDecision> {
  const startTime = Date.now();
  const rawPrompt = input.pergunta || "";
  const normalized = normalizeText(rawPrompt);

  const USER_FRIENDLY_BADGE = "ORVEXA escolheu a melhor IA para esta tarefa.";
  let decision: SmartRouterDecision;

  // REGRA 4: Imagens e Visão Computacional -> Priorizar Gemini (Google)
  if (isImageTask(input, normalized)) {
    const model = await resolveModelRecord("gemini-3-flash-preview", "google", [
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ]);
    decision = {
      categoria: "IMAGEM",
      provedor: "google",
      modeloIdentificador: model.identifier,
      modeloNome: model.name,
      modeloId: model.id,
      motivoEscolha:
        "Entrada multimodal ou processamento visual detectado. Priorizado Google Gemini pela arquitetura nativa para visão e imagens.",
      capacidadeNecessaria: "IMAGEM",
      userBadge: USER_FRIENDLY_BADGE,
      tempoClassificacaoMs: Date.now() - startTime,
    };
  } else if (isLongTextOrDocumentTask(input, normalized)) {
    // REGRA 1: Texto Longo / Documentos -> Priorizar Modelo Especializado em Documentos
    const model = await resolveModelRecord("gpt-5.6-terra", "openai", [
      "claude-sonnet-5",
      "claude-3-5-sonnet-20241022",
      "gpt-6-sol",
    ]);
    decision = {
      categoria: "TEXTO_LONGO_DOCUMENTO",
      provedor: model.provider,
      modeloIdentificador: model.identifier,
      modeloNome: model.name,
      modeloId: model.id,
      motivoEscolha:
        "Texto de grande extensão ou análise documental detectado. Priorizado modelo especializado em contexto e profundidade interpretativa.",
      capacidadeNecessaria: input.hasFiles ? "DOCUMENTO" : "TEXTO",
      userBadge: USER_FRIENDLY_BADGE,
      tempoClassificacaoMs: Date.now() - startTime,
    };
  } else if (isCodeTask(input, normalized)) {
    // REGRA 2: Código e Engenharia de Software -> Priorizar GPT-5.6 Sol / GPT (OpenAI)
    const model = await resolveModelRecord("gpt-5.6-sol", "openai", [
      "gpt-6-sol",
      "gpt-4o",
      "gpt-6-astra",
    ]);
    decision = {
      categoria: "CODIGO",
      provedor: "openai",
      modeloIdentificador: model.identifier,
      modeloNome: model.name,
      modeloId: model.id,
      motivoEscolha:
        "Desenvolvimento de software e engenharia de código detectados. Priorizado GPT Sol pela excelência analítica em algoritmos e sintaxe.",
      capacidadeNecessaria: "CODIGO",
      userBadge: USER_FRIENDLY_BADGE,
      tempoClassificacaoMs: Date.now() - startTime,
    };
  } else if (isMathTask(normalized, rawPrompt)) {
    // REGRA 3: Raciocínio Matemático e Lógica -> Priorizar GPT-6 Sol / GPT (OpenAI)
    const model = await resolveModelRecord("gpt-6-sol", "openai", [
      "gpt-5.6-sol",
      "gpt-4o",
    ]);
    decision = {
      categoria: "MATEMATICA",
      provedor: "openai",
      modeloIdentificador: model.identifier,
      modeloNome: model.name,
      modeloId: model.id,
      motivoEscolha:
        "Raciocínio lógico-matemático e computacional detectado. Priorizado GPT Sol pelo rigor analítico e precisão quantitativa.",
      capacidadeNecessaria: "TEXTO",
      userBadge: USER_FRIENDLY_BADGE,
      tempoClassificacaoMs: Date.now() - startTime,
    };
  } else if (isSimpleQuestion(input, normalized)) {
    // REGRA 5: Perguntas Simples e Rápidas -> Usar Modelo Econômico (gpt-5.6-luna / gpt-4o-mini)
    const model = await resolveModelRecord("gpt-5.6-luna", "openai", [
      "gpt-4o-mini",
      "gemini-3.1-flash-lite-preview",
      "gpt-6-sol",
    ]);
    decision = {
      categoria: "PERGUNTA_SIMPLES",
      provedor: model.provider,
      modeloIdentificador: model.identifier,
      modeloNome: model.name,
      modeloId: model.id,
      motivoEscolha:
        "Pergunta direta e objetiva detectada. Selecionado modelo econômico de alta velocidade e baixo consumo de quota.",
      capacidadeNecessaria: "TEXTO",
      userBadge: USER_FRIENDLY_BADGE,
      tempoClassificacaoMs: Date.now() - startTime,
    };
  } else {
    // Fallback Padrão: Equilíbrio de alta qualidade com GPT-6 Sol / Claude Sonnet
    const defaultModel = await resolveModelRecord("gpt-6-sol", "openai", [
      "claude-sonnet-5",
      "claude-3-5-sonnet-20241022",
      "gpt-5.6-sol",
    ]);
    decision = {
      categoria: "GERAL",
      provedor: defaultModel.provider,
      modeloIdentificador: defaultModel.identifier,
      modeloNome: defaultModel.name,
      modeloId: defaultModel.id,
      motivoEscolha:
        "Consulta balanceada de uso geral. Selecionado modelo premium para respostas consistentes e articuladas.",
      capacidadeNecessaria: "TEXTO",
      userBadge: USER_FRIENDLY_BADGE,
      tempoClassificacaoMs: Date.now() - startTime,
    };
  }

  // Resiliência AI Quota Manager: Verifica se o provedor preferencial possui saldo e validade
  try {
    const quotaCheck = await AiQuotaManagerService.checkProviderAvailability(decision.provedor);
    if (!quotaCheck.available) {
      let fallbackProvider: "anthropic" | "openai" | "google" = "openai";
      let fallbackCandidate = "gpt-4o";

      if (decision.provedor === "openai") {
        fallbackProvider = "anthropic";
        fallbackCandidate = "claude-sonnet-5";
      } else if (decision.provedor === "anthropic") {
        fallbackProvider = "openai";
        fallbackCandidate = "gpt-4o";
      } else if (decision.provedor === "google") {
        fallbackProvider = "openai";
        fallbackCandidate = "gpt-4o";
      }

      const resolved = await resolveModelRecord(fallbackCandidate, fallbackProvider);
      decision.motivoEscolha = `[Fallback AI Quota Manager] ${quotaCheck.reason} O Smart Router redirecionou automaticamente para ${resolved.name}.`;
      decision.provedor = fallbackProvider;
      decision.modeloIdentificador = resolved.identifier;
      decision.modeloNome = resolved.name;
      decision.modeloId = resolved.id;
    }
  } catch {
    // Continua com a decisão original caso o serviço de quota não responda
  }

  return decision;
}

/**
 * Registra o histórico interno de decisões do roteador no banco de dados (AuditLog).
 * Registra: pergunta, modelo escolhido, motivo da escolha, tempo de resposta.
 */
export async function logRouterDecision(params: LogRouterDecisionParams): Promise<void> {
  const { userId, pergunta, decision, tempoRespostaMs } = params;

  try {
    await prisma.auditLog.create({
      data: {
        actorId: userId || null,
        action: "ROUTER_DECISION",
        resourceType: "ROUTER",
        resourceId: decision.modeloIdentificador,
        details: JSON.stringify({
          pergunta: pergunta.slice(0, 300),
          modeloEscolhido: decision.modeloIdentificador,
          modeloNome: decision.modeloNome,
          provedor: decision.provedor,
          categoria: decision.categoria,
          motivoEscolha: decision.motivoEscolha,
          tempoClassificacaoMs: decision.tempoClassificacaoMs,
          tempoRespostaMs,
        }),
      },
    });
  } catch (err: any) {
    console.error("[SmartRouter] Falha ao registrar log de auditoria do roteador:", err?.message);
  }
}

