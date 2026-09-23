// src/lib/security-validation.ts
// ORVEXA PRIME DIGITAL — MÓDULO DE VALIDAÇÃO E SANITIZAÇÃO DE ENTRADAS
// Proteção ativa contra Injeções, XSS, Path Traversal e Execução de Arquivos Maliciosos

import path from "path";

// Extensões explicitamente permitidas para upload e análise de arquivos
export const ALLOWED_FILE_EXTENSIONS = new Set([
  "pdf",
  "docx",
  "doc",
  "xlsx",
  "xls",
  "csv",
  "txt",
  "json",
  "md",
  "xml",
  "log",
  "zip",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "svg",
]);

// Extensões categoricamente bloqueadas por alto risco de execução remota de código
export const BLOCKED_FILE_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "sh",
  "bash",
  "php",
  "phtml",
  "vbs",
  "vbe",
  "ps1",
  "psm1",
  "msi",
  "dll",
  "so",
  "dylib",
  "jar",
  "jsp",
  "jspx",
  "asp",
  "aspx",
  "cgi",
  "py",
  "pyc",
  "js",
  "mjs",
  "cjs",
  "ts",
  "app",
  "com",
  "scr",
  "reg",
]);

// Tamanho máximo permitido por arquivo individual (25 MB)
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/**
 * Validação rigorosa de formato de e-mail (RFC 5322 simplificado)
 */
export function validateEmail(email: string): { valid: boolean; normalized?: string; reason?: string } {
  if (!email || typeof email !== "string") {
    return { valid: false, reason: "E-mail não informado ou formato inválido." };
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length > 254) {
    return { valid: false, reason: "E-mail excede o tamanho máximo permitido de 254 caracteres." };
  }

  // Regex estrito para validação de formato
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, reason: "Formato de e-mail inválido." };
  }

  return { valid: true, normalized: trimmed };
}

/**
 * Validação de requisitos de complexidade de senha
 */
export function validatePassword(password: string): { valid: boolean; reason?: string } {
  if (!password || typeof password !== "string") {
    return { valid: false, reason: "Senha não informada." };
  }

  if (password.length < 8) {
    return { valid: false, reason: "A senha deve conter no mínimo 8 caracteres." };
  }

  if (password.length > 128) {
    return { valid: false, reason: "A senha não pode exceder 128 caracteres." };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return { valid: false, reason: "A senha deve conter pelo menos uma letra e um número." };
  }

  return { valid: true };
}

/**
 * Sanitiza o nome do arquivo prevenindo Directory Traversal, caracteres de controle e nulos
 */
export function sanitizeFileName(rawFileName: string): string {
  if (!rawFileName || typeof rawFileName !== "string") {
    return `arquivo_${Date.now()}`;
  }

  // Remove caminhos e obtém apenas o nome base
  let clean = path.basename(rawFileName.trim());

  // Remove caracteres nulos (\0) e caracteres de controle
  clean = clean.replace(/[\x00-\x1f\x80-\x9f]/g, "");

  // Remove tentativas de directory traversal residuais
  clean = clean.replace(/\.\.+/g, ".");

  // Substitui caracteres especiais/inseguros por underline, mantendo alfanuméricos, ponto, traço e sublinhado
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Garante que o nome não fique vazio ou consista apenas em pontos
  if (!clean || clean.replace(/\./g, "").length === 0) {
    clean = `arquivo_${Date.now()}`;
  }

  // Trunca para no máximo 120 caracteres preservando extensão
  if (clean.length > 120) {
    const ext = path.extname(clean);
    const base = clean.slice(0, 120 - ext.length);
    clean = `${base}${ext}`;
  }

  return clean;
}

/**
 * Verifica se a extensão do arquivo é permitida e segura
 */
export function isAllowedFileExtension(fileName: string): { allowed: boolean; extension: string; reason?: string } {
  const ext = (path.extname(fileName) || "").replace(/^\./, "").toLowerCase();

  if (!ext) {
    return { allowed: false, extension: "", reason: "Arquivo sem extensão identificável." };
  }

  if (BLOCKED_FILE_EXTENSIONS.has(ext)) {
    return {
      allowed: false,
      extension: ext,
      reason: `Arquivos com extensão .${ext} são estritamente bloqueados por motivos de segurança.`,
    };
  }

  if (!ALLOWED_FILE_EXTENSIONS.has(ext)) {
    return {
      allowed: false,
      extension: ext,
      reason: `Extensão .${ext} não é suportada pela plataforma.`,
    };
  }

  return { allowed: true, extension: ext };
}

/**
 * Higienização de strings para prevenção de injeção XSS
 */
export function sanitizeHtmlText(input: string): string {
  if (!input || typeof input !== "string") return "";

  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}
