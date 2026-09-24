// src/lib/serverless-sync.ts
// SINCRONIZADOR & GUARDIÃO DE PERSISTÊNCIA SERVERLESS — ORVEXA PRIME DIGITAL
// Garante que contas de API cadastradas persistam em ambientes serverless (Vercel)
// mesmo através de múltiplos containers efêmeros e reinicializações de lambdas.

import { prisma } from "./prisma";
import fs from "fs";
import path from "path";

const SYNC_COOKIE_NAME = "orvexa_ai_sync";
const LOCAL_FALLBACK_FILE = path.join("/tmp", "orvexa_synced_account.json");

export interface SerializedAccountPayload {
  id: string;
  provider: string;
  name: string;
  baseUrl: string | null;
  keyHint: string;
  encryptedKey: string;
  iv: string;
  authTag: string;
  modelsDetected: string[];
  capabilities: string[];
  quotaLimit: number;
  priority: number;
  status: string;
  createdAt: string;
}

function mapAccountToPayload(account: any): SerializedAccountPayload {
  let models: string[] = [];
  try {
    models = typeof account.modelsDetected === "string" 
      ? JSON.parse(account.modelsDetected) 
      : (typeof account.detectedModels === "string" ? JSON.parse(account.detectedModels) : (account.modelsDetected || []));
  } catch {}

  let caps: string[] = ["TEXTO"];
  try {
    caps = typeof account.capabilities === "string" 
      ? JSON.parse(account.capabilities) 
      : (account.capabilities || ["TEXTO"]);
  } catch {}

  return {
    id: account.id,
    provider: account.provider,
    name: account.name || account.accountName || "API AI Gateway",
    baseUrl: account.baseUrl || account.customBaseUrl || null,
    keyHint: account.keyHint || account.apiKeyMasked || "sk-...****",
    encryptedKey: account.encryptedApiKey || account.encryptedKey || "",
    iv: account.iv || "",
    authTag: account.authTag || "",
    modelsDetected: models,
    capabilities: caps,
    quotaLimit: Number(account.quotaLimit || account.totalQuota || 50000000),
    priority: Number(account.priority || 1),
    status: account.status || "ACTIVE",
    createdAt: account.createdAt ? new Date(account.createdAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Serializa a(s) conta(s) ativa(s) para formato seguro e cifrado para o cookie de sincronização
 */
export function serializeAccountToCookieValue(accountOrAccounts: any | any[]): string {
  try {
    if (!accountOrAccounts) return "";
    const items = Array.isArray(accountOrAccounts) ? accountOrAccounts : [accountOrAccounts];
    const payloads: SerializedAccountPayload[] = items.filter(Boolean).map(mapAccountToPayload);
    if (payloads.length === 0) return "";
    const json = JSON.stringify(payloads);
    return Buffer.from(json, "utf-8").toString("base64");
  } catch (err) {
    console.error("[ServerlessSync] Erro ao serializar conta:", err);
    return "";
  }
}

/**
 * Deserializa o cookie de sincronização
 */
export function deserializeAccountFromCookieValue(cookieValue: string): SerializedAccountPayload[] {
  try {
    if (!cookieValue || cookieValue.trim().length === 0) return [];
    const json = Buffer.from(cookieValue, "base64").toString("utf-8");
    const parsed = JSON.parse(json);
    if (!parsed) return [];
    if (Array.isArray(parsed)) {
      return parsed.filter((p) => p && p.provider && (p.encryptedKey || p.encryptedApiKey));
    }
    if (parsed.provider && (parsed.encryptedKey || parsed.encryptedApiKey)) {
      return [parsed];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Salva snapshot local em /tmp
 */
export function saveLocalDiskSnapshot(payload: SerializedAccountPayload | SerializedAccountPayload[] | any) {
  try {
    const list = Array.isArray(payload) ? payload : [payload];
    fs.writeFileSync(LOCAL_FALLBACK_FILE, JSON.stringify(list), "utf-8");
  } catch {}
}

/**
 * Remove snapshot local em /tmp
 */
export function removeLocalDiskSnapshot() {
  try {
    if (fs.existsSync(LOCAL_FALLBACK_FILE)) {
      fs.unlinkSync(LOCAL_FALLBACK_FILE);
    }
  } catch {}
}

/**
 * Restaura uma conta no banco de dados do container ativo
 */
async function restoreSingleAccount(payloadToRestore: SerializedAccountPayload): Promise<any> {
  const restoredAccount = await prisma.aiProviderAccount.upsert({
    where: { id: payloadToRestore.id },
    create: {
      id: payloadToRestore.id,
      provider: payloadToRestore.provider,
      name: payloadToRestore.name,
      accountName: payloadToRestore.name,
      baseUrl: payloadToRestore.baseUrl,
      customBaseUrl: payloadToRestore.baseUrl,
      encryptedApiKey: payloadToRestore.encryptedKey,
      encryptedKey: payloadToRestore.encryptedKey,
      iv: payloadToRestore.iv,
      authTag: payloadToRestore.authTag,
      keyHint: payloadToRestore.keyHint,
      apiKeyMasked: payloadToRestore.keyHint,
      modelsDetected: JSON.stringify(payloadToRestore.modelsDetected),
      detectedModels: JSON.stringify(payloadToRestore.modelsDetected),
      capabilities: JSON.stringify(payloadToRestore.capabilities),
      quotaLimit: payloadToRestore.quotaLimit,
      totalQuota: payloadToRestore.quotaLimit,
      tokensUsed: 0,
      usedQuota: 0,
      tokensRemaining: payloadToRestore.quotaLimit,
      remainingQuota: payloadToRestore.quotaLimit,
      status: "ACTIVE",
      priority: payloadToRestore.priority,
      lastSync: new Date(),
    },
    update: {
      status: "ACTIVE",
      baseUrl: payloadToRestore.baseUrl,
      customBaseUrl: payloadToRestore.baseUrl,
      modelsDetected: JSON.stringify(payloadToRestore.modelsDetected),
      capabilities: JSON.stringify(payloadToRestore.capabilities),
    },
  });

  // Sincroniza AiProvider
  let prov = await prisma.aiProvider.findUnique({ where: { slug: payloadToRestore.provider } });
  if (!prov) {
    prov = await prisma.aiProvider.create({
      data: {
        slug: payloadToRestore.provider,
        name: payloadToRestore.provider === "openai" ? "OpenAI Compatible" : payloadToRestore.provider.toUpperCase(),
        baseUrl: payloadToRestore.baseUrl,
        isActive: true,
      },
    });
  } else {
    await prisma.aiProvider.update({
      where: { id: prov.id },
      data: { isActive: true, baseUrl: payloadToRestore.baseUrl || prov.baseUrl },
    }).catch(() => {});
  }

  // Sincroniza ApiKey
  await prisma.apiKey.upsert({
    where: { id: payloadToRestore.id },
    create: {
      id: payloadToRestore.id,
      providerId: prov.id,
      name: payloadToRestore.name,
      encryptedKey: payloadToRestore.encryptedKey,
      iv: payloadToRestore.iv,
      authTag: payloadToRestore.authTag,
      keyHint: payloadToRestore.keyHint,
      tokenLimitMonthly: payloadToRestore.quotaLimit,
      customBaseUrl: payloadToRestore.baseUrl,
      capabilities: JSON.stringify(payloadToRestore.capabilities),
      status: "ACTIVE",
      priority: payloadToRestore.priority,
    },
    update: {
      status: "ACTIVE",
      customBaseUrl: payloadToRestore.baseUrl,
    },
  }).catch(() => {});

  // Upsert detected models in AiModel
  for (const mId of payloadToRestore.modelsDetected || []) {
    await prisma.aiModel.upsert({
      where: { modelIdentifier: mId },
      update: { isActive: true },
      create: {
        providerId: prov.id,
        modelIdentifier: mId,
        name: mId,
        category: "TEXT",
        capabilities: JSON.stringify(payloadToRestore.capabilities),
        isActive: true,
      },
    }).catch(() => {});
  }

  // Sincroniza SystemSetting se openai
  if (payloadToRestore.provider === "openai" && payloadToRestore.baseUrl) {
    await prisma.systemSetting.upsert({
      where: { key: "openai_base_url" },
      update: { value: payloadToRestore.baseUrl },
      create: { key: "openai_base_url", value: payloadToRestore.baseUrl, category: "AI" },
    }).catch(() => {});
  }

  return restoredAccount;
}

/**
 * Garante que as contas ativas estejam presentes na tabela oficial ai_provider_accounts do container ativo.
 * Se o container for recém-iniciado e o banco efêmero estiver vazio, restaura a partir do cookie ou snapshot.
 */
export async function ensureActiveAccountInDatabase(req?: Request): Promise<any | null> {
  try {
    // 1. Verifica se já existe conta ativa no banco deste container
    const existing = await prisma.aiProviderAccount.findFirst({
      where: { status: { in: ["ACTIVE", "CONNECTED"] } },
      orderBy: { updatedAt: "desc" },
    });

    if (existing) {
      return existing;
    }

    // 2. Se o banco está vazio, busca dados no cookie da requisição
    let payloadsToRestore: SerializedAccountPayload[] = [];

    if (req) {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(new RegExp(`(?:^|; )${SYNC_COOKIE_NAME}=([^;]*)`));
      if (match && match[1]) {
        payloadsToRestore = deserializeAccountFromCookieValue(decodeURIComponent(match[1]));
      }
    }

    // 3. Se não veio no cookie, tenta ler do snapshot em /tmp
    if (payloadsToRestore.length === 0 && fs.existsSync(LOCAL_FALLBACK_FILE)) {
      try {
        const fileContent = fs.readFileSync(LOCAL_FALLBACK_FILE, "utf-8");
        const parsed = JSON.parse(fileContent);
        if (Array.isArray(parsed)) {
          payloadsToRestore = parsed;
        } else if (parsed && parsed.provider) {
          payloadsToRestore = [parsed];
        }
      } catch {}
    }

    if (payloadsToRestore.length === 0) {
      return null;
    }

    // 4. Restaura todas as contas na tabela oficial ai_provider_accounts
    console.log(`[ServerlessSync] Restaurando ${payloadsToRestore.length} conta(s) no container ativo...`);
    let lastRestored: any = null;

    for (const item of payloadsToRestore) {
      lastRestored = await restoreSingleAccount(item);
    }

    saveLocalDiskSnapshot(payloadsToRestore);
    return lastRestored;
  } catch (err) {
    console.error("[ServerlessSync] Falha na recuperação de conta:", err);
    return null;
  }
}

export { SYNC_COOKIE_NAME };
