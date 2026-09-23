// src/app/api/ai/projects/[id]/memories/route.ts
// GERENCIAMENTO DE MEMÓRIA CONTEXTUAL DO PROJETO — ORVEXA PRIME DIGITAL

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

/**
 * GET: Lista as memórias contextuais do projeto
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id: projectId } = params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
    }

    const memories = await prisma.projectMemory.findMany({
      where: { projectId, userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      memories,
    });
  } catch (error: any) {
    console.error("[Project Memories GET Error]:", error);
    return NextResponse.json(
      { error: "Erro ao listar memórias do projeto: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Salva uma nova informação importante na memória contextual do projeto
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id: projectId } = params;
    const body = await req.json().catch(() => ({}));
    const { content, key, category = "CONTEXT" } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "O conteúdo da memória é obrigatório." },
        { status: 400 }
      );
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
    }

    const memory = await prisma.projectMemory.create({
      data: {
        projectId,
        userId: user.id,
        content: content.trim(),
        key: key?.trim() || null,
        category: category || "CONTEXT",
      },
    });

    return NextResponse.json({
      success: true,
      memory,
    });
  } catch (error: any) {
    console.error("[Project Memories POST Error]:", error);
    return NextResponse.json(
      { error: "Erro ao salvar memória do projeto: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Exclui uma memória do projeto via query param ?memoryId=... ou body
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id: projectId } = params;
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const memoryId = searchParams.get("memoryId") || body.memoryId;

    if (!memoryId) {
      return NextResponse.json(
        { error: "O ID da memória é obrigatório para exclusão." },
        { status: 400 }
      );
    }

    const existing = await prisma.projectMemory.findFirst({
      where: { id: memoryId, projectId, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Memória não encontrada." },
        { status: 404 }
      );
    }

    await prisma.projectMemory.delete({
      where: { id: memoryId },
    });

    return NextResponse.json({
      success: true,
      message: "Informação removida da memória do projeto.",
    });
  } catch (error: any) {
    console.error("[Project Memories DELETE Error]:", error);
    return NextResponse.json(
      { error: "Erro ao excluir memória do projeto: " + error.message },
      { status: 500 }
    );
  }
}

