// src/ai/memory/conversation-indexer.ts
// INDEXADOR SEMÂNTICO DE CONVERSAS ANTERIORES
// Sintetiza tópicos, decisões e lições de diálogos passados com embeddings

import { prisma } from "@/lib/prisma";
import { generateDenseEmbedding, serializeEmbedding } from "./vector-store";

export interface ConversationSummaryResult {
  title: string;
  summary: string;
  keyTakeaways: string[];
  tags: string[];
}

/**
 * Sintetiza o diálogo de uma conversa em conclusões acionáveis
 */
export function summarizeConversationMessages(
  title: string,
  messages: { role: string; content: string }[]
): ConversationSummaryResult {
  if (messages.length === 0) {
    return {
      title,
      summary: "Conversa vazia iniciada sem mensagens registradas.",
      keyTakeaways: [],
      tags: [],
    };
  }

  // Identifica tópicos principais com base nas mensagens do usuário e respostas
  const userMessages = messages.filter((m) => m.role === "USER" || m.role === "user");
  const assistantMessages = messages.filter((m) => m.role === "ASSISTANT" || m.role === "assistant");

  const combinedUserText = userMessages.map((m) => m.content).join(" ");
  const combinedAllText = messages.map((m) => `${m.role}: ${m.content}`).join("\n");

  // Extração de tags por termos-chave
  const detectedTags: string[] = [];
  const keywordMap: Record<string, string> = {
    react: "Frontend",
    nextjs: "Fullstack",
    python: "Python",
    banco: "Database",
    sql: "SQL",
    contrato: "Documentos",
    relatorio: "Relatórios",
    marketing: "Marketing",
    vendas: "Vendas",
    design: "Design UI/UX",
    api: "Backend API",
    seguranca: "Segurança",
  };

  const lower = combinedAllText.toLowerCase();
  for (const [kw, tag] of Object.entries(keywordMap)) {
    if (lower.includes(kw)) detectedTags.push(tag);
  }

  // Gera pontos-chave (Takeaways)
  const takeaways: string[] = [];

  // Pega a primeira dúvida do usuário
  if (userMessages[0]) {
    takeaways.push(`Objetivo inicial: ${userMessages[0].content.slice(0, 100)}...`);
  }

  // Pega uma conclusão da última resposta da IA
  if (assistantMessages.length > 0) {
    const lastReply = assistantMessages[assistantMessages.length - 1].content;
    const firstSentence = lastReply.split("\n")[0].slice(0, 120);
    takeaways.push(`Conclusão ou entrega da IA: ${firstSentence}`);
  }

  takeaways.push(`Diálogo composto por ${messages.length} interações entre usuário e IA.`);

  // Sumário descritivo
  const summary = `Discussão sobre "${title}". O usuário abordou: ${userMessages
    .slice(0, 2)
    .map((m) => `"${m.content.slice(0, 60)}"`)
    .join(" e ")}. Principais orientações fornecidas com foco em produtividade e resolução prática.`;

  return {
    title,
    summary,
    keyTakeaways: takeaways,
    tags: Array.from(new Set(detectedTags)),
  };
}

/**
 * Indexa uma conversa individual na tabela ConversationMemory
 */
export async function indexConversation(conversationId: string) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation || conversation.messages.length === 0) {
      return null;
    }

    const { title, summary, keyTakeaways, tags } = summarizeConversationMessages(
      conversation.title,
      conversation.messages
    );

    const fullTextForEmbedding = `${title} ${summary} ${keyTakeaways.join(" ")} ${tags.join(" ")}`;
    const embedding = generateDenseEmbedding(fullTextForEmbedding);

    // Salva ou atualiza a memória da conversa
    const existing = await prisma.conversationMemory.findFirst({
      where: { conversationId },
    });

    if (existing) {
      return await prisma.conversationMemory.update({
        where: { id: existing.id },
        data: {
          title,
          summary,
          keyTakeaways: JSON.stringify(keyTakeaways),
          tags: JSON.stringify(tags),
          embedding: serializeEmbedding(embedding),
        },
      });
    }

    return await prisma.conversationMemory.create({
      data: {
        userId: conversation.userId,
        conversationId: conversation.id,
        title,
        summary,
        keyTakeaways: JSON.stringify(keyTakeaways),
        tags: JSON.stringify(tags),
        embedding: serializeEmbedding(embedding),
      },
    });
  } catch (err: any) {
    console.error(`[ConversationIndexer Error] Falha ao indexar conversa ${conversationId}:`, err);
    return null;
  }
}

/**
 * Indexa todas as conversas do usuário que possuem mensagens
 */
export async function indexAllUserConversations(userId: string): Promise<number> {
  const conversations = await prisma.conversation.findMany({
    where: { userId },
    select: { id: true },
  });

  let indexedCount = 0;
  for (const conv of conversations) {
    const res = await indexConversation(conv.id);
    if (res) indexedCount++;
  }

  return indexedCount;
}
