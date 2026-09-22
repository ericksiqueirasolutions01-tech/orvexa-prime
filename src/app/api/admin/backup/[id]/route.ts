import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteBackupVersion } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
    }

    const backupId = params.id;
    await deleteBackupVersion(backupId, session.id);

    return NextResponse.json({
      success: true,
      message: "Versão de backup excluída com sucesso.",
    });
  } catch (err: any) {
    console.error("[API Backup DELETE Error]:", err);
    return NextResponse.json({ error: "Erro ao excluir backup: " + err.message }, { status: 500 });
  }
}

