// src/ai/gateway/intent-detector.ts
// CLASSIFICADOR SEMÂNTICO DE INTENÇÃO — ORVEXA PRIME DIGITAL

export type UserIntent =
  | "PROGRAMACAO"
  | "DOCUMENTO"
  | "IMAGEM"
  | "ESTUDOS"
  | "BUSINESS"
  | "ANALYST"
  | "GERAL";

export interface IntentDetectionResult {
  intent: UserIntent;
  confidence: number;
  inferredCapability: "CODIGO" | "DOCUMENTO" | "IMAGEM" | "TEXTO" | "CRIACAO_SITES";
  recommendedProvider: "openai" | "anthropic" | "google" | "pollinations";
  recommendedModel: string;
  reason: string;
}

export function detectUserIntent(prompt: string, hasFiles: boolean = false): IntentDetectionResult {
  const p = prompt.toLowerCase().trim();

  // 1. Detecção de Documentos e Arquivos
  if (
    hasFiles ||
    p.includes("contrato") ||
    p.includes("documento") ||
    p.includes("relatório") ||
    p.includes("relatorio") ||
    p.includes("cláusula") ||
    p.includes("clausula") ||
    p.includes("pdf") ||
    p.includes("docx") ||
    p.includes("auditoria jurídica") ||
    p.includes("auditoria juridica")
  ) {
    return {
      intent: "DOCUMENTO",
      confidence: 0.95,
      inferredCapability: "DOCUMENTO",
      recommendedProvider: "anthropic",
      recommendedModel: "claude-sonnet-5",
      reason: "Detectada demanda de análise documental, leitura de termos e auditoria textual com Claude.",
    };
  }

  // 2. Detecção de Geração e Edição de Imagens
  if (
    p.startsWith("/imagem") ||
    p.includes("crie uma imagem") ||
    p.includes("cria uma imagem") ||
    p.includes("gerar imagem") ||
    p.includes("gere uma imagem") ||
    p.includes("foto realista") ||
    p.includes("banner profissional") ||
    p.includes("ilustração digital") ||
    p.includes("ilustracao") ||
    p.includes("desenhe") ||
    p.includes("logo vetorial")
  ) {
    return {
      intent: "IMAGEM",
      confidence: 0.96,
      inferredCapability: "IMAGEM",
      recommendedProvider: "pollinations",
      recommendedModel: "flux-ultra-8k",
      reason: "Detectada solicitação de geração e síntese de imagem ultra-realista via Flux 8K.",
    };
  }

  // 3. Detecção de Programação & Engenharia de Software
  if (
    p.includes("react") ||
    p.includes("crie um aplicativo") ||
    p.includes("cria um app") ||
    p.includes("typescript") ||
    p.includes("javascript") ||
    p.includes("python") ||
    p.includes("código") ||
    p.includes("codigo") ||
    p.includes("api rest") ||
    p.includes("endpoint") ||
    p.includes("banco de dados") ||
    p.includes("prisma") ||
    p.includes("sql") ||
    p.includes("bug") ||
    p.includes("refatorar") ||
    p.includes("script") ||
    p.includes("função") ||
    p.includes("funcao") ||
    p.includes("algoritmo") ||
    p.includes("componente") ||
    p.includes("html") ||
    p.includes("css") ||
    p.includes("tailwind")
  ) {
    return {
      intent: "PROGRAMACAO",
      confidence: 0.94,
      inferredCapability: "CODIGO",
      recommendedProvider: "openai",
      recommendedModel: "gpt-5.6-sol",
      reason: "Detectada demanda de desenvolvimento de software e Clean Architecture com Codex/OpenAI.",
    };
  }

  // 4. Detecção de Estudos, Concursos e Método Feynman
  if (
    p.includes("caderno de questões") ||
    p.includes("caderno de questoes") ||
    p.includes("questões de concurso") ||
    p.includes("concurso") ||
    p.includes("flashcard") ||
    p.includes("método feynman") ||
    p.includes("metodo feynman") ||
    p.includes("resumo didático") ||
    p.includes("resumo didatico") ||
    p.includes("me ensine como se eu tivesse") ||
    p.includes("prova") ||
    p.includes("vestibular") ||
    p.includes("enem")
  ) {
    return {
      intent: "ESTUDOS",
      confidence: 0.93,
      inferredCapability: "TEXTO",
      recommendedProvider: "google",
      recommendedModel: "gemini-3-flash-preview",
      reason: "Detectada demanda pedagógica e estudo ativo com síntese de alta velocidade Google Gemini.",
    };
  }

  // 5. Detecção de Negócios e Estratégia Corporativa
  if (
    p.includes("modelo de negócios") ||
    p.includes("modelo de negocio") ||
    p.includes("plano de negócios") ||
    p.includes("planejamento estratégico") ||
    p.includes("planejamento estrategico") ||
    p.includes("pitch deck") ||
    p.includes("investidores") ||
    p.includes("okr") ||
    p.includes("kpi") ||
    p.includes("go-to-market") ||
    p.includes("c-level")
  ) {
    return {
      intent: "BUSINESS",
      confidence: 0.91,
      inferredCapability: "TEXTO",
      recommendedProvider: "openai",
      recommendedModel: "gpt-6-astra",
      reason: "Detectada demanda de planejamento estratégico e visão corporativa com GPT-6 Astra.",
    };
  }

  // 6. Detecção de Análise de Dados e Planilhas Financeiras
  if (
    p.includes("planilha") ||
    p.includes("xlsx") ||
    p.includes("csv") ||
    p.includes("cálculos financeiros") ||
    p.includes("calculos financeiros") ||
    p.includes("demonstrativo") ||
    p.includes("fluxo de caixa") ||
    p.includes("métrica") ||
    p.includes("metrica") ||
    p.includes("gráfico") ||
    p.includes("grafico")
  ) {
    return {
      intent: "ANALYST",
      confidence: 0.92,
      inferredCapability: "DOCUMENTO",
      recommendedProvider: "anthropic",
      recommendedModel: "claude-sonnet-5",
      reason: "Detectada demanda de análise quantitativa e estruturação de dados com Claude Sonnet.",
    };
  }

  // 7. Fallback Geral
  return {
    intent: "GERAL",
    confidence: 0.85,
    inferredCapability: "TEXTO",
    recommendedProvider: "anthropic",
    recommendedModel: "claude-sonnet-5",
    reason: "Processamento balanceado padrão para assistência geral de alta fidelidade.",
  };
}
