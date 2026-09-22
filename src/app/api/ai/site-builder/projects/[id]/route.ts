import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = params;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
    }

    if (project.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Projeto excluído com sucesso." });
  } catch (error: any) {
    console.error("[SiteBuilder Project DELETE Error]:", error);
    return NextResponse.json(
      { error: "Erro ao excluir projeto: " + error.message },
      { status: 500 }
    );
  }
}

