// src/app/api/ai/projects/[id]/route.ts
// DETALHES, ATUALIZAÇÃO E EXCLUSÃO DE PROJETOS — ORVEXA PRIME DIGITAL

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

/**
 * GET: Retorna os dados completos do projeto com arquivos, memórias e conversas
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = params;

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        files: {
          orderBy: { createdAt: "desc" },
        },
        memories: {
          orderBy: { createdAt: "desc" },
        },
        conversations: {
          orderBy: { updatedAt: "desc" },
          take: 50,
          include: {
            messages: {
              take: 1,
              orderBy: { createdAt: "desc" },
              select: { content: true, role: true, createdAt: true },
            },
            _count: {
              select: { messages: true },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Projeto não encontrado ou acesso não permitido." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        customInstructions: project.customInstructions,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        files: project.files.map((f) => ({
          id: f.id,
          fileName: f.fileName,
          fileSize: f.fileSize,
          fileType: f.fileType,
          createdAt: f.createdAt,
        })),
        memories: project.memories.map((m) => ({
          id: m.id,
          key: m.key,
          content: m.content,
          category: m.category,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        })),
        conversations: project.conversations.map((c) => ({
          id: c.id,
          title: c.title,
          modelPreference: c.modelPreference,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          messagesCount: c._count.messages,
          lastMessage: c.messages[0]?.content?.slice(0, 100) || "Sem mensagens",
        })),
      },
    });
  } catch (error: any) {
    console.error("[Project GET Error]:", error);
    return NextResponse.json(
      { error: "Erro ao obter projeto: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Atualiza dados, descrição ou instruções personalizadas do projeto
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { name, description, customInstructions, status } = body;

    const existing = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Projeto não encontrado." },
        { status: 404 }
      );
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(name && typeof name === "string" ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(customInstructions !== undefined ? { customInstructions: customInstructions?.trim() || null } : {}),
        ...(status ? { status } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      project: updated,
    });
  } catch (error: any) {
    console.error("[Project PATCH Error]:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar projeto: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Exclui o projeto e seus relacionamentos
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = params;

    const existing = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Projeto não encontrado." },
        { status: 404 }
      );
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Projeto excluído com sucesso.",
    });
  } catch (error: any) {
    console.error("[Project DELETE Error]:", error);
    return NextResponse.json(
      { error: "Erro ao excluir projeto: " + error.message },
      { status: 500 }
    );
  }
}

