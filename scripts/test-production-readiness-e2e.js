// scripts/test-production-readiness-e2e.js
// TESTE COMPLETO E2E DO ORVEXA PRODUCTION READINESS ENGINE
// Valida: Rate Limiter, PII Masker, Structured Logger, Audit Trail, Plan Quotas, Cache, e Error Handling

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
    },
  });

  const customRequire = (id) => {
    if (id === "@/lib/prisma" || id === "./prisma" || id === "../prisma" || id.endsWith("/prisma")) {
      return { prisma };
    }
    if (id.startsWith("@/lib/")) {
      const resolved = path.resolve(__dirname, "../src/lib", id.replace("@/lib/", ""));
      const withTs = resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
      if (fs.existsSync(withTs)) {
        return loadTsModule(path.relative(__dirname, withTs));
      }
    }
    if (id.startsWith("./") || id.startsWith("../")) {
      const resolved = path.resolve(path.dirname(fullPath), id);
      const withTs = resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
      if (fs.existsSync(withTs)) {
        return loadTsModule(path.relative(__dirname, withTs));
      }
    }
    return require(id);
  };

  const m = { exports: {} };
  const fn = new Function("module", "exports", "require", "__dirname", "__filename", transpiled.outputText);
  fn(m, m.exports, customRequire, path.dirname(fullPath), fullPath);
  return m.exports;
}

