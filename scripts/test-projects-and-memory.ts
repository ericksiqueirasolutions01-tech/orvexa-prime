// scripts/test-projects-and-memory.ts
// Bateria de Testes Automatizados — Projetos e Memória Contextual ORVEXA PRIME

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

async function main() {
  console.log("======================================================================");
  console.log("🚀 INICIANDO TESTES: PROJETOS E MEMÓRIA CONTEXTUAL — ORVEXA PRIME");
  console.log("======================================================================\n");

  let testPassedCount = 0;
  let totalTests = 5;

  try {
    // 0. Obter ou criar um usuário de teste
    let testUser = await prisma.user.findFirst();
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          id: "test-user-contextual",
          email: "test-projects@orvexa.com",
          name: "Tester Projetos",
        },
      });
    }
    console.log(`👤 Usuário de teste: ${testUser.name} (${testUser.id})`);

    // ------------------------------------------------------------------
    // TESTE 1: Criar Projeto com Diretrizes Personalizadas
    // ------------------------------------------------------------------
    console.log("\n--- TESTE 1: Criar Projeto no Banco de Dados ---");
    const testProjectName = `Empresa Alpha ${Date.now()}`;
    const testProjectDesc = "Espaço corporativo para desenvolvimento de estratégias e relatórios";
    const testInstructions = "Empresa atua no ramo X. Tom de comunicação profissional. Clientes principais são Y.";

    const createdProject = await prisma.project.create({
      data: {
        userId: testUser.id,
        name: testProjectName,
        description: testProjectDesc,
        customInstructions: testInstructions,
        status: "ACTIVE",
      },
    });

    if (createdProject && createdProject.id && createdProject.customInstructions === testInstructions) {
      console.log(`✅ Projeto criado com sucesso: [ID: ${createdProject.id}] "${createdProject.name}"`);
      console.log(`   Instruções registradas: "${createdProject.customInstructions}"`);
      testPassedCount++;
    } else {
      throw new Error("Falha ao criar projeto no Prisma");
    }

    // ------------------------------------------------------------------
    // TESTE 2: Adicionar Arquivo e Memória ao Projeto
    // ------------------------------------------------------------------
    console.log("\n--- TESTE 2: Adicionar Arquivo e Memória Contextual ---");
    const sampleFileText = "Manual de Operações Alpha: Regra 1 - Pagamentos em 30 dias. Regra 2 - Suporte 24/7 aos clientes enterprise.";
    const createdFile = await prisma.projectFile.create({
      data: {
        projectId: createdProject.id,
        userId: testUser.id,
        fileName: "manual_operacoes.txt",
        fileType: "text/plain",
        fileSize: Buffer.byteLength(sampleFileText, "utf-8"),
        extractedText: sampleFileText,
      },
    });

    const createdMemory = await prisma.projectMemory.create({
      data: {
        projectId: createdProject.id,
        userId: testUser.id,
        content: "A empresa possui sede em São Paulo e subsidiária em Lisboa.",
        category: "business_fact",
      },
    });

    console.log(`✅ Arquivo associado ao projeto: [ID: ${createdFile.id}] "${createdFile.fileName}" (${createdFile.fileSize} bytes)`);
    console.log(`   Texto extraído: "${createdFile.extractedText?.slice(0, 50)}..."`);
    console.log(`✅ Memória gravada: [ID: ${createdMemory.id}] "${createdMemory.content}"`);
    testPassedCount++;

    // ------------------------------------------------------------------
    // TESTE 3: Criar Conversa Vinculada ao Projeto e Tabela de Junção
    // ------------------------------------------------------------------
    console.log("\n--- TESTE 3: Criar Conversa Vinculada ao Projeto ---");
    const createdConversation = await prisma.conversation.create({
      data: {
        userId: testUser.id,
        title: "Alinhamento Estratégico Q4",
        modelPreference: "orvexa-prime",
        projectId: createdProject.id,
        projectConversations: {
          create: {
            projectId: createdProject.id,
          },
        },
      },
      include: {
        projectConversations: true,
      },
    });

    const isLinked = createdConversation.projectId === createdProject.id && createdConversation.projectConversations.length > 0;
    if (isLinked) {
      console.log(`✅ Conversa criada e vinculada ao Projeto: [ID: ${createdConversation.id}] "${createdConversation.title}"`);
      console.log(`   Vínculo confirmado na tabela ProjectConversation: count=${createdConversation.projectConversations.length}`);
      testPassedCount++;
    } else {
      throw new Error("Falha ao vincular conversa ao projeto na tabela de junção");
    }

    // ------------------------------------------------------------------
    // TESTE 4: Validar Montagem do Contexto do Projeto para a IA
    // ------------------------------------------------------------------
    console.log("\n--- TESTE 4: Validar Montagem do Contexto para a IA ---");
    // Simula a lógica de montagem do context injection executada em /api/ai/chat
    const projectWithData = await prisma.project.findUnique({
      where: { id: createdProject.id },
      include: {
        memories: { orderBy: { createdAt: "desc" }, take: 10 },
        files: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    let projectContextParts: string[] = [];
    projectContextParts.push(`\n\n[ESPAÇO DE TRABALHO / PROJETO ATIVO: "${projectWithData?.name}"]`);
    if (projectWithData?.description) {
      projectContextParts.push(`Descrição do Projeto: ${projectWithData.description}`);
    }
    if (projectWithData?.customInstructions) {
      projectContextParts.push(`Diretrizes e Instruções Específicas do Projeto:\n${projectWithData.customInstructions}`);
    }
    if (projectWithData?.memories && projectWithData.memories.length > 0) {
      const memoryLines = projectWithData.memories.map((m, idx) => `${idx + 1}. ${m.content}`).join("\n");
      projectContextParts.push(`Memória Contextual Aprendida do Projeto:\n${memoryLines}`);
    }
    if (projectWithData?.files && projectWithData.files.length > 0) {
      const fileTexts = projectWithData.files
        .filter((f) => f.extractedText)
        .map((f) => `--- Arquivo: ${f.fileName} ---\n${f.extractedText?.slice(0, 1000)}`)
        .join("\n\n");
      if (fileTexts) {
        projectContextParts.push(`Base de Arquivos e Documentos do Projeto:\n${fileTexts}`);
      }
    }
    projectContextParts.push(
      `Instrução para a IA: Aplique estritamente as diretrizes, memórias e fatos deste projeto em todas as respostas.`
    );

    const assembledContext = projectContextParts.join("\n\n");
    console.log("📝 Contexto gerado para injeção no system prompt:");
    console.log("------------------------------------------------------------------");
    console.log(assembledContext);
    console.log("------------------------------------------------------------------");

    const containsInstructions = assembledContext.includes("Empresa atua no ramo X");
    const containsMemory = assembledContext.includes("subsidiária em Lisboa");
    const containsFileText = assembledContext.includes("Regra 1 - Pagamentos");

    if (containsInstructions && containsMemory && containsFileText) {
      console.log("✅ Injeção de contexto validada com sucesso (instruções + memória + arquivos presentes)!");
      testPassedCount++;
    } else {
      throw new Error("Falha na validação do contexto contextual montado");
    }

    // ------------------------------------------------------------------
    // TESTE 5: Validar Persistência de Memória Automática no Chat
    // ------------------------------------------------------------------
    console.log("\n--- TESTE 5: Detecção e Persistência de Memória Conversacional ---");
    const memoryCommand = "Guarde que nossa filial no Rio opera das 8h às 18h.";
    const memoryMatch = memoryCommand.match(/^(?:guarde|salve|lembre-se|lembre|grave|anote|registre)\s+(?:que|de que|isso:?)\s+(.+)/i);

    if (memoryMatch && memoryMatch[1]) {
      const extractedMemoryFact = memoryMatch[1].trim();
      console.log(`🔍 Comando conversacional identificado: "${memoryCommand}"`);
      console.log(`   Fato extraído: "${extractedMemoryFact}"`);

      // Persiste no banco de dados como faz a rota /api/ai/chat
      const autoMemory = await prisma.projectMemory.create({
        data: {
          projectId: createdProject.id,
          userId: testUser.id,
          content: extractedMemoryFact,
          category: "conversational_capture",
        },
      });

      console.log(`✅ Memória conversacional salva automaticamente: [ID: ${autoMemory.id}] "${autoMemory.content}"`);

      // Confere persistência total
      const totalMemories = await prisma.projectMemory.count({
        where: { projectId: createdProject.id },
      });
      console.log(`📊 Total de memórias salvas no projeto: ${totalMemories}`);

      if (totalMemories >= 2) {
        testPassedCount++;
      } else {
        throw new Error("Contagem de memórias no projeto inconsistente");
      }
    } else {
      throw new Error("Regex de captura de memória não correspondeu ao comando padrão");
    }

    // ------------------------------------------------------------------
    // Limpeza de registros de teste
    // ------------------------------------------------------------------
    console.log("\n🧹 Limpando dados do teste...");
    await prisma.message.deleteMany({
      where: { conversation: { projectId: createdProject.id } },
    });
    await prisma.projectConversation.deleteMany({
      where: { projectId: createdProject.id },
    });
    await prisma.conversation.deleteMany({
      where: { projectId: createdProject.id },
    });
    await prisma.projectMemory.deleteMany({
      where: { projectId: createdProject.id },
    });
    await prisma.projectFile.deleteMany({
      where: { projectId: createdProject.id },
    });
    await prisma.project.delete({
      where: { id: createdProject.id },
    });
    console.log("✅ Limpeza de dados do teste concluída com sucesso.");

    // ------------------------------------------------------------------
    // RESULTADO FINAL
    // ------------------------------------------------------------------
    console.log("\n======================================================================");
    console.log(`🎉 RESULTADO: ${testPassedCount}/${totalTests} TESTES EXECUTADOS COM SUCESSO!`);
    console.log("======================================================================\n");
  } catch (error) {
    console.error("❌ ERRO NO TESTE:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
