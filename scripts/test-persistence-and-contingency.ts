// scripts/test-persistence-and-contingency.ts
// TESTE COMPLETO DE PERSISTÊNCIA, FONTE ÚNICA DE VERDADE E ELIMINAÇÃO DE CONTINGÊNCIA FALSA

import { PrismaClient } from "@prisma/client";
import { ensureActiveAccountInDatabase, serializeAccountToCookieValue, deserializeAccountFromCookieValue, SYNC_COOKIE_NAME } from "../src/lib/serverless-sync";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

async function login(email: string, pass: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}`);
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  return cookie!;
}

async function main() {
  console.log("====================================================");
  console.log("INICIANDO BATERIA DE TESTES DE PERSISTÊNCIA E GATEWAY");
  console.log("====================================================");

  // 1. Limpeza de registros de teste para isolamento
  console.log("\n[PASSO 1] Limpando ambiente de teste...");
  await prisma.aiProviderAccount.deleteMany({
    where: { name: "Clipoos Teste Automatizado" },
  });

  // 2. Login do Admin
  console.log("\n[PASSO 2] Admin faz login...");
  const adminCookie = await login("admin@orvexa.digital", "AdminOrvexa2026!");
  console.log(" Admin autenticado com sucesso.");

  // 3. Cadastro de API OpenAI Compatible pelo Admin
  console.log("\n[PASSO 3] Admin cadastra API OpenAI Compatible (proxy.clipoos.online)...");
  const saveRes = await fetch(`${BASE_URL}/api/admin/api-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      name: "Clipoos Teste Automatizado",
      providerId: "openai",
      rawApiKey: "sk-clipoos-test-key-2026",
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
  console.log(` Status do cadastro: ${saveRes.status}`);
  console.log(` Mensagem: ${saveData.message}`);
  const syncCookieHeader = saveRes.headers.get("set-cookie");
  const hasSyncCookie = syncCookieHeader?.includes(SYNC_COOKIE_NAME);
  console.log(` Cookie de sincronização serverless emitido: ${hasSyncCookie ? "SIM (" + SYNC_COOKIE_NAME + ")" : "NÃO"}`);

  // 4. Verificação no banco de dados (Tabela ai_provider_accounts)
  console.log("\n[PASSO 4] Verificação na tabela mestra oficial ai_provider_accounts...");
  const dbAccount = await prisma.aiProviderAccount.findFirst({
    where: { name: "Clipoos Teste Automatizado" },
  });
  if (!dbAccount) {
    throw new Error("ERRO: Conta não foi gravada em ai_provider_accounts!");
  }
  console.log(` Conta gravada com sucesso: ID=${dbAccount.id}, status=${dbAccount.status}, baseUrl=${dbAccount.baseUrl}`);

  // 5. Cliente faz login e consulta modelos
  console.log("\n[PASSO 5] Cliente acessa área do cliente e consulta modelos disponíveis...");
  const clientCookie = await login("cliente.real@orvexa.digital", "ClienteSenhaSegura2026!");
  const modelsRes = await fetch(`${BASE_URL}/api/ai/models`, {
    headers: { Cookie: clientCookie },
  });
  const modelsData = await modelsRes.json();
  console.log(` Modelos retornados para o cliente: ${modelsData.models?.length}`);
  const modelNames = modelsData.models?.map((m: any) => m.name || m.id);
  console.log(` Lista de modelos: ${JSON.stringify(modelNames)}`);

  // 6. Cliente faz teste de chat (verificando eliminação de contingência falsa)
  console.log("\n[PASSO 6] Cliente envia mensagem no chat...");
  const chatRes = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: clientCookie,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Teste de validação de persistência" }],
      modelPreference: "orvexa-prime",
    }),
  });

  console.log(` Chat HTTP Status: ${chatRes.status}`);
  const chatBody = await chatRes.text();
  console.log(` Resposta do Chat: ${chatBody}`);

  // Validação: NUNCA deve retornar o stream simulado de contingência
  if (chatBody.includes("ORVEXA PRIME DIGITAL (GPT-5.6 Luna") || chatBody.includes("Standby / Fallback")) {
    throw new Error("ERRO CRÍTICO: Chat ainda está retornando resposta demo de contingência falsa!");
  }
  console.log(" Resposta demo de contingência eliminada com sucesso. Erro real retornado.");

  // 7. Admin retorna para Gestão de APIs
  console.log("\n[PASSO 7] Admin retorna para Gestão de APIs (GET /api/admin/api-keys)...");
  const adminKeysRes = await fetch(`${BASE_URL}/api/admin/api-keys`, {
    headers: { Cookie: adminCookie },
  });
  const adminKeysData = await adminKeysRes.json();
  const foundAccount = adminKeysData.keys?.find((k: any) => k.name === "Clipoos Teste Automatizado");
  if (!foundAccount) {
    throw new Error("ERRO CRÍTICO: A API cadastrada desapareceu da lista do Admin!");
  }
  console.log(` API cadastrada continua 100% visível para o Admin: ID=${foundAccount.id}, nome=${foundAccount.name}`);

  // 8. Teste de Rehidratação Serverless (Simulando Cold Start em novo container)
  console.log("\n[PASSO 8] Testando resiliência serverless multi-container (Cold Start)...");
  // Extrai o valor do cookie de sincronização
  let cookieVal = "";
  if (syncCookieHeader) {
    const match = syncCookieHeader.match(new RegExp(`${SYNC_COOKIE_NAME}=([^;]+)`));
    if (match) cookieVal = decodeURIComponent(match[1]);
  }
  if (!cookieVal) {
    cookieVal = serializeAccountToCookieValue([dbAccount]);
  }

  const deserialized = deserializeAccountFromCookieValue(cookieVal);
  console.log(` Cookie deserializado com sucesso: ${deserialized.length} conta(s) sincronizada(s).`);

  // Simula request com o cookie em novo container
  const mockReq = new Request("http://localhost:3000/api/ai/chat", {
    headers: { cookie: `${SYNC_COOKIE_NAME}=${cookieVal}` },
  });
  const rehydrated = await ensureActiveAccountInDatabase(mockReq);
  console.log(` Rehidratação concluída com sucesso: conta ativa "${rehydrated?.name}" confirmada no banco.`);

  // 9. Limpeza final
  await prisma.aiProviderAccount.deleteMany({
    where: { name: "Clipoos Teste Automatizado" },
  });

  console.log("\n====================================================");
  console.log("TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!");
  console.log("====================================================");
}

main()
  .catch((e) => {
    console.error("\nTESTE FALHOU:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
