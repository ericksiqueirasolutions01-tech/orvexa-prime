// src/ai/agents/tool-dispatcher.ts
// DESPACHANTE AUTÔNOMO DE FERRAMENTAS — ORVEXA PRIME
// O agente escolhe e aciona automaticamente a ferramenta ideal conforme a intenção do usuário

import { AgentTool, executeAgentTool } from "@/lib/agents-hub";

export interface AutonomousDispatchResult {
  executed: boolean;
  tool?: AgentTool;
  result?: {
    title: string;
    output: string;
  };
  diagnosticBadge?: string;
}

/**
 * Detecta semanticamente qual ferramenta do agente deve ser ativada para atender à demanda.
 */
export function detectAutonomousTool(
  agentSlug: string,
  tools: AgentTool[],
  userPrompt: string
): AgentTool | null {
  if (!tools || tools.length === 0) return null;

  const p = userPrompt.toLowerCase();

  // Heurísticas de Roteamento por Agente e Palavras-chave
  for (const tool of tools) {
    const tid = tool.id.toLowerCase();
    const tname = tool.name.toLowerCase();

    // ORVEXA DEV
    if (tid === "unit-tests" && (p.includes("teste") || p.includes("jest") || p.includes("vitest") || p.includes("pytest") || p.includes("unitário"))) {
      return tool;
    }
    if (tid === "refactor-clean" && (p.includes("refator") || p.includes("clean architecture") || p.includes("solid") || p.includes("organizar código") || p.includes("code smell"))) {
      return tool;
    }

    // ORVEXA DESIGN
    if (tid === "palette-generator" && (p.includes("paleta") || p.includes("cor") || p.includes("cores") || p.includes("hex") || p.includes("harmonia cromática"))) {
      return tool;
    }
    if (tid === "design-system-tokens" && (p.includes("componente") || p.includes("glassmorphism") || p.includes("card") || p.includes("navbar") || p.includes("design system"))) {
      return tool;
    }

    // ORVEXA MARKETING
    if (tid === "aida-copy" && (p.includes("copy") || p.includes("aida") || p.includes("persuasivo") || p.includes("copywriting") || p.includes("headline"))) {
      return tool;
    }
    if (tid === "ad-variations" && (p.includes("anúncio") || p.includes("anuncio") || p.includes("meta ads") || p.includes("google ads") || p.includes("campanha"))) {
      return tool;
    }

    // ORVEXA EDU
    if (tid === "flashcards-generator" && (p.includes("flashcard") || p.includes("anki") || p.includes("memorizar") || p.includes("questões") || p.includes("revisão"))) {
      return tool;
    }
    if (tid === "feynman-explanation" && (p.includes("feynman") || p.includes("explique como se") || p.includes("leigo") || p.includes("analogia simples") || p.includes("didática"))) {
      return tool;
    }

    // ORVEXA BUSINESS
    if (tid === "unit-economics" && (p.includes("cac") || p.includes("ltv") || p.includes("payback") || p.includes("churn") || p.includes("unit economics") || p.includes("margem"))) {
      return tool;
    }
    if (tid === "pitch-deck-generator" && (p.includes("pitch") || p.includes("pitch deck") || p.includes("apresentação para investidor") || p.includes("captação") || p.includes("rodada"))) {
      return tool;
    }

    // ORVEXA ANALYST
    if (tid === "kpi-forecast" && (p.includes("forecast") || p.includes("projeção") || p.includes("previsão") || p.includes("simulação") || p.includes("kpi"))) {
      return tool;
    }
    if (tid === "data-insights" && (p.includes("cohort") || p.includes("retenção") || p.includes("análise de dados") || p.includes("jornada"))) {
      return tool;
    }

    // ORVEXA JURÍDICO
    if (tid === "lgpd-checklist" && (p.includes("lgpd") || p.includes("privacidade") || p.includes("anpd") || p.includes("cookies") || p.includes("dados pessoais"))) {
      return tool;
    }
    if (tid === "nda-drafter" && (p.includes("nda") || p.includes("confidencialidade") || p.includes("sigilo") || p.includes("acordo"))) {
      return tool;
    }

    // Suporte Geral & Agentes Personalizados criados pelo Administrador
    if (p.includes(tname) || p.includes(tid)) {
      return tool;
    }
  }

  return null;
}

/**
 * Executa de forma autônoma a ferramenta escolhida pelo agente.
 */
export function dispatchAutonomousAgentTool(
  agentSlug: string,
  tools: AgentTool[],
  userPrompt: string
): AutonomousDispatchResult {
  const chosenTool = detectAutonomousTool(agentSlug, tools, userPrompt);
  if (!chosenTool) {
    return { executed: false };
  }

  const toolOutput = executeAgentTool(agentSlug, chosenTool.id, userPrompt);

  return {
    executed: true,
    tool: chosenTool,
    result: toolOutput,
    diagnosticBadge: `⚡ Ferramenta Autônoma: ${chosenTool.name}`,
  };
}
