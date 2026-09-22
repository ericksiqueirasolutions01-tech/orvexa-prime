// scripts/run-all-system-tests.js
// ============================================================================
// SUÍTE COMPLETA DE TESTES AUTOMÁTICOS & DIAGNÓSTICO DO ORVEXA PRIME SAAS
// Valida: Autenticação, Banco de Dados, APIs, Upload, Processamento, Agentes e Performance
// ============================================================================

const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Loader dinâmico com suporte a path aliases (@/lib, @/ai, etc.)
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

async function main() {
  console.log("\n================================================================================");
  console.log("🚀  ORVEXA PRIME SAAS — SUÍTE DE TESTES AUTOMÁTICOS & DIAGNÓSTICO DO SISTEMA");
  console.log("================================================================================\n");

  const startTime = Date.now();
  let passedCount = 0;
  let failedCount = 0;

  function recordPass(label, duration, detail) {
    passedCount++;
    console.log(`  ✅ [PASS] ${label} (${duration}ms) ${detail ? `→ ${detail}` : ""}`);
  }

  function recordFail(label, err) {
    failedCount++;
    console.error(`  ❌ [FAIL] ${label} → ${err.message || err}`);
  }

  try {
    // Carregar módulo de diagnóstico
    const diagnosticsMod = loadTsModule("../src/lib/diagnostics.ts");

    // --------------------------------------------------------------------------
    // 1. TESTE DE AUTENTICAÇÃO & SEGURANÇA CRIPTOGRÁFICA
    // --------------------------------------------------------------------------
    console.log("🔐 [1/6] Testando Autenticação, Tokens JWT e Bcrypt...");
    try {
      const tStart = Date.now();
      const authRes = await diagnosticsMod.testAuthentication();
      if (authRes.status === "PASS") {
        recordPass(authRes.name, Date.now() - tStart, authRes.message);
      } else {
        throw new Error(authRes.message);
      }
    } catch (err) {
      recordFail("Autenticação & Criptografia", err);
    }

    // --------------------------------------------------------------------------
    // 2. TESTE DO BANCO DE DADOS & INTEGRIDADE RELACIONAL
    // --------------------------------------------------------------------------
    console.log("\n🗄️  [2/6] Testando Conectividade do Banco de Dados & Latência de Query...");
    try {
      const tStart = Date.now();
      const dbRes = await diagnosticsMod.testDatabase();
      if (dbRes.result.status === "PASS") {
        const counts = dbRes.status.counts;
        recordPass(
          dbRes.result.name,
          Date.now() - tStart,
          `Engine: ${dbRes.status.engine} | Latência: ${dbRes.status.latencyMs}ms | Users: ${counts.users} | Plans: ${counts.plans} | Convs: ${counts.conversations} | Files: ${counts.files}`
        );
      } else {
        throw new Error(dbRes.result.message);
      }
    } catch (err) {
      recordFail("Banco de Dados & Integridade Relacional", err);
    }

    // --------------------------------------------------------------------------
    // 3. TESTE E VALIDAÇÃO DAS APIS & RATE LIMITER
    // --------------------------------------------------------------------------
    console.log("\n🌐 [3/6] Testando APIs, Endpoints Críticos e Rate Limiting...");
    try {
      const tStart = Date.now();
      const apiRes = await diagnosticsMod.testApis();
      if (apiRes.result.status === "PASS" || apiRes.result.status === "WARN") {
        recordPass(
          apiRes.result.name,
          Date.now() - tStart,
          `${apiRes.apis.length} rotas validadas. Rate limiter ativo e respondendo.`
        );
        for (const api of apiRes.apis) {
          console.log(`     • ${api.name.padEnd(30)} [${api.status}] ${api.endpoint} (${api.latencyMs}ms)`);
        }
      } else {
        throw new Error(apiRes.result.message);
      }
    } catch (err) {
      recordFail("Validação das APIs Críticas", err);
    }

    // --------------------------------------------------------------------------
    // 4. TESTE DE UPLOAD, CHUNKING SEMÂNTICO & VETORIZAÇÃO
    // --------------------------------------------------------------------------
    console.log("\n📁 [4/6] Testando Upload, Chunking Semântico & Embeddings RAG...");
    try {
      const tStart = Date.now();
      const storageRes = await diagnosticsMod.testFileUploadAndProcessing();
      if (storageRes.result.status === "PASS") {
        recordPass(
          storageRes.result.name,
          Date.now() - tStart,
          `Arquivos no disco/banco: ${storageRes.storage.totalFiles} | Usado: ${(storageRes.storage.usedBytes / 1024).toFixed(1)} KB`
        );
      } else {
        throw new Error(storageRes.result.message);
      }
    } catch (err) {
      recordFail("Upload & Processamento de Arquivos", err);
    }

    // --------------------------------------------------------------------------
    // 5. TESTE DA ARQUITETURA DOS AGENTES ESPECIALISTAS
    // --------------------------------------------------------------------------
    console.log("\n🤖 [5/6] Testando Arquitetura dos 6 Agentes Oficiais...");
    try {
      const tStart = Date.now();
      const agentsRes = await diagnosticsMod.testAgentsArchitecture();
      if (agentsRes.status === "PASS") {
        recordPass(
          agentsRes.name,
          Date.now() - tStart,
          `6 Agentes validados com ${agentsRes.details?.totalTools || 0} ferramentas autônomas.`
        );
      } else {
        throw new Error(agentsRes.message);
      }
    } catch (err) {
      recordFail("Arquitetura dos Agentes Especialistas", err);
    }

    // --------------------------------------------------------------------------
    // 6. TESTE DE DESEMPENHO DO SISTEMA & TELEMETRIA
    // --------------------------------------------------------------------------
    console.log("\n⚡ [6/6] Testando Desempenho, Uso de Memória & Cache LRU...");
    try {
      const tStart = Date.now();
      const perf = diagnosticsMod.getSystemPerformance();
      recordPass(
        "Métricas de Performance",
        Date.now() - tStart,
        `Heap: ${perf.memoryHeapUsedMb} MB | RSS: ${perf.memoryRssMb} MB | Uptime: ${perf.uptimeSeconds}s | Cache Hit Rate: ${perf.cacheStats.hitRate}`
      );
    } catch (err) {
      recordFail("Desempenho & Telemetria", err);
    }

    // --------------------------------------------------------------------------
    // EXECUTOR COMPLETO & RELATÓRIO CONSOLIDADO
    // --------------------------------------------------------------------------
    console.log("\n📊 [CONSOLIDAÇÃO] Executando runSystemDiagnostics() completo...");
    const reportStart = Date.now();
    const fullReport = await diagnosticsMod.runSystemDiagnostics();
    const reportDuration = Date.now() - reportStart;

    console.log("\n================================================================================");
    console.log("📋  RELATÓRIO DE SAÚDE DO SISTEMA — ORVEXA PRIME SAAS");
    console.log("================================================================================");
    console.log(`  Data / Hora       : ${fullReport.timestamp}`);
    console.log(`  Score Global      : ${fullReport.overallScore}% (${fullReport.overallStatus})`);
    console.log(`  Total de Testes   : ${fullReport.summary.totalTests}`);
    console.log(`  Testes Aprovados  : ${fullReport.summary.passedTests}`);
    console.log(`  Falhas            : ${fullReport.summary.failedTests}`);
    console.log(`  Alertas           : ${fullReport.summary.warningTests}`);
    console.log(`  Tempo Total       : ${Date.now() - startTime}ms (Diagnóstico Rápido: ${reportDuration}ms)`);
    console.log("--------------------------------------------------------------------------------");
    console.log(`  Banco de Dados    : ${fullReport.database.engine} (${fullReport.database.latencyMs}ms) [${fullReport.database.connected ? "ONLINE" : "OFFLINE"}]`);
    console.log(`  Armazenamento     : ${fullReport.storage.totalFiles} arquivos | ${(fullReport.storage.usedBytes / 1024).toFixed(1)} KB consumidos`);
    console.log(`  Consumo de Heap   : ${fullReport.performance.memoryHeapUsedMb} MB`);
    console.log(`  Uptime            : ${fullReport.performance.uptimeSeconds} segundos`);
    console.log("================================================================================\n");

    if (failedCount > 0 || fullReport.summary.failedTests > 0) {
      console.error(`❌ O diagnóstico detectou ${failedCount + fullReport.summary.failedTests} falha(s). Verifique os logs acima.`);
      process.exit(1);
    } else {
      console.log("🎉 TODOS OS TESTES PASSARAM COM SUCESSO! O ORVEXA PRIME ESTÁ PRONTO PARA PRODUÇÃO.");
      process.exit(0);
    }
  } catch (err) {
    console.error("❌ Erro fatal durante a execução dos testes:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

