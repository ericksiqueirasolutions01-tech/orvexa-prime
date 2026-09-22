// src/app/api/ai/agents/[id]/route.ts
// DETALHES, ATUALIZAÇÃO E EXCLUSÃO DE AGENTE — ORVEXA PRIME

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = params;
    const agent = await prisma.agent.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        preferredModel: true,
        _count: {
          select: {
            conversations: { where: { userId: user.id } },
            agentMemories: { where: { userId: user.id } },
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      agent: {
        ...agent,
        tools: JSON.parse(agent.tools || "[]"),
        allowedRoles: JSON.parse(agent.allowedRoles || "[\"USER\",\"ADMIN\"]"),
        allowedPlans: JSON.parse(agent.allowedPlans || "[\"ALL\"]"),
      },
    });
  } catch (error: any) {
    console.error("[Agent GET Error]:", error);
    return NextResponse.json(
      { error: "Erro ao buscar agente: " + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem alterar configurações de agentes." },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json();

    const existing = await prisma.agent.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
    }

    // Processa atualização de campos
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.badge !== undefined) updateData.badge = body.badge;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.systemPrompt !== undefined) updateData.systemPrompt = body.systemPrompt;
    if (body.iconName !== undefined) updateData.iconName = body.iconName;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

    if (body.tools !== undefined) {
      updateData.tools = typeof body.tools === "string" ? body.tools : JSON.stringify(body.tools);
    }
    if (body.allowedRoles !== undefined) {
      updateData.allowedRoles = typeof body.allowedRoles === "string" ? body.allowedRoles : JSON.stringify(body.allowedRoles);
    }
    if (body.allowedPlans !== undefined) {
      updateData.allowedPlans = typeof body.allowedPlans === "string" ? body.allowedPlans : JSON.stringify(body.allowedPlans);
    }

    if (body.preferredModelId !== undefined) {
      const modelInDb = await prisma.aiModel.findFirst({
        where: {
          OR: [{ id: body.preferredModelId }, { modelIdentifier: body.preferredModelId }],
        },
      });
      updateData.preferredModelId = modelInDb?.id || null;
    }

    const updated = await prisma.agent.update({
      where: { id: existing.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      agent: updated,
      message: `Agente "${updated.name}" atualizado com sucesso.`,
    });
  } catch (error: any) {
    console.error("[Agent PUT Error]:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar agente: " + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem excluir agentes." },
        { status: 403 }
      );
    }

    const { id } = params;
    const existing = await prisma.agent.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
    }

    // Agentes nativos do sistema não podem ser excluídos, apenas desativados
    if (existing.isSystem) {
      return NextResponse.json(
        {
          error: "Agentes nativos da ORVEXA não podem ser excluídos. Você pode desativá-los com o botão de status.",
        },
        { status: 400 }
      );
    }

    await prisma.agent.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      success: true,
      message: `Agente "${existing.name}" excluído com sucesso.`,
    });
  } catch (error: any) {
    console.error("[Agent DELETE Error]:", error);
    return NextResponse.json(
      { error: "Erro ao excluir agente: " + error.message },
      { status: 500 }
    );
  }
}
