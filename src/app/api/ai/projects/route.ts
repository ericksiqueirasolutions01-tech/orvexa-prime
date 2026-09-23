// src/app/api/ai/projects/route.ts
// GERENCIAMENTO DE PROJETOS E ESPAÇOS DE TRABALHO — ORVEXA PRIME DIGITAL

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: Lista os projetos do usuário autenticado com contagem de recursos
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q")?.trim() || "";

    const projects = await prisma.project.findMany({
      where: {
        userId: user.id,
        status: { not: "ARCHIVED" },
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { description: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        _count: {
          select: {
            files: true,
            memories: true,
            conversations: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const formatted = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      customInstructions: p.customInstructions,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      filesCount: p._count.files,
      memoriesCount: p._count.memories,
      conversationsCount: p._count.conversations,
    }));

    return NextResponse.json({
      success: true,
      projects: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    console.error("[Projects GET Error]:", error);
    return NextResponse.json(
      { error: "Erro ao listar projetos: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Cria um novo projeto com instruções personalizadas opcionais
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, description, customInstructions } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "O nome do projeto é obrigatório." },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        customInstructions: customInstructions?.trim() || null,
        status: "ACTIVE",
      },
    });

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
        filesCount: 0,
        memoriesCount: 0,
        conversationsCount: 0,
      },
    });
  } catch (error: any) {
    console.error("[Projects POST Error]:", error);
    return NextResponse.json(
      { error: "Erro ao criar projeto: " + error.message },
      { status: 500 }
    );
  }
}

