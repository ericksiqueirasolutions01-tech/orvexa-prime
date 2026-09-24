// src/lib/model-names.ts
// NOMES AMIGÁVEIS E REGISTRO INTELIGENTE DE MODELOS — ORVEXA PRIME

export interface ModelDisplayInfo {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  badgeColor: string;
  description: string;
  speed: "Ultra Rápido" | "Rápido" | "Profundo";
  power: "Alta Potência" | "Equilibrado" | "Especialista";
  recommendedFor: string;
  isDefault?: boolean;
}

export const FRIENDLY_MODELS: Record<string, ModelDisplayInfo> = {
  "orvexa-prime": {
    id: "orvexa-prime",
    name: "ORVEXA Auto",
    shortName: "Auto",
    badge: "Recomendado",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    description: "Roteamento inteligente que escolhe automaticamente o melhor modelo para sua solicitação.",
    speed: "Rápido",
    power: "Alta Potência",
    recommendedFor: "Geral, tarefas variadas, escrita e raciocínio",
    isDefault: true,
  },
  "gpt-6-sol": {
    id: "gpt-6-sol",
    name: "ORVEXA Prime",
    shortName: "Prime",
    badge: "Mais Inteligente",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    description: "Modelo principal de máxima capacidade. Excelente para raciocínio analítico, planejamento e redação premium.",
    speed: "Rápido",
    power: "Alta Potência",
    recommendedFor: "Planejamento, textos persuasivos, análise estratégica",
  },
  "gpt-5.6-sol": {
    id: "gpt-5.6-sol",
    name: "ORVEXA Codex",
    shortName: "Codex",
    badge: "Especialista em Código",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    description: "Otimizado para engenharia de software, geração de código, refatoração e arquitetura de sistemas.",
    speed: "Rápido",
    power: "Especialista",
    recommendedFor: "Programação, APIs, banco de dados, depuração",
  },
  "gpt-5.6-terra": {
    id: "gpt-5.6-terra",
    name: "ORVEXA Análise",
    shortName: "Análise",
    badge: "Documentos & Dados",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    description: "Especialista em processamento de contexto amplo, leitura de PDFs, contratos extensos e relatórios.",
    speed: "Rápido",
    power: "Especialista",
    recommendedFor: "Leitura de PDFs, planilhas, contratos e pesquisa",
  },
  "gpt-5.6-luna": {
    id: "gpt-5.6-luna",
    name: "ORVEXA Instant",
    shortName: "Instant",
    badge: "Ultra Rápido",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    description: "Respostas imediatas e concisas com máxima velocidade e baixo consumo de créditos.",
    speed: "Ultra Rápido",
    power: "Equilibrado",
    recommendedFor: "Perguntas rápidas, brainstorm, traduções simples",
  },
};

/**
 * Retorna informações de exibição amigável para qualquer identificador de modelo
 */
export function getModelDisplayInfo(modelId: string): ModelDisplayInfo {
  if (FRIENDLY_MODELS[modelId]) {
    return FRIENDLY_MODELS[modelId];
  }

  // Fallback inteligente para modelos não mapeados
  const cleanName = modelId
    .replace(/^gpt-/, "GPT ")
    .replace(/^claude-/, "Claude ")
    .replace(/^gemini-/, "Gemini ")
    .replace(/-/g, " ")
    .toUpperCase();

  return {
    id: modelId,
    name: cleanName,
    shortName: cleanName.slice(0, 10),
    badge: "IA Conectada",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    description: `Modelo ativo no provedor configurado (${modelId}).`,
    speed: "Rápido",
    power: "Equilibrado",
    recommendedFor: "Uso geral",
  };
}

