// src/app/api/ai/agents/[id]/duplicate/route.ts
// DUPLICAR AGENTE ESPECIALISTA — ORVEXA AGENTS

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = params;

    const sourceAgent = await prisma.agent.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    if (!sourceAgent) {
      return NextResponse.json({ error: "Agente de origem não encontrado." }, { status: 404 });
    }

    // Gera slug único para a cópia
    const baseSlug = sourceAgent.slug.replace(/-copia-\w+$/, "");
    const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const newSlug = `${baseSlug}-copia-${uniqueSuffix}`;

    const cloned = await prisma.agent.create({
      data: {
        userId: user.id,
        projectId: sourceAgent.projectId,
        name: `${sourceAgent.name} (Cópia)`,
        slug: newSlug,
        role: sourceAgent.role,
        badge: "PERSONALIZADO",
        color: sourceAgent.color,
        avatar: sourceAgent.avatar || "🤖",
        description: sourceAgent.description,
        instructions: sourceAgent.instructions || sourceAgent.systemPrompt,
        systemPrompt: sourceAgent.systemPrompt,
        modelPreference: sourceAgent.modelPreference || "orvexa-prime",
        iconName: sourceAgent.iconName,
        category: sourceAgent.category || "PERSONALIZADO",
        tools: sourceAgent.tools,
        allowedRoles: JSON.stringify(["USER", "ADMIN"]),
        allowedPlans: JSON.stringify(["ALL"]),
        isSystem: false,
        isActive: true,
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        agent: {
          ...cloned,
          tools: typeof cloned.tools === "string" ? JSON.parse(cloned.tools) : cloned.tools,
          preferredModel: cloned.modelPreference,
          isOwner: true,
        },
        message: `Agente duplicado com sucesso como "${cloned.name}".`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Agent Duplicate Error]:", error);
    return NextResponse.json(
      { error: "Erro ao duplicar agente: " + error.message },
      { status: 500 }
    );
  }
}

