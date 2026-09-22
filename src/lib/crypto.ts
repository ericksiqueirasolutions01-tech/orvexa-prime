import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 12 bytes standard for GCM

function getMasterKey(): Buffer {
  const secret = process.env.ENCRYPTION_MASTER_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  // Guarantee exactly 32 bytes
  return crypto.createHash("sha256").update(secret).digest();
}

export interface EncryptedPayload {
  cipherText: string;
  iv: string;
  authTag: string;
  keyHint: string;
}

/**
 * Encrypts an API Key using AES-256-GCM.
 * Never stores plain keys in the database.
 */
export function encryptApiKey(plainKey: string): EncryptedPayload {
  if (!plainKey || plainKey.trim().length === 0) {
    throw new Error("Chave de API não pode estar vazia.");
  }

  const trimmed = plainKey.trim();
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);
  let encrypted = cipher.update(trimmed, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  // Key hint displays only the last 4 characters for safe display in UI
  const keyHint = trimmed.length > 4 ? `...${trimmed.slice(-4)}` : "...key";

  return {
    cipherText: encrypted,
    iv: iv.toString("hex"),
    authTag,
    keyHint,
  };
}

/**
 * Decrypts an API Key using AES-256-GCM with authentication tag validation.
 * Throws an error if data was tampered or master key does not match.
 */
export function decryptApiKey(cipherText: string, ivHex: string, authTagHex: string): string {
  const masterKey = getMasterKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

