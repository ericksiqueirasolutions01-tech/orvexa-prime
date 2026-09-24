// scripts/reproduce-user-bug.ts
// Reproduz o fluxo exato relatado pelo usuário

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

async function login(email: string, pass: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass }),
  });
  if (!res.ok) throw new Error("Login failed");
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  return cookie!;
}

async function main() {
  console.log("--- PASSO 0: Estado inicial do banco ---");
  let accounts = await prisma.aiProviderAccount.findMany();
  console.log(`Contas no banco: ${accounts.length}`);

  console.log("\n--- PASSO 1: Admin faz login ---");
  const adminCookie = await login("admin@orvexa.digital", "AdminOrvexa2026!");

  console.log("\n--- PASSO 2: Admin cadastra API OpenAI Compatible ---");
  const saveRes = await fetch(`${BASE_URL}/api/admin/api-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      name: "Clipoos Produção",
      providerId: "openai",
      rawApiKey: "sk-clipoos-test-key-12345678",
      tokenLimitMonthly: 50000000,
      customBaseUrl: "https://proxy.clipoos.online/v1",
      capabilities: ["TEXTO", "CODIGO", "DOCUMENTO"],
      detectedModels: ["gpt-4o", "gpt-4o-mini"],
      priority: 1,
      status: "ACTIVE",
      forceSave: true,
    }),
  });

  const saveData = await saveRes.json();
  console.log("Resposta do salvamento:", saveData);

  console.log("\n--- PASSO 3: Consulta direta ao banco de dados ---");
  accounts = await prisma.aiProviderAccount.findMany();
  console.log(`Contas no banco após salvar: ${accounts.length}`);
  for (const acc of accounts) {
    console.log(`  ID: ${acc.id} | Nome: ${acc.name} | Status: ${acc.status} | BaseUrl: ${acc.baseUrl}`);
  }

  console.log("\n--- PASSO 4: Cliente entra e faz teste de chat ---");
  const clientCookie = await login("cliente.real@orvexa.digital", "ClienteSenhaSegura2026!");

  const chatRes = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: clientCookie,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Olá, você está funcionando?" }],
      modelPreference: "orvexa-prime",
    }),
  });

  console.log(`Chat HTTP Status: ${chatRes.status}`);
  const keyStatusHeader = chatRes.headers.get("x-orvexa-key-status");
  const modelHeader = chatRes.headers.get("x-orvexa-model");
  console.log(`Header x-orvexa-key-status: ${keyStatusHeader}`);
  console.log(`Header x-orvexa-model: ${modelHeader}`);

  // Lê a resposta do stream
  const reader = chatRes.body?.getReader();
  let chatBody = "";
  if (reader) {
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chatBody += decoder.decode(value);
    }
  }
  console.log("Trecho da resposta do chat (primeiros 200 chars):", chatBody.slice(0, 200));

  console.log("\n--- PASSO 5: Consulta banco de dados APÓS o chat ---");
  accounts = await prisma.aiProviderAccount.findMany();
  console.log(`Contas no banco após o chat: ${accounts.length}`);
  for (const acc of accounts) {
    console.log(`  ID: ${acc.id} | Nome: ${acc.name} | Status: ${acc.status}`);
  }

  console.log("\n--- PASSO 6: Admin retorna para Gestão de APIs (GET /api/admin/api-keys) ---");
  const adminKeysRes = await fetch(`${BASE_URL}/api/admin/api-keys`, {
    headers: { Cookie: adminCookie },
  });
  const adminKeysData = await adminKeysRes.json();
  console.log(`APIs retornadas para o Admin: ${adminKeysData.keys?.length}`);
  console.log("Keys:", adminKeysData.keys);
}

main().catch(console.error).finally(() => prisma.$disconnect());
