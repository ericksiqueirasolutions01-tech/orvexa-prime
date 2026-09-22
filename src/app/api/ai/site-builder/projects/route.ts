import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      projects,
    });
  } catch (error: any) {
    console.error("[SiteBuilder Projects GET Error]:", error);
    return NextResponse.json(
      { error: "Erro ao buscar projetos: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { name, segment, description, layoutData } = body;

    if (!name || !segment) {
      return NextResponse.json(
        { error: "Nome e Segmento são obrigatórios." },
        { status: 400 }
      );
    }

    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") + "-" + Date.now().toString(36);

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name,
        slug,
        segment: segment.toUpperCase(),
        description: description || `Site gerado para ${name}`,
        layoutData: typeof layoutData === "string" ? layoutData : JSON.stringify(layoutData),
        status: "PUBLISHED",
      },
    });

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error: any) {
    console.error("[SiteBuilder Projects POST Error]:", error);
    return NextResponse.json(
      { error: "Erro ao salvar projeto: " + error.message },
      { status: 500 }
    );
  }
}
