// scripts/test-plans-and-consumption-e2e.js
// ============================================================================
// TESTE COMPLETO E2E: SISTEMA DE PLANOS, CONSUMO DOS 5 VETORES & PAGAMENTOS
// Valida: FREE, PRO, BUSINESS, ENTERPRISE, Quotas em Tempo Real e Webhooks
// ============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function loadTsModule(relPath) {
  const fullPath = path.resolve(__dirname, relPath);
  const code = fs.readFileSync(fullPath, "utf-8");
  const transpiled = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });

  const customRequire = (id) => {
    if (id === "@/lib/prisma" || id === "./prisma" || id === "../prisma" || id.endsWith("/prisma")) {
      return { prisma };
    }
    if (id.startsWith("@/lib/")) {
      const resolved = path.resolve(__dirname, "../src/lib", id.replace("@/lib/", ""));
      const withTs = resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
      if (fs.existsSync(withTs)) return loadTsModule(path.relative(__dirname, withTs));
    }
    if (id.startsWith("@/ai/")) {
      const resolved = path.resolve(__dirname, "../src/ai", id.replace("@/ai/", ""));
      const withTs = resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
      if (fs.existsSync(withTs)) return loadTsModule(path.relative(__dirname, withTs));
    }
    if (id.startsWith("./") || id.startsWith("../")) {
      const resolved = path.resolve(path.dirname(fullPath), id);
      const withTs = resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
      if (fs.existsSync(withTs)) return loadTsModule(path.relative(__dirname, withTs));
    }
    return require(id);
  };

  const m = { exports: {} };
  const fn = new Function("module", "exports", "require", "__dirname", "__filename", transpiled.outputText);
  fn(m, m.exports, customRequire, path.dirname(fullPath), fullPath);
  return m.exports;
}

