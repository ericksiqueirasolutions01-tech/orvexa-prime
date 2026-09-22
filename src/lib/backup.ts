// src/lib/backup.ts
// ============================================================================
// MOTOR PROFISSIONAL DE BACKUP & RESTAURAÇÃO — ORVEXA PRIME SAAS
// Suporta: Banco de Dados, Arquivos do Workspace, Checksums SHA-256,
// Histórico de Versões, Rotação e Restauração com Integridade Relacional
// ============================================================================

import fs from "fs";
import path from "path";
import crypto from "crypto";
import JSZip from "jszip";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { logAuditEvent } from "./security";

export type BackupType = "FULL" | "DATABASE" | "FILES";
export type BackupStatus = "SUCCESS" | "RESTORED" | "FAILED" | "IN_PROGRESS";

export interface BackupManifestItem {
  id: string;
  type: BackupType;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  checksumSha256: string;
  status: BackupStatus;
  isAutomatic: boolean;
  counts: {
    users: number;
    plans: number;
    conversations: number;
    messages: number;
    files: number;
    memories: number;
    payments: number;
    auditLogs: number;
  };
  durationMs: number;
  createdAt: string;
  restoredAt?: string;
}

export interface BackupCatalogManifest {
  version: string;
  lastUpdated: string;
  retentionLimit: number;
  backups: BackupManifestItem[];
}

const BACKUPS_DIR = path.resolve(process.cwd(), "storage/backups");
const MANIFEST_FILE = path.join(BACKUPS_DIR, "manifest.json");
const MAX_BACKUP_RETENTION = 15; // Mantém até 15 versões no histórico

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

function loadManifest(): BackupCatalogManifest {
  ensureBackupsDir();
  if (!fs.existsSync(MANIFEST_FILE)) {
    const initial: BackupCatalogManifest = {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      retentionLimit: MAX_BACKUP_RETENTION,
      backups: [],
    };
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
  try {
    const content = fs.readFileSync(MANIFEST_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    logger.error("[BACKUP] Erro ao carregar manifest.json, recriando...", { error: String(err) });
    return {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      retentionLimit: MAX_BACKUP_RETENTION,
      backups: [],
    };
  }
}

function saveManifest(manifest: BackupCatalogManifest) {
  ensureBackupsDir();
  manifest.lastUpdated = new Date().toISOString();
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), "utf-8");
}

function computeFileSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

/**
 * 1. CRIAÇÃO DE BACKUP DO SISTEMA (FULL, DATABASE OU FILES)
 */
