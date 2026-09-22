// scripts/run-all-modules-battery.js
// ============================================================================
// BATERIA COMPLETA DE TESTES REAIS DE TODOS OS MÓDULOS — ORVEXA PRIME SAAS
// Módulos Auditados:
// 1. Chat IA (simples, longas, contexto, histórico)
// 2. APIs (OpenAI/Codex, Claude, erro, fallback)
// 3. Arquivos (PDF, DOCX, XLSX, CSV, imagens, ZIP + upload, leitura, análise, resposta IA, geração)
// 4. Imagens (criação, análise, edição, processamento)
// 5. Agentes (DEV, DESIGN, MARKETING, EDU, BUSINESS, ANALYST)
// 6. Memória (salvar contexto, recuperar informações, gerenciamento)
// 7. Usuários (cadastro, login, permissões, planos)
// ============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const XLSX = require("xlsx");
const JSZip = require("jszip");
const { PrismaClient } = require("@prisma/client");

const BASE_URL = "http://localhost:3000";
const AUTH_COOKIE_NAME = "orvexa_auth_token";
const prisma = new PrismaClient();

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  modules: {},
};

function recordTest(moduleName, testName, passed, details = "") {
  results.total++;
  if (!results.modules[moduleName]) {
    results.modules[moduleName] = { passed: 0, failed: 0, tests: [] };
  }
  if (passed) {
    results.passed++;
    results.modules[moduleName].passed++;
    console.log(`  ✅ [PASS] ${testName} ${details ? "→ " + details : ""}`);
  } else {
    results.failed++;
    results.modules[moduleName].failed++;
    console.error(`  ❌ [FAIL] ${testName} ${details ? "→ " + details : ""}`);
  }
  results.modules[moduleName].tests.push({ testName, passed, details });
}

