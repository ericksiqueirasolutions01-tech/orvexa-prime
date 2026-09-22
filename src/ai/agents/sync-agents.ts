// src/ai/agents/sync-agents.ts
// SINCRONIZADOR DE AGENTES PROFISSIONAIS NO BANCO DE DADOS — ORVEXA PRIME

import { prisma } from "@/lib/prisma";
import { OFFICIAL_AGENTS } from "@/lib/agents-hub";

export async function syncOfficialAgentsToDatabase() {
  try {
    for (const agentDef of OFFICIAL_AGENTS) {
      // Tenta localizar o modelo de IA no banco para vincular a FK
      const modelInDb = await prisma.aiModel.findFirst({
        where: {
          OR: [
            { modelIdentifier: agentDef.preferredModelId },
            { id: agentDef.preferredModelId },
          ],
        },
      });

      await prisma.agent.upsert({
        where: { slug: agentDef.slug },
        update: {
          name: agentDef.name,
          role: agentDef.role,
          badge: agentDef.badge,
          color: agentDef.color,
          description: agentDef.description,
          systemPrompt: agentDef.systemPrompt,
          iconName: agentDef.iconName,
          category: agentDef.category,
          tools: JSON.stringify(agentDef.tools),
          isSystem: true,
          preferredModelId: modelInDb?.id || null,
        },
        create: {
          slug: agentDef.slug,
          name: agentDef.name,
          role: agentDef.role,
          badge: agentDef.badge,
          color: agentDef.color,
          description: agentDef.description,
          systemPrompt: agentDef.systemPrompt,
          iconName: agentDef.iconName,
          category: agentDef.category,
          tools: JSON.stringify(agentDef.tools),
          allowedRoles: JSON.stringify(["USER", "ADMIN"]),
          allowedPlans: JSON.stringify(["ALL"]),
          isSystem: true,
          isActive: true,
          preferredModelId: modelInDb?.id || null,
        },
      });
    }

    return { success: true, count: OFFICIAL_AGENTS.length };
  } catch (error: any) {
    console.error("[Sync Official Agents Error]", error);
    return { success: false, error: error.message };
  }
}