export async function createSystemBackup(options: {
  type?: BackupType;
  isAutomatic?: boolean;
  actorId?: string;
  notes?: string;
}): Promise<BackupManifestItem> {
  const startTime = Date.now();
  ensureBackupsDir();

  const type = options.type || "FULL";
  const backupId = `bkp_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const timestampIso = new Date().toISOString();
  const dateFormatted = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `orvexa_backup_${type.toLowerCase()}_${dateFormatted}_${backupId.slice(-6)}.zip`;
  const filePath = path.join(BACKUPS_DIR, fileName);

  logger.info(`[BACKUP] Iniciando criação de backup (${type}) ID: ${backupId}`);

  const zip = new JSZip();

  let counts = {
    users: 0,
    plans: 0,
    conversations: 0,
    messages: 0,
    files: 0,
    memories: 0,
    payments: 0,
    auditLogs: 0,
  };

  try {
    // ------------------------------------------------------------------------
    // SEÇÃO A: BACKUP DO BANCO DE DADOS (SE TYPE FOR DATABASE OU FULL)
    // ------------------------------------------------------------------------
    if (type === "DATABASE" || type === "FULL") {
      const dbFolder = zip.folder("database");

      // 1. Exportação universal em JSON de todas as tabelas
      const [
        users,
        plans,
        subscriptions,
        payments,
        conversations,
        messages,
        files,
        userMemories,
        agentMemories,
        conversationMemories,
        fileKnowledge,
        generatedImages,
        projects,
        systemSettings,
        routerRules,
        apiKeys,
        auditLogs,
      ] = await Promise.all([
        prisma.user.findMany(),
        prisma.plan.findMany(),
        prisma.subscription.findMany(),
        prisma.payment.findMany(),
        prisma.conversation.findMany(),
        prisma.message.findMany(),
        prisma.file.findMany(),
        prisma.userMemory.findMany(),
        prisma.agentMemory.findMany(),
        prisma.conversationMemory.findMany(),
        prisma.fileKnowledge.findMany(),
        prisma.generatedImage.findMany(),
        prisma.project.findMany(),
        prisma.systemSetting.findMany(),
        prisma.routerRule.findMany(),
        prisma.apiKey.findMany(),
        prisma.auditLog.findMany({ take: 1000, orderBy: { createdAt: "desc" } }),
      ]);

      counts = {
        users: users.length,
        plans: plans.length,
        conversations: conversations.length,
        messages: messages.length,
        files: files.length,
        memories: userMemories.length + agentMemories.length + conversationMemories.length,
        payments: payments.length,
        auditLogs: auditLogs.length,
      };

      const dbDump = {
        meta: {
          backupId,
          version: "ORVEXA_PRIME_2026_SAAS",
          timestamp: timestampIso,
          counts,
        },
        data: {
          plans,
          users,
          subscriptions,
          payments,
          conversations,
          messages,
          files,
          userMemories,
          agentMemories,
          conversationMemories,
          fileKnowledge,
          generatedImages,
          projects,
          systemSettings,
          routerRules,
          apiKeys,
          auditLogs,
        },
      };

      dbFolder?.file("dump.json", JSON.stringify(dbDump, null, 2));

      // 2. Se SQLite, inclui cópia do arquivo binário dev.db
      const sqlitePath = path.resolve(process.cwd(), "prisma/dev.db");
      if (fs.existsSync(sqlitePath)) {
        const dbBinary = fs.readFileSync(sqlitePath);
        dbFolder?.file("dev.db", dbBinary);
      }
    }

    // ------------------------------------------------------------------------
    // SEÇÃO B: BACKUP DOS ARQUIVOS ENVIADOS (SE TYPE FOR FILES OU FULL)
    // ------------------------------------------------------------------------
    if (type === "FILES" || type === "FULL") {
      const filesFolder = zip.folder("files");
      const allFiles = await prisma.file.findMany();

      const filesManifest: any[] = [];

      for (const f of allFiles) {
        let contentBuffer: Buffer | null = null;

        // Se tem dataUrl em previewData
        if (f.previewData) {
          try {
            const preview = JSON.parse(f.previewData);
            if (preview?.dataUrl && typeof preview.dataUrl === "string" && preview.dataUrl.includes(",")) {
              contentBuffer = Buffer.from(preview.dataUrl.split(",")[1], "base64");
            }
          } catch {}
        }

        // Se tem extractedText
        if (!contentBuffer && f.extractedText) {
          contentBuffer = Buffer.from(f.extractedText, "utf-8");
        }

        // Se arquivo físico existir no disco
        if (!contentBuffer && f.storedPath) {
          const possiblePath = path.resolve(process.cwd(), f.storedPath.replace(/^\//, ""));
          if (fs.existsSync(possiblePath)) {
            contentBuffer = fs.readFileSync(possiblePath);
          }
        }

        // Grava no ZIP
        const safeName = `${f.id}_${f.originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        if (contentBuffer) {
          filesFolder?.file(safeName, contentBuffer);
        }

        filesManifest.push({
          id: f.id,
          userId: f.userId,
          originalName: f.originalName,
          category: f.category,
          mimeType: f.mimeType,
          fileSizeBytes: f.fileSizeBytes,
          archivedName: contentBuffer ? safeName : null,
          createdAt: f.createdAt,
        });
      }

      filesFolder?.file("files_index.json", JSON.stringify(filesManifest, null, 2));
    }

    // Metadados centrais no manifesto do pacote
    const packageInfo = {
      id: backupId,
      type,
      createdAt: timestampIso,
      counts,
      isAutomatic: !!options.isAutomatic,
      notes: options.notes || "Snapshot do sistema ORVEXA PRIME",
    };
    zip.file("package.json", JSON.stringify(packageInfo, null, 2));

    // Gerar buffer ZIP e gravar no disco
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    fs.writeFileSync(filePath, zipBuffer);

    // Calcular checksum SHA-256 e tamanho
    const fileSizeBytes = zipBuffer.length;
    const checksumSha256 = crypto.createHash("sha256").update(zipBuffer).digest("hex");
    const durationMs = Date.now() - startTime;

    const backupItem: BackupManifestItem = {
      id: backupId,
      type,
      fileName,
      filePath,
      fileSizeBytes,
      fileSizeFormatted: formatBytes(fileSizeBytes),
      checksumSha256,
      status: "SUCCESS",
      isAutomatic: !!options.isAutomatic,
      counts,
      durationMs,
      createdAt: timestampIso,
    };

    // Atualizar manifesto de versões
    const manifest = loadManifest();
    manifest.backups.unshift(backupItem);

    // Rotação de versões excedentes (mantém até MAX_BACKUP_RETENTION)
    while (manifest.backups.length > manifest.retentionLimit) {
      const removed = manifest.backups.pop();
      if (removed && fs.existsSync(removed.filePath)) {
        try {
          fs.unlinkSync(removed.filePath);
          logger.info(`[BACKUP ROTATION] Versão antiga expurgada: ${removed.fileName}`);
        } catch {}
      }
    }

    saveManifest(manifest);

    // Registrar log de auditoria
    await logAuditEvent({
      actorId: options.actorId || null,
      action: "BACKUP_CREATED",
      resourceType: "SYSTEM",
      resourceId: backupId,
      details: {
        type,
        fileName,
        fileSizeBytes,
        durationMs,
        isAutomatic: options.isAutomatic,
        checksum: checksumSha256.slice(0, 16),
      },
    });

    logger.info(`[BACKUP] Backup criado com sucesso: ${fileName} (${formatBytes(fileSizeBytes)}, ${durationMs}ms)`);

    return backupItem;
  } catch (err: any) {
    logger.error("[BACKUP] Falha durante criação do backup:", { error: String(err) });
    throw new Error(`Falha ao gerar backup: ${err.message}`);
  }
}

