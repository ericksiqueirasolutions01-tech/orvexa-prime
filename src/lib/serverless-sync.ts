// src/lib/serverless-sync.ts
// SINCRONIZADOR & GUARDIÃO DE PERSISTÊNCIA SERVERLESS — ORVEXA PRIME DIGITAL
// Garante que contas de API cadastradas persistam em ambientes serverless (Vercel)
// mesmo através de múltiplos containers efêmeros e reinicializações de lambdas.

import { prisma } from "./prisma";
import fs from "fs";
import path from "path";

import os from "os";

const SYNC_COOKIE_NAME = "orvexa_ai_sync";
const LOCAL_FALLBACK_FILES = [
  path.join("/tmp", "orvexa_synced_account.json"),
  "C:\\tmp\\orvexa_synced_account.json",
  path.join(os.tmpdir(), "orvexa_synced_account.json"),
];

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
    name: account.name || account.accountName || "API Provedor",
    baseUrl: account.baseUrl || account.customBaseUrl || null,
    keyHint: account.keyHint || account.apiKeyMasked || "sk-...****",
    encryptedKey: account.encryptedApiKey || account.encryptedKey || "",
    iv: account.iv || "",
    authTag: account.authTag || "",
    modelsDetected: models,
    capabilities: caps,
    quotaLimit: Number(account.quotaLimit || account.totalQuota || 0),
    priority: Number(account.priority || 1),
    status: account.status || "ACTIVE",
    createdAt: account.createdAt ? new Date(account.createdAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Serializa a(s) conta(s) ativa(s) para formato seguro para cookie
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
 * Snapshot desativado para garantir ZERO autocriação
 */
export function saveLocalDiskSnapshot(_payload: any) {
  // Desativado: o banco oficial é a única fonte da verdade
}

/**
 * Remove qualquer snapshot residual em disco
 */
export function removeLocalDiskSnapshot() {
  for (const filePath of LOCAL_FALLBACK_FILES) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {}
  }
}

/**
 * Garante que nenhuma API seja criada automaticamente em requisições de leitura (GET/SELECT).
 * O banco oficial ai_provider_accounts é a ÚNICA fonte de verdade.
 */
export async function ensureActiveAccountInDatabase(_req?: Request): Promise<any | null> {
  // ZERO AUTOCRIAÇÃO: Nunca recriar ou restaurar contas automaticamente no banco.
  return null;
}

export { SYNC_COOKIE_NAME };

