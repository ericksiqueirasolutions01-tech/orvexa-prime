// src/app/api/ai/agents/[id]/route.ts
// DETALHES, EDIÇÃO E EXCLUSÃO DE AGENTE — ORVEXA AGENTS

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
        project: {
          select: { id: true, name: true, customInstructions: true },
        },
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

    let tools: any[] = [];
    try {
      tools = JSON.parse(agent.tools || "[]");
    } catch {}

    const preferredModel =
      agent.modelPreference ||
      agent.preferredModel?.modelIdentifier ||
      agent.preferredModelId ||
      "orvexa-prime";

    return NextResponse.json({
      success: true,
      agent: {
        ...agent,
        avatar: agent.avatar || "🤖",
        instructions: agent.instructions || agent.systemPrompt,
        preferredModel,
        tools,
        isOwner: agent.userId === user.id || user.role === "ADMIN",
        stats: {
          conversationsCount: agent._count.conversations,
          memoriesCount: agent._count.agentMemories,
        },
      },
    });
  } catch (error: any) {
    console.error("[Agent GET [id] Error]:", error);
    return NextResponse.json(
      { error: "Erro ao buscar agente: " + error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
    }

    // Permissão: dono ou ADMIN
    if (agent.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Você não tem permissão para editar este agente." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      role,
      description,
      avatar,
      instructions,
      systemPrompt,
      preferredModel,
      projectId,
      tools,
      color,
      isActive,
    } = body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name.trim();
    if (role !== undefined) updateData.role = role.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (avatar !== undefined) updateData.avatar = avatar;
    if (color !== undefined) updateData.color = color;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    if (instructions !== undefined || systemPrompt !== undefined) {
      const prompt = (instructions || systemPrompt || "").trim();
      updateData.instructions = prompt;
      updateData.systemPrompt = prompt;
    }

    if (preferredModel !== undefined) {
      updateData.modelPreference = preferredModel || "orvexa-prime";
    }

    if (projectId !== undefined) {
      if (projectId) {
        const proj = await prisma.project.findFirst({
          where: { id: projectId, userId: user.id },
        });
        updateData.projectId = proj ? proj.id : null;
      } else {
        updateData.projectId = null;
      }
    }

    if (tools !== undefined) {
      updateData.tools = JSON.stringify(tools || []);
    }

    const updated = await prisma.agent.update({
      where: { id: agent.id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      agent: {
        ...updated,
        tools: typeof updated.tools === "string" ? JSON.parse(updated.tools) : updated.tools,
        preferredModel: updated.modelPreference,
        isOwner: true,
      },
      message: `Agente "${updated.name}" atualizado com sucesso.`,
    });
  } catch (error: any) {
    console.error("[Agent PATCH [id] Error]:", error);
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
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = params;

    const agent = await prisma.agent.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
    }

    // Não permite que usuários normais excluam agentes nativos do sistema
    if (agent.isSystem && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Agentes oficiais do sistema não podem ser excluídos." },
        { status: 403 }
      );
    }

    // Permissão: dono ou ADMIN
    if (agent.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Você não tem permissão para excluir este agente." },
        { status: 403 }
      );
    }

    // Desvincula conversas associadas antes de deletar
    await prisma.conversation.updateMany({
      where: { agentId: agent.id },
      data: { agentId: null },
    });

    await prisma.agent.delete({
      where: { id: agent.id },
    });

    return NextResponse.json({
      success: true,
      message: `Agente "${agent.name}" excluído com sucesso.`,
    });
  } catch (error: any) {
    console.error("[Agent DELETE [id] Error]:", error);
    return NextResponse.json(
      { error: "Erro ao excluir agente: " + error.message },
      { status: 500 }
    );
  }
}
