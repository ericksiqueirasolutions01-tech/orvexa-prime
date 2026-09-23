// scripts/test-chat-project-memory-e2e.ts
// Teste E2E de Chat com Projeto e Captura Automática de Memória

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

async function runChatProjectMemoryE2E() {
  console.log("======================================================================");
  console.log("💬 TESTE E2E: CHAT COM PROJETO E CAPTURA DE MEMÓRIA — ORVEXA PRIME");
  console.log("======================================================================\n");

  try {
    // 1. Login
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "cliente@orvexa.digital", password: "ClienteOrvexa2026!" }),
    });
    const cookie = loginRes.headers.get("set-cookie") || "";
    console.log("✓ Autenticado com sucesso.");

    // 2. Criar Projeto
    const projRes = await fetch(`${BASE_URL}/api/ai/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        name: "Consultoria Estratégica Global",
        description: "Espaço para projetos de consultoria de alta gestão",
        customInstructions: "Responder sempre em tom executivo, objetivo e com bullet points quando couber.",
      }),
    });
    const projData = await projRes.json();
    const projectId = projData.project.id;
    console.log(`✓ Projeto criado: [ID: ${projectId}] "${projData.project.name}"`);

    // 3. Criar Conversa vinculada ao Projeto
    const convRes = await fetch(`${BASE_URL}/api/ai/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        title: "Alinhamento de Clientes",
        modelPreference: "orvexa-prime",
        projectId: projectId,
      }),
    });
    const convData = await convRes.json();
    const conversationId = convData.conversation.id;
    console.log(`✓ Conversa criada vinculada ao projeto: [ID: ${conversationId}]`);

    // 4. Enviar mensagem com comando de guardar memória
    console.log('\n--- Enviando mensagem: "Guarde que nossa sede central fica no Rio de Janeiro e nosso principal cliente é a Petrobras." ---');
    const chatRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        conversationId,
        projectId,
        modelPreference: "orvexa-prime",
        messages: [
          {
            role: "user",
            content: "Guarde que nossa sede central fica no Rio de Janeiro e nosso principal cliente é a Petrobras.",
          },
        ],
      }),
    });

    console.log(`✓ Resposta do Chat HTTP Status: ${chatRes.status}`);
    const selectedProvider = chatRes.headers.get("x-orvexa-provider");
    const routerReason = chatRes.headers.get("x-orvexa-router-reason");
    const headerProjectId = chatRes.headers.get("x-orvexa-project-id");
    console.log(`  Provedor roteado: ${selectedProvider}`);
    console.log(`  Motivo do Smart Router: ${routerReason}`);
    console.log(`  Header Project ID: ${headerProjectId}`);

    // Ler stream
    const reader = chatRes.body?.getReader();
    let assistantReply = "";
    if (reader) {
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantReply += decoder.decode(value, { stream: true });
      }
    }
    console.log(`  Resposta da IA: "${assistantReply.trim().slice(0, 150)}..."`);

    // 5. Validar se a memória foi automaticamente persistida no banco de dados!
    console.log("\n--- Validando persistência automática da memória no banco de dados ---");
    const savedMemories = await prisma.projectMemory.findMany({
      where: { projectId: projectId },
    });

    console.log(`📊 Memórias encontradas no banco para o projeto: ${savedMemories.length}`);
    savedMemories.forEach((m, idx) => {
      console.log(`   [${idx + 1}] Categoria: ${m.category} | Conteúdo: "${m.content}"`);
    });

    const hasPetrobrasMemory = savedMemories.some((m) =>
      m.content.toLowerCase().includes("petrobras") || m.content.toLowerCase().includes("rio de janeiro")
    );

    if (hasPetrobrasMemory) {
      console.log("\n✅ SUCESSO: Memória contextual foi capturada e persistida automaticamente no banco!");
    } else {
      throw new Error("Memória contextual não foi encontrada no banco de dados.");
    }

    // 6. Limpar projeto de teste
    console.log("\n🧹 Limpando dados do teste...");
    await fetch(`${BASE_URL}/api/ai/projects/${projectId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    console.log("✓ Projeto de teste removido.");

    console.log("\n======================================================================");
    console.log("🎉 TESTE E2E DE CHAT COM PROJETO E MEMÓRIA EXECUTADO COM SUCESSO!");
    console.log("======================================================================\n");
  } catch (error) {
    console.error("❌ ERRO NO TESTE E2E:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runChatProjectMemoryE2E();

