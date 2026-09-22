const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

const ALGORITHM = "aes-256-gcm";
const masterKey = crypto.createHash("sha256").update(process.env.ENCRYPTION_MASTER_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef").digest();

function encryptKey(plainKey) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);
  let enc = cipher.update(plainKey.trim(), "utf8", "hex");
  enc += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return {
    cipherText: enc,
    iv: iv.toString("hex"),
    authTag: tag,
    keyHint: `...${plainKey.slice(-4)}`,
  };
}

async function main() {
  const baseUrl = "https://api.miraiapi.com/v1";

  // 1. Atualiza Provedores
  await prisma.aiProvider.updateMany({
    where: { slug: { in: ["openai", "anthropic"] } },
    data: { baseUrl },
  });

  // 2. Chaves novas do Mirai
  const codexPlain = "sk-lOlWI7nTnv6CtAWWrrerBHyhMLVJLF7z757tOPcN1t0OoD2r";
  const claudePlain = "sk-ise0qYxQ2uPRnb6vUaspA1I1JRauQCgLJDzSXRRmPXSweTcs";

  const encCodex = encryptKey(codexPlain);
  const encClaude = encryptKey(claudePlain);

  const openaiProvider = await prisma.aiProvider.findUnique({ where: { slug: "openai" } });
  const anthropicProvider = await prisma.aiProvider.findUnique({ where: { slug: "anthropic" } });

  // Limpa chaves antigas inválidas
  await prisma.apiKey.deleteMany();

  // Cadastra a chave Codex do Mirai
  await prisma.apiKey.create({
    data: {
      providerId: openaiProvider.id,
      name: "Mirai OpenAI / Codex (gpt-5.6-sol)",
      encryptedKey: encCodex.cipherText,
      iv: encCodex.iv,
      authTag: encCodex.authTag,
      keyHint: encCodex.keyHint,
      priority: 1,
      tokenLimitMonthly: 0,
      customBaseUrl: baseUrl,
      status: "ACTIVE",
      errorCount: 0,
      quarantinedUntil: null,
    },
  });

  // Cadastra a chave Claude do Mirai
  await prisma.apiKey.create({
    data: {
      providerId: anthropicProvider.id,
      name: "Mirai Anthropic Claude (claude-sonnet-5)",
      encryptedKey: encClaude.cipherText,
      iv: encClaude.iv,
      authTag: encClaude.authTag,
      keyHint: encClaude.keyHint,
      priority: 1,
      tokenLimitMonthly: 0,
      customBaseUrl: baseUrl,
      status: "ACTIVE",
      errorCount: 0,
      quarantinedUntil: null,
    },
  });

  console.log("✓ Chaves do Mirai API configuradas e ativadas com sucesso no banco!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

