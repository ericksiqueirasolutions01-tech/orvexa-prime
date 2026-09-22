// src/ai/agents/agent-memory.ts
// MEMÓRIA DEDICADA & ISOLADA POR AGENTE — ORVEXA PRIME

import { prisma } from "@/lib/prisma";

export interface AgentMemoryEntry {
  key: string;
  value: string;
  category?: "STACK" | "PREFERENCE" | "FACT" | "RULE" | "CONTEXT" | "GENERAL";
  tags?: string[];
  importance?: number;
}

/**
 * Salva ou atualiza uma memória vinculada a um agente e a um usuário específico.
 */
export async function saveAgentMemory(
  agentId: string,
  userId: string,
  entry: AgentMemoryEntry
) {
  const existing = await prisma.agentMemory.findFirst({
    where: {
      agentId,
      userId,
      key: entry.key,
    },
  });

  if (existing) {
    return prisma.agentMemory.update({
      where: { id: existing.id },
      data: {
        value: entry.value,
        category: entry.category || existing.category,
        tags: entry.tags ? JSON.stringify(entry.tags) : existing.tags,
        importance: entry.importance ?? existing.importance,
      },
    });
  }

  return prisma.agentMemory.create({
    data: {
      agentId,
      userId,
      key: entry.key,
      value: entry.value,
      category: entry.category || "GENERAL",
      tags: JSON.stringify(entry.tags || []),
      importance: entry.importance ?? 3,
    },
  });
}

/**
 * Recupera as memórias que este agente possui sobre este usuário.
 */
export async function getAgentMemories(
  agentId: string,
  userId: string,
  category?: string
) {
  return prisma.agentMemory.findMany({
    where: {
      agentId,
      userId,
      category: category || undefined,
    },
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
  });
}

/**
 * Remove uma memória específica com checagem de propriedade.
 */
export async function deleteAgentMemory(memoryId: string, userId: string) {
  const memory = await prisma.agentMemory.findUnique({
    where: { id: memoryId },
  });

  if (!memory || memory.userId !== userId) {
    throw new Error("Memória não encontrada ou sem autorização.");
  }

  return prisma.agentMemory.delete({
    where: { id: memoryId },
  });
}

/**
 * Constrói o bloco de prompt de contexto de memória exclusivo do agente.
 */
export async function buildAgentMemoryContextPrompt(
  agentId: string,
  userId: string
): Promise<string> {
  const memories = await getAgentMemories(agentId, userId);
  if (!memories || memories.length === 0) return "";

  const lines = memories
    .map((m) => `- [${m.key}] (${m.category}): ${m.value}`)
    .join("\n");

  return `\n[MEMÓRIA DEDICADA DESTE ESPECIALISTA SOBRE O USUÁRIO]:\n${lines}\nLembre-se destas preferências e fatos anteriores ao responder.\n`;
}

/**
 * Extrai e salva fatos automaticamente a partir de mensagens enviadas para o agente.
 */
export async function extractAndSaveAgentFacts(
  agentId: string,
  userId: string,
  agentSlug: string,
  userMessage: string
) {
  try {
    const text = userMessage.toLowerCase();

    // 1. ORVEXA DEV: Detecta stacks de desenvolvimento
    if (agentSlug.includes("dev")) {
      if (text.includes("react") || text.includes("next.js") || text.includes("vue")) {
        const stackMatch = text.match(/(next\.js|react|vue|angular|node|python|django|fastapi|nest)/i);
        if (stackMatch) {
          await saveAgentMemory(agentId, userId, {
            key: "dev_stack_preferida",
            value: `O usuário utiliza a tecnologia ${stackMatch[0]} em seus projetos.`,
            category: "STACK",
            tags: ["dev", "tech_stack", stackMatch[0].toLowerCase()],
            importance: 4,
          });
        }
      }
      if (text.includes("prisma") || text.includes("postgres") || text.includes("mysql") || text.includes("sqlite")) {
        const dbMatch = text.match(/(prisma|postgres|mysql|sqlite|mongodb)/i);
        if (dbMatch) {
          await saveAgentMemory(agentId, userId, {
            key: "banco_de_dados_preferido",
            value: `O usuário utiliza ${dbMatch[0]} como camada de banco de dados.`,
            category: "STACK",
            tags: ["database", dbMatch[0].toLowerCase()],
            importance: 4,
          });
        }
      }
    }

    // 2. ORVEXA DESIGN: Detecta identidade visual e cores
    else if (agentSlug.includes("design")) {
      if (text.includes("cor") || text.includes("paleta") || text.includes("estilo")) {
        await saveAgentMemory(agentId, userId, {
          key: "diretriz_visual_recente",
          value: `O usuário solicitou referências de design para: "${userMessage.slice(0, 100)}".`,
          category: "PREFERENCE",
          tags: ["design", "ui", "cores"],
          importance: 3,
        });
      }
    }

    // 3. ORVEXA MARKETING: Detecta nicho de mercado ou produto
    else if (agentSlug.includes("marketing")) {
      if (text.includes("meu produto") || text.includes("minha empresa") || text.includes("minha oferta")) {
        await saveAgentMemory(agentId, userId, {
          key: "produto_ou_oferta_recente",
          value: userMessage.slice(0, 150),
          category: "CONTEXT",
          tags: ["marketing", "oferta", "copy"],
          importance: 4,
        });
      }
    }

    // 4. ORVEXA EDU: Detecta tópicos de estudo
    else if (agentSlug.includes("edu") || agentSlug.includes("estudos")) {
      if (text.includes("concurso") || text.includes("estudando") || text.includes("prova")) {
        await saveAgentMemory(agentId, userId, {
          key: "foco_de_estudos",
          value: `Área de estudos prioritária do usuário: "${userMessage.slice(0, 100)}"`,
          category: "FACT",
          tags: ["estudo", "pedagogico"],
          importance: 4,
        });
      }
    }

    // 5. ORVEXA BUSINESS: Detecta metas de negócios e métricas
    else if (agentSlug.includes("business")) {
      if (text.includes("cac") || text.includes("ltv") || text.includes("faturamento") || text.includes("startup")) {
        await saveAgentMemory(agentId, userId, {
          key: "metricas_de_negocio",
          value: `Parâmetros corporativos informados pelo usuário: "${userMessage.slice(0, 120)}"`,
          category: "FACT",
          tags: ["business", "financeiro", "kpi"],
          importance: 4,
        });
      }
    }

    // 6. ORVEXA ANALYST: Detecta relatórios e KPIs monitorados
    else if (agentSlug.includes("analyst")) {
      if (text.includes("kpi") || text.includes("vendas") || text.includes("churn") || text.includes("cohort")) {
        await saveAgentMemory(agentId, userId, {
          key: "kpis_monitorados",
          value: `O usuário acompanha métricas analíticas sobre: "${userMessage.slice(0, 100)}"`,
          category: "FACT",
          tags: ["analise", "dados", "cohort"],
          importance: 3,
        });
      }
    }
  } catch (err) {
    console.error("[extractAndSaveAgentFacts Error]", err);
  }
}

