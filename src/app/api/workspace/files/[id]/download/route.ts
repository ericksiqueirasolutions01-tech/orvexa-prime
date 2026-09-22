// src/app/api/workspace/files/[id]/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSpreadsheetBuffer, generateCsvBuffer } from "@/ai/tools/file-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const file = await prisma.file.findUnique({
      where: { id: params.id },
    });

    if (!file) {
      return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }

    if (file.userId !== session.id && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    let fileBuffer: Buffer | null = null;
    let mime = file.mimeType || "application/octet-stream";

    const preview = file.previewData ? JSON.parse(file.previewData) : null;

    // 1. Arquivo com Data URL Base64 embutido (PDF, Imagem, SVG)
    if (preview?.dataUrl && typeof preview.dataUrl === "string" && preview.dataUrl.startsWith("data:")) {
      const parts = preview.dataUrl.split(",");
      if (parts.length === 2) {
        fileBuffer = Buffer.from(parts[1], "base64");
      }
    }

    // 2. Planilha estruturada (XLSX / CSV)
    if (!fileBuffer && preview?.sheets && Array.isArray(preview.sheets)) {
      if (file.originalName.toLowerCase().endsWith(".csv")) {
        const sheet = preview.sheets[0];
        if (sheet) {
          fileBuffer = generateCsvBuffer({
            headers: sheet.headers || [],
            rows: sheet.rows || [],
          });
          mime = "text/csv; charset=utf-8";
        }
      } else {
        fileBuffer = generateSpreadsheetBuffer({
          sheets: preview.sheets,
        });
        mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      }
    }

    // 3. Documento de Texto / JSON / Markdown
    if (!fileBuffer) {
      const content = file.extractedText || "";
      fileBuffer = Buffer.from(content, "utf-8");
      if (!mime || mime === "application/octet-stream") {
        mime = "text/plain; charset=utf-8";
      }
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("[Workspace Download Error]", error);
    return NextResponse.json(
      { error: "Erro ao baixar arquivo.", details: error?.message },
      { status: 500 }
    );
  }
}
