// scripts/test-smart-router.js
// BATERIA DE TESTES AUTOMATIZADOS: SMART AI ROUTER — ORVEXA PRIME DIGITAL

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runSmartRouterBattery() {
  console.log("================================================================================");
  console.log("   TESTE DE VALIDAÇÃO: CAMADA INTELIGENTE DE ROTEAMENTO (ORVEXA AUTO)");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  // Carrega dinamicamente a função do roteador compilada pelo Next.js/TypeScript
  // Ou usamos ts-node / importação direta
  // Para compatibilidade com Node.js CJS, importamos as funções do módulo compilado ou testamos via Next / API
  // Também podemos importar via esm ou require ts-node
  // Vamos carregar o módulo diretamente
  let smartRouter;
  try {
    smartRouter = require("../src/ai/gateway/smart-router");
  } catch (err) {
    // Se precisar compilar via ts-node ou esbuild
    require("esbuild-register/dist/node").register();
    smartRouter = require("../src/ai/gateway/smart-router.ts");
  }

  const { classifyAndRoute, logRouterDecision } = smartRouter;

  // -------------------------------------------------------------------------
  // CASO 1: TEXTO LONGO / DOCUMENTOS -> Priorizar Claude (Anthropic)
  // -------------------------------------------------------------------------
  console.log("📋 [CASO 1] Testando Classificação: Texto Longo / Documentos...");
  const longPrompt = "Contrato de Prestação de Serviços Tecnológicos celebrado entre as partes qualificadas. Cláusula Primeira: O objeto deste instrumento compreende a prestação continuada de serviços de desenvolvimento e auditoria de software em nuvem. Cláusula Segunda: Das Obrigações da Contratada. A contratada compromete-se a entregar os módulos em conformidade com as boas práticas de engenharia de software e os critérios de aceitação formalmente estabelecidos. Cláusula Terceira: Das Penalidades e Rescisão. Qualquer infração às cláusulas deste contrato ensejará multa rescisória de vinte por cento calculada sobre o montante remanescente do valor global, além de eventuais perdas e danos devidamente comprovados perante juízo arbitral competente. Analise minuciosamente cada termo e apresente um parecer jurídico preventivo.";

  const decision1 = await classifyAndRoute({
    pergunta: longPrompt,
    hasFiles: false,
    tamanho: longPrompt.length,
  });

  console.log(`   -> Categoria Detectada: ${decision1.categoria}`);
  console.log(`   -> Provedor: ${decision1.provedor} | Modelo: ${decision1.modeloIdentificador} (${decision1.modeloNome})`);
  console.log(`   -> Motivo: ${decision1.motivoEscolha}`);
  console.log(`   -> Badge Usuário: "${decision1.userBadge}"`);

  if (
    decision1.categoria === "TEXTO_LONGO_DOCUMENTO" &&
    decision1.provedor === "anthropic" &&
    (decision1.modeloIdentificador.includes("claude") || decision1.modeloIdentificador.includes("sonnet"))
  ) {
    console.log("   ✅ [PASSOU] Caso 1 classificado com sucesso para Claude (Anthropic)!\n");
    passed++;
  } else {
    console.error("   ❌ [FALHOU] Caso 1 não direcionou para Claude.");
    failed++;
  }

  // -------------------------------------------------------------------------
  // CASO 2: CÓDIGO E PROGRAMAÇÃO -> Priorizar GPT (OpenAI)
  // -------------------------------------------------------------------------
  console.log("📋 [CASO 2] Testando Classificação: Código e Engenharia de Software...");
  const codePrompt = "Escreva uma função TypeScript com Clean Architecture para autenticar usuários via JWT com validação de payload no Prisma:\n```typescript\nexport async function authenticateUser(token: string) {}\n```";

  const decision2 = await classifyAndRoute({
    pergunta: codePrompt,
    hasFiles: false,
  });

  console.log(`   -> Categoria Detectada: ${decision2.categoria}`);
  console.log(`   -> Provedor: ${decision2.provedor} | Modelo: ${decision2.modeloIdentificador} (${decision2.modeloNome})`);
  console.log(`   -> Motivo: ${decision2.motivoEscolha}`);

  if (
    decision2.categoria === "CODIGO" &&
    decision2.provedor === "openai" &&
    (decision2.modeloIdentificador.includes("gpt") || decision2.modeloIdentificador.includes("sol"))
  ) {
    console.log("   ✅ [PASSOU] Caso 2 classificado com sucesso para GPT (OpenAI)!\n");
    passed++;
  } else {
    console.error("   ❌ [FALHOU] Caso 2 não direcionou para GPT.");
    failed++;
  }

  // -------------------------------------------------------------------------
  // CASO 3: RACIOCÍNIO MATEMÁTICO -> Priorizar GPT (OpenAI)
  // -------------------------------------------------------------------------
  console.log("📋 [CASO 3] Testando Classificação: Raciocínio Matemático...");
  const mathPrompt = "Calcule a integral definida de f(x) = 3x^2 + 4x - 5 no intervalo de [1, 4] e deduza o cálculo passo a passo.";

  const decision3 = await classifyAndRoute({
    pergunta: mathPrompt,
    hasFiles: false,
  });

  console.log(`   -> Categoria Detectada: ${decision3.categoria}`);
  console.log(`   -> Provedor: ${decision3.provedor} | Modelo: ${decision3.modeloIdentificador} (${decision3.modeloNome})`);
  console.log(`   -> Motivo: ${decision3.motivoEscolha}`);

  if (
    decision3.categoria === "MATEMATICA" &&
    decision3.provedor === "openai" &&
    decision3.modeloIdentificador.includes("gpt")
  ) {
    console.log("   ✅ [PASSOU] Caso 3 classificado com sucesso para GPT (OpenAI)!\n");
    passed++;
  } else {
    console.error("   ❌ [FALHOU] Caso 3 não direcionou para GPT.");
    failed++;
  }

  // -------------------------------------------------------------------------
  // CASO 4: IMAGENS E VISÃO COMPUTACIONAL -> Priorizar Gemini (Google)
  // -------------------------------------------------------------------------
  console.log("📋 [CASO 4] Testando Classificação: Imagens e Visão...");
  const imagePrompt = "Analise a imagem da embalagem anexada e extraia todos os ingredientes e tabela nutricional.";

  const decision4 = await classifyAndRoute({
    pergunta: imagePrompt,
    tipoArquivo: "image/png",
    hasFiles: true,
  });

  console.log(`   -> Categoria Detectada: ${decision4.categoria}`);
  console.log(`   -> Provedor: ${decision4.provedor} | Modelo: ${decision4.modeloIdentificador} (${decision4.modeloNome})`);
  console.log(`   -> Motivo: ${decision4.motivoEscolha}`);

  if (
    decision4.categoria === "IMAGEM" &&
    decision4.provedor === "google" &&
    decision4.modeloIdentificador.includes("gemini")
  ) {
    console.log("   ✅ [PASSOU] Caso 4 classificado com sucesso para Gemini (Google)!\n");
    passed++;
  } else {
    console.error("   ❌ [FALHOU] Caso 4 não direcionou para Gemini.");
    failed++;
  }

  // -------------------------------------------------------------------------
  // CASO 5: PERGUNTAS SIMPLES -> Usar Modelo Econômico (gpt-4o-mini / gemini lite)
  // -------------------------------------------------------------------------
  console.log("📋 [CASO 5] Testando Classificação: Perguntas Simples / Econômico...");
  const simplePrompt = "Qual é a capital da França?";

  const decision5 = await classifyAndRoute({
    pergunta: simplePrompt,
    hasFiles: false,
  });

  console.log(`   -> Categoria Detectada: ${decision5.categoria}`);
  console.log(`   -> Provedor: ${decision5.provedor} | Modelo: ${decision5.modeloIdentificador} (${decision5.modeloNome})`);
  console.log(`   -> Motivo: ${decision5.motivoEscolha}`);

  if (
    decision5.categoria === "PERGUNTA_SIMPLES" &&
    (decision5.modeloIdentificador.includes("mini") || decision5.modeloIdentificador.includes("lite"))
  ) {
    console.log("   ✅ [PASSOU] Caso 5 classificado com sucesso para Modelo Econômico!\n");
    passed++;
  } else {
    console.error("   ❌ [FALHOU] Caso 5 não direcionou para modelo econômico.");
    failed++;
  }

  // -------------------------------------------------------------------------
  // CASO 6: HISTÓRICO INTERNO DE DECISÕES NO BANCO DE DADOS (AuditLog)
  // -------------------------------------------------------------------------
  console.log("📋 [CASO 6] Testando Histórico Interno de Decisões do Roteador (AuditLog)...");
  
  // Registra 1 decisão para validação no banco
  const testResponseTimeMs = 342;
  await logRouterDecision({
    userId: null,
    pergunta: simplePrompt,
    decision: decision5,
    tempoRespostaMs: testResponseTimeMs,
  });

  // Busca o último registro de auditoria do router
  const lastLog = await prisma.auditLog.findFirst({
    where: {
      action: "ROUTER_DECISION",
      resourceType: "ROUTER",
    },
    orderBy: { createdAt: "desc" },
  });

  if (lastLog && lastLog.details) {
    const details = JSON.parse(lastLog.details);
    console.log("   -> Registro encontrado no banco com ID:", lastLog.id);
    console.log("   -> Pergunta gravada:", details.pergunta);
    console.log("   -> Modelo escolhido:", details.modeloEscolhido);
    console.log("   -> Motivo da escolha:", details.motivoEscolha);
    console.log("   -> Tempo de resposta (ms):", details.tempoRespostaMs);

    if (
      details.pergunta === simplePrompt &&
      details.modeloEscolhido === decision5.modeloIdentificador &&
      details.tempoRespostaMs === testResponseTimeMs &&
      details.motivoEscolha
    ) {
      console.log("   ✅ [PASSOU] Histórico interno registrado perfeitamente no banco de dados!\n");
      passed++;
    } else {
      console.error("   ❌ [FALHOU] Campos gravados no AuditLog não coincidem com o esperado.");
      failed++;
    }
  } else {
    console.error("   ❌ [FALHOU] Registro de auditoria do roteador não foi encontrado no banco.");
    failed++;
  }

  // -------------------------------------------------------------------------
  // RESULTADO FINAL
  // -------------------------------------------------------------------------
  console.log("================================================================================");
  console.log(`   RESULTADO DA BATERIA: ${passed} PASSOU | ${failed} FALHOU`);
  console.log("================================================================================\n");

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSmartRouterBattery().catch((err) => {
  console.error("Erro fatal na execução do teste:", err);
  process.exit(1);
});

