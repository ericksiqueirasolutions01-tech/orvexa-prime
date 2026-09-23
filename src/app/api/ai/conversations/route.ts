// src/app/api/ai/conversations/route.ts
// GERENCIAMENTO DE CONVERSAS DO USUÁRIO — ORVEXA PRIME DIGITAL

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: Lista as conversas do usuário autenticado com busca opcional por título
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q")?.trim() || "";
    const projectIdParam = searchParams.get("projectId");
    const agentIdParam = searchParams.get("agentId");

    const projectFilter =
      projectIdParam === "none"
        ? { projectId: null }
        : projectIdParam
        ? { projectId: projectIdParam }
        : {};

    const agentFilter =
      agentIdParam === "none"
        ? { agentId: null }
        : agentIdParam
        ? { agentId: agentIdParam }
        : {};

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: user.id,
        ...projectFilter,
        ...agentFilter,
        ...(search
          ? {
              title: {
                contains: search,
              },
            }
          : {}),
      },
      include: {
        agent: {
          select: { id: true, name: true, avatar: true, iconName: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { content: true, role: true, createdAt: true },
        },
        _count: {
          select: { messages: true, files: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 60,
    });

    const formatted = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      modelPreference: conv.modelPreference,
      agentId: conv.agentId,
      agent: conv.agent,
      projectId: conv.projectId,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messagesCount: conv._count.messages,
      filesCount: conv._count.files,
      lastMessage: conv.messages[0]?.content?.slice(0, 100) || "Sem mensagens",
    }));

    return NextResponse.json({
      success: true,
      conversations: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    console.error("[Conversations GET Error]:", error);
    return NextResponse.json(
      { error: "Erro ao buscar histórico de conversas: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Cria uma nova conversa em branco para o usuário
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { title = "Nova Conversa", modelPreference = "orvexa-prime", agentId = null, projectId = null } = body;

    const newConversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        title: title.trim() || "Nova Conversa",
        modelPreference: modelPreference || "orvexa-prime",
        agentId: agentId || null,
        projectId: projectId || null,
      },
    });

    if (projectId) {
      await prisma.projectConversation.create({
        data: {
          projectId,
          conversationId: newConversation.id,
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      conversation: {
        id: newConversation.id,
        title: newConversation.title,
        modelPreference: newConversation.modelPreference,
        projectId: newConversation.projectId,
        createdAt: newConversation.createdAt,
        updatedAt: newConversation.updatedAt,
        messagesCount: 0,
        filesCount: 0,
        lastMessage: "Nova Conversa",
      },
    });
  } catch (error: any) {
    console.error("[Conversations POST Error]:", error);
    return NextResponse.json(
      { error: "Erro ao criar nova conversa: " + error.message },
      { status: 500 }
    );
  }
}

