// src/ai/memory/file-indexer.ts
// INDEXADOR INTELIGENTE DE ARQUIVOS & CONHECIMENTO DOCUMENTAL
// Converte arquivos em fragmentos semânticos (chunks) com embeddings vetoriais

import { prisma } from "@/lib/prisma";
import { generateDenseEmbedding, serializeEmbedding } from "./vector-store";

export interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

/**
 * Divide um texto em blocos semânticos com sobreposição de contexto
 */
export function chunkTextSemantically(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const { chunkSize = 700, overlap = 100 } = options;

  if (!text || text.trim().length === 0) return [];
  if (text.length <= chunkSize) return [text.trim()];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Tenta quebrar em quebra de linha ou ponto final próximo
    if (end < text.length) {
      const naturalBreak = text.lastIndexOf("\n\n", end);
      const sentenceBreak = text.lastIndexOf(". ", end);
      const lineBreak = text.lastIndexOf("\n", end);

      if (naturalBreak > start + chunkSize * 0.5) {
        end = naturalBreak + 2;
      } else if (sentenceBreak > start + chunkSize * 0.5) {
        end = sentenceBreak + 2;
      } else if (lineBreak > start + chunkSize * 0.5) {
        end = lineBreak + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 20) {
      chunks.push(chunk);
    }

    start = end - overlap;
    if (start >= text.length) break;
  }

  return chunks;
}

/**
 * Indexa um arquivo individual no banco de conhecimento semântico
 */
export async function indexFileKnowledge(fileId: string): Promise<{
  success: boolean;
  chunksIndexed: number;
  error?: string;
}> {
  try {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return { success: false, chunksIndexed: 0, error: "Arquivo não encontrado." };
    }

    // Se não tiver texto extraído, tenta usar previewData ou nome
    const rawContent = file.extractedText || file.previewData || `Arquivo: ${file.originalName}`;
    if (!rawContent || rawContent.trim().length === 0) {
      return { success: false, chunksIndexed: 0, error: "Arquivo sem conteúdo legível." };
    }

    // Remove chunks pré-existentes deste arquivo para reindexação limpa
    await prisma.fileKnowledge.deleteMany({
      where: { fileId: file.id },
    });

    const chunks = chunkTextSemantically(rawContent, {
      chunkSize: file.category === "SPREADSHEET" ? 500 : 750,
      overlap: 100,
    });

    if (chunks.length === 0) {
      return { success: true, chunksIndexed: 0 };
    }

    // Cria os chunks com vetores semânticos
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const embedding = generateDenseEmbedding(
        `${file.originalName}: ${chunkText.slice(0, 300)}`
      );

      // Micro-resumo da primeira linha
      const firstLine = chunkText.split("\n")[0].slice(0, 80);

      await prisma.fileKnowledge.create({
        data: {
          userId: file.userId,
          fileId: file.id,
          fileName: file.originalName,
          chunkIndex: i,
          content: chunkText,
          summary: firstLine,
          category: file.category,
          embedding: serializeEmbedding(embedding),
          metadata: JSON.stringify({
            mimeType: file.mimeType,
            fileSize: file.fileSizeBytes,
            totalChunks: chunks.length,
          }),
        },
      });
    }

    return { success: true, chunksIndexed: chunks.length };
  } catch (err: any) {
    console.error(`[FileIndexer Error] Falha ao indexar arquivo ${fileId}:`, err);
    return { success: false, chunksIndexed: 0, error: err.message };
  }
}

/**
 * Indexa todos os arquivos pendentes de um usuário
 */
export async function indexAllUserFiles(userId: string): Promise<{
  filesProcessed: number;
  totalChunks: number;
}> {
  const files = await prisma.file.findMany({
    where: { userId },
  });

  let totalChunks = 0;
  let filesProcessed = 0;

  for (const file of files) {
    const res = await indexFileKnowledge(file.id);
    if (res.success) {
      totalChunks += res.chunksIndexed;
      filesProcessed++;
    }
  }

  return { filesProcessed, totalChunks };
}
