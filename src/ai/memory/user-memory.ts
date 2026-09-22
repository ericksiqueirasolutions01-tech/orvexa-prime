// src/ai/memory/user-memory.ts
// MEMÓRIA INTELIGENTE & CONTEXTO PERMANENTE — ORVEXA PRIME DIGITAL

import { prisma } from "@/lib/prisma";

export interface MemoryEntry {
  key: string;
  value: string;
  category?: "GENERAL" | "PREFERENCE" | "FACT" | "PROJECT" | "CODING" | "PEDAGOGICAL";
  tags?: string[];
  importance?: number;
}

/**
 * Salva ou atualiza uma memória para o usuário
 */
export async function saveUserMemory(userId: string, entry: MemoryEntry) {
  const existing = await prisma.userMemory.findFirst({
    where: {
      userId,
      key: entry.key,
    },
  });

  if (existing) {
    return prisma.userMemory.update({
      where: { id: existing.id },
      data: {
        value: entry.value,
        category: entry.category || existing.category,
        tags: entry.tags ? JSON.stringify(entry.tags) : existing.tags,
        importance: entry.importance ?? existing.importance,
      },
    });
  }

  return prisma.userMemory.create({
    data: {
      userId,
      key: entry.key,
      value: entry.value,
      category: entry.category || "GENERAL",
      tags: JSON.stringify(entry.tags || []),
      importance: entry.importance ?? 3,
    },
  });
}

/**
 * Recupera todas as memórias ativas de um usuário
 */
export async function getUserMemories(userId: string, category?: string) {
  return prisma.userMemory.findMany({
    where: {
      userId,
      category: category || undefined,
    },
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
  });
}

/**
 * Monta o bloco de prompt de contexto de memória para personalização contínua
 */
export async function buildMemoryContextPrompt(userId: string): Promise<string> {
  const memories = await getUserMemories(userId);
  if (!memories || memories.length === 0) return "";

  const memoryLines = memories.map((m) => `- [${m.key}]: ${m.value}`).join("\n");
  return `\n[MEMÓRIA DE LONGO PRAZO DO USUÁRIO]:\n${memoryLines}\n`;
}

/**
 * Busca semântica nas memórias do usuário (compatível com SQLite e preparado para PostgreSQL + pgvector)
 */
export async function searchUserMemorySemantically(userId: string, query: string, limit: number = 5) {
  const allMemories = await getUserMemories(userId);
  if (allMemories.length === 0) return [];

  const queryTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  // Classificação por relevância de tokens e tags
  const scored = allMemories.map((m) => {
    const text = `${m.key} ${m.value} ${m.tags} ${m.category}`.toLowerCase();
    let score = 0;
    for (const token of queryTokens) {
      if (text.includes(token)) {
        score += 10;
      }
    }
    score += m.importance;
    return { memory: m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter((item) => item.score > 3).slice(0, limit).map((item) => item.memory);
}

/**
 * Extrai automaticamente fatos e preferências de mensagens do usuário para memória de longo prazo
 */
export async function extractAndSaveFactsFromConversation(userId: string, userMessage: string) {
  const clean = userMessage.trim();

  // Detecção de nome do usuário
  const nameMatch = clean.match(/(?:meu nome é|me chamo|pode me chamar de)\s+([A-Za-zÀ-ÿ]+)/i);
  if (nameMatch && nameMatch[1]) {
    await saveUserMemory(userId, {
      key: "NOME_DO_USUARIO",
      value: nameMatch[1],
      category: "FACT",
      importance: 5,
    });
  }

  // Detecção de stack ou linguagem de programação preferida
  const stackMatch = clean.match(/(?:minha stack é|eu programo em|minha linguagem favorita é)\s+([A-Za-z0-9+#.\s]+)/i);
  if (stackMatch && stackMatch[1]) {
    await saveUserMemory(userId, {
      key: "STACK_PREFERIDA",
      value: stackMatch[1].trim(),
      category: "CODING",
      importance: 4,
    });
  }

  // Detecção de empresa ou projeto ativo
  const projectMatch = clean.match(/(?:estou criando|meu projeto é|minha empresa é|meu sistema se chama)\s+([A-Za-z0-9À-ÿ\s]+)/i);
  if (projectMatch && projectMatch[1]) {
    await saveUserMemory(userId, {
      key: "PROJETO_ATIVO",
      value: projectMatch[1].trim().slice(0, 100),
      category: "PROJECT",
      importance: 4,
    });
  }
}

/**
 * Remove uma memória específica
 */
export async function deleteUserMemory(userId: string, memoryId: string) {
  return prisma.userMemory.deleteMany({
    where: {
      id: memoryId,
      userId,
    },
  });
}

