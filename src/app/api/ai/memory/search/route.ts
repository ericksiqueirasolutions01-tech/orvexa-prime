// src/app/api/ai/memory/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchAllMemories } from "@/ai/memory/semantic-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST: Busca semântica em tempo real nas memórias do usuário
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { query, scope = "ALL", limit = 10, minScore = 30 } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "O parâmetro 'query' é obrigatório para busca semântica." },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const results = await searchAllMemories({
      userId: session.id,
      query: query.trim(),
      scope,
      limit: Math.min(limit, 30),
      minScore,
    });
    const searchTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      query,
      searchTimeMs,
      totalResults: results.length,
      results,
    });
  } catch (error: any) {
    console.error("[Memory Search POST Error]", error);
    return NextResponse.json(
      { error: error?.message || "Falha ao realizar busca semântica." },
      { status: 500 }
    );
  }
}
