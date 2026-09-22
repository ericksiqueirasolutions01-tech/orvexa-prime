import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SITE_TEMPLATES, COLOR_PRESETS } from "@/lib/site-builder";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Busca templates salvos no banco ou retorna os oficiais
    const dbTemplates = await prisma.template.findMany({
      where: { isSystem: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      templates: SITE_TEMPLATES,
      dbTemplates,
      presets: COLOR_PRESETS,
    });
  } catch (error: any) {
    console.error("[SiteBuilder Templates Error]:", error);
    return NextResponse.json(
      { error: "Erro ao buscar templates: " + error.message },
      { status: 500 }
    );
  }
}
