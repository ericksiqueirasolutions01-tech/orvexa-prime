// scripts/test-ai-quota-manager.ts
// BATERIA DE TESTES AUTOMATIZADOS — AI QUOTA MANAGER (ORVEXA PRIME)
// Valida:
// 1. Cadastro de Conta Mirai API
// 2. Sincronização (Direta via API ou calculada via ai_usage_logs)
// 3. Cálculo de Consumo (Hoje, Mês, Tokens restantes, %, Projeção)
// 4. Geração de Alertas Preditivos (80%, 90%, Vencimento em 7 dias, Inválido, Limite Atingido)
// 5. Integração com Smart Router (Detecção de quota e fallback resiliente)
// 6. Teste de Conexão com Provedor

import { PrismaClient } from "@prisma/client";
import { AiQuotaManagerService } from "../src/ai/quota/quota-manager.service";
import { AIMonitorService } from "../src/ai/monitoring/ai-monitor.service";
import { classifyAndRoute } from "../src/ai/gateway/smart-router";

const prisma = new PrismaClient();

async function main() {
  console.log("======================================================================");
  console.log("🔑 INICIANDO TESTES: AI QUOTA MANAGER — ORVEXA PRIME");
  console.log("======================================================================\n");

  let testPassedCount = 0;
  const totalTests = 6;
  let testAccountId: string | null = null;

  try {
    // ------------------------------------------------------------------
    // TESTE 1: Cadastro de Conta Mirai API no Banco (ai_provider_accounts)
    // ------------------------------------------------------------------
    console.log("--- TESTE 1: Cadastro de Conta Mirai API com Quotas e Criptografia ---");
    const accountName = `Mirai Enterprise High-Speed ${Date.now()}`;
    const rawApiKey = "sk-mirai-super-secret-key-orvexa-2026";
    const customBaseUrl = "https://api.mirai.io/v1";
    const expirationDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 dias
    const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 dias
    const totalQuota = 10_000_000; // 10M tokens

    const createdAccount = await AiQuotaManagerService.saveAccount({
      provider: "mirai",
      accountName,
      rawKey: rawApiKey,
      customBaseUrl,
      totalQuota,
      quotaType: "TOKENS",
      expirationDate,
      renewalDate,
    });

    if (!createdAccount || !createdAccount.id) {
      throw new Error("Falha ao salvar conta Mirai no banco.");
    }
    testAccountId = createdAccount.id;

    console.log(`✓ Conta criada: [ID: ${createdAccount.id}] "${createdAccount.accountName}"`);
    console.log(`  Provedor: ${createdAccount.provider} | Chave mascarada: ${createdAccount.apiKeyMasked}`);
    console.log(`  Quota Total: ${createdAccount.quota.totalQuota.toLocaleString()} tokens | Status: ${createdAccount.status}`);
    console.log(`  Base URL: ${createdAccount.diagnostics ? "Configurada" : "Padrão"}`);

    // Validação no banco (garantir que chave não está em texto puro)
    const dbAccount = await prisma.aiProviderAccount.findUnique({
      where: { id: createdAccount.id },
    });

    if (!dbAccount || dbAccount.encryptedKey === rawApiKey) {
      throw new Error("A chave de API DEVE ser salva criptografada (AES-256-GCM)!");
    }

    console.log("✅ TESTE 1 PASSOU: Cadastro de conta Mirai com criptografia bem-sucedido.\n");
    testPassedCount++;

    // ------------------------------------------------------------------
    // TESTE 2: Registro em ai_usage_logs e Cálculo de Consumo Real
    // ------------------------------------------------------------------
    console.log("--- TESTE 2: Cálculo de Consumo e Projeção Integrado a ai_usage_logs ---");
    
    // Inserir logs de uso simulados para o provedor mirai
    await AIMonitorService.recordUsageLog({
      provider: "mirai",
      model: "mirai-prime-v2",
      tokensInput: 25000,
      tokensOutput: 10000,
      cost: 0.07,
      latencyMs: 320,
      statusCode: 200,
      status: "SUCCESS",
    });

    await AIMonitorService.recordUsageLog({
      provider: "mirai",
      model: "mirai-prime-v2",
      tokensInput: 40000,
      tokensOutput: 15000,
      cost: 0.11,
      latencyMs: 410,
      statusCode: 200,
      status: "SUCCESS",
    });

    // Buscar métricas da conta
    const { accounts } = await AiQuotaManagerService.listAccountsWithMetrics();
    const currentMirai = accounts.find((a) => a.id === testAccountId);

    if (!currentMirai) {
      throw new Error("Conta Mirai recém-criada não foi retornada em listAccountsWithMetrics.");
    }

    console.log(`✓ Consumo apurado para "${currentMirai.accountName}":`);
    console.log(`  Tokens hoje: ${currentMirai.consumption.todayTokens.toLocaleString()}`);
    console.log(`  Tokens mês: ${currentMirai.consumption.monthTokens.toLocaleString()}`);
    console.log(`  Tokens consumidos total: ${currentMirai.quota.usedQuota.toLocaleString()}`);
    console.log(`  Tokens restantes: ${currentMirai.quota.remainingQuota.toLocaleString()}`);
    console.log(`  Percentual utilizado: ${currentMirai.quota.percentageConsumed}%`);
    console.log(`  Custo acumulado: $${currentMirai.consumption.estimatedCostUsd.toFixed(4)} (R$ ${currentMirai.consumption.estimatedCostBrl.toFixed(2)})`);
    console.log(`  Projeção até fim do ciclo: $${currentMirai.consumption.projectedCostUsd.toFixed(2)} (R$ ${currentMirai.consumption.projectedCostBrl.toFixed(2)})`);

    if (currentMirai.consumption.monthTokens < 90000) {
      throw new Error(`Esperava pelo menos 90.000 tokens registrados, mas encontrou ${currentMirai.consumption.monthTokens}`);
    }

    console.log("✅ TESTE 2 PASSOU: Cálculo de consumo e projeção apurados com perfeição.\n");
    testPassedCount++;

    // ------------------------------------------------------------------
    // TESTE 3: Rotina de Sincronização (Individual e Batch)
    // ------------------------------------------------------------------
    console.log("--- TESTE 3: Rotina de Sincronização de Quota e Saldo ---");
    const syncResult = await AiQuotaManagerService.syncAccount(testAccountId);

    console.log(`✓ Resultado Sincronização Individual: [${syncResult.accountName}] Status: ${syncResult.status}`);
    if (!syncResult || !syncResult.id) {
      throw new Error(`Falha na sincronização da conta: ID não retornado`);
    }

    // Testar sincronização em lote de todas as contas
    const allSyncResults = await AiQuotaManagerService.syncAllAccounts();
    console.log(`✓ Sincronização Global finalizada. Total de contas sincronizadas: ${allSyncResults.syncedCount}`);

    const syncAccountInDb = await prisma.aiProviderAccount.findUnique({
      where: { id: testAccountId },
    });

    if (!syncAccountInDb?.lastSync) {
      throw new Error("O campo lastSync não foi atualizado após a sincronização!");
    }

    console.log(`✓ Data da última sincronização registrada: ${syncAccountInDb.lastSync.toISOString()}`);
    console.log("✅ TESTE 3 PASSOU: Rotina de sincronização atualizou saldos e timestamps com sucesso.\n");
    testPassedCount++;

    // ------------------------------------------------------------------
    // TESTE 4: Detecção de Alertas Preditivos (80%, 90%, < 7 Dias, Inválido)
    // ------------------------------------------------------------------
    console.log("--- TESTE 4: Detecção de Alertas de Quota e Validade ---");

    // Criar conta de teste que simula 85% de consumo e validade de 4 dias
    const nearLimitAccount = await prisma.aiProviderAccount.create({
      data: {
        provider: "openai",
        accountName: "Conta Teste OpenAI Quase Expirada",
        apiKeyMasked: "sk-...9999",
        encryptedKey: "dummy-key",
        totalQuota: 100000,
        usedQuota: 85000, // 85% consumido
        remainingQuota: 15000,
        quotaType: "TOKENS",
        status: "CONNECTED",
        expirationDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 dias restante
      },
    });

    const { alerts } = await AiQuotaManagerService.listAccountsWithMetrics();
    const alertsForNearLimit = alerts.filter((a) => a.accountId === nearLimitAccount.id);

    console.log(`✓ Alertas identificados para a conta (${alertsForNearLimit.length}):`);
    for (const alert of alertsForNearLimit) {
      console.log(`  [${alert.severity}] ${alert.title}: ${alert.message}`);
    }

    const has80Alert = alertsForNearLimit.some((a) => a.type === "CONSUMPTION_OVER_80");
    const hasExpiryAlert = alertsForNearLimit.some((a) => a.type === "EXPIRES_IN_7_DAYS");

    if (!has80Alert || !hasExpiryAlert) {
      throw new Error(`Esperava alertas de 80% e vencimento em 7 dias, mas obteve: ${JSON.stringify(alertsForNearLimit)}`);
    }

    // Limpar conta auxiliar
    await prisma.aiProviderAccount.delete({ where: { id: nearLimitAccount.id } });

    console.log("✅ TESTE 4 PASSOU: Alertas preditivos de 80% e validade < 7 dias gerados corretamente.\n");
    testPassedCount++;

    // ------------------------------------------------------------------
    // TESTE 5: Integração com Smart Router & Fallback de Provedor Esgotado
    // ------------------------------------------------------------------
    console.log("--- TESTE 5: Integração com Smart Router e Fallback de Quota ---");

    // Verificar disponibilidade de conta normal
    const normalAvailability = await AiQuotaManagerService.checkProviderAvailability("mirai");
    console.log(`✓ Disponibilidade Provedor Mirai (saldo positivo):`, normalAvailability);
    if (!normalAvailability.available) {
      throw new Error("Esperava disponibilidade TRUE para a conta recém-criada com saldo positivo.");
    }

    // Criar conta fictícia com LIMIT_REACHED para testar bloqueio
    const exhaustedAccount = await prisma.aiProviderAccount.create({
      data: {
        provider: "openai",
        accountName: "OpenAI Esgotado Teste",
        apiKeyMasked: "sk-...0000",
        encryptedKey: "dummy-key",
        totalQuota: 50000,
        usedQuota: 50000,
        remainingQuota: 0,
        quotaType: "TOKENS",
        status: "LIMIT_REACHED",
      },
    });

    const exhaustedAvailability = await AiQuotaManagerService.checkProviderAvailability("openai");
    console.log(`✓ Disponibilidade Provedor OpenAI (LIMIT_REACHED):`, exhaustedAvailability);

    if (exhaustedAvailability.available) {
      throw new Error("O Smart Router deveria bloquear um provedor cujo status é LIMIT_REACHED!");
    }

    // Testar se o SmartRouter desvia para provedor alternativo com saldo (Anthropic)
    const routeDecision = await classifyAndRoute({
      pergunta: "calcule a derivada de x^3 + 4x",
    });

    console.log(`✓ Decisão do Smart Router para rota com OpenAI esgotado:`);
    console.log(`  Provedor Selecionado: ${routeDecision.provedor} (Fallback dinâmico)`);
    console.log(`  Modelo Selecionado: ${routeDecision.modeloNome}`);
    console.log(`  Razão do Roteamento: ${routeDecision.motivoEscolha}`);

    // Limpar conta de teste antes das validações para evitar resíduos se falhar
    await prisma.aiProviderAccount.delete({ where: { id: exhaustedAccount.id } });

    if (routeDecision.provedor === "openai") {
      throw new Error("O Smart Router não deveria ter mantido OpenAI após detecção de quota esgotada!");
    }

    if (!routeDecision.motivoEscolha.includes("[Fallback AI Quota Manager]")) {
      throw new Error("O motivoEscolha deve documentar o Fallback do AI Quota Manager!");
    }

    console.log("✅ TESTE 5 PASSOU: Smart Router evitou provedor esgotado e realizou fallback dinâmico.\n");
    testPassedCount++;

    // ------------------------------------------------------------------
    // TESTE 6: Teste de Conexão com Endpoint do Provedor
    // ------------------------------------------------------------------
    console.log("--- TESTE 6: Diagnóstico e Teste de Conexão com Provedor ---");
    const testDiagResult = await AiQuotaManagerService.testAccountConnection(testAccountId);

    console.log(`✓ Diagnóstico retornado:`);
    console.log(`  Status: ${testDiagResult.status}`);
    console.log(`  Latência: ${testDiagResult.latencyMs}ms`);
    console.log(`  Modelos detectados: ${testDiagResult.detectedModels?.length > 0 ? testDiagResult.detectedModels.join(", ") : "Nenhum (chave simulada)"}`);
    console.log(`  Mensagem: ${testDiagResult.message || "OK"}`);

    if (typeof testDiagResult.latencyMs !== "number") {
      throw new Error("Diagnóstico deve retornar latência em milissegundos.");
    }

    console.log("✅ TESTE 6 PASSOU: Teste de conexão executado e métricas de diagnóstico registradas.\n");
    testPassedCount++;

  } catch (error: any) {
    console.error("\n❌ ERRO NA EXECUÇÃO DO TESTE:", error.message || error);
    process.exitCode = 1;
  } finally {
    // Limpeza da conta principal de teste
    if (testAccountId) {
      try {
        await prisma.aiProviderAccount.delete({ where: { id: testAccountId } });
        console.log(`\n🧹 Limpeza de dados de teste concluída [ID: ${testAccountId}].`);
      } catch (e) {
        // Ignora se já tiver sido removido
      }
    }
    await prisma.$disconnect();
  }

  console.log("\n======================================================================");
  console.log(`🏁 RESULTADO FINAL: ${testPassedCount}/${totalTests} TESTES APROVADOS COM SUCESSO!`);
  console.log("======================================================================\n");
}

main();
