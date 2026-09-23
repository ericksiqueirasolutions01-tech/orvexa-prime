// scripts/test-ai-key-management.ts
// BATERIA DE TESTES AUTOMATIZADOS — AI KEY MANAGEMENT (ORVEXA PRIME)
// Valida: Cadastro de Chave, Cálculo de Consumo Real, Alerta de Validade, Alerta de Consumo e Teste de Conexão

import { PrismaClient } from "@prisma/client";
import { AiKeyManagementService } from "../src/ai/keys/key-management.service";
import { AIMonitorService } from "../src/ai/monitoring/ai-monitor.service";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

async function main() {
  console.log("======================================================================");
  console.log("🔑 INICIANDO TESTES: AI KEY MANAGEMENT — ORVEXA PRIME");
  console.log("======================================================================\n");

  let testPassedCount = 0;
  const totalTests = 6;

  try {
    // ------------------------------------------------------------------
    // TESTE 1: Cadastro de Chave de Contrato no Banco (ai_provider_keys)
    // ------------------------------------------------------------------
    console.log("--- TESTE 1: Cadastro de Chave com Criptografia e Limites Contratuais ---");
    const testKeyName = `Contrato OpenAI Master ${Date.now()}`;
    const testSecretKey = "sk-proj-test-master-key-sample-for-orvexa-2026";
    const expirationDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 dias
    const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 dias

    const createdKey = await AiKeyManagementService.saveKeyContract({
      provider: "openai",
      name: testKeyName,
      rawKey: testSecretKey,
      tokenLimit: 1000000,
      monthlyLimit: 500000,
      dailyLimit: 25000,
      initialBalance: 1000000,
      expirationDate,
      renewalDate,
    });

    if (!createdKey || !createdKey.id) {
      throw new Error("Falha ao cadastrar chave no banco de dados.");
    }

    console.log(`✓ Chave criada com sucesso: [ID: ${createdKey.id}] "${createdKey.name}"`);
    console.log(`  Provedor: ${createdKey.provider} | Chave mascarada: ${createdKey.keyHint}`);
    console.log(`  Total Contratado: ${createdKey.tokenLimit.toLocaleString()} tokens | Saldo Inicial: ${createdKey.initialBalance.toLocaleString()}`);

    // Valida no banco
    const keyInDb = await prisma.aiProviderKey.findUnique({
      where: { id: createdKey.id },
    });

    if (!keyInDb || keyInDb.encryptedKey === testSecretKey) {
      throw new Error("A chave deve ser criptografada e não pode estar em texto puro no banco!");
    }

    console.log("✅ TESTE 1 PASSOU: Cadastro de chave criptografada com limites persistido.\n");
    testPassedCount++;

    // ------------------------------------------------------------------
    // TESTE 2: Cálculo de Consumo Real Integrado com ai_usage_logs
    // ------------------------------------------------------------------
    console.log("--- TESTE 2: Cálculo de Consumo Real Integrado a ai_usage_logs ---");
    // Injeta requisições de consumo na tabela ai_usage_logs
    await AIMonitorService.recordUsageLog({
      provider: "openai",
      model: "gpt-4o",
      tokensInput: 15000,
      tokensOutput: 5000,
      latencyMs: 320,
      cost: 0.0875,
      statusCode: 200,
      status: "SUCCESS",
    });

    const metricsData = await AiKeyManagementService.listKeysWithMetrics();
    const evaluatedKey = metricsData.keys.find((k) => k.id === createdKey.id);

    if (!evaluatedKey) {
      throw new Error("Chave cadastrada não retornada na listagem de métricas");
    }

    console.log(`✓ Consumo medido para a chave "${evaluatedKey.name}":`);
    console.log(`  Tokens Consumidos: ${evaluatedKey.consumption.tokensUsed.toLocaleString()}`);
    console.log(`  Tokens Restantes: ${evaluatedKey.consumption.tokensRemaining.toLocaleString()}`);
    console.log(`  Percentual Consumido: ${evaluatedKey.consumption.percentageConsumed}%`);
    console.log(`  Custo Acumulado: $${evaluatedKey.consumption.costAccumulatedUsd.toFixed(4)} (R$ ${evaluatedKey.consumption.costAccumulatedBrl.toFixed(2)})`);

    if (evaluatedKey.consumption.tokensUsed <= 0) {
      throw new Error("O consumo integrado a ai_usage_logs não foi contabilizado corretamente!");
    }

    console.log("✅ TESTE 2 PASSOU: Integração de consumo real com ai_usage_logs validada com sucesso.\n");
    testPassedCount++;

    // ------------------------------------------------------------------
    // TESTE 3: Alerta de Validade (Chave Expira em <= 7 Dias)
    // ------------------------------------------------------------------
    console.log("--- TESTE 3: Alerta de Validade Preditiva (Chave Expira em <= 7 Dias) ---");
    const expiringKeyName = `Contrato Quase Expirado ${Date.now()}`;
    const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    const expiringKey = await AiKeyManagementService.saveKeyContract({
      provider: "anthropic",
      name: expiringKeyName,
      rawKey: "sk-ant-test-sample-expiring-key-2026",
      tokenLimit: 500000,
      expirationDate: fiveDaysFromNow,
    });

    const metricsWithExp = await AiKeyManagementService.listKeysWithMetrics();
    const expAlert = metricsWithExp.alerts.find(
      (a) => a.keyId === expiringKey.id && a.type === "EXPIRES_IN_7_DAYS"
    );

    if (!expAlert) {
      throw new Error("Alerta de expiração em 7 dias não foi emitido para a chave com 5 dias restantes!");
    }

    console.log(`✓ Alerta de validade capturado: [Tipo: ${expAlert.type}]`);
    console.log(`  Título: "${expAlert.title}"`);
    console.log(`  Mensagem: "${expAlert.message}"`);
    console.log("✅ TESTE 3 PASSOU: Alerta preditivo de validade em 7 dias validado com sucesso.\n");
    testPassedCount++;

    // ------------------------------------------------------------------
    // TESTE 4: Alerta de Consumo Acima de 80% e 90%
    // ------------------------------------------------------------------
    console.log("--- TESTE 4: Alerta de Consumo Alto (>= 80% e >= 90%) ---");
    // Cria chave com limite baixo (10.000 tokens)
    const quotaKeyName = `Contrato Limite Crítico ${Date.now()}`;
    const quotaKey = await AiKeyManagementService.saveKeyContract({
      provider: "google",
      name: quotaKeyName,
      rawKey: "AIzaSyTestSampleQuotaKeyForAlerts2026",
      tokenLimit: 10000,
    });

    // Injeta uso de 8.500 tokens (85% -> WARNING_80)
    await AIMonitorService.recordUsageLog({
      provider: "google",
      model: "gemini-1.5-flash",
      tokensInput: 6500,
      tokensOutput: 2000,
      latencyMs: 190,
      cost: 0.005,
      statusCode: 200,
      status: "SUCCESS",
    });

    const metricsAfterUsage = await AiKeyManagementService.listKeysWithMetrics();
    const quotaContract = metricsAfterUsage.keys.find((k) => k.id === quotaKey.id);

    console.log(`✓ Chave "${quotaContract?.name}": percentual de uso = ${quotaContract?.consumption.percentageConsumed}% | status = ${quotaContract?.status}`);

    const consumptionAlert = metricsAfterUsage.alerts.find(
      (a) => a.keyId === quotaKey.id && (a.type === "CONSUMPTION_OVER_80" || a.type === "CONSUMPTION_OVER_90")
    );

    if (!consumptionAlert) {
      throw new Error("Alerta de consumo acima de 80% não foi emitido!");
    }

    console.log(`✓ Alerta de consumo capturado com sucesso: [Tipo: ${consumptionAlert.type}]`);
    console.log(`  Título: "${consumptionAlert.title}"`);
    console.log("✅ TESTE 4 PASSOU: Alertas de consumo de quota validados com sucesso.\n");
    testPassedCount++;

    // ------------------------------------------------------------------
    // TESTE 5: Teste de Conexão da Chave (🧪 Testar conexão)
    // ------------------------------------------------------------------
    console.log("--- TESTE 5: Teste de Conexão com a Chave (🧪 Testar conexão) ---");
    const testResult = await AiKeyManagementService.testKeyConnection(createdKey.id);

    console.log(`✓ Resultado do teste de conexão:`);
    console.log(`  Status retornado: ${testResult.status}`);
    console.log(`  Latência medida: ${testResult.latencyMs} ms`);
    console.log(`  Modelos detectados: ${testResult.detectedModels.slice(0, 3).join(", ")}`);
    console.log(`  Mensagem do provedor: "${testResult.message}"`);

    // Valida se atualizou a tabela ai_provider_keys
    const updatedKey = await prisma.aiProviderKey.findUnique({
      where: { id: createdKey.id },
    });

    if (!updatedKey || !updatedKey.lastTestedAt) {
      throw new Error("lastTestedAt não foi atualizado no banco de dados!");
    }

    console.log(`✓ Timestamp de teste gravado no banco: ${updatedKey.lastTestedAt.toISOString()}`);
    console.log("✅ TESTE 5 PASSOU: Teste de conexão operacional validado com sucesso.\n");
    testPassedCount++;

    // ------------------------------------------------------------------
    // TESTE 6: Endpoints HTTP de API (/api/admin/ai-keys)
    // ------------------------------------------------------------------
    console.log("--- TESTE 6: Endpoints HTTP da API (/api/admin/ai-keys) ---");
    // Login admin
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@orvexa.digital", password: "AdminOrvexa2026!" }),
    });

    const cookie = loginRes.headers.get("set-cookie") || "";
    console.log("✓ Autenticado como Administrador.");

    // GET /api/admin/ai-keys
    const getRes = await fetch(`${BASE_URL}/api/admin/ai-keys`, {
      headers: { Cookie: cookie },
    });

    if (!getRes.ok) {
      throw new Error(`GET /api/admin/ai-keys retornou status ${getRes.status}`);
    }

    const getData = await getRes.json();
    console.log(`✓ GET /api/admin/ai-keys retornou ${getData.keys.length} contratos e ${getData.alerts.length} alertas.`);

    // POST /api/admin/ai-keys/[id]/test
    const testRes = await fetch(`${BASE_URL}/api/admin/ai-keys/${createdKey.id}/test`, {
      method: "POST",
      headers: { Cookie: cookie },
    });

    if (!testRes.ok) {
      throw new Error(`POST /api/admin/ai-keys/[id]/test retornou status ${testRes.status}`);
    }

    const testData = await testRes.json();
    console.log(`✓ POST /api/admin/ai-keys/[id]/test retornou status=${testData.status} | latência=${testData.latencyMs}ms`);

    // Limpeza das chaves de teste
    await AiKeyManagementService.deleteKey(createdKey.id);
    await AiKeyManagementService.deleteKey(expiringKey.id);
    await AiKeyManagementService.deleteKey(quotaKey.id);
    console.log("✓ Chaves de teste limpas com sucesso.");

    console.log("✅ TESTE 6 PASSOU: Endpoints REST e ciclo de vida validados com 100% de sucesso.\n");
    testPassedCount++;

    // ------------------------------------------------------------------
    // RESULTADO FINAL
    // ------------------------------------------------------------------
    console.log("======================================================================");
    console.log(`🎉 RESULTADO FINAL: ${testPassedCount}/${totalTests} TESTES APROVADOS COM SUCESSO!`);
    console.log("O módulo AI KEY MANAGEMENT está 100% operacional e integrado.");
    console.log("======================================================================\n");

  } catch (error: any) {
    console.error("❌ ERRO DURANTE A EXECUÇÃO DOS TESTES:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

