// src/app/api/ai/conversations/[id]/route.ts
// DETALHES, EDIÇÃO E EXCLUSÃO DE UMA CONVERSA ESPECÍFICA — ORVEXA PRIME

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: Retorna os dados da conversa e todas as mensagens armazenadas
 */
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

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
        files: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            fileSizeBytes: true,
            category: true,
            createdAt: true,
          },
        },
        agent: {
          select: { id: true, name: true, slug: true, iconName: true },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
    }

    const formattedMessages = conversation.messages.map((m) => ({
      id: m.id,
      role: m.role.toLowerCase() as "user" | "assistant" | "system",
      content: m.content,
      createdAt: m.createdAt,
    }));

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        modelPreference: conversation.modelPreference,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        agent: conversation.agent,
        files: conversation.files,
        messages: formattedMessages,
      },
    });
  } catch (error: any) {
    console.error("[Conversation Details GET Error]:", error);
    return NextResponse.json(
      { error: "Erro ao buscar detalhes da conversa: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Renomeia a conversa ou atualiza o modelo preferido
 */
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
    const body = await req.json();
    const { title, modelPreference } = body;

    const existing = await prisma.conversation.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: title.trim() || "Sem título" } : {}),
        ...(modelPreference !== undefined ? { modelPreference } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      conversation: {
        id: updated.id,
        title: updated.title,
        modelPreference: updated.modelPreference,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("[Conversation PATCH Error]:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar conversa: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Remove a conversa e todas as mensagens associadas
 */
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

    const existing = await prisma.conversation.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
    }

    await prisma.conversation.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Conversa excluída com sucesso.",
    });
  } catch (error: any) {
    console.error("[Conversation DELETE Error]:", error);
    return NextResponse.json(
      { error: "Erro ao excluir conversa: " + error.message },
      { status: 500 }
    );
  }
}

