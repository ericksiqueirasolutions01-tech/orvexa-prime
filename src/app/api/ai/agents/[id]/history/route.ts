// src/app/api/ai/agents/[id]/history/route.ts
// HISTÓRICO PRÓPRIO DE CONVERSAS COM O AGENTE — ORVEXA PRIME

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
    });

    if (!agent) {
      return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: user.id,
        agentId: agent.id,
      },
      include: {
        messages: {
          take: 2,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { messages: true, files: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    const formatted = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      modelPreference: conv.modelPreference,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messagesCount: conv._count.messages,
      filesCount: conv._count.files,
      lastMessage: conv.messages[0]?.content?.slice(0, 120) || "Sem mensagens",
    }));

    return NextResponse.json({
      success: true,
      agent: { id: agent.id, name: agent.name, slug: agent.slug },
      conversations: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    console.error("[Agent History GET Error]:", error);
    return NextResponse.json(
      { error: "Erro ao buscar histórico do agente: " + error.message },
      { status: 500 }
    );
  }
}

