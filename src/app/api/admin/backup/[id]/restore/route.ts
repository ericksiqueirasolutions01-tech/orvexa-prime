import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { restoreSystemBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
    }

    const backupId = params.id;
    if (!backupId) {
      return NextResponse.json({ error: "ID do backup não informado." }, { status: 400 });
    }

    const result = await restoreSystemBackup(backupId, {
      actorId: session.id,
    });

    return NextResponse.json({
      success: true,
      message: "Sistema restaurado com sucesso a partir do backup selecionado!",
      result,
    });
  } catch (err: any) {
    console.error("[API Backup Restore Error]:", err);
    return NextResponse.json({ error: "Falha na restauração: " + err.message }, { status: 500 });
  }
}

