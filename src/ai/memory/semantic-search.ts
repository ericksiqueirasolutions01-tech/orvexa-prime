// src/ai/memory/semantic-search.ts
// MOTOR UNIFICADO DE BUSCA SEMÂNTICA & RAG — ORVEXA PRIME
// Pesquisa vetorial híbrida em Memórias de Usuário, Conversas Anteriores e Arquivos

import { prisma } from "@/lib/prisma";
import {
  generateDenseEmbedding,
  deserializeEmbedding,
  cosineSimilarity,
  calculateHybridScore,
} from "./vector-store";

export interface SemanticSearchResultItem {
  id: string;
  type: "USER" | "CONVERSATION" | "FILE" | "AGENT";
  title: string;
  content: string;
  snippet: string;
  category?: string;
  tags?: string[];
  score: number; // 0 a 100
  sourceName?: string;
  metadata?: any;
  createdAt: string;
}

export interface SearchMemoryOptions {
  userId: string;
  query: string;
  scope?: "ALL" | "USER" | "CONVERSATION" | "FILE" | "AGENT";
  limit?: number;
  minScore?: number;
  conversationId?: string | null;
  allowedFileIds?: string[];
}

/**
 * Busca semântica unificada em todas as camadas de memória autorizadas
 */
export async function searchAllMemories(
  options: SearchMemoryOptions
): Promise<SemanticSearchResultItem[]> {
  const {
    userId,
    query,
    scope = "ALL",
    limit = 8,
    minScore = 35,
    conversationId,
    allowedFileIds,
  } = options;

  if (!query || query.trim().length === 0) return [];

  const queryVector = generateDenseEmbedding(query);
  const results: SemanticSearchResultItem[] = [];

  // 1. MEMÓRIA DO USUÁRIO
  if (scope === "ALL" || scope === "USER") {
    const userMemories = await prisma.userMemory.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    for (const mem of userMemories) {
      let vec = deserializeEmbedding(mem.embedding);
      if (!vec) {
        vec = generateDenseEmbedding(`${mem.key}: ${mem.value}`);
      }
      const sim = cosineSimilarity(queryVector, vec);
      const score = calculateHybridScore({
        vectorSimilarity: sim,
        query,
        targetText: `${mem.key} ${mem.value} ${mem.tags}`,
        importance: mem.importance,
      });

      const finalScore = +(score * 100).toFixed(1);
      if (finalScore >= minScore) {
        let parsedTags: string[] = [];
        try {
          parsedTags = JSON.parse(mem.tags || "[]");
        } catch {}

        results.push({
          id: mem.id,
          type: "USER",
          title: mem.key,
          content: mem.value,
          snippet: mem.value.slice(0, 150),
          category: mem.category,
          tags: parsedTags,
          score: finalScore,
          sourceName: "Perfil do Usuário",
          createdAt: mem.createdAt.toISOString(),
        });
      }
    }
  }

  // 2. MEMÓRIA DAS CONVERSAS ANTERIORES
  if (scope === "ALL" || scope === "CONVERSATION") {
    const convMemories = await prisma.conversationMemory.findMany({
      where: {
        userId,
        // Exclui a conversa atual para não duplicar contexto do histórico ativo
        conversationId: conversationId ? { not: conversationId } : undefined,
      },
      orderBy: { updatedAt: "desc" },
      take: 40,
    });

    for (const conv of convMemories) {
      let vec = deserializeEmbedding(conv.embedding);
      if (!vec) {
        vec = generateDenseEmbedding(`${conv.title}: ${conv.summary}`);
      }
      const sim = cosineSimilarity(queryVector, vec);
      const score = calculateHybridScore({
        vectorSimilarity: sim,
        query,
        targetText: `${conv.title} ${conv.summary} ${conv.keyTakeaways}`,
        importance: 4,
      });

      const finalScore = +(score * 100).toFixed(1);
      if (finalScore >= minScore) {
        let parsedTags: string[] = [];
        try {
          parsedTags = JSON.parse(conv.tags || "[]");
        } catch {}

        results.push({
          id: conv.id,
          type: "CONVERSATION",
          title: `Conversa: ${conv.title}`,
          content: conv.summary,
          snippet: conv.summary.slice(0, 180),
          category: "CONVERSATION",
          tags: parsedTags,
          score: finalScore,
          sourceName: "Histórico Anterior",
          metadata: { conversationId: conv.conversationId },
          createdAt: conv.createdAt.toISOString(),
        });
      }
    }
  }

  // 3. CONHECIMENTO DOS ARQUIVOS (FILE KNOWLEDGE)
  if (scope === "ALL" || scope === "FILE") {
    // Filtro estrito de permissão: arquivos do próprio usuário
    const fileChunks = await prisma.fileKnowledge.findMany({
      where: {
        userId,
        fileId: allowedFileIds && allowedFileIds.length > 0 ? { in: allowedFileIds } : undefined,
      },
      take: 100,
    });

    for (const chunk of fileChunks) {
      let vec = deserializeEmbedding(chunk.embedding);
      if (!vec) {
        vec = generateDenseEmbedding(`${chunk.fileName}: ${chunk.content.slice(0, 300)}`);
      }
      const sim = cosineSimilarity(queryVector, vec);
      const score = calculateHybridScore({
        vectorSimilarity: sim,
        query,
        targetText: `${chunk.fileName} ${chunk.summary || ""} ${chunk.content}`,
        importance: 3,
      });

      const finalScore = +(score * 100).toFixed(1);
      if (finalScore >= minScore) {
        results.push({
          id: chunk.id,
          type: "FILE",
          title: `${chunk.fileName} (Parte ${chunk.chunkIndex + 1})`,
          content: chunk.content,
          snippet: chunk.content.slice(0, 180),
          category: chunk.category,
          tags: [chunk.category.toLowerCase(), "arquivo"],
          score: finalScore,
          sourceName: chunk.fileName,
          metadata: { fileId: chunk.fileId, chunkIndex: chunk.chunkIndex },
          createdAt: chunk.createdAt.toISOString(),
        });
      }
    }
  }

  // 4. MEMÓRIA DOS AGENTES
  if (scope === "ALL" || scope === "AGENT") {
    const agentMemories = await prisma.agentMemory.findMany({
      where: { userId },
      include: { agent: true },
      take: 30,
    });

    for (const am of agentMemories) {
      let vec = deserializeEmbedding(am.embedding);
      if (!vec) {
        vec = generateDenseEmbedding(`${am.key}: ${am.value}`);
      }
      const sim = cosineSimilarity(queryVector, vec);
      const score = calculateHybridScore({
        vectorSimilarity: sim,
        query,
        targetText: `${am.key} ${am.value} ${am.tags}`,
        importance: am.importance,
      });

      const finalScore = +(score * 100).toFixed(1);
      if (finalScore >= minScore) {
        results.push({
          id: am.id,
          type: "AGENT",
          title: `[${am.agent.name}] ${am.key}`,
          content: am.value,
          snippet: am.value.slice(0, 150),
          category: am.category,
          tags: [am.agent.slug, "agente"],
          score: finalScore,
          sourceName: am.agent.name,
          metadata: { agentId: am.agentId },
          createdAt: am.createdAt.toISOString(),
        });
      }
    }
  }

  // Ordena por pontuação de similaridade semântica descrescente
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * Recupera e formata contexto RAG enriquecido para injeção no prompt das LLMs
 */
export async function retrieveUnifiedMemoryContext(options: {
  userId: string;
  query: string;
  conversationId?: string | null;
  limit?: number;
}): Promise<string> {
  const matches = await searchAllMemories({
    userId: options.userId,
    query: options.query,
    scope: "ALL",
    limit: options.limit || 5,
    minScore: 40,
    conversationId: options.conversationId,
  });

  if (matches.length === 0) return "";

  const userFacts = matches.filter((m) => m.type === "USER");
  const pastConvs = matches.filter((m) => m.type === "CONVERSATION");
  const fileChunks = matches.filter((m) => m.type === "FILE");
  const agentFacts = matches.filter((m) => m.type === "AGENT");

  let promptBlock = "\n\n[MEMÓRIA DE LONGO PRAZO & CONHECIMENTO RECUPERADO VIA BUSCA SEMÂNTICA]:";
  promptBlock += "\nUse as informações abaixo com sabedoria para personalizar sua resposta ao usuário:\n";

  if (userFacts.length > 0) {
    promptBlock += "\n• FATOS CONHECIDOS DO USUÁRIO:\n";
    userFacts.forEach((f) => {
      promptBlock += `  - [${f.title}]: ${f.content}\n`;
    });
  }

  if (pastConvs.length > 0) {
    promptBlock += "\n• CONTEXTO RECUPERADO DE CONVERSAS ANTERIORES:\n";
    pastConvs.forEach((c) => {
      promptBlock += `  - ${c.title}: ${c.content}\n`;
    });
  }

  if (fileChunks.length > 0) {
    promptBlock += "\n• TRECHOS DE ARQUIVOS E DOCUMENTOS AUTORIZADOS:\n";
    fileChunks.forEach((fc) => {
      promptBlock += `  - [${fc.sourceName}]: "${fc.snippet.replace(/\n+/g, " ")}..."\n`;
    });
  }

  if (agentFacts.length > 0) {
    promptBlock += "\n• CONTEXTO DE ESPECIALISTAS:\n";
    agentFacts.forEach((af) => {
      promptBlock += `  - ${af.title}: ${af.content}\n`;
    });
  }

  promptBlock += "\n(Fim do conhecimento recuperado. Mantenha um tom natural e útil.)\n";

  return promptBlock;
}