async function runTests() {
  console.log("===============================================================");
  console.log("🛡️  INICIANDO TESTE E2E: ORVEXA ENTERPRISE PRODUCTION READINESS");
  console.log("===============================================================\n");

  const rateLimitMod = loadTsModule("../src/lib/rate-limit.ts");
  const piiMod = loadTsModule("../src/lib/pii-masker.ts");
  const loggerMod = loadTsModule("../src/lib/logger.ts");
  const auditMod = loadTsModule("../src/lib/audit.ts");
  const planLimitsMod = loadTsModule("../src/lib/plan-limits.ts");
  const cacheMod = loadTsModule("../src/lib/cache.ts");
  const errorsMod = loadTsModule("../src/lib/errors.ts");

  let passedTests = 0;

  // ---------------------------------------------------------------------------
  // 1. RATE LIMITER (Sliding Window & RFC Headers)
  // ---------------------------------------------------------------------------
  console.log("1️⃣  Testando Rate Limiter (Sliding Window & RFC Headers)...");
  const testIp = `test-ip-${Date.now()}`;
  rateLimitMod.RATE_LIMIT_PROFILES.TEST_BURST = {
    windowMs: 2000,
    maxRequests: 3,
  };

  const req1 = rateLimitMod.checkRateLimit(testIp, "TEST_BURST");
  assert.strictEqual(req1.allowed, true, "1ª requisição deve ser permitida");
  assert.strictEqual(req1.remaining, 2, "Restante deve ser 2");

  const req2 = rateLimitMod.checkRateLimit(testIp, "TEST_BURST");
  assert.strictEqual(req2.allowed, true, "2ª requisição deve ser permitida");

  const req3 = rateLimitMod.checkRateLimit(testIp, "TEST_BURST");
  assert.strictEqual(req3.allowed, true, "3ª requisição deve ser permitida");
  assert.strictEqual(req3.remaining, 0, "Restante deve ser 0");

  const req4 = rateLimitMod.checkRateLimit(testIp, "TEST_BURST");
  assert.strictEqual(req4.allowed, false, "4ª requisição deve ser bloqueada (429)");
  assert.strictEqual(req4.remaining, 0, "Restante deve ser 0 ao exceder");
  
  const headers = rateLimitMod.getRateLimitHeaders(req4);
  assert(headers["Retry-After"], "Header Retry-After deve estar presente");
  assert.strictEqual(headers["X-RateLimit-Limit"], "3");

  console.log("   ✅ Rate Limiter bloqueou com sucesso após atingir o teto, com headers RFC.");
  passedTests++;

  // ---------------------------------------------------------------------------
  // 2. PII MASKER (Proteção de Dados Sensíveis)
  // ---------------------------------------------------------------------------
  console.log("\n2️⃣  Testando PII Masker (Proteção de Dados Sensíveis)...");
  const rawText = "Cliente João com CPF 123.456.789-00, cartão 4532 1111 2222 3333, email joao.silva@empresa.com.br e token Bearer sk-ant-api03-abcdef123456.";
  const maskedText = piiMod.maskPii(rawText);

  assert(!maskedText.includes("123.456.789-00"), "CPF cru não deve estar presente no texto mascarado");
  assert(!maskedText.includes("4532 1111 2222 3333"), "Cartão de crédito não deve estar presente");
  assert(!maskedText.includes("joao.silva@empresa.com.br"), "E-mail cru não deve estar presente");
  assert(!maskedText.includes("sk-ant-api03-abcdef123456"), "Chave de API não deve estar presente");

  const complexObj = {
    user: "Maria",
    cpf: "987.654.321-99",
    security: {
      card: "5500 9999 8888 7777",
      secretToken: "sk-orvexa-supersecretkey99999",
    },
    notes: ["Email de contato: maria@orvexa.ai"],
  };
  const sanitizedObj = piiMod.sanitizeLogPayload(complexObj);
  assert(!JSON.stringify(sanitizedObj).includes("987.654.321-99"), "Objeto sanitizado não deve conter CPF");
  assert(!JSON.stringify(sanitizedObj).includes("5500 9999 8888 7777"), "Objeto sanitizado não deve conter cartão");
  assert(!JSON.stringify(sanitizedObj).includes("sk-orvexa-supersecretkey99999"), "Objeto sanitizado não deve conter secretToken");

  console.log("   ✅ PII Masker protegeu CPFs, Cartões, E-mails e Tokens em strings e objetos recursivos.");
  passedTests++;

  // ---------------------------------------------------------------------------
  // 3. STRUCTURED LOGGER (Buffer Circular & Níveis de Log)
  // ---------------------------------------------------------------------------
  console.log("\n3️⃣  Testando Structured Logger e Buffer Circular...");
  const logger = loggerMod.logger;
  logger.info("Teste de info para produção", { testRunId: "test-run-1" });
  logger.warn("Aviso de latência elevada", { latencyMs: 450 });
  logger.error("Erro simulado tratado", { error: "Falha controlada" });

  const recentLogs = logger.getRecentLogs();
  assert(recentLogs.length >= 3, "Buffer deve conter os logs gerados");
  const lastLog = recentLogs[0];
  assert(lastLog.level === "ERROR" || lastLog.level === "WARN" || lastLog.level === "INFO");
  assert(lastLog.timestamp, "Log deve conter timestamp ISO");

  console.log(`   ✅ Structured Logger registrou eventos. Total no buffer em memória: ${recentLogs.length}.`);
  passedTests++;

  // ---------------------------------------------------------------------------
  // 4. AUDIT LOGGING SERVICE (Trilha de Auditoria com Prisma)
  // ---------------------------------------------------------------------------
  console.log("\n4️⃣  Testando Trilha de Auditoria (AuditLog com Prisma)...");
  const sampleUser = await prisma.user.findFirst();
  assert(sampleUser, "Usuário deve existir no banco para auditoria");

  const auditEntry = await auditMod.recordAuditEvent({
    action: "SECURITY_TEST_AUDIT",
    actorId: sampleUser.id,
    resourceType: "SECURITY",
    ipAddress: "127.0.0.1",
    details: { event: "Automated verification test", timestamp: Date.now() },
  });

  assert(auditEntry.id, "Entrada de auditoria deve ser persistida com ID");
  const auditQueryResult = await auditMod.getAuditRecords({ action: "SECURITY_TEST_AUDIT", limit: 5 });
  assert(auditQueryResult.records.length > 0, "Consulta de auditoria deve retornar a entrada registrada");
  assert.strictEqual(auditQueryResult.records[0].action, "SECURITY_TEST_AUDIT");

  console.log(`   ✅ Trilha de Auditoria persistida com sucesso no banco (ID: ${auditEntry.id}).`);
  passedTests++;

  // ---------------------------------------------------------------------------
  // 5. PLAN LIMITS & CONSUMPTION QUOTAS
  // ---------------------------------------------------------------------------
  console.log("\n5️⃣  Testando Gestão de Planos, Cotas de Tokens e Armazenamento...");
  
  // Teste de Acesso a Modelos
  const modelAccessCheck = await planLimitsMod.checkModelAccess(sampleUser.id, "claude-3-7-sonnet");
  assert(typeof modelAccessCheck.allowed === "boolean", "checkModelAccess deve retornar status booleano");
  assert(Array.isArray(modelAccessCheck.allowedModels), "allowedModels deve ser array");

  // Teste de Quota de Armazenamento
  const storageCheck = await planLimitsMod.checkUserStorageQuota(sampleUser.id, 1024 * 1024); // 1 MB
  assert(typeof storageCheck.hasStorage === "boolean", "storageCheck deve retornar boolean hasStorage");
  assert(storageCheck.maxBytes > 0, "maxBytes deve ser maior que zero");

  // Teste de Quota de Tokens
  const tokenCheck = await planLimitsMod.checkUserTokenQuota(sampleUser.id);
  assert(typeof tokenCheck.hasQuota === "boolean", "tokenCheck deve retornar boolean hasQuota");
  assert(typeof tokenCheck.maxTokens === "number", "maxTokens deve ser um número");

  console.log(`   ✅ Plan Limits validou acesso a modelos, cotas de tokens e armazenamento.`);
  passedTests++;

  // ---------------------------------------------------------------------------
  // 6. IN-MEMORY CACHE (TTL & Cache-Aside)
  // ---------------------------------------------------------------------------
  console.log("\n6️⃣  Testando In-Memory Cache (TTL & Cache-Aside Pattern)...");
  const cache = cacheMod.appCache;
  const cacheKey = "test:cache:key:1";

  cache.set(cacheKey, { data: "valor_em_cache" }, 10); // 10s
  const cachedVal = cache.get(cacheKey);
  assert.deepStrictEqual(cachedVal, { data: "valor_em_cache" }, "Valor deve ser recuperado do cache");

  // Cache-Aside helper
  let factoryCalls = 0;
  const computed = await cache.getOrSet("test:cache:aside", async () => {
    factoryCalls++;
    return { calculated: 42 };
  }, 10);

  const cachedComputed = await cache.getOrSet("test:cache:aside", async () => {
    factoryCalls++;
    return { calculated: 99 };
  }, 10);

  assert.strictEqual(factoryCalls, 1, "Factory function só deve ser invocada uma vez devido ao cache");
  assert.strictEqual(cachedComputed.calculated, 42, "Segundo acesso deve retornar valor em cache");

  const stats = cache.getStats();
  assert(stats.hits > 0, "Hit count do cache deve ser incrementado");

  console.log(`   ✅ Cache validado com sucesso (Hits: ${stats.hits}, Misses: ${stats.misses}, Itens: ${stats.size}).`);
  passedTests++;

  // ---------------------------------------------------------------------------
  // 7. STANDARDIZED ERROR HANDLING
  // ---------------------------------------------------------------------------
  console.log("\n7️⃣  Testando Tratamento Centralizado de Erros (AppError & Serialization)...");
  const { RateLimitError, QuotaExceededError, NotFoundError } = errorsMod;

  const rateErr = new RateLimitError(15);
  assert.strictEqual(rateErr.statusCode, 429);
  assert.strictEqual(rateErr.details.retryAfterSeconds, 15);
  assert.strictEqual(rateErr.code, "RATE_LIMIT_EXCEEDED");

  const quotaErr = new QuotaExceededError("Limite de tokens atingido");
  assert.strictEqual(quotaErr.statusCode, 403);
  assert.strictEqual(quotaErr.code, "QUOTA_EXCEEDED");

  const notFoundErr = new NotFoundError("Recurso não localizado");
  assert.strictEqual(notFoundErr.statusCode, 404);
  assert.strictEqual(notFoundErr.code, "NOT_FOUND");

  console.log("   ✅ Tratamento de erros seguro e estruturado para produção validado.");
  passedTests++;

  // ---------------------------------------------------------------------------
  // FINAL REPORT
  // ---------------------------------------------------------------------------
  console.log("\n===============================================================");
  console.log(`🎉 TODOS OS ${passedTests} TESTES DE PRODUCTION READINESS PASSARAM!`);
  console.log("🛡️  ORVEXA PRIME ESTÁ PRONTO PARA OPERAÇÃO SAAS EM PRODUÇÃO.");
  console.log("===============================================================\n");
}

runTests()
  .catch((err) => {
    console.error("❌ ERRO NO TESTE E2E:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