/**
 * 2. RESTAURAÇÃO DE BACKUP COM VALIDAÇÃO DE SEGURANÇA
 */
export async function restoreSystemBackup(
  backupId: string,
  options?: { actorId?: string }
): Promise<{
  success: boolean;
  backupId: string;
  preRestoreSafetyBackupId: string;
  durationMs: number;
  restoredCounts: Record<string, number>;
}> {
  const startTime = Date.now();
  const manifest = loadManifest();
  const backup = manifest.backups.find((b) => b.id === backupId);

  if (!backup) {
    throw new Error(`Backup com ID ${backupId} não encontrado no catálogo.`);
  }

  if (!fs.existsSync(backup.filePath)) {
    throw new Error(`Arquivo físico do backup não encontrado no disco: ${backup.fileName}`);
  }

  // 1. Validação de integridade do arquivo via SHA-256
  const currentChecksum = computeFileSha256(backup.filePath);
  if (currentChecksum !== backup.checksumSha256) {
    throw new Error(
      `Falha na validação de integridade do backup! Checksum SHA-256 divergente (arquivo pode estar corrompido).`
    );
  }

  logger.info(`[RESTORE] Integridade SHA-256 verificada com sucesso para ${backup.fileName}`);

  // 2. Snapshot preventivo de segurança antes de restaurar
  const safetyBackup = await createSystemBackup({
    type: "FULL",
    isAutomatic: true,
    actorId: options?.actorId,
    notes: `Snapshot preventivo gerado antes da restauração do backup ${backupId}`,
  });

  logger.info(`[RESTORE] Snapshot preventivo criado: ${safetyBackup.id}`);

  // 3. Ler e descompactar o arquivo ZIP
  const zipBuffer = fs.readFileSync(backup.filePath);
  const zip = await JSZip.loadAsync(zipBuffer);

  const dumpFile = zip.file("database/dump.json");
  if (!dumpFile) {
    throw new Error("O arquivo de backup não contém dados relacionais válidos (database/dump.json ausente).");
  }

  const dumpContent = await dumpFile.async("string");
  const dump = JSON.parse(dumpContent);
  const data = dump.data;

  const restoredCounts: Record<string, number> = {};

  try {
    // 4. Restauração das tabelas em ordem relacional correta (com upsert)
    // A. Planos
    if (data.plans && Array.isArray(data.plans)) {
      for (const p of data.plans) {
        await prisma.plan.upsert({
          where: { slug: p.slug },
          update: p,
          create: p,
        });
      }
      restoredCounts.plans = data.plans.length;
    }

    // B. Usuários
    if (data.users && Array.isArray(data.users)) {
      for (const u of data.users) {
        await prisma.user.upsert({
          where: { email: u.email },
          update: {
            name: u.name,
            passwordHash: u.passwordHash,
            role: u.role,
            status: u.status,
            planId: u.planId,
            avatarUrl: u.avatarUrl,
          },
          create: u,
        });
      }
      restoredCounts.users = data.users.length;
    }

    // C. Configurações de Sistema & Regras
    if (data.systemSettings && Array.isArray(data.systemSettings)) {
      for (const s of data.systemSettings) {
        await prisma.systemSetting.upsert({
          where: { key: s.key },
          update: { value: s.value, category: s.category },
          create: s,
        });
      }
      restoredCounts.settings = data.systemSettings.length;
    }

    // D. Chaves de API
    if (data.apiKeys && Array.isArray(data.apiKeys)) {
      for (const k of data.apiKeys) {
        await prisma.apiKey.upsert({
          where: { id: k.id },
          update: k,
          create: k,
        });
      }
      restoredCounts.apiKeys = data.apiKeys.length;
    }

    // E. Conversas & Mensagens
    if (data.conversations && Array.isArray(data.conversations)) {
      for (const c of data.conversations) {
        await prisma.conversation.upsert({
          where: { id: c.id },
          update: {
            title: c.title,
            modelPreference: c.modelPreference,
            agentId: c.agentId,
          },
          create: c,
        });
      }
      restoredCounts.conversations = data.conversations.length;
    }

    if (data.messages && Array.isArray(data.messages)) {
      for (const m of data.messages) {
        await prisma.message.upsert({
          where: { id: m.id },
          update: {
            content: m.content,
            role: m.role,
            tokensIn: m.tokensIn,
            tokensOut: m.tokensOut,
          },
          create: m,
        });
      }
      restoredCounts.messages = data.messages.length;
    }

    // F. Arquivos do Workspace
    if (data.files && Array.isArray(data.files)) {
      for (const f of data.files) {
        await prisma.file.upsert({
          where: { id: f.id },
          update: {
            originalName: f.originalName,
            storedPath: f.storedPath,
            fileSizeBytes: f.fileSizeBytes,
            mimeType: f.mimeType,
            category: f.category,
            extractedText: f.extractedText,
            previewData: f.previewData,
          },
          create: f,
        });
      }
      restoredCounts.files = data.files.length;
    }

    // G. Memórias Inteligentes
    if (data.userMemories && Array.isArray(data.userMemories)) {
      for (const mem of data.userMemories) {
        await prisma.userMemory.upsert({
          where: { id: mem.id },
          update: mem,
          create: mem,
        });
      }
      restoredCounts.memories = data.userMemories.length;
    }

    // 5. Atualizar status do backup no manifesto
    backup.status = "RESTORED";
    backup.restoredAt = new Date().toISOString();
    saveManifest(manifest);

    const durationMs = Date.now() - startTime;

    // Registrar auditoria
    await logAuditEvent({
      actorId: options?.actorId || null,
      action: "BACKUP_RESTORED",
      resourceType: "SYSTEM",
      resourceId: backupId,
      details: {
        backupId,
        fileName: backup.fileName,
        preRestoreSafetyBackupId: safetyBackup.id,
        durationMs,
        restoredCounts,
      },
    });

    logger.info(`[RESTORE] Restauração concluída com sucesso em ${durationMs}ms`);

    return {
      success: true,
      backupId,
      preRestoreSafetyBackupId: safetyBackup.id,
      durationMs,
      restoredCounts,
    };
  } catch (err: any) {
    logger.error("[RESTORE] Erro crítico durante a restauração:", { error: String(err) });
    throw new Error(`Erro na restauração dos dados: ${err.message}`);
  }
}

