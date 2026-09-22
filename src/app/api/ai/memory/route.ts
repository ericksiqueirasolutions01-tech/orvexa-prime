// src/app/api/ai/memory/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getUserMemories,
  saveUserMemory,
  updateUserMemory,
  deleteUserMemory,
} from "@/ai/memory/user-memory";
import { isPgvectorConfigured } from "@/ai/memory/vector-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: Lista todas as memórias consolidadas do usuário com contagens e métricas
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "ALL";
    const search = searchParams.get("search")?.toLowerCase();

    // 1. Fatos do Usuário
    const userMemories = await prisma.userMemory.findMany({
      where: { userId: session.id },
      orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    });

    // 2. Memória das Conversas
    const conversationMemories = await prisma.conversationMemory.findMany({
      where: { userId: session.id },
      orderBy: { updatedAt: "desc" },
    });

    // 3. Conhecimento dos Arquivos
    const fileChunks = await prisma.fileKnowledge.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 150,
    });

    // 4. Memória dos Agentes
    const agentMemories = await prisma.agentMemory.findMany({
      where: { userId: session.id },
      include: { agent: true },
      orderBy: { updatedAt: "desc" },
    });

    // Mapeamento padronizado para exibição unificada
    const allItems: any[] = [];

    if (scope === "ALL" || scope === "USER") {
      userMemories.forEach((m) => {
        let parsedTags: string[] = [];
        try {
          parsedTags = JSON.parse(m.tags || "[]");
        } catch {}

        allItems.push({
          id: m.id,
          type: "USER",
          typeLabel: "Fato do Usuário",
          title: m.key,
          content: m.value,
          category: m.category,
          tags: parsedTags,
          importance: m.importance,
          hasEmbedding: !!m.embedding,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        });
      });
    }

    if (scope === "ALL" || scope === "CONVERSATION") {
      conversationMemories.forEach((c) => {
        let parsedTakeaways: string[] = [];
        let parsedTags: string[] = [];
        try {
          parsedTakeaways = JSON.parse(c.keyTakeaways || "[]");
          parsedTags = JSON.parse(c.tags || "[]");
        } catch {}

        allItems.push({
          id: c.id,
          type: "CONVERSATION",
          typeLabel: "Conversa Anterior",
          title: c.title,
          content: c.summary,
          category: "CONVERSATION",
          tags: parsedTags,
          importance: 4,
          hasEmbedding: !!c.embedding,
          metadata: { conversationId: c.conversationId, takeaways: parsedTakeaways },
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        });
      });
    }

    if (scope === "ALL" || scope === "FILE") {
      fileChunks.forEach((f) => {
        allItems.push({
          id: f.id,
          type: "FILE",
          typeLabel: "Conhecimento de Arquivo",
          title: `${f.fileName} (Parte ${f.chunkIndex + 1})`,
          content: f.content,
          category: f.category,
          tags: [f.category.toLowerCase(), "documento"],
          importance: 3,
          hasEmbedding: !!f.embedding,
          metadata: { fileId: f.fileId, chunkIndex: f.chunkIndex, summary: f.summary },
          createdAt: f.createdAt.toISOString(),
          updatedAt: f.updatedAt.toISOString(),
        });
      });
    }

    if (scope === "ALL" || scope === "AGENT") {
      agentMemories.forEach((a) => {
        let parsedTags: string[] = [];
        try {
          parsedTags = JSON.parse(a.tags || "[]");
        } catch {}

        allItems.push({
          id: a.id,
          type: "AGENT",
          typeLabel: `Agente: ${a.agent.name}`,
          title: a.key,
          content: a.value,
          category: a.category,
          tags: parsedTags,
          importance: a.importance,
          hasEmbedding: !!a.embedding,
          metadata: { agentId: a.agentId, agentSlug: a.agent.slug },
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
        });
      });
    }

    // Filtro por texto opcional
    let filteredItems = allItems;
    if (search) {
      filteredItems = allItems.filter(
        (i) =>
          i.title.toLowerCase().includes(search) ||
          i.content.toLowerCase().includes(search) ||
          i.category?.toLowerCase().includes(search) ||
          (i.tags && i.tags.some((t: string) => t.toLowerCase().includes(search)))
      );
    }

    return NextResponse.json({
      metrics: {
        totalMemories: userMemories.length + conversationMemories.length + fileChunks.length + agentMemories.length,
        userFactsCount: userMemories.length,
        conversationsCount: conversationMemories.length,
        fileChunksCount: fileChunks.length,
        agentMemoriesCount: agentMemories.length,
        isPgvectorReady: isPgvectorConfigured(),
        pgvectorStatus: isPgvectorConfigured() ? "Ativo (PostgreSQL)" : "Pronto (Fallback SQLite Vetorial)",
      },
      items: filteredItems,
    });
  } catch (error: any) {
    console.error("[Memory GET Error]", error);
    return NextResponse.json({ error: "Falha ao listar memórias." }, { status: 500 });
  }
}

