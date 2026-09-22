// src/ai/memory/user-memory.ts
// MEMÓRIA INTELIGENTE & CONTEXTO PERMANENTE — ORVEXA PRIME DIGITAL
// Gestão de fatos, preferências, projetos e conhecimentos do usuário com embeddings

import { prisma } from "@/lib/prisma";
import {
  generateDenseEmbedding,
  serializeEmbedding,
  deserializeEmbedding,
  cosineSimilarity,
  calculateHybridScore,
} from "./vector-store";

export interface MemoryEntry {
  id?: string;
  key: string;
  value: string;
  category?: "GENERAL" | "PREFERENCE" | "FACT" | "PROJECT" | "CODING" | "PEDAGOGICAL" | "BUSINESS";
  tags?: string[];
  importance?: number;
}

/**
 * Salva ou atualiza uma memória para o usuário, gerando vetor semântico
 */
export async function saveUserMemory(userId: string, entry: MemoryEntry) {
  const existing = await prisma.userMemory.findFirst({
    where: {
      userId,
      key: entry.key,
    },
  });

  const fullText = `${entry.key}: ${entry.value} ${(entry.tags || []).join(" ")} ${entry.category || ""}`;
  const embedding = generateDenseEmbedding(fullText);
  const serialized = serializeEmbedding(embedding);

  if (existing) {
    return prisma.userMemory.update({
      where: { id: existing.id },
      data: {
        value: entry.value,
        category: entry.category || existing.category,
        tags: entry.tags ? JSON.stringify(entry.tags) : existing.tags,
        importance: entry.importance ?? existing.importance,
        embedding: serialized,
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
      embedding: serialized,
    },
  });
}

/**
 * Edita uma memória existente por ID
 */
export async function updateUserMemory(
  userId: string,
  memoryId: string,
  updates: Partial<MemoryEntry>
) {
  const existing = await prisma.userMemory.findFirst({
    where: { id: memoryId, userId },
  });

  if (!existing) {
    throw new Error("Memória não encontrada ou permissão negada.");
  }

  const updatedKey = updates.key || existing.key;
  const updatedValue = updates.value || existing.value;
  const updatedTags = updates.tags ? JSON.stringify(updates.tags) : existing.tags;
  const updatedCategory = updates.category || existing.category;
  const updatedImportance = updates.importance ?? existing.importance;

  const fullText = `${updatedKey}: ${updatedValue} ${updatedTags} ${updatedCategory}`;
  const embedding = generateDenseEmbedding(fullText);

  return prisma.userMemory.update({
    where: { id: memoryId },
    data: {
      key: updatedKey,
      value: updatedValue,
      tags: updatedTags,
      category: updatedCategory,
      importance: updatedImportance,
      embedding: serializeEmbedding(embedding),
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
      category: category && category !== "ALL" ? category : undefined,
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
 * Busca semântica vetorial híbrida nas memórias do usuário
 */
export async function searchUserMemorySemantically(
  userId: string,
  query: string,
  limit = 5
) {
  const allMemories = await getUserMemories(userId);
  if (allMemories.length === 0) return [];

  const queryVector = generateDenseEmbedding(query);

  const scored = allMemories.map((m) => {
    let vectorSim = 0;
    const itemVector = deserializeEmbedding(m.embedding);

    if (itemVector) {
      vectorSim = cosineSimilarity(queryVector, itemVector);
    } else {
      // Fallback: gera na hora se não tiver salvo
      const generated = generateDenseEmbedding(`${m.key}: ${m.value}`);
      vectorSim = cosineSimilarity(queryVector, generated);
    }

    const hybridScore = calculateHybridScore({
      vectorSimilarity: vectorSim,
      query,
      targetText: `${m.key} ${m.value} ${m.tags}`,
      importance: m.importance,
    });

    return {
      memory: m,
      similarityScore: +(hybridScore * 100).toFixed(1),
    };
  });

  scored.sort((a, b) => b.similarityScore - a.similarityScore);
  return scored.slice(0, limit);
}

/**
 * Extrai automaticamente fatos e preferências de mensagens do usuário para memória de longo prazo
 */
export async function extractAndSaveFactsFromConversation(
  userId: string,
  userMessage: string
) {
  const clean = userMessage.trim();

  // 1. Detecção de nome do usuário
  const nameMatch = clean.match(
    /(?:meu nome é|me chamo|pode me chamar de|sou o|sou a)\s+([A-Za-zÀ-ÿ]+)/i
  );
  if (nameMatch && nameMatch[1]) {
    await saveUserMemory(userId, {
      key: "NOME_DO_USUARIO",
      value: nameMatch[1],
      category: "FACT",
      importance: 5,
      tags: ["identidade", "perfil"],
    });
  }

  // 2. Detecção de stack ou linguagem de programação preferida
  const stackMatch = clean.match(
    /(?:minha stack é|eu programo em|minha linguagem favorita é|desenvolvo em|trabalho com)\s+([A-Za-z0-9+#.\s]+)/i
  );
  if (stackMatch && stackMatch[1]) {
    await saveUserMemory(userId, {
      key: "STACK_PREFERIDA",
      value: stackMatch[1].trim(),
      category: "CODING",
      importance: 4,
      tags: ["desenvolvimento", "tecnologia"],
    });
  }

  // 3. Detecção de empresa ou projeto ativo
  const projectMatch = clean.match(
    /(?:estou criando|meu projeto é|minha empresa é|meu sistema se chama|estou desenvolvendo um)\s+([A-Za-z0-9À-ÿ\s]+)/i
  );
  if (projectMatch && projectMatch[1]) {
    await saveUserMemory(userId, {
      key: "PROJETO_ATIVO",
      value: projectMatch[1].trim().slice(0, 100),
      category: "PROJECT",
      importance: 4,
      tags: ["projeto", "negocio"],
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