/**
 * 3. LISTAGEM DO CATÁLOGO DE BACKUPS
 */
export function listBackupCatalog(): BackupManifestItem[] {
  const manifest = loadManifest();
  return manifest.backups;
}

/**
 * 4. EXCLUSÃO DE VERSÃO ESPECÍFICA DO HISTÓRICO
 */
export async function deleteBackupVersion(
  backupId: string,
  actorId?: string
): Promise<boolean> {
  const manifest = loadManifest();
  const index = manifest.backups.findIndex((b) => b.id === backupId);

  if (index === -1) {
    throw new Error(`Backup ${backupId} não encontrado.`);
  }

  const removed = manifest.backups[index];

  if (fs.existsSync(removed.filePath)) {
    try {
      fs.unlinkSync(removed.filePath);
    } catch (err) {
      logger.warn(`[BACKUP] Não foi possível remover arquivo ${removed.filePath}: ${err}`);
    }
  }

  manifest.backups.splice(index, 1);
  saveManifest(manifest);

  await logAuditEvent({
    actorId: actorId || null,
    action: "BACKUP_DELETED",
    resourceType: "SYSTEM",
    resourceId: backupId,
    details: { fileName: removed.fileName },
  });

  return true;
}

/**
 * 5. TELEMETRIA E ESTATÍSTICAS DE ARMAZENAMENTO DE BACKUP
 */
export function getBackupStorageStats(): {
  totalBackups: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  lastBackup: BackupManifestItem | null;
  healthy: boolean;
  retentionLimit: number;
} {
  const manifest = loadManifest();
  const totalBackups = manifest.backups.length;
  const totalSizeBytes = manifest.backups.reduce((acc, b) => acc + (b.fileSizeBytes || 0), 0);
  const lastBackup = manifest.backups[0] || null;

  return {
    totalBackups,
    totalSizeBytes,
    totalSizeFormatted: formatBytes(totalSizeBytes),
    lastBackup,
    healthy: true,
    retentionLimit: manifest.retentionLimit,
  };
}

/**
 * 6. LOGS DE AUDITORIA DE BACKUP
 */
export async function getBackupLogs(limit = 20) {
  return prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          "BACKUP_CREATED",
          "BACKUP_RESTORED",
          "BACKUP_DELETED",
          "BACKUP_RESTORE_FAILED",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