/**
 * POST: Cria um novo fato / memória personalizada para o usuário
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { key, value, category = "GENERAL", tags = [], importance = 3 } = body;

    if (!key || !value) {
      return NextResponse.json(
        { error: "Os campos 'key' (identificador) e 'value' (conteúdo) são obrigatórios." },
        { status: 400 }
      );
    }

    const created = await saveUserMemory(session.id, {
      key: key.trim(),
      value: value.trim(),
      category,
      tags: Array.isArray(tags) ? tags : [tags],
      importance: Number(importance) || 3,
    });

    return NextResponse.json({ success: true, item: created });
  } catch (error: any) {
    console.error("[Memory POST Error]", error);
    return NextResponse.json({ error: error?.message || "Falha ao salvar memória." }, { status: 500 });
  }
}

/**
 * PUT: Edita uma memória existente
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { id, type = "USER", key, value, category, tags, importance } = body;

    if (!id || !value) {
      return NextResponse.json(
        { error: "O 'id' e o 'value' são obrigatórios para edição." },
        { status: 400 }
      );
    }

    if (type === "USER") {
      const updated = await updateUserMemory(session.id, id, {
        key,
        value,
        category,
        tags: Array.isArray(tags) ? tags : undefined,
        importance: importance !== undefined ? Number(importance) : undefined,
      });
      return NextResponse.json({ success: true, item: updated });
    }

    if (type === "AGENT") {
      const updated = await prisma.agentMemory.update({
        where: { id },
        data: {
          key: key || undefined,
          value,
          category: category || undefined,
          tags: tags ? JSON.stringify(tags) : undefined,
          importance: importance ? Number(importance) : undefined,
        },
      });
      return NextResponse.json({ success: true, item: updated });
    }

    if (type === "CONVERSATION") {
      const updated = await prisma.conversationMemory.update({
        where: { id },
        data: {
          title: key || undefined,
          summary: value,
          tags: tags ? JSON.stringify(tags) : undefined,
        },
      });
      return NextResponse.json({ success: true, item: updated });
    }

    if (type === "FILE") {
      const updated = await prisma.fileKnowledge.update({
        where: { id },
        data: {
          content: value,
          category: category || undefined,
        },
      });
      return NextResponse.json({ success: true, item: updated });
    }

    return NextResponse.json({ error: "Tipo de memória não suportado para edição." }, { status: 400 });
  } catch (error: any) {
    console.error("[Memory PUT Error]", error);
    return NextResponse.json({ error: error?.message || "Falha ao editar memória." }, { status: 500 });
  }
}

/**
 * DELETE: Remove uma memória específica
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type") || "USER";

    if (!id) {
      return NextResponse.json({ error: "O parâmetro 'id' é obrigatório." }, { status: 400 });
    }

    if (type === "USER") {
      await deleteUserMemory(session.id, id);
    } else if (type === "CONVERSATION") {
      await prisma.conversationMemory.deleteMany({
        where: { id, userId: session.id },
      });
    } else if (type === "FILE") {
      await prisma.fileKnowledge.deleteMany({
        where: { id, userId: session.id },
      });
    } else if (type === "AGENT") {
      await prisma.agentMemory.deleteMany({
        where: { id, userId: session.id },
      });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("[Memory DELETE Error]", error);
    return NextResponse.json({ error: "Falha ao excluir memória." }, { status: 500 });
  }
}

