// scripts/test-smart-memory-e2e.js
// TESTE COMPLETO E2E DO ORVEXA SMART MEMORY ENGINE
// Valida geração vetorial, pgvector readiness, RAG, chunking de arquivos, conversas e CRUD

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Helper para carregar módulos TypeScript em runtime
function loadTsModule(relPath) {
  const fullPath = path.resolve(__dirname, relPath);
  const code = fs.readFileSync(fullPath, "utf-8");
  const transpiled = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });

  const customRequire = (id) => {
    if (id === "@/lib/prisma" || id === "../../lib/prisma" || id === "../src/lib/prisma") {
      return { prisma };
    }
    if (id.startsWith("./") || id.startsWith("../")) {
      const resolved = path.resolve(path.dirname(fullPath), id);
      const withTs = resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
      if (fs.existsSync(withTs)) {
        return loadTsModule(path.relative(__dirname, withTs));
      }
    }
    return require(id);
  };

  const m = { exports: {} };
  const fn = new Function("module", "exports", "require", "__dirname", "__filename", transpiled.outputText);
  fn(m, m.exports, customRequire, path.dirname(fullPath), fullPath);
  return m.exports;
}

async function runTests() {
  console.log("==================================================");
  console.log("🧠 INICIANDO TESTE E2E DO ORVEXA SMART MEMORY ENGINE");
  console.log("==================================================\n");

  const vectorStore = loadTsModule("../src/ai/memory/vector-store.ts");
  const userMemory = loadTsModule("../src/ai/memory/user-memory.ts");
  const fileIndexer = loadTsModule("../src/ai/memory/file-indexer.ts");
  const convIndexer = loadTsModule("../src/ai/memory/conversation-indexer.ts");
  const semanticSearch = loadTsModule("../src/ai/memory/semantic-search.ts");

  // Localiza usuário de teste
  const user = await prisma.user.findFirst();
  assert(user, "Usuário deve existir no banco de dados para testes");
  const testUserId = user.id;

  // 1. Geração de Embeddings Densos & Norma L2
  console.log("▶ [TESTE 1] Geração de Embeddings Densos & Norma L2 (384 dimensões)...");
  const vec1 = vectorStore.generateDenseEmbedding("Desenvolvimento de microsserviços em TypeScript e Next.js");
  const vec2 = vectorStore.generateDenseEmbedding("Programação backend com Node.js e TypeScript");
  const vec3 = vectorStore.generateDenseEmbedding("Receita culinária de bolo de chocolate");

  assert.strictEqual(vec1.length, vectorStore.EMBEDDING_DIMENSION);
  assert.strictEqual(vec2.length, vectorStore.EMBEDDING_DIMENSION);

  let norm1 = 0;
  for (const v of vec1) norm1 += v * v;
  norm1 = Math.sqrt(norm1);
  console.log(`  ✔ Vetor denso gerado: ${vec1.length} dimensões, Norma L2 = ${norm1.toFixed(4)}`);
  assert(Math.abs(norm1 - 1.0) < 0.01, "Norma do vetor deve ser unitária (1.0)");

  const simRel = vectorStore.cosineSimilarity(vec1, vec2);
  const simNaoRel = vectorStore.cosineSimilarity(vec1, vec3);
  console.log(`  ✔ Similaridade entre tópicos técnicos: ${(simRel * 100).toFixed(1)}%`);
  console.log(`  ✔ Similaridade entre técnico e culinária: ${(simNaoRel * 100).toFixed(1)}%`);
  assert(simRel > simNaoRel, "Tópicos semanticamente próximos devem ter similaridade superior");
  console.log("  ✔ TESTE 1 CONCLUÍDO COM SUCESSO!\n");

  // 2. Arquitetura PostgreSQL + pgvector
  console.log("▶ [TESTE 2] Arquitetura Preparada para PostgreSQL + pgvector...");
  const snippet = vectorStore.getPgvectorQuerySnippet("FileKnowledge", "embedding", vec1, 5);
  console.log(`  ✔ Snippet SQL pgvector: ${snippet.query.trim().slice(0, 95)}...`);
  assert(snippet.query.includes("<=>"), "Deve utilizar operador de distância vetorial <=> do pgvector");
  console.log(`  ✔ pgvector status: ${vectorStore.isPgvectorConfigured() ? "Ativo" : "Pronto (Fallback SQLite Vetorial)"}`);
  console.log("  ✔ TESTE 2 CONCLUÍDO COM SUCESSO!\n");

  // 3. CRUD da Memória do Usuário
  console.log("▶ [TESTE 3] Testando CRUD da Memória do Usuário com Vetor...");
  const created = await userMemory.saveUserMemory(testUserId, {
    key: "PREFERENCIA_ARQUITETURA",
    value: "Arquitetura Clean com Domain-Driven Design (DDD) e PostgreSQL",
    category: "CODING",
    tags: ["ddd", "arquitetura", "postgres"],
    importance: 5,
  });
  console.log(`  ✔ Memória inserida com vetor: ID ${created.id}, Chave: ${created.key}`);
  assert(created.embedding !== null, "Deve armazenar vetor serializado no banco");

  // Edição
  const updated = await userMemory.updateUserMemory(testUserId, created.id, {
    value: "Arquitetura Clean com DDD, PostgreSQL e pgvector",
    importance: 5,
  });
  assert(updated.value.includes("pgvector"), "Conteúdo deve refletir a atualização");
  console.log(`  ✔ Memória editada com sucesso: "${updated.value}"`);

  // Listagem
  const userMems = await userMemory.getUserMemories(testUserId);
  assert(userMems.length > 0);
  console.log(`  ✔ Total de memórias ativas listadas para o usuário: ${userMems.length}`);
  console.log("  ✔ TESTE 3 CONCLUÍDO COM SUCESSO!\n");

  // 4. Chunking Semântico de Arquivos
  console.log("▶ [TESTE 4] Fatiamento Semântico e Indexação de Arquivos...");
  const sampleDoc = `
    ORVEXA PRIME DIGITAL - CONTRATO DE PRESTAÇÃO DE SERVIÇOS
    
    Cláusula 1ª - DO OBJETO
    O presente contrato tem como objeto a prestação de serviços de consultoria em inteligência artificial
    e automação de processos corporativos com fornecimento de modelos LLM dedicados.
    
    Cláusula 2ª - DOS VALORES E FORMA DE PAGAMENTO
    Pela prestação dos serviços objeto deste contrato, a CONTRATANTE pagará à CONTRATADA o valor mensal de
    R$ 14.900,00 (quatorze mil e novecentos reais), com vencimento no dia 10 de cada mês.
    
    Cláusula 3ª - DA CONFIDENCIALIDADE
    As partes comprometem-se a manter em sigilo absoluto todas as informações técnicas e comerciais.
  `;
  const chunks = fileIndexer.chunkTextSemantically(sampleDoc, { chunkSize: 250, overlap: 50 });
  console.log(`  ✔ Documento fatiado em ${chunks.length} chunks com sobreposição semântica.`);
  assert(chunks.length >= 2);

  // Inserção de chunk de teste
  const dummyFile = await prisma.file.findFirst({ where: { userId: testUserId } });
  let savedChunkId = null;
  if (dummyFile) {
    const chunkEmbed = vectorStore.generateDenseEmbedding(chunks[1]);
    const savedChunk = await prisma.fileKnowledge.create({
      data: {
        userId: testUserId,
        fileId: dummyFile.id,
        fileName: dummyFile.originalName,
        chunkIndex: 0,
        content: chunks[1],
        summary: "Cláusula 2ª - Valores de R$ 14.900,00 mensais",
        category: "DOCUMENT",
        embedding: JSON.stringify(chunkEmbed),
      },
    });
    savedChunkId = savedChunk.id;
    console.log(`  ✔ Chunk de arquivo indexado com vetor: ID ${savedChunk.id}`);
  }
  console.log("  ✔ TESTE 4 CONCLUÍDO COM SUCESSO!\n");

  // 5. Sumarização e Indexação de Conversas Anteriores
  console.log("▶ [TESTE 5] Sumarização Semântica de Diálogos Anteriores...");
  const sampleMessages = [
    { role: "user", content: "Como configuro a chave da OpenAI no painel administrativo?" },
    { role: "assistant", content: "Vá em Admin > Chaves de API e adicione sua chave com prefixo sk-live." },
    { role: "user", content: "Perfeito, configurado com sucesso!" },
  ];
  const summaryRes = convIndexer.summarizeConversationMessages("Configuração de APIs", sampleMessages);
  console.log(`  ✔ Sumário gerado: "${summaryRes.summary.slice(0, 90)}..."`);
  console.log(`  ✔ Takeaways extraídos: ${summaryRes.keyTakeaways.length}`);
  assert(summaryRes.keyTakeaways.length > 0);
  console.log("  ✔ TESTE 5 CONCLUÍDO COM SUCESSO!\n");

  // 6. Busca Semântica Cruzada em Tempo Real & RAG
  console.log("▶ [TESTE 6] Busca Semântica Vetorial Híbrida & Recuperação RAG...");
  const searchResults = await semanticSearch.searchAllMemories({
    userId: testUserId,
    query: "qual a arquitetura de banco de dados do projeto?",
    scope: "ALL",
    limit: 5,
    minScore: 20,
  });

  console.log(`  ✔ Itens encontrados via busca semântica: ${searchResults.length}`);
  searchResults.forEach((r) => {
    console.log(`    • [${r.type}] ${r.title} — Similaridade: ${r.score}%`);
  });
  assert(searchResults.length > 0);

  const ragPrompt = await semanticSearch.retrieveUnifiedMemoryContext({
    userId: testUserId,
    query: "quais os valores e regras combinadas?",
    limit: 3,
  });
  console.log(`  ✔ Contexto RAG formatado para injeção no prompt: ${ragPrompt.length} caracteres.`);
  assert(ragPrompt.includes("MEMÓRIA DE LONGO PRAZO"));
  console.log("  ✔ TESTE 6 CONCLUÍDO COM SUCESSO!\n");

  // 7. Exclusão Segura (Controle Solicitado)
  console.log("▶ [TESTE 7] Testando Exclusão de Memória (Delete Control)...");
  await userMemory.deleteUserMemory(testUserId, created.id);
  const checkDeleted = await prisma.userMemory.findUnique({ where: { id: created.id } });
  assert.strictEqual(checkDeleted, null, "Memória deve ter sido removida do banco");
  console.log(`  ✔ Memória ID ${created.id} excluída com sucesso.`);

  if (savedChunkId) {
    await prisma.fileKnowledge.delete({ where: { id: savedChunkId } }).catch(() => {});
  }
  console.log("  ✔ TESTE 7 CONCLUÍDO COM SUCESSO!\n");

  console.log("==================================================");
  console.log("🎉 TODOS OS 7 TESTES DO SMART MEMORY ENGINE FORAM APROVADOS COM 100%!");
  console.log("==================================================");
}

runTests()
  .catch((err) => {
    console.error("❌ ERRO NO TESTE E2E:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