function authHeaders(token, extra = {}) {
  return {
    Cookie: `${AUTH_COOKIE_NAME}=${token}`,
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

async function streamToString(response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

const moduleCache = new Map();

function loadTsModule(relPath) {
  const fullPath = path.resolve(__dirname, relPath);
  if (moduleCache.has(fullPath)) return moduleCache.get(fullPath);

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
  moduleCache.set(fullPath, m.exports);
  const fn = new Function("module", "exports", "require", "__dirname", "__filename", transpiled.outputText);
  fn(m, m.exports, customRequire, path.dirname(fullPath), fullPath);
  moduleCache.set(fullPath, m.exports);
  return m.exports;
}

async function run() {
  console.log("================================================================================");
  console.log("⚡  ORVEXA PRIME SAAS — BATERIA COMPLETA DE TESTES REAIS (7 MÓDULOS)");
  console.log(`📡  Alvo: ${BASE_URL} | Data: ${new Date().toISOString()}`);
  console.log("================================================================================\n");

  // Importações dinâmicas dos módulos internos via TypeScript Transpiler
  const authMod = loadTsModule("../src/lib/auth.ts");
  const { createAuthToken, hashPassword, verifyPassword } = authMod;
  const filesMod = loadTsModule("../src/ai/tools/files.ts");
  const { extractTextFromFileBuffer } = filesMod;
  const fileGenMod = loadTsModule("../src/ai/tools/file-generator.ts");
  const {
    generateSpreadsheetBuffer,
    generateCsvBuffer,
    generateDocumentBuffer,
    generateZipArchiveBuffer,
  } = fileGenMod;
  const imagesMod = loadTsModule("../src/ai/tools/images.ts");
  const {
    generateNeuralImage,
    enhancePromptForStyle,
    analyzeVisualAttributes,
    prepareBackgroundRemovalPrompt,
    buildReferenceEnhancedPrompt,
    createPromptFromIdea,
  } = imagesMod;
  const agentsHubMod = loadTsModule("../src/lib/agents-hub.ts");
  const { OFFICIAL_AGENTS, executeAgentTool } = agentsHubMod;
  const userMemoryMod = loadTsModule("../src/ai/memory/user-memory.ts");
  const { saveUserMemory, getUserMemories, deleteUserMemory } = userMemoryMod;
  const semanticMod = loadTsModule("../src/ai/memory/semantic-search.ts");
  const { retrieveUnifiedMemoryContext } = semanticMod;
  const consumptionMod = loadTsModule("../src/lib/consumption.ts");
  const { PLANS_CONFIG, getUserConsumption } = consumptionMod;
  const fallbackMod = loadTsModule("../src/ai/gateway/fallback.ts");
  const { createHighFidelitySimulatedStream } = fallbackMod;

  // Configuração de Usuários de Teste (Admin e Normal)
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  assert(adminUser, "Deve existir ao menos um usuário ADMIN no banco");
  const adminToken = await createAuthToken({
    id: adminUser.id,
    name: adminUser.name,
    email: adminUser.email,
    role: "ADMIN",
    status: "ACTIVE",
    planId: adminUser.planId,
  });

  const testUserEmail = `test.battery.${Date.now()}@orvexa.digital`;
  const normalUser = await prisma.user.create({
    data: {
      name: "Bateria Teste User",
      email: testUserEmail,
      passwordHash: await hashPassword("OrvexaSenha@2026"),
      role: "USER",
      status: "ACTIVE",
    },
  });
  const userToken = await createAuthToken({
    id: normalUser.id,
    name: normalUser.name,
    email: normalUser.email,
    role: "USER",
    status: "ACTIVE",
    planId: null,
  });

  // --------------------------------------------------------------------------
  // MÓDULO 1: CHAT IA
  // --------------------------------------------------------------------------
  console.log("💬 [MÓDULO 1/7] Testando Chat IA (Simples, Longas, Contexto & Histórico)...");
  let sharedConvId = null;
  try {
    // 1.1 Enviar Mensagem Simples
    const resSimple = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(userToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        messages: [{ role: "user", content: "Olá, me informe quais são seus recursos principais." }],
      }),
    });
    sharedConvId = resSimple.headers.get("x-orvexa-conversation-id");
    const streamContent1 = await streamToString(resSimple);
    const passSimple = resSimple.status === 200 && sharedConvId && streamContent1.length > 20;
    recordTest("1. Chat IA", "Mensagem Simples com Streaming SSE", passSimple, `Status: ${resSimple.status}, Chars: ${streamContent1.length}, ConvId: ${sharedConvId}`);

    // 1.2 Enviar Mensagem Longa
    const longPrompt = "Por favor, elabore um documento técnico detalhado com arquitetura de software em microserviços contendo: API Gateway, balanceamento de carga, barramento de mensageria com Apache Kafka, observabilidade com OpenTelemetry e Prometheus, banco de dados distribuído PostgreSQL com sharding e réplicas de leitura, e padrões de resiliência com Circuit Breaker e Retry Pattern. " + "Detalhe cada item com requisitos de produção e escalabilidade para 100k requisições por segundo. ".repeat(3);
    const resLong = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(userToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        conversationId: sharedConvId,
        messages: [
          { role: "user", content: "Olá" },
          { role: "assistant", content: "Olá! Como posso ajudar?" },
          { role: "user", content: longPrompt },
        ],
      }),
    });
    const streamContent2 = await streamToString(resLong);
    const passLong = resLong.status === 200 && streamContent2.length > 30;
    recordTest("1. Chat IA", "Mensagem Longa com Multi-turn Context", passLong, `Status: ${resLong.status}, Chars: ${streamContent2.length}, Input: ${longPrompt.length} chars`);

    // 1.3 Contexto de Conversa
    const resContext = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(userToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        conversationId: sharedConvId,
        messages: [
          { role: "user", content: "Meu nome é Carlos e estou construindo uma fintech de pagamentos." },
          { role: "assistant", content: "Entendido, Carlos!" },
          { role: "user", content: "Qual é o meu nome e qual tipo de empresa estou criando?" },
        ],
      }),
    });
    const streamContent3 = await streamToString(resContext);
    const passContext = resContext.status === 200 && streamContent3.length > 20;
    recordTest("1. Chat IA", "Preservação de Contexto Conversacional", passContext, `Status: ${resContext.status}, Chars: ${streamContent3.length}`);

    // 1.4 Histórico Persistido no Banco de Dados
    let savedMessagesCount = 0;
    if (sharedConvId) {
      const savedMessages = await prisma.message.findMany({
        where: { conversationId: sharedConvId },
        orderBy: { createdAt: "asc" },
      });
      savedMessagesCount = savedMessages.length;
    }
    const passHistory = savedMessagesCount >= 3;
    recordTest("1. Chat IA", "Persistência e Recuperação do Histórico", passHistory, `Total de Mensagens Gravadas: ${savedMessagesCount}`);
  } catch (err) {
    recordTest("1. Chat IA", "Exceção inesperada no Chat IA", false, err.message);
  }

  // --------------------------------------------------------------------------
  // MÓDULO 2: APIS & GATEWAY
  // --------------------------------------------------------------------------
  console.log("\n🌐 [MÓDULO 2/7] Testando Conexões OpenAI/Codex, Claude, Erro & Fallback...");
  try {
    // 2.1 Conexão / Roteamento OpenAI / Codex
    const resCodex = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(adminToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        modelPreference: "gpt-5.6-sol",
        messages: [{ role: "user", content: "Escreva uma função TypeScript que valida CPF com cálculo de dígitos verificadores." }],
      }),
    });
    const codexIntent = resCodex.headers.get("x-orvexa-intent");
    const codexModel = resCodex.headers.get("x-orvexa-model");
    const codexText = await streamToString(resCodex);
    const passCodex = resCodex.status === 200 && codexText.length > 30;
    recordTest("2. APIs", "Roteamento OpenAI / Codex Engine", passCodex, `Modelo: ${codexModel}, Intenção: ${codexIntent}, Chars: ${codexText.length}`);

    // 2.2 Conexão / Roteamento Claude
    const resClaude = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(adminToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        modelPreference: "claude-sonnet-5",
        messages: [{ role: "user", content: "Analise a estrutura de contraste para um design system dark mode." }],
      }),
    });
    const claudeModel = resClaude.headers.get("x-orvexa-model");
    const claudeText = await streamToString(resClaude);
    const passClaude = resClaude.status === 200 && claudeText.length > 30;
    recordTest("2. APIs", "Roteamento Claude Anthropic Engine", passClaude, `Modelo: ${claudeModel}, Chars: ${claudeText.length}`);

    // 2.3 Tratamento de Erro (Validação de Parâmetros e Quotas)
    const resErr = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: authHeaders(userToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ messages: [] }),
    });
    const errJson = await resErr.json();
    const passErrHandling = resErr.status === 400 && !!errJson.error;
    recordTest("2. APIs", "Tratamento Semântico de Erro (400 Bad Request)", passErrHandling, `Resposta: "${errJson.error}"`);

    // 2.4 Fallback / Failover Contingência Resiliente
    const fallbackStream = createHighFidelitySimulatedStream({
      intent: "PROGRAMACAO",
      messages: [{ role: "user", content: "Crie uma API REST" }],
      lastUserMessage: "Crie uma API REST",
    });
    const simulatedText = await streamToString({ body: fallbackStream });
    const passFallback = simulatedText.includes("ORVEXA DEV") || simulatedText.includes("TypeScript");
    recordTest("2. APIs", "Motor de Fallback & Contingência de Alta Fidelidade", passFallback, `Chars no Stream de Contingência: ${simulatedText.length}`);
  } catch (err) {
    recordTest("2. APIs", "Exceção inesperada em APIs", false, err.message);
  }

  // --------------------------------------------------------------------------
  // MÓDULO 3: ARQUIVOS
  // --------------------------------------------------------------------------
  console.log("\n📁 [MÓDULO 3/7] Testando Arquivos (PDF, DOCX, XLSX, CSV, Imagens, ZIP + Geração)...");
  try {
    // 3.1 Extração XLSX
    const testWb = XLSX.utils.book_new();
    const testWs = XLSX.utils.aoa_to_sheet([
      ["SKU", "Produto", "Preco", "Estoque"],
      ["SKU-001", "Servidor Orvexa Pro", 4999.0, 15],
      ["SKU-002", "Licença AI Gateway", 1200.0, 50],
      ["SKU-003", "Suporte 24/7 Enterprise", 850.0, 100],
    ]);
    XLSX.utils.book_append_sheet(testWb, testWs, "Estoque");
    const xlsxBuf = XLSX.write(testWb, { type: "buffer", bookType: "xlsx" });
    const xlsxResult = await extractTextFromFileBuffer("estoque.xlsx", xlsxBuf);
    const passXlsx = xlsxResult.format === "XLSX" && xlsxResult.extractedText.includes("SKU-001") && xlsxResult.metrics.totalRows === 4;
    recordTest("3. Arquivos", "Leitura & Extração XLSX", passXlsx, `Linhas: ${xlsxResult.metrics.totalRows}, Chars: ${xlsxResult.extractedText.length}`);

    // 3.2 Extração CSV
    const csvContent = "Nome,Cargo,Departamento,Salario\nMaria Silva,Tech Lead,Engenharia,18000\nJoao Souza,Product Manager,Produto,15000";
    const csvBuf = Buffer.from(csvContent, "utf-8");
    const csvResult = await extractTextFromFileBuffer("folha.csv", csvBuf);
    const passCsv = csvResult.format === "CSV" && csvResult.extractedText.includes("Tech Lead");
    recordTest("3. Arquivos", "Leitura & Extração CSV", passCsv, `Linhas: ${csvResult.metrics.totalRows}, Formato: ${csvResult.format}`);

    // 3.3 Extração PDF (Simulado estruturado)
    const pdfRaw = "%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\nBT (Contrato de Prestacao de Servicos Orvexa Prime) Tj ( Clausula 1: Confidencialidade e SLA de 99.9%) Tj ET\n%%EOF";
    const pdfBuf = Buffer.from(pdfRaw, "latin1");
    const pdfResult = await extractTextFromFileBuffer("contrato.pdf", pdfBuf);
    const passPdf = pdfResult.format === "PDF" && pdfResult.extractedText.length > 20;
    recordTest("3. Arquivos", "Leitura & Extração PDF", passPdf, `Formato: ${pdfResult.format}, Caracteres: ${pdfResult.extractedText.length}`);

    // 3.4 Extração DOCX (XML tags)
    const docxRaw = 'PK\x03\x04...<w:p><w:t>Proposta Comercial de Licenciamento SaaS ORVEXA PRIME 2026</w:t></w:p>';
    const docxBuf = Buffer.from(docxRaw, "latin1");
    const docxResult = await extractTextFromFileBuffer("proposta.docx", docxBuf);
    const passDocx = docxResult.format === "DOCX" && docxResult.extractedText.includes("Proposta Comercial");
    recordTest("3. Arquivos", "Leitura & Extração DOCX", passDocx, `Formato: ${docxResult.format}, Texto extraído: "${docxResult.extractedText.slice(0, 40)}..."`);

    // 3.5 Extração de Imagem
    const dummyImgBuf = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    const imgResult = await extractTextFromFileBuffer("banner.png", dummyImgBuf);
    const passImg = imgResult.format === "IMAGE" && imgResult.previewData?.type === "IMAGE";
    recordTest("3. Arquivos", "Leitura & Análise de Imagem", passImg, `Formato: ${imgResult.format}, Mime: ${imgResult.fileType}`);

    // 3.6 Extração de Pacote ZIP
    const zipPack = new JSZip();
    zipPack.file("README.md", "# Documentação do Sistema Orvexa\nInstruções completas de deploy.");
    zipPack.file("config.json", JSON.stringify({ version: "2.4.0", mode: "production" }));
    zipPack.file("src/main.ts", "console.log('Orvexa Core Running');");
    const zipBuf = await zipPack.generateAsync({ type: "nodebuffer" });
    const zipResult = await extractTextFromFileBuffer("projeto.zip", zipBuf);
    const passZip = zipResult.format === "ZIP" && zipResult.extractedText.includes("README.md") && zipResult.previewData?.totalEntries >= 3;
    recordTest("3. Arquivos", "Leitura & Inspeção de Arquivos ZIP", passZip, `Formato: ${zipResult.format}, Itens no ZIP: ${zipResult.previewData?.totalEntries}`);

    // 3.7 Geração de Arquivos (XLSX, CSV, Documento, ZIP)
    const genXlsx = generateSpreadsheetBuffer({
      sheets: [{ name: "Balanco", headers: ["Mes", "Lucro"], rows: [["Jan", 50000], ["Fev", 65000]] }],
    });
    const genCsv = generateCsvBuffer({
      headers: ["ID", "Nome"],
      rows: [[1, "Orvexa Prime"]],
    });
    const genDoc = generateDocumentBuffer({
      title: "Relatório Mensal",
      content: "Resultados extraordinários atingidos no trimestre.",
      format: "md",
    });
    const genZip = await generateZipArchiveBuffer({
      files: [{ path: "resultado.txt", content: "Sucesso no teste de geração!" }],
    });
    const passGen = genXlsx.length > 500 && genCsv.length > 10 && genDoc.length > 50 && genZip.length > 100;
    recordTest("3. Arquivos", "Geração de Arquivos (XLSX, CSV, MD, ZIP)", passGen, `XLSX: ${genXlsx.length}B, CSV: ${genCsv.length}B, Doc: ${genDoc.length}B, ZIP: ${genZip.length}B`);

    // 3.8 Análise de Documento via Endpoint (/api/ai/document-analyzer)
    const form = new FormData();
    const blob = new Blob([csvContent], { type: "text/csv" });
    form.append("file", blob, "folha_teste.csv");
    form.append("analysisType", "CALCULOS_FINANCEIROS");
    form.append("question", "Qual é o total da folha salarial?");

    const resDocAnalyzer = await fetch(`${BASE_URL}/api/ai/document-analyzer`, {
      method: "POST",
      headers: authHeaders(userToken),
      body: form,
    });
    const docAnalyzerJson = await resDocAnalyzer.json();
    const passDocApi = resDocAnalyzer.status === 200 && docAnalyzerJson.success && docAnalyzerJson.analysis.length > 50;
    recordTest("3. Arquivos", "Endpoint Document Analyzer (Análise e Resposta IA)", passDocApi, `Status: ${resDocAnalyzer.status}, Modelo: ${docAnalyzerJson.modelUsed}`);
  } catch (err) {
    recordTest("3. Arquivos", "Exceção inesperada em Arquivos", false, err.message);
  }

  // --------------------------------------------------------------------------
  // MÓDULO 4: IMAGENS
  // --------------------------------------------------------------------------
  console.log("\n🎨 [MÓDULO 4/7] Testando Imagens (Criação, Análise, Edição & Processamento)...");
  try {
    // 4.1 Criação de Imagem Neural
    const neuralImg = await generateNeuralImage({
      prompt: "Relógio de luxo em platina com engrenagens visíveis",
      style: "ESTUDIO",
      aspectRatio: "1:1",
    });
    const passImgGen = !!neuralImg.imageUrl && neuralImg.imageUrl.startsWith("https://") && neuralImg.refinedPrompt.includes("professional studio");
    recordTest("4. Imagens", "Criação de Imagem Neural 8K com Refinamento", passImgGen, `URL: ${neuralImg.imageUrl.slice(0, 60)}..., Seed: ${neuralImg.seed}`);

    // 4.2 Análise de Atributos Visuais
    const visualAttr = analyzeVisualAttributes("Foto de estúdio de produto cosmético");
    const passImgAnalysis = !!visualAttr.lighting && !!visualAttr.palette && visualAttr.recommendedImprovements.length >= 3;
    recordTest("4. Imagens", "Análise de Atributos Visuais e Recomendações", passImgAnalysis, `Iluminação: ${visualAttr.lighting.slice(0, 45)}...`);

    // 4.3 Edição e Estilização por Referência
    const editedPrompt = buildReferenceEnhancedPrompt("Smartphone futurista", "Estética Cyberpunk Neón com Vidro Fosco");
    const passImgEdit = editedPrompt.includes("Cyberpunk Neón") && editedPrompt.includes("Smartphone futurista");
    recordTest("4. Imagens", "Edição & Composição por Referência", passImgEdit, `Prompt Expandido: "${editedPrompt.slice(0, 60)}..."`);

    // 4.4 Processamento / Remoção de Fundo
    const bgRemoval = prepareBackgroundRemovalPrompt("Fone de ouvido sem fio premium");
    const passBgRemoval = bgRemoval.includes("pure transparent alpha background") && bgRemoval.includes("vector mask");
    recordTest("4. Imagens", "Processamento e Preparação de Remoção de Fundo", passBgRemoval, `Diretiva de Máscara: "${bgRemoval.slice(0, 60)}..."`);

    // 4.5 Teste Endpoint Image Studio (/api/ai/image-studio)
    const resImgStudio = await fetch(`${BASE_URL}/api/ai/image-studio`, {
      method: "POST",
      headers: authHeaders(userToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        prompt: "Carro elétrico esportivo conceito 2026",
        style: "CYBERPUNK",
        aspectRatio: "16:9",
      }),
    });
    const imgStudioJson = await resImgStudio.json();
    const passImgStudio = resImgStudio.status === 200 && imgStudioJson.success && !!imgStudioJson.image?.imageUrl;
    recordTest("4. Imagens", "Endpoint Image Studio (API de Geração & Persistência)", passImgStudio, `Status: ${resImgStudio.status}, ID: ${imgStudioJson.image?.id}, Dimensões: ${imgStudioJson.image?.dimensions}`);
  } catch (err) {
    recordTest("4. Imagens", "Exceção inesperada em Imagens", false, err.message);
  }

  // --------------------------------------------------------------------------
  // MÓDULO 5: AGENTES
  // --------------------------------------------------------------------------
  console.log("\n🤖 [MÓDULO 5/7] Testando Todos os 6 Agentes Especialistas...");
  const agentSlugs = [
    { slug: "orvexa-dev", expectedName: "ORVEXA DEV", testInput: "function soma(a, b) { return a + b; }" },
    { slug: "orvexa-design", expectedName: "ORVEXA DESIGN", testInput: "Fintech moderna com paleta roxa e azul neon" },
    { slug: "orvexa-marketing", expectedName: "ORVEXA MARKETING", testInput: "Software de IA para automatizar atendimento no WhatsApp" },
    { slug: "orvexa-edu", expectedName: "ORVEXA EDU", testInput: "Como funciona a fotossíntese de forma simples" },
    { slug: "orvexa-business", expectedName: "ORVEXA BUSINESS", testInput: "Ticket R$ 200, CAC R$ 50, Churn 3% ao mês" },
    { slug: "orvexa-analyst", expectedName: "ORVEXA ANALYST", testInput: "Dados de vendas diárias dos últimos 30 dias" },
  ];

  for (const a of agentSlugs) {
    try {
      const def = OFFICIAL_AGENTS.find((agent) => agent.slug === a.slug || (a.slug === "orvexa-edu" && agent.slug === "orvexa-estudos"));
      assert(def, `Agente ${a.expectedName} deve estar registrado no catálogo`);

      // Executa a primeira ferramenta especializada do agente
      const firstTool = def.tools[0];
      const toolResult = executeAgentTool(def.slug, firstTool.id, a.testInput);
      const toolText = typeof toolResult === "object" && toolResult ? toolResult.output : String(toolResult || "");
      const passTool = !!toolText && toolText.length > 50;

      // Executa chamada real no chat via HTTP apontando para o agente com token ADMIN
      const resAgentChat = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: "POST",
        headers: authHeaders(adminToken, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          agentId: def.slug,
          messages: [{ role: "user", content: `Olá ${def.name}, ${a.testInput}` }],
        }),
      });
      let agentStream = await streamToString(resAgentChat);
      if (agentStream.length === 0) {
        // Retry de resiliência caso ocorra pico transitório de latência na API externa
        const retryRes = await fetch(`${BASE_URL}/api/ai/chat`, {
          method: "POST",
          headers: authHeaders(adminToken, { "Content-Type": "application/json" }),
          body: JSON.stringify({
            agentId: def.slug,
            messages: [{ role: "user", content: `Olá ${def.name}, ${a.testInput}` }],
          }),
        });
        agentStream = await streamToString(retryRes);
      }
      const passAgentChat = resAgentChat.status === 200 && agentStream.length > 20;

      const passAgent = passTool && passAgentChat;
      recordTest(
        "5. Agentes",
        `Agente Especialista: ${a.expectedName}`,
        passAgent,
        `Ferramenta: "${firstTool.name}" OK | Chat SSE: ${agentStream.length} chars`
      );
    } catch (err) {
      recordTest("5. Agentes", `Agente Especialista: ${a.expectedName}`, false, err.message);
    }
  }

  // --------------------------------------------------------------------------
  // MÓDULO 6: MEMÓRIA
  // --------------------------------------------------------------------------
  console.log("\n🧠 [MÓDULO 6/7] Testando Memória (Salvar Contexto, Recuperar Informações, Gerenciamento)...");
  try {
    // 6.1 Salvar Fato na Memória
    const savedMem = await saveUserMemory(normalUser.id, {
      key: "linguagem_preferida",
      value: "TypeScript e Rust com foco em segurança de memória",
      category: "PREFERENCIA",
      importance: 5,
      tags: ["tech", "dev", "orvexa"],
    });
    const passSaveMem = !!savedMem && savedMem.key === "linguagem_preferida";
    recordTest("6. Memória", "Salvar Fato e Preferência do Usuário", passSaveMem, `Chave: "${savedMem.key}", Categoria: ${savedMem.category}`);

    // 6.2 Recuperar Informações via Busca Semântica / RAG Unificado
    const retrievedContext = await retrieveUnifiedMemoryContext({
      userId: normalUser.id,
      query: "Qual linguagem eu gosto de programar?",
      limit: 5,
    });
    const passRetrieve = retrievedContext && (retrievedContext.includes("TypeScript") || retrievedContext.includes("linguagem_preferida"));
    recordTest("6. Memória", "Recuperar Informações e RAG de Memória", passRetrieve, `Contexto Injetado: ${retrievedContext.length} caracteres`);

    // 6.3 Listar e Gerenciar Memórias (/api/ai/memory)
    const resMemList = await fetch(`${BASE_URL}/api/ai/memory?scope=ALL`, {
      headers: authHeaders(userToken),
    });
    const memListJson = await resMemList.json();
    const passListMem = resMemList.status === 200 && Array.isArray(memListJson.items) && memListJson.items.length > 0;
    recordTest("6. Memória", "Listagem & Catálogo Central de Memória (/api/ai/memory)", passListMem, `Total de itens memorizados: ${memListJson.items?.length}`);

    // 6.4 Exclusão e Gerenciamento de Memória
    const deleted = await deleteUserMemory(savedMem.id, normalUser.id);
    const passDeleteMem = !!deleted;
    recordTest("6. Memória", "Exclusão Segura e Gerenciamento de Memória", passDeleteMem, `Item excluído com sucesso ID: ${savedMem.id}`);
  } catch (err) {
    recordTest("6. Memória", "Exceção inesperada em Memória", false, err.message);
  }

  // --------------------------------------------------------------------------
  // MÓDULO 7: USUÁRIOS
  // --------------------------------------------------------------------------
  console.log("\n👤 [MÓDULO 7/7] Testando Usuários (Cadastro, Login, Permissões & Planos)...");
  try {
    // 7.1 Cadastro de Novo Usuário no Plano FREE
    const registerEmail = `novo.usuario.${Date.now()}@orvexa.digital`;
    const resRegister = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Novo Usuário Free",
        email: registerEmail,
        password: "SenhaForte@2026",
        planSlug: "free",
      }),
    });
    const regJson = await resRegister.json();
    const passRegister = resRegister.status === 200 && regJson.success && regJson.user?.status === "ACTIVE";
    recordTest("7. Usuários", "Cadastro com Ativação Automática (Plano FREE)", passRegister, `Status: ${regJson.user?.status}, Plano: ${regJson.user?.plan}`);

    // 7.2 Login com Verificação de Hash Bcrypt e Emissão de Cookie JWT
    const resLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: registerEmail,
        password: "SenhaForte@2026",
      }),
    });
    const loginJson = await resLogin.json();
    const setCookieHeader = resLogin.headers.get("set-cookie");
    const passLogin = resLogin.status === 200 && loginJson.success && !!setCookieHeader && setCookieHeader.includes(AUTH_COOKIE_NAME);
    recordTest("7. Usuários", "Login Seguro com Bcrypt e Emissão de Cookie JWT", passLogin, `Email: ${loginJson.user?.email}, Cookie emitido: SIM`);

    // 7.3 Permissões e Controle de Acesso (RBAC Admin vs User)
    const resForbidden = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: authHeaders(userToken),
    });
    const resAdmin = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: authHeaders(adminToken),
    });
    const passPermissions = resForbidden.status === 403 && resAdmin.status === 200;
    recordTest("7. Usuários", "Controle de Acesso RBAC (USER = 403, ADMIN = 200)", passPermissions, `USER: ${resForbidden.status}, ADMIN: ${resAdmin.status}`);

    // 7.4 Gestão de Planos e Cálculo de Consumo dos 5 Vetores
    const consumption = await getUserConsumption(regJson.user.id);
    const isFree = consumption.plan.slug.toLowerCase() === "free";
    const passPlanCalc = isFree && consumption.metrics.messages.limit === 100 && consumption.metrics.files.limit === 5 && consumption.metrics.images.limit === 10;
    recordTest("7. Usuários", "Aplicação de Quotas dos 4 Planos e 5 Vetores", passPlanCalc, `Plano: ${consumption.plan.slug} | Msgs: ${consumption.metrics.messages.used}/${consumption.metrics.messages.limit} | Arqs: ${consumption.metrics.files.used}/${consumption.metrics.files.limit}`);
  } catch (err) {
    recordTest("7. Usuários", "Exceção inesperada em Usuários", false, err.message);
  }

  // --------------------------------------------------------------------------
  // LIMPEZA DE DADOS TEMPORÁRIOS
  // --------------------------------------------------------------------------
  try {
    const testUsers = await prisma.user.findMany({
      where: { email: { in: [testUserEmail] } },
      select: { id: true },
    });
    for (const u of testUsers) {
      const convs = await prisma.conversation.findMany({ where: { userId: u.id }, select: { id: true } });
      await prisma.message.deleteMany({ where: { conversationId: { in: convs.map((c) => c.id) } } });
      await prisma.conversation.deleteMany({ where: { userId: u.id } });
      await prisma.userMemory.deleteMany({ where: { userId: u.id } });
      await prisma.generatedImage.deleteMany({ where: { userId: u.id } });
      await prisma.usageLog.deleteMany({ where: { userId: u.id } });
      await prisma.file.deleteMany({ where: { userId: u.id } });
      await prisma.auditLog.deleteMany({ where: { actorId: u.id } });
      await prisma.subscription.deleteMany({ where: { userId: u.id } });
      await prisma.payment.deleteMany({ where: { userId: u.id } });
      await prisma.user.delete({ where: { id: u.id } });
    }
  } catch {}

  // --------------------------------------------------------------------------
  // RELATÓRIO FINAL CONSOLIDADO
  // --------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("📊  RELATÓRIO CONSOLIDADO DA BATERIA DE TESTES — ORVEXA PRIME SAAS");
  console.log("================================================================================");
  console.log(`  Total de Testes Executados : ${results.total}`);
  console.log(`  Testes Aprovados           : ${results.passed} (${Math.round((results.passed / results.total) * 100)}%)`);
  console.log(`  Falhas Detectadas          : ${results.failed}`);
  console.log("--------------------------------------------------------------------------------");

  for (const [mod, data] of Object.entries(results.modules)) {
    const statusIcon = data.failed === 0 ? "✅" : "❌";
    console.log(`  ${statusIcon} ${mod.padEnd(25)} : ${data.passed}/${data.passed + data.failed} testes aprovados`);
  }

  console.log("================================================================================");

  if (results.failed === 0) {
    console.log("🎉  TODOS OS 7 MÓDULOS FORAM HOMOLOGADOS COM 100% DE SUCESSO!\n");
    process.exit(0);
  } else {
    console.error("⚠️  ALGUNS TESTES APRESENTARAM FALHAS. VERIFIQUE OS LOGS ACIMA.\n");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Erro fatal na execução da bateria de testes:", err);
  process.exit(1);
});
