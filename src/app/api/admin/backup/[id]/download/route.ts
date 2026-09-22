import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listBackupCatalog } from "@/lib/backup";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 });
    }

    const backupId = params.id;
    const catalog = listBackupCatalog();
    const backup = catalog.find((b) => b.id === backupId);

    if (!backup || !fs.existsSync(backup.filePath)) {
      return NextResponse.json({ error: "Arquivo de backup não encontrado." }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(backup.filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${backup.fileName}"`,
        "Content-Length": backup.fileSizeBytes.toString(),
      },
    });
  } catch (err: any) {
    console.error("[API Backup Download Error]:", err);
    return NextResponse.json({ error: "Erro ao baixar backup: " + err.message }, { status: 500 });
  }
}