async function runTests() {
  console.log("\n================================================================================");
  console.log("💎 TESTE E2E: SISTEMA DE PLANOS, CONSUMO & PAGAMENTOS — ORVEXA PRIME SAAS");
  console.log("================================================================================\n");

  const consumptionMod = loadTsModule("../src/lib/consumption.ts");
  const paymentMod = loadTsModule("../src/lib/payment-gateway.ts");

  let testPassed = 0;
  let testFailed = 0;

  function pass(title, detail) {
    testPassed++;
    console.log(`  ✅ [PASS] ${title} ${detail ? `→ ${detail}` : ""}`);
  }

  function fail(title, err) {
    testFailed++;
    console.error(`  ❌ [FAIL] ${title} → ${err.message || err}`);
  }

  // --------------------------------------------------------------------------
  // 1. VALIDAÇÃO DOS 4 PLANOS OFICIAIS NO BANCO
  // --------------------------------------------------------------------------
  console.log("📋 [1/5] Validando Catálogo dos 4 Planos Oficiais...");
  try {
    const plans = await prisma.plan.findMany();
    const slugs = plans.map((p) => p.slug.toLowerCase());

    assert(slugs.includes("free"), "Plano FREE não encontrado no banco de dados.");
    assert(slugs.includes("pro"), "Plano PRO não encontrado no banco de dados.");
    assert(slugs.includes("business"), "Plano BUSINESS não encontrado no banco de dados.");
    assert(slugs.includes("enterprise"), "Plano ENTERPRISE não encontrado no banco de dados.");

    const freePlan = plans.find((p) => p.slug === "free");
    const proPlan = plans.find((p) => p.slug === "pro");
    const bizPlan = plans.find((p) => p.slug === "business");
    const entPlan = plans.find((p) => p.slug === "enterprise");

    assert.strictEqual(freePlan.monthlyMessages, 100, "Quota de mensagens do FREE incorreta.");
    assert.strictEqual(proPlan.monthlyMessages, 1500, "Quota de mensagens do PRO incorreta.");
    assert.strictEqual(bizPlan.monthlyMessages, 6000, "Quota de mensagens do BUSINESS incorreta.");
    assert.strictEqual(entPlan.monthlyMessages, 50000, "Quota de mensagens do ENTERPRISE incorreta.");

    pass(
      "4 Planos Verificados",
      `FREE (100 msgs, 5 arqs, 10 imgs) | PRO (1.5k msgs, 60 arqs) | BIZ (6k msgs, 300 arqs) | ENT (50k msgs)`
    );
  } catch (err) {
    fail("Catálogo dos 4 Planos", err);
  }

  // --------------------------------------------------------------------------
  // 2. CRIAÇÃO DE USUÁRIO DE TESTE NO PLANO FREE
  // --------------------------------------------------------------------------
  console.log("\n👤 [2/5] Criando Usuário de Teste com Plano FREE...");
  let testUser;
  try {
    const freePlan = await prisma.plan.findUnique({ where: { slug: "free" } });
    testUser = await prisma.user.upsert({
      where: { email: "teste-planos@orvexa.digital" },
      update: {
        planId: freePlan.id,
        status: "ACTIVE",
        role: "USER",
      },
      create: {
        name: "Usuário Teste Consumo",
        email: "teste-planos@orvexa.digital",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuu",
        planId: freePlan.id,
        status: "ACTIVE",
        role: "USER",
      },
    });

    pass("Usuário de Teste Criado", `ID: ${testUser.id} | Plano: FREE`);
  } catch (err) {
    fail("Criação de Usuário FREE", err);
  }

  // --------------------------------------------------------------------------
  // 3. MOTOR DE CONSUMO DOS 5 VETORES
  // --------------------------------------------------------------------------
  console.log("\n📊 [3/5] Testando Cálculo de Consumo e Limites dos 5 Vetores...");
  try {
    const summary = await consumptionMod.getUserConsumption(testUser.id);

    assert.strictEqual(summary.plan.slug, "free");
    assert.strictEqual(summary.metrics.messages.limit, 100);
    assert.strictEqual(summary.metrics.files.limit, 5);
    assert.strictEqual(summary.metrics.images.limit, 10);
    assert(summary.metrics.storage.limit > 0);
    assert(Array.isArray(summary.plan.allowedAgents));

    pass(
      "Consumo dos 5 Vetores Calculado",
      `Msgs: ${summary.metrics.messages.used}/${summary.metrics.messages.limit} | Arqs: ${summary.metrics.files.used}/${summary.metrics.files.limit} | Imgs: ${summary.metrics.images.used}/${summary.metrics.images.limit} | Storage: ${summary.metrics.storage.usedFormatted}`
    );
  } catch (err) {
    fail("Cálculo de Consumo dos 5 Vetores", err);
  }

  // --------------------------------------------------------------------------
  // 4. GUARDS EM TEMPO REAL: MENSAGENS, ARQUIVOS, IMAGENS E AGENTES
  // --------------------------------------------------------------------------
  console.log("\n🛡️  [4/5] Testando Guards de Enforcement em Tempo Real...");
  try {
    // 4.1 Guard de Mensagens
    const msgGuard = await consumptionMod.assertCanSendMessage(testUser.id);
    assert(msgGuard.allowed === true, "Usuário novo deve poder enviar mensagens.");
    pass("Guard de Mensagens", "Aprovado para consumo dentro da quota.");

    // 4.2 Guard de Acesso a Agentes (FREE só pode orvexa-dev)
    const allowedAgentCheck = await consumptionMod.assertCanUseAgent(testUser.id, "orvexa-dev");
    assert(allowedAgentCheck.allowed === true, "FREE deve poder acessar orvexa-dev.");

    const blockedAgentCheck = await consumptionMod.assertCanUseAgent(testUser.id, "orvexa-design");
    assert(blockedAgentCheck.allowed === false, "FREE não deve poder acessar orvexa-design.");
    pass("Guard de Agentes Especialistas", "Bloqueou 'orvexa-design' no FREE e permitiu 'orvexa-dev'.");

    // 4.3 Guard de Upload de Arquivos
    const uploadGuard = await consumptionMod.assertCanUploadFile(testUser.id, 1024 * 1024); // 1 MB
    assert(uploadGuard.allowed === true, "Upload de 1MB deve ser permitido.");

    const giantFileGuard = await consumptionMod.assertCanUploadFile(testUser.id, 200 * 1024 * 1024); // 200 MB no FREE (limite 100MB)
    assert(giantFileGuard.allowed === false, "Upload de 200MB deve ser rejeitado no plano FREE.");
    pass("Guard de Armazenamento & Upload", "Bloqueou arquivo de 200MB que excede quota de 100MB.");

    // 4.4 Guard de Imagens
    const imgGuard = await consumptionMod.assertCanGenerateImage(testUser.id);
    assert(imgGuard.allowed === true, "Geração de imagem inicial deve ser permitida.");
    pass("Guard de Imagens", "Aprovado para cota inicial.");
  } catch (err) {
    fail("Guards em Tempo Real", err);
  }

  // --------------------------------------------------------------------------
  // 5. CHECKOUT, UPGRADE E WEBHOOK DE PAGAMENTO
  // --------------------------------------------------------------------------
  console.log("\n💳 [5/5] Testando Checkout Modular e Upgrade de Plano via Webhook...");
  try {
    // 5.1 Iniciar checkout Pix
    const checkoutPix = await paymentMod.PaymentService.initiateCheckout({
      userId: testUser.id,
      planSlug: "pro",
      paymentMethod: "PIX",
    });

    assert(checkoutPix.success === true, "Checkout PIX deve retornar sucesso.");
    assert(checkoutPix.pixCode, "PIX Copia e Cola deve ser gerado.");
    assert.strictEqual(checkoutPix.planName, "PRO");
    pass("Checkout PIX Gerado", `Código gerado: ${checkoutPix.pixCode.slice(0, 30)}...`);

    // 5.2 Simular confirmação via Webhook / Ativação
    const activation = await paymentMod.PaymentService.confirmPaymentAndActivate({
      gateway: "MERCADO_PAGO",
      transactionId: `test_e2e_txn_${Date.now()}`,
      status: "CONFIRMED",
      userId: testUser.id,
      planSlug: "pro",
      amountCents: 7990,
      eventType: "pix.received",
    });

    assert.strictEqual(activation.plan.name, "PRO");
    assert.strictEqual(activation.user.status, "ACTIVE");
    assert.strictEqual(activation.subscription.status, "ACTIVE");

    // 5.3 Verificar se quotas foram expandidas no novo plano PRO
    const updatedSummary = await consumptionMod.getUserConsumption(testUser.id);
    assert.strictEqual(updatedSummary.plan.name, "PRO");
    assert.strictEqual(updatedSummary.metrics.messages.limit, 1500);
    assert.strictEqual(updatedSummary.metrics.files.limit, 60);
    assert.strictEqual(updatedSummary.metrics.images.limit, 80);

    // Agora deve permitir o agente orvexa-design
    const nowAllowedAgent = await consumptionMod.assertCanUseAgent(testUser.id, "orvexa-design");
    assert(nowAllowedAgent.allowed === true, "Após upgrade para PRO, orvexa-design deve ser liberado.");

    pass(
      "Upgrade para PRO Confirmado",
      `Novo limite de mensagens: 1.500 | Novo limite de arquivos: 60 | Agente orvexa-design: LIBERADO`
    );
  } catch (err) {
    fail("Upgrade e Webhook de Pagamento", err);
  }

  // --------------------------------------------------------------------------
  // RESULTADO FINAL
  // --------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`📊 RESULTADO DA SUÍTE: ${testPassed} APROVADOS | ${testFailed} FALHAS`);
  console.log("================================================================================\n");

  if (testFailed > 0) {
    console.error(`❌ Houve falhas na verificação do sistema de planos e consumo.`);
    process.exit(1);
  } else {
    console.log("🎉 SISTEMA DE PLANOS, CONSUMO DOS 5 VETORES & PAGAMENTOS 100% OPERACIONAL!");
    process.exit(0);
  }
}

runTests()
  .catch((e) => {
    console.error("Erro fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

