import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createSystemBackup,
  listBackupCatalog,
  getBackupStorageStats,
  getBackupLogs,
  BackupType,
} from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
    }

    const [stats, backups, logs] = await Promise.all([
      getBackupStorageStats(),
      listBackupCatalog(),
      getBackupLogs(20),
    ]);

    return NextResponse.json({
      success: true,
      stats,
      backups,
      logs,
    });
  } catch (err: any) {
    console.error("[API Backup GET Error]:", err);
    return NextResponse.json({ error: "Erro ao consultar backups: " + err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const type: BackupType = body.type || "FULL";
    const notes = body.notes || "Backup manual disparado via painel administrativo";

    const backup = await createSystemBackup({
      type,
      isAutomatic: false,
      actorId: session.id,
      notes,
    });

    return NextResponse.json({
      success: true,
      message: `Backup ${type} gerado com sucesso!`,
      backup,
    });
  } catch (err: any) {
    console.error("[API Backup POST Error]:", err);
    return NextResponse.json({ error: "Falha na criação do backup: " + err.message }, { status: 500 });
  }
}

