// src/app/api/ai/agents/[id]/memory/route.ts
// GESTÃO DE MEMÓRIA DEDICADA POR AGENTE — ORVEXA PRIME

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAgentMemories,
  saveAgentMemory,
  deleteAgentMemory,
} from "@/ai/agents/agent-memory";

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

    const memories = await getAgentMemories(agent.id, user.id);

    return NextResponse.json({
      success: true,
      agent: { id: agent.id, name: agent.name, slug: agent.slug },
      memories,
      total: memories.length,
    });
  } catch (error: any) {
    console.error("[Agent Memory GET Error]:", error);
    return NextResponse.json(
      { error: "Erro ao buscar memórias do agente: " + error.message },
      { status: 500 }
    );
  }
}

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
    const agent = await prisma.agent.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
    }

    const body = await req.json();
    const { key, value, category = "PREFERENCE", tags = [], importance = 3 } = body;

    if (!key || !value) {
      return NextResponse.json(
        { error: "Chave (key) e Conteúdo (value) da memória são obrigatórios." },
        { status: 400 }
      );
    }

    const memory = await saveAgentMemory(agent.id, user.id, {
      key,
      value,
      category,
      tags,
      importance: Number(importance),
    });

    return NextResponse.json(
      {
        success: true,
        memory,
        message: `Memória registrada com sucesso para o especialista ${agent.name}.`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Agent Memory POST Error]:", error);
    return NextResponse.json(
      { error: "Erro ao salvar memória do agente: " + error.message },
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

    const { searchParams } = new URL(req.url);
    const memoryId = searchParams.get("memoryId");

    if (!memoryId) {
      return NextResponse.json({ error: "memoryId é obrigatório." }, { status: 400 });
    }

    await deleteAgentMemory(memoryId, user.id);

    return NextResponse.json({
      success: true,
      message: "Memória removida com sucesso.",
    });
  } catch (error: any) {
    console.error("[Agent Memory DELETE Error]:", error);
    return NextResponse.json(
      { error: "Erro ao excluir memória do agente: " + error.message },
      { status: 500 }
    );
  }
}

