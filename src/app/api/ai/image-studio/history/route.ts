import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const images = await prisma.generatedImage.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ images });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao buscar histórico de imagens." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID não fornecido." }, { status: 400 });
    }

    await prisma.generatedImage.deleteMany({
      where: {
        id,
        userId: session.id, // Garante que o usuário só deleta as próprias imagens
      },
    });

    return NextResponse.json({ success: true, message: "Imagem removida com sucesso." });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao remover imagem." }, { status: 500 });
  }
}
