// scripts/test-backup-system-e2e.js
// ============================================================================
// TESTE COMPLETO E2E: SISTEMA DE BACKUP, RESTAURAÇÃO & DISASTER RECOVERY
// Valida: Snapshots do Banco, Arquivos, Validação SHA-256, Restauração e Auditoria
// ============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
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
  console.log("💾 TESTE E2E: SISTEMA PROFISSIONAL DE BACKUP & RESTAURAÇÃO — ORVEXA PRIME SAAS");
  console.log("================================================================================\n");

  const backupMod = loadTsModule("../src/lib/backup.ts");

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

  let dbBackup;
  let fullBackup;

  // --------------------------------------------------------------------------
  // 1. CRIAÇÃO DE BACKUP DO BANCO DE DADOS (DATABASE ONLY)
  // --------------------------------------------------------------------------
  console.log("🗄️  [1/5] Testando Geração de Backup do Banco de Dados (DATABASE)...");
  try {
    const tStart = Date.now();
    dbBackup = await backupMod.createSystemBackup({
      type: "DATABASE",
      isAutomatic: false,
      notes: "Teste E2E de backup do banco",
    });

    assert(dbBackup.id, "ID do backup não gerado.");
    assert(fs.existsSync(dbBackup.filePath), "Arquivo .zip do backup não encontrado no disco.");
    assert(dbBackup.checksumSha256, "Checksum SHA-256 não computado.");
    assert.strictEqual(dbBackup.type, "DATABASE");
    assert(dbBackup.counts.users > 0, "Usuários devem estar no dump do banco.");

    pass(
      "Backup de Banco Gerado",
      `Arquivo: ${dbBackup.fileName} (${dbBackup.fileSizeFormatted}, ${Date.now() - tStart}ms) | SHA: ${dbBackup.checksumSha256.slice(0, 16)}...`
    );
  } catch (err) {
    fail("Criação de Backup DATABASE", err);
  }

  // --------------------------------------------------------------------------
  // 2. CRIAÇÃO DE BACKUP COMPLETO (FULL: BANCO + ARQUIVOS)
  // --------------------------------------------------------------------------
  console.log("\n📦 [2/5] Testando Geração de Backup Completo (FULL)...");
  try {
    const tStart = Date.now();
    fullBackup = await backupMod.createSystemBackup({
      type: "FULL",
      isAutomatic: false,
      notes: "Teste E2E de backup completo",
    });

    assert(fullBackup.id, "ID do backup FULL não gerado.");
    assert(fs.existsSync(fullBackup.filePath), "Arquivo .zip do backup FULL não encontrado no disco.");
    assert(fullBackup.fileSizeBytes > 0, "Tamanho do backup deve ser maior que 0.");

    pass(
      "Backup Completo (FULL) Gerado",
      `Arquivo: ${fullBackup.fileName} (${fullBackup.fileSizeFormatted}, ${Date.now() - tStart}ms) | Counts: ${fullBackup.counts.users} users, ${fullBackup.counts.conversations} convs, ${fullBackup.counts.plans} plans`
    );
  } catch (err) {
    fail("Criação de Backup FULL", err);
  }

  // --------------------------------------------------------------------------
  // 3. VALIDAÇÃO DE INTEGRIDADE CRIPTOGRÁFICA VIA SHA-256
  // --------------------------------------------------------------------------
  console.log("\n🔐 [3/5] Testando Validação de Integridade Criptográfica (SHA-256)...");
  try {
    const fileBytes = fs.readFileSync(fullBackup.filePath);
    const computedHash = crypto.createHash("sha256").update(fileBytes).digest("hex");

    assert.strictEqual(
      computedHash,
      fullBackup.checksumSha256,
      "Hash computado do arquivo diverge do registrado no manifesto."
    );

    pass("Integridade SHA-256 Verificada", `Hash verificado: ${computedHash.slice(0, 32)}... (100% íntegro)`);
  } catch (err) {
    fail("Validação de Integridade SHA-256", err);
  }

  // --------------------------------------------------------------------------
  // 4. RESTAURAÇÃO DO SISTEMA & SNAPSHOT PREVENTIVO AUTOMÁTICO
  // --------------------------------------------------------------------------
  console.log("\n🔄 [4/5] Testando Fluxo Completo de Restauração & Snapshot de Segurança...");
  try {
    const tStart = Date.now();
    const restoreResult = await backupMod.restoreSystemBackup(fullBackup.id);

    assert(restoreResult.success === true, "Restauração deve retornar sucesso.");
    assert(restoreResult.preRestoreSafetyBackupId, "Snapshot preventivo deve ser criado antes da restauração.");
    assert(restoreResult.restoredCounts.users > 0, "Usuários devem ter sido restaurados.");

    pass(
      "Restauração Concluída com Sucesso",
      `Snapshot de segurança preventivo criado: ${restoreResult.preRestoreSafetyBackupId} | Duração: ${Date.now() - tStart}ms`
    );
  } catch (err) {
    fail("Restauração do Sistema", err);
  }

  // --------------------------------------------------------------------------
  // 5. CATÁLOGO DE VERSÕES, TELEMETRIA & AUDITORIA
  // --------------------------------------------------------------------------
  console.log("\n📋 [5/5] Testando Catálogo de Versões, Telemetria e Logs de Auditoria...");
  try {
    const stats = backupMod.getBackupStorageStats();
    assert(stats.totalBackups >= 2, "Catálogo deve conter pelo menos 2 backups.");
    assert(stats.lastBackup !== null, "Último backup deve estar registrado.");
    assert(stats.totalSizeBytes > 0, "Tamanho total deve ser maior que 0.");

    const logs = await backupMod.getBackupLogs(10);
    assert(logs.length > 0, "Logs de auditoria de backup devem existir.");

    const actions = logs.map((l) => l.action);
    assert(actions.includes("BACKUP_CREATED"), "Ação BACKUP_CREATED deve constar nos logs.");
    assert(actions.includes("BACKUP_RESTORED"), "Ação BACKUP_RESTORED deve constar nos logs.");

    pass(
      "Catálogo & Auditoria Validados",
      `Total Versões: ${stats.totalBackups} | Espaço: ${stats.totalSizeFormatted} | Logs Registrados: ${logs.length}`
    );
  } catch (err) {
    fail("Catálogo de Versões & Auditoria", err);
  }

  // --------------------------------------------------------------------------
  // RESULTADO FINAL
  // --------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`📊 RESULTADO DA SUÍTE: ${testPassed} APROVADOS | ${testFailed} FALHAS`);
  console.log("================================================================================\n");

  if (testFailed > 0) {
    console.error(`❌ Houve falhas no teste do sistema de backup e restauração.`);
    process.exit(1);
  } else {
    console.log("🎉 SISTEMA PROFISSIONAL DE BACKUP & RESTAURAÇÃO 100% OPERACIONAL!");
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

