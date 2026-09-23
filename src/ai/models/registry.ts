// src/ai/models/registry.ts
// REGISTRO CENTRAL DE MODELOS DE INTELIGÊNCIA ARTIFICIAL — ORVEXA PRIME DIGITAL

export interface ModelSpec {
  identifier: string;
  name: string;
  provider: "openai" | "anthropic" | "google" | "pollinations" | "mistral" | "deepseek" | "llama";
  category: "CODE" | "TEXT" | "DOCUMENT" | "IMAGE" | "RESEARCH" | "MULTIMODAL";
  capabilities: Array<"TEXTO" | "CODIGO" | "DOCUMENTO" | "IMAGEM" | "CRIACAO_SITES" | "OCR">;
  contextWindow: number;
  costPer1kInputCents: number;
  costPer1kOutputCents: number;
  description: string;
  recommendedFor: string;
  isFlagship?: boolean;
}

export const MODEL_REGISTRY: Record<string, ModelSpec> = {
  // PROVEDOR OPENAI & CODEX (MIRAI API & OFICIAL)
  "gpt-5.6-sol": {
    identifier: "gpt-5.6-sol",
    name: "GPT-5.6 Sol (Codex Flagship)",
    provider: "openai",
    category: "CODE",
    capabilities: ["CODIGO", "TEXTO", "CRIACAO_SITES", "DOCUMENTO"],
    contextWindow: 256000,
    costPer1kInputCents: 0.25,
    costPer1kOutputCents: 1.0,
    description: "Modelo flagship para engenharia de software, geração de projetos full-stack e Clean Architecture.",
    recommendedFor: "ORVEXA DEV, Programação, Scripts e Arquitetura de Software",
    isFlagship: true,
  },
  "gpt-6-astra": {
    identifier: "gpt-6-astra",
    name: "GPT-6 Astra (Next-Gen Strategic)",
    provider: "openai",
    category: "TEXT",
    capabilities: ["TEXTO", "CODIGO", "DOCUMENTO", "CRIACAO_SITES"],
    contextWindow: 512000,
    costPer1kInputCents: 0.35,
    costPer1kOutputCents: 1.5,
    description: "Modelo de raciocínio de próxima geração para decisões estratégicas, business plan e inovação corporativa.",
    recommendedFor: "ORVEXA BUSINESS, Estratégia C-Level e Planejamento",
    isFlagship: true,
  },
  "gpt-4o": {
    identifier: "gpt-4o",
    name: "OpenAI GPT-4o",
    provider: "openai",
    category: "MULTIMODAL",
    capabilities: ["TEXTO", "CODIGO", "DOCUMENTO", "OCR"],
    contextWindow: 128000,
    costPer1kInputCents: 0.25,
    costPer1kOutputCents: 1.0,
    description: "Modelo multimodal balanceado para visão e tarefas gerais de alto desempenho.",
    recommendedFor: "Uso geral balanceado",
  },
  "gpt-4o-mini": {
    identifier: "gpt-4o-mini",
    name: "OpenAI GPT-4o Mini",
    provider: "openai",
    category: "TEXT",
    capabilities: ["TEXTO", "CODIGO"],
    contextWindow: 128000,
    costPer1kInputCents: 0.015,
    costPer1kOutputCents: 0.06,
    description: "Modelo de ultrabaixa latência para chats instantâneos e respostas rápidas.",
    recommendedFor: "Triagem e chats informais",
  },

  // PROVEDOR ANTHROPIC CLAUDE (MIRAI API & OFICIAL)
  "claude-sonnet-5": {
    identifier: "claude-sonnet-5",
    name: "Claude Sonnet 5 (Pro & Design)",
    provider: "anthropic",
    category: "DOCUMENT",
    capabilities: ["DOCUMENTO", "TEXTO", "CRIACAO_SITES", "OCR", "CODIGO"],
    contextWindow: 200000,
    costPer1kInputCents: 0.3,
    costPer1kOutputCents: 1.5,
    description: "Líder mundial em redação refinada, compreensão semântica de contratos, documentos longos e UI/UX.",
    recommendedFor: "ORVEXA DESIGN, ORVEXA ANALYST, Contratos e Relatórios",
    isFlagship: true,
  },
  "claude-opus-5": {
    identifier: "claude-opus-5",
    name: "Claude Opus 5 (Deep Intelligence)",
    provider: "anthropic",
    category: "RESEARCH",
    capabilities: ["DOCUMENTO", "TEXTO", "RESEARCH" as any, "CODIGO"],
    contextWindow: 200000,
    costPer1kInputCents: 0.5,
    costPer1kOutputCents: 2.5,
    description: "Máxima densidade cognitiva para pesquisas científicas, auditorias profundas e cruzamento de teses.",
    recommendedFor: "Pesquisas complexas, Auditorias Forenses e Jurídico",
    isFlagship: true,
  },
  "claude-fable-5.1": {
    identifier: "claude-fable-5.1",
    name: "Claude Fable 5.1 (Creative & Copy)",
    provider: "anthropic",
    category: "TEXT",
    capabilities: ["TEXTO", "DOCUMENTO"],
    contextWindow: 200000,
    costPer1kInputCents: 0.2,
    costPer1kOutputCents: 1.0,
    description: "Narrativas persuasivas, frameworks de vendas AIDA/PAS e copywriting magnético.",
    recommendedFor: "ORVEXA MARKETING, Copywriting e Campanhas de Vendas",
  },

  // PROVEDOR GOOGLE GEMINI (GOOGLE AI STUDIO NATIVO)
  "gemini-3-flash-preview": {
    identifier: "gemini-3-flash-preview",
    name: "Gemini 3 Flash (High-Speed & Feynman)",
    provider: "google",
    category: "TEXT",
    capabilities: ["TEXTO", "DOCUMENTO", "CODIGO", "OCR"],
    contextWindow: 1000000,
    costPer1kInputCents: 0.05,
    costPer1kOutputCents: 0.15,
    description: "1 milhão de tokens de contexto, velocidade supersônica e excelente síntese pedagógica.",
    recommendedFor: "ORVEXA EDU, Cadernos de Questões, Concursos e Sínteses",
    isFlagship: true,
  },
  "gemini-3.1-flash-lite-preview": {
    identifier: "gemini-3.1-flash-lite-preview",
    name: "Gemini 3.1 Flash Lite",
    provider: "google",
    category: "TEXT",
    capabilities: ["TEXTO", "DOCUMENTO"],
    contextWindow: 1000000,
    costPer1kInputCents: 0.02,
    costPer1kOutputCents: 0.08,
    description: "Versão ultra leve do Gemini para processamento em lote e resposta imediata.",
    recommendedFor: "Extrações rápidas e fallback de alta demanda",
  },
  "gemini-3.8": {
    identifier: "gemini-3.8",
    name: "Gemini 3.8 Ultra",
    provider: "google",
    category: "MULTIMODAL",
    capabilities: ["TEXTO", "DOCUMENTO", "OCR", "CODIGO"],
    contextWindow: 1000000,
    costPer1kInputCents: 0.15,
    costPer1kOutputCents: 0.5,
    description: "Modelo multimodal avançado do Google para processamento de áudio, visão e documentos.",
    recommendedFor: "ORVEXA EDU e Análise Multimodal",
  },

  // PROVEDOR NEURAL IMAGEM (FLUX / SDXL)
  "flux-ultra-8k": {
    identifier: "flux-ultra-8k",
    name: "Flux Ultra HD 8K Neural Diffusion",
    provider: "pollinations",
    category: "IMAGE",
    capabilities: ["IMAGEM"],
    contextWindow: 4096,
    costPer1kInputCents: 0,
    costPer1kOutputCents: 0,
    description: "Motor de difusão neural de ponta com renderização hiper-realista, iluminação volumétrica e fidelidade fotográfica.",
    recommendedFor: "ORVEXA DESIGN, Image Studio, Criação de Artes e Banners",
    isFlagship: true,
  },

  // MODELOS PREPARADOS: MISTRAL AI
  "mistral-large": {
    identifier: "mistral-large",
    name: "Mistral Large (Reasoning & Multilingual)",
    provider: "mistral",
    category: "TEXT",
    capabilities: ["TEXTO", "CODIGO", "DOCUMENTO"],
    contextWindow: 128000,
    costPer1kInputCents: 0.2,
    costPer1kOutputCents: 0.6,
    description: "Modelo de ponta europeu com alta capacidade de raciocínio, multilingual e matemática.",
    recommendedFor: "Tarefas corporativas e multilingual",
  },
  "codestral": {
    identifier: "codestral",
    name: "Mistral Codestral (Code Synthesis)",
    provider: "mistral",
    category: "CODE",
    capabilities: ["CODIGO", "TEXTO"],
    contextWindow: 256000,
    costPer1kInputCents: 0.1,
    costPer1kOutputCents: 0.3,
    description: "Modelo ultra especializado em código, completamento FIM (fill-in-the-middle) e refatoração.",
    recommendedFor: "ORVEXA DEV e Programação avançada",
  },

  // MODELOS PREPARADOS: DEEPSEEK
  "deepseek-chat": {
    identifier: "deepseek-chat",
    name: "DeepSeek V3 (Chat & General)",
    provider: "deepseek",
    category: "TEXT",
    capabilities: ["TEXTO", "CODIGO", "DOCUMENTO"],
    contextWindow: 64000,
    costPer1kInputCents: 0.014,
    costPer1kOutputCents: 0.028,
    description: "Arquitetura MoE com extrema eficiência de custo e alta capacidade em raciocínio geral.",
    recommendedFor: "Uso geral de alto desempenho e baixo custo",
  },
  "deepseek-coder": {
    identifier: "deepseek-coder",
    name: "DeepSeek Coder (Software Engineering)",
    provider: "deepseek",
    category: "CODE",
    capabilities: ["CODIGO", "TEXTO"],
    contextWindow: 128000,
    costPer1kInputCents: 0.014,
    costPer1kOutputCents: 0.028,
    description: "Referência open-weights para programação em dezenas de linguagens e algoritmos.",
    recommendedFor: "Geração de código e engenharia de software",
  },
  "deepseek-r1": {
    identifier: "deepseek-r1",
    name: "DeepSeek R1 (Deep Reasoning Engine)",
    provider: "deepseek",
    category: "RESEARCH",
    capabilities: ["TEXTO", "CODIGO", "DOCUMENTO"],
    contextWindow: 64000,
    costPer1kInputCents: 0.05,
    costPer1kOutputCents: 0.2,
    description: "Modelo de raciocínio baseado em reinforcement learning para problemas de alta complexidade.",
    recommendedFor: "Lógica matemática e raciocínio profundo",
    isFlagship: true,
  },

  // MODELOS PREPARADOS: META LLAMA
  "llama-3.3-70b": {
    identifier: "llama-3.3-70b",
    name: "Meta Llama 3.3 70B Instruct",
    provider: "llama",
    category: "TEXT",
    capabilities: ["TEXTO", "CODIGO", "DOCUMENTO"],
    contextWindow: 128000,
    costPer1kInputCents: 0.08,
    costPer1kOutputCents: 0.2,
    description: "Modelo de 70 bilhões de parâmetros da Meta com desempenho de nível flagship.",
    recommendedFor: "Respostas detalhadas e raciocínio robusto",
  },
  "llama-3.1-8b": {
    identifier: "llama-3.1-8b",
    name: "Meta Llama 3.1 8B Fast",
    provider: "llama",
    category: "TEXT",
    capabilities: ["TEXTO", "CODIGO"],
    contextWindow: 128000,
    costPer1kInputCents: 0.02,
    costPer1kOutputCents: 0.05,
    description: "Modelo ultraleve e rápido para inferência de baixa latência e assistentes ágeis.",
    recommendedFor: "Respostas instantâneas e agentes de suporte",
  },
};

/**
 * Retorna lista de modelos recomendados por categoria
 */
export function getModelsByCategory(category: ModelSpec["category"]): ModelSpec[] {
  return Object.values(MODEL_REGISTRY).filter((m) => m.category === category);
}

/**
 * Retorna lista de modelos que atendem a uma capacidade específica
 */
export function getModelsByCapability(cap: ModelSpec["capabilities"][number]): ModelSpec[] {
  return Object.values(MODEL_REGISTRY).filter((m) => m.capabilities.includes(cap));
}

/**
 * Normaliza identificador de modelo legado para modelo ativo
 */
export function normalizeModelIdentifier(identifier: string): string {
  const mapping: Record<string, string> = {
    "claude-3-5-sonnet-20241022": "claude-sonnet-5",
    "claude-3-haiku-20240307": "claude-sonnet-5",
    "gemini-1.5-pro": "gemini-3-flash-preview",
    "gemini-1.5-flash": "gemini-3-flash-preview",
    "gemini-2.5-flash": "gemini-3-flash-preview",
    "gemini-2.5-pro": "gemini-3-flash-preview",
    "gemini-flash-latest": "gemini-3-flash-preview",
  };
  return mapping[identifier] || identifier;
}

