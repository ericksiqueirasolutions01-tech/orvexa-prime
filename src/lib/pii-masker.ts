// src/lib/pii-masker.ts
// SANITIZADOR E MASCARADOR DE DADOS SENSÍVEIS (PII & CREDENCIAIS)
// Garante conformidade com LGPD/GDPR e impede vazamento acidental em logs e prompts

/**
 * Mascara dados sensíveis em uma string de texto
 */
export function maskPii(text: string): string {
  if (!text || typeof text !== "string") return text;

  let masked = text;

  // 1. Chaves de API e Tokens Secretos (OpenAI, GitHub, AWS, JWT)
  masked = masked.replace(
    /\b(sk-[a-zA-Z0-9_\-]{16,}|ghp_[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z\-_]{35}|eyJ[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]+)\b/g,
    (match) => `${match.slice(0, 5)}...[SEGREDO_PROTEGIDO]`
  );

  // 2. CPF (com ou sem pontuação: 123.456.789-00 ou 12345678900)
  masked = masked.replace(
    /\b(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})\b/g,
    "***.***.$3-**"
  );

  // 3. Cartões de Crédito (16 dígitos com ou sem espaços/hífens)
  masked = masked.replace(
    /\b(?:\d{4}[ -]?){3}(\d{4})\b/g,
    "****-****-****-$1"
  );

  // 4. E-mails (ex: usuario@empresa.com -> u***@empresa.com)
  masked = masked.replace(
    /\b([a-zA-Z0-9])[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    "$1***@$2"
  );

  // 5. Senhas em strings JSON ou queries (password="...", "passwordHash": "...")
  masked = masked.replace(
    /(["']?(?:password|senha|secret|token|hash)["']?\s*[:=]\s*["'])([^"']+)(["'])/gi,
    "$1[REDACTED]$3"
  );

  return masked;
}

/**
 * Higieniza recursivamente qualquer objeto ou payload antes de enviar para logs
 */
export function sanitizeLogPayload(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return maskPii(obj);
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeLogPayload(item));
  }

  const cleanObj: Record<string, any> = {};
  const sensitiveKeys = [
    "password",
    "passwordHash",
    "secret",
    "token",
    "apiKey",
    "authorization",
    "key",
    "cvv",
    "cardNumber",
  ];

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      cleanObj[key] = "[PROTEGIDO]";
    } else {
      cleanObj[key] = sanitizeLogPayload(value);
    }
  }

  return cleanObj;
}

