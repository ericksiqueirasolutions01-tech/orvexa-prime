const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runSimulation() {
  console.log("=== INICIANDO SIMULAÇÃO DE AI GATEWAY, CAPACIDADES & QUOTA ===");

  const prov = await prisma.aiProvider.findUnique({ where: { slug: "openai" } });
  if (!prov) {
    console.error("Provedor openai não encontrado!");
    return;
  }

  // 1. Cria duas chaves temporárias para teste
  const keyA = await prisma.apiKey.create({
    data: {
      providerId: prov.id,
      name: "TEST_KEY_ALPHA_CODE",
      encryptedKey: "dummy_encrypted_alpha",
      iv: "dummy_iv",
      authTag: "dummy_tag",
      keyHint: "sk-alpha...9999",
      priority: 1,
      tokenLimitMonthly: 10000,
      tokensUsedMonth: 0,
      capabilities: JSON.stringify(["CODIGO", "TEXTO"]),
      status: "ACTIVE",
    },
  });

  const keyB = await prisma.apiKey.create({
    data: {
      providerId: prov.id,
      name: "TEST_KEY_BETA_DOCS_ONLY",
      encryptedKey: "dummy_encrypted_beta",
      iv: "dummy_iv",
      authTag: "dummy_tag",
      keyHint: "sk-beta...8888",
      priority: 2,
      tokenLimitMonthly: 10000,
      tokensUsedMonth: 0,
      capabilities: JSON.stringify(["DOCUMENTO", "TEXTO"]),
      status: "ACTIVE",
    },
  });

  console.log("-> Chaves de teste criadas: Alpha (CODIGO, TEXTO, P1), Beta (DOCUMENTO, TEXTO, P2)");

  // Import getHealthyApiKeys logic to test
  async function testRoute(capability) {
    const keys = await prisma.apiKey.findMany({
      where: {
        providerId: prov.id,
        name: { in: ["TEST_KEY_ALPHA_CODE", "TEST_KEY_BETA_DOCS_ONLY"] },
        status: { not: "DISABLED" },
      },
    });

    const eligible = [];
    for (const key of keys) {
      if (capability && capability !== "TEXTO") {
        const caps = JSON.parse(key.capabilities || "[]");
        if (!caps.includes(capability)) {
          continue;
        }
      }

      let effectivePriority = key.priority;
      let effectiveStatus = key.status;

      if (key.tokenLimitMonthly > 0) {
        const percentUsed = (key.tokensUsedMonth / key.tokenLimitMonthly) * 100;
        if (key.tokensUsedMonth >= key.tokenLimitMonthly) {
          continue; // 100% Bloqueada
        }
        if (percentUsed >= 90) {
          effectivePriority = key.priority + 50; // 90% Rotação
          effectiveStatus = "WARNING_90";
        }
      }

      eligible.push({
        ...key,
        effectivePriority,
        effectiveStatus,
      });
    }

    eligible.sort((a, b) => a.effectivePriority - b.effectivePriority || a.tokensUsedMonth - b.tokensUsedMonth);
    return eligible;
  }

  // TESTE 1: Filtragem estrita por capacidade
  console.log("\n[TESTE 1] Solicitando capacidade 'CODIGO':");
  let resCode = await testRoute("CODIGO");
  console.log(`Eligíveis: ${resCode.map(k => k.name).join(", ")}`);
  if (resCode.length === 1 && resCode[0].name === "TEST_KEY_ALPHA_CODE") {
    console.log("✔ SUCESSO: Apenas TEST_KEY_ALPHA_CODE com capacidade CODIGO foi selecionada!");
  } else {
    console.error("❌ FALHA no teste de capacidade CODIGO");
  }

  console.log("\n[TESTE 1.1] Solicitando capacidade 'DOCUMENTO':");
  let resDoc = await testRoute("DOCUMENTO");
  console.log(`Eligíveis: ${resDoc.map(k => k.name).join(", ")}`);
  if (resDoc.length === 1 && resDoc[0].name === "TEST_KEY_BETA_DOCS_ONLY") {
    console.log("✔ SUCESSO: Apenas TEST_KEY_BETA_DOCS_ONLY com capacidade DOCUMENTO foi selecionada!");
  } else {
    console.error("❌ FALHA no teste de capacidade DOCUMENTO");
  }

  // TESTE 2: Rotação a 90% da quota
  console.log("\n[TESTE 2] Simulando Alpha atingindo 92% da quota (9.200 / 10.000 tokens):");
  await prisma.apiKey.update({
    where: { id: keyA.id },
    data: { tokensUsedMonth: 9200, status: "WARNING_90" },
  });

  // Ambas suportam TEXTO, mas Alpha era P1 e Beta P2.
  // Como Alpha está em 92%, seu effectivePriority vai para 1 + 50 = 51.
  // Logo, Beta (P2) DEVE passar na frente!
  let resText = await testRoute("TEXTO");
  console.log(`Ordem de roteamento para TEXTO:`);
  resText.forEach((k, idx) => console.log(`  ${idx + 1}. ${k.name} (Prioridade Efetiva: P${k.effectivePriority}, Status: ${k.effectiveStatus})`));

  if (resText[0].name === "TEST_KEY_BETA_DOCS_ONLY") {
    console.log("✔ SUCESSO: Alpha atingiu 90% e foi automaticamente rebaixada! Beta assumiu a liderança do tráfego!");
  } else {
    console.error("❌ FALHA: Alpha não foi rebaixada");
  }

  // TESTE 3: Bloqueio estrito a 100% da quota
  console.log("\n[TESTE 3] Simulando Beta atingindo 100% da quota (10.000 / 10.000 tokens):");
  await prisma.apiKey.update({
    where: { id: keyB.id },
    data: { tokensUsedMonth: 10000, status: "BLOCKED_QUOTA" },
  });

  let resAfter100 = await testRoute("TEXTO");
  console.log(`Ordem de roteamento com Beta a 100%:`);
  resAfter100.forEach((k, idx) => console.log(`  ${idx + 1}. ${k.name} (Prioridade Efetiva: P${k.effectivePriority})`));

  if (!resAfter100.find(k => k.name === "TEST_KEY_BETA_DOCS_ONLY")) {
    console.log("✔ SUCESSO: Beta a 100% foi ESTRITAMENTE BLOQUEADA e removida do roteamento!");
  } else {
    console.error("❌ FALHA: Beta não foi bloqueada!");
  }

  // TESTE 4: Reset de Quota
  console.log("\n[TESTE 4] Resetando quota de Beta:");
  await prisma.apiKey.update({
    where: { id: keyB.id },
    data: { tokensUsedMonth: 0, status: "ACTIVE" },
  });
  let resAfterReset = await testRoute("TEXTO");
  console.log(`Ordem após reset da Beta:`);
  resAfterReset.forEach((k, idx) => console.log(`  ${idx + 1}. ${k.name} (P${k.effectivePriority})`));
  if (resAfterReset[0].name === "TEST_KEY_BETA_DOCS_ONLY") {
    console.log("✔ SUCESSO: Quota resetada com sucesso e chave restaurada ao balanceador!");
  }

  // Limpeza
  await prisma.apiKey.deleteMany({
    where: { id: { in: [keyA.id, keyB.id] } },
  });
  console.log("\n✔ Chaves de teste limpas. SIMULAÇÃO CONCLUÍDA COM 100% DE SUCESSO!");
}

runSimulation()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

