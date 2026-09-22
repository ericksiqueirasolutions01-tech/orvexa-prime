// src/ai/memory/vector-store.ts
// MOTOR VETORIAL & BUSCA SEMÂNTICA — PREPARADO PARA POSTGRESQL + PGVECTOR & SQLITE
// Dimensão de Embedding: 384 (compatível com mini-LM, pgvector e SQLite serializado)

export const EMBEDDING_DIMENSION = 384;

/**
 * Gera um vetor de embedding semântico denso de 384 dimensões normalizado (norma L2 = 1.0)
 * Permite cálculo de Similaridade de Cosseno direto via Dot Product (A · B)
 */
export function generateDenseEmbedding(text: string): number[] {
  if (!text || text.trim().length === 0) {
    const empty = new Array(EMBEDDING_DIMENSION).fill(0);
    empty[0] = 1.0;
    return empty;
  }

  const clean = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const vector = new Float64Array(EMBEDDING_DIMENSION);

  // 1. Extração de tokens e n-gramas
  const tokens = clean.split(/[\s,.;:!?_/\-()\[\]{}'"]+/).filter((t) => t.length > 0);
  
  // Dicionário de conceitos semânticos prioritários para ancoragem de dimensões
  const SEMANTIC_BUCKETS: Record<string, number> = {
    // Técnico / Programação (0 - 50)
    codigo: 5, programacao: 5, react: 10, nextjs: 12, typescript: 14, python: 16, csharp: 18,
    sql: 20, database: 22, api: 25, backend: 28, frontend: 30, prisma: 32, bug: 35, erro: 35,
    // Negócios / Financeiro (51 - 100)
    dinheiro: 55, pagamento: 58, plano: 60, preco: 62, contrato: 65, cliente: 68, ltv: 72,
    cac: 75, receita: 78, empresa: 80, faturamento: 82, metas: 85, proposta: 88,
    // Documentos / Arquivos (101 - 150)
    arquivo: 105, documento: 108, planilha: 112, relatorio: 115, pdf: 120, docx: 122, tabela: 125,
    dados: 128, analise: 130, texto: 135, resumo: 140,
    // Usuário / Pessoal (151 - 200)
    nome: 155, usuario: 158, perfil: 160, email: 162, cargo: 165, preferencia: 170, gosto: 172,
    // Agentes / IA (201 - 250)
    agente: 205, inteligência: 208, assistente: 210, prompt: 215, modelo: 220, memoria: 225,
  };

  // 2. Projeção de tokens com funções hash determinísticas e buckets
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const weight = 1.0 + Math.log(1 + token.length) * 0.4;
    const positionWeight = 1.0 + (1.0 / (i + 1)) * 0.3; // Primeiros tokens têm ligeira relevância

    // Atribuição de buckets conceituais
    if (SEMANTIC_BUCKETS[token] !== undefined) {
      const bucketIdx = SEMANTIC_BUCKETS[token];
      vector[bucketIdx] += 2.5 * weight;
      vector[(bucketIdx + 1) % EMBEDDING_DIMENSION] += 1.8 * weight;
    }

    // Hash de caracteres para dispersão densa de subpalavras
    let h1 = 0x811c9dc5;
    let h2 = 0x5bd1e995;
    for (let c = 0; c < token.length; c++) {
      const code = token.charCodeAt(c);
      h1 = Math.imul(h1 ^ code, 0x01000193);
      h2 = Math.imul(h2 ^ (code << 3), 0x5bd1e995);
    }

    const idx1 = Math.abs(h1) % EMBEDDING_DIMENSION;
    const idx2 = Math.abs(h2) % EMBEDDING_DIMENSION;
    const idx3 = (idx1 + idx2 + 73) % EMBEDDING_DIMENSION;

    vector[idx1] += weight * positionWeight;
    vector[idx2] += (weight * 0.7) * positionWeight;
    vector[idx3] += (weight * 0.5);

    // Bigramas com o token seguinte
    if (i < tokens.length - 1) {
      const bigram = `${token}_${tokens[i + 1]}`;
      let bgHash = 0;
      for (let b = 0; b < bigram.length; b++) {
        bgHash = (bgHash << 5) - bgHash + bigram.charCodeAt(b);
        bgHash |= 0;
      }
      const bgIdx = Math.abs(bgHash) % EMBEDDING_DIMENSION;
      vector[bgIdx] += 1.5;
    }
  }

  // 3. Normalização L2 (comprimento do vetor = 1.0)
  let norm = 0;
  for (let j = 0; j < EMBEDDING_DIMENSION; j++) {
    norm += vector[j] * vector[j];
  }
  norm = Math.sqrt(norm);

  const result = new Array(EMBEDDING_DIMENSION);
  if (norm > 0) {
    for (let k = 0; k < EMBEDDING_DIMENSION; k++) {
      result[k] = +(vector[k] / norm).toFixed(6);
    }
  } else {
    result[0] = 1.0;
    for (let k = 1; k < EMBEDDING_DIMENSION; k++) result[k] = 0;
  }

  return result;
}

/**
 * Calcula a Similaridade de Cosseno entre dois vetores densos normalizados
 * Retorna valor entre 0.0 (sem similaridade) e 1.0 (idêntico)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  
  // Normaliza para faixa [0, 1]
  return Math.max(0, Math.min(1, (similarity + 1) / 2));
}

/**
 * Serializa vetor para armazenamento no banco (JSON string)
 */
export function serializeEmbedding(vector: number[]): string {
  return JSON.stringify(vector);
}

/**
 * Deserializa vetor armazenado
 */
export function deserializeEmbedding(raw: string | null | undefined): number[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Detecta se a conexão com banco suporta PostgreSQL + pgvector
 */
export function isPgvectorConfigured(): boolean {
  const dbUrl = process.env.DATABASE_URL || "";
  return (
    dbUrl.startsWith("postgresql://") ||
    dbUrl.startsWith("postgres://") ||
    process.env.ENABLE_PGVECTOR === "true"
  );
}

/**
 * Gera SQL especializado para PostgreSQL + pgvector caso habilitado
 */
export function getPgvectorQuerySnippet(
  tableName: string,
  vectorColumn: string,
  queryVector: number[],
  limit = 10
): { query: string; params: any[] } {
  // Operador <=> representa a distância de cosseno no pgvector (1 - cosine similarity)
  const vectorStr = `[${queryVector.join(",")}]`;
  const query = `
    SELECT id, content, (1 - (${vectorColumn} <=> $1::vector)) as score
    FROM "${tableName}"
    ORDER BY ${vectorColumn} <=> $1::vector ASC
    LIMIT $2;
  `;
  return { query, params: [vectorStr, limit] };
}

/**
 * Cálculo de pontuação híbrida (Similaridade Vetorial 60% + Correspondência Lexical 30% + Peso 10%)
 */
export function calculateHybridScore(options: {
  vectorSimilarity: number;
  query: string;
  targetText: string;
  importance?: number;
}): number {
  const { vectorSimilarity, query, targetText, importance = 3 } = options;

  // 1. Relevância Lexical (Tokens exatos e substring)
  const cleanQuery = query.toLowerCase();
  const cleanTarget = targetText.toLowerCase();
  const queryTokens = cleanQuery.split(/\s+/).filter((t) => t.length > 2);

  let matchCount = 0;
  for (const token of queryTokens) {
    if (cleanTarget.includes(token)) {
      matchCount++;
    }
  }

  const lexicalScore =
    queryTokens.length > 0 ? Math.min(1, matchCount / queryTokens.length) : 0;

  // 2. Bônus por correspondência exata de frase completa
  const phraseBonus = cleanTarget.includes(cleanQuery) ? 0.2 : 0;

  // 3. Fator de importância normalizado (1 a 5 -> 0.2 a 1.0)
  const importanceFactor = Math.min(1, Math.max(0.2, importance / 5));

  // Fórmula Híbrida Ponderada
  const finalScore =
    vectorSimilarity * 0.6 +
    Math.min(1, lexicalScore + phraseBonus) * 0.3 +
    importanceFactor * 0.1;

  return Math.min(1, Math.max(0, finalScore));
}
