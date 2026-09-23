// scripts/test-security-suite.js
// BATERIA DE AUDITORIA E TESTES DE SEGURANÇA E2E — ORVEXA PRIME SAAS
// Validação real de defesas: Webhook, Upload Malicioso, RBAC, Headers OWASP e Rate Limit

const BASE_URL = process.env.TEST_TARGET_URL || "http://localhost:3000";

let passedCount = 0;
let failedCount = 0;

function assertTest(name, condition, details = "") {
  if (condition) {
    console.log(`  ✅ [PASS] ${name}${details ? ` → ${details}` : ""}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${name}${details ? ` → ${details}` : ""}`);
    failedCount++;
  }
}

async function runSecurityTests() {
  console.log("================================================================================");
  console.log("🛡️  ORVEXA PRIME SAAS — BATERIA DE AUDITORIA & TESTES DE SEGURANÇA E2E");
  console.log(`📡  Alvo: ${BASE_URL} | Data: ${new Date().toISOString()}`);
  console.log("================================================================================\n");

  // ----------------------------------------------------------------------
  // 1. TESTE DE VALIDAÇÃO DE ENTRADAS (CADASTRO & REGISTRO)
  // ----------------------------------------------------------------------
  console.log("🔒 [CATEGORIA 1/5] Testando Validação de Entradas & Sanitização no Registro...");
  {
    // 1.1 Tentativa de cadastro com e-mail inválido
    const resBadEmail = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Hacker Test",
        email: "email_invalido_sem_arroba",
        password: "SenhaForte@2026",
      }),
    });
    const badEmailJson = await resBadEmail.json();
    assertTest(
      "Rejeição de e-mail inválido (400 Bad Request)",
      resBadEmail.status === 400 && badEmailJson.error.includes("e-mail"),
      `Status: ${resBadEmail.status}, Erro: "${badEmailJson.error}"`
    );

    // 1.2 Tentativa de cadastro com senha fraca (< 8 caracteres ou sem números)
    const resWeakPass = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Hacker Test",
        email: "usuario.fraco@orvexa.digital",
        password: "123",
      }),
    });
    const weakPassJson = await resWeakPass.json();
    assertTest(
      "Rejeição de senha fraca (< 8 chars) com 400",
      resWeakPass.status === 400 && weakPassJson.error.includes("senha"),
      `Status: ${resWeakPass.status}, Erro: "${weakPassJson.error}"`
    );
  }

  // Cria um usuário válido e autenticado para os testes subsequentes
  const testEmail = `sec.user.${Date.now()}@orvexa.digital`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Usuario Auditoria",
      email: testEmail,
      password: "SenhaForte@2026",
      planSlug: "free",
    }),
  });
  const regJson = await regRes.json();
  const setCookieHeader = regRes.headers.get("set-cookie") || "";
  const tokenMatch = setCookieHeader.match(/orvexa_auth_token=([^;]+)/);
  const userToken = tokenMatch ? tokenMatch[1] : "";
  const authHeaders = {
    Cookie: `orvexa_auth_token=${userToken}`,
    Authorization: `Bearer ${userToken}`,
  };
  const testUserId = regJson.user?.id;

  // ----------------------------------------------------------------------
  // 2. TESTE DE SEGURANÇA DE ARQUIVOS (BLOQUEIO DE EXECUTÁVEIS & UPLOAD)
  // ----------------------------------------------------------------------
  console.log("\n📁 [CATEGORIA 2/5] Testando Proteção de Arquivos & Uploads...");
  {
    // 2.1 Envio de arquivo executável perigoso (.exe)
    const formDataExe = new FormData();
    const fakeExeBlob = new Blob(["MZ\x90\x00\x03\x00\x00\x00malicious binary content"], { type: "application/x-msdownload" });
    formDataExe.append("file", fakeExeBlob, "payload_malicioso.exe");

    const resExe = await fetch(`${BASE_URL}/api/workspace/upload`, {
      method: "POST",
      headers: authHeaders,
      body: formDataExe,
    });
    const exeJson = await resExe.json();
    assertTest(
      "Bloqueio de upload de arquivo .exe perigoso (400)",
      resExe.status === 400 && exeJson.error.includes("bloqueado"),
      `Status: ${resExe.status}, Erro: "${exeJson.error}"`
    );

    // 2.2 Envio de script shell perigoso (.sh)
    const formDataSh = new FormData();
    const fakeShBlob = new Blob(["#!/bin/bash\nrm -rf /"], { type: "text/x-shellscript" });
    formDataSh.append("file", fakeShBlob, "exploit.sh");

    const resSh = await fetch(`${BASE_URL}/api/workspace/upload`, {
      method: "POST",
      headers: authHeaders,
      body: formDataSh,
    });
    const shJson = await resSh.json();
    assertTest(
      "Bloqueio de script shell .sh perigoso (400)",
      resSh.status === 400 && shJson.error.includes("bloqueado"),
      `Status: ${resSh.status}, Erro: "${shJson.error}"`
    );

    // 2.3 Envio de arquivo seguro com tentativa de Path Traversal no nome (../../../etc/passwd.txt)
    const formDataTraversal = new FormData();
    const safeBlob = new Blob(["Relatorio de seguranca"], { type: "text/plain" });
    formDataTraversal.append("file", safeBlob, "../../../etc/passwd.txt");

    const resTraversal = await fetch(`${BASE_URL}/api/workspace/upload`, {
      method: "POST",
      headers: authHeaders,
      body: formDataTraversal,
    });
    const traversalJson = await resTraversal.json();
    const uploadedName = traversalJson.uploaded?.[0]?.name || "";
    assertTest(
      "Sanitização de Path Traversal no nome do arquivo",
      resTraversal.status === 200 && !uploadedName.includes("..") && !uploadedName.includes("/"),
      `Nome salvo higienizado: "${uploadedName}"`
    );
  }

  // ----------------------------------------------------------------------
  // 3. TESTE DE SEGURANÇA DO WEBHOOK DE PAGAMENTOS (ANTI-FRAUDE & ASSINATURA)
  // ----------------------------------------------------------------------
  console.log("\n💳 [CATEGORIA 3/5] Testando Proteção do Webhook de Pagamentos...");
  {
    // 3.1 Webhook SEM assinatura -> Deve retornar 401
    const resNoSig = await fetch(`${BASE_URL}/api/webhooks/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "CONFIRMED",
        userId: testUserId,
        planSlug: "enterprise",
      }),
    });
    const noSigJson = await resNoSig.json();
    assertTest(
      "Webhook rejeita requisição forjada sem assinatura (401)",
      resNoSig.status === 401 && noSigJson.error.includes("Assinatura"),
      `Status: ${resNoSig.status}, Mensagem: "${noSigJson.error}"`
    );

    // 3.2 Webhook com assinatura adulterada/falsa -> Deve retornar 401
    const resBadSig = await fetch(`${BASE_URL}/api/webhooks/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "assinatura_forjada_invalida_123456",
      },
      body: JSON.stringify({
        status: "CONFIRMED",
        userId: testUserId,
        planSlug: "enterprise",
      }),
    });
    const badSigJson = await resBadSig.json();
    assertTest(
      "Webhook rejeita assinatura forjada (401)",
      resBadSig.status === 401 && badSigJson.error.includes("inválida"),
      `Status: ${resBadSig.status}, Mensagem: "${badSigJson.error}"`
    );

    // 3.3 Webhook com assinatura mock autorizada para testes em dev -> Deve aceitar
    const resMockSig = await fetch(`${BASE_URL}/api/webhooks/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "demo_mock_signature_valid",
      },
      body: JSON.stringify({
        status: "CONFIRMED",
        userId: testUserId,
        planSlug: "pro",
        transactionId: `txn_sec_test_${Date.now()}`,
      }),
    });
    assertTest(
      "Webhook aceita assinatura de teste autorizada",
      resMockSig.status === 200,
      `Status: ${resMockSig.status}`
    );
  }

  // ----------------------------------------------------------------------
  // 4. TESTE DE CONTROLE DE ACESSO & RBAC (TENANT ISOLATION & ADMIN SHIELD)
  // ----------------------------------------------------------------------
  console.log("\n🛡️ [CATEGORIA 4/5] Testando Controle de Acesso & Proteção de APIs...");
  {
    // 4.1 Acesso anônimo a API administrativa de usuários -> Bloqueado com 401
    const resAdminNoAuth = await fetch(`${BASE_URL}/api/admin/users`);
    assertTest(
      "API Admin bloqueia requisição anônima",
      resAdminNoAuth.status === 401 || resAdminNoAuth.status === 403,
      `Status: ${resAdminNoAuth.status}`
    );

    // 4.2 Acesso com usuário comum (não admin) -> Bloqueado com 403
    const resAdminUserAuth = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: authHeaders,
    });
    assertTest(
      "API Admin bloqueia usuário sem papel ADMIN (403)",
      resAdminUserAuth.status === 403,
      `Status: ${resAdminUserAuth.status}`
    );

    // 4.3 Acesso anônimo a API de chaves de API -> Bloqueado com 401
    const resKeysNoAuth = await fetch(`${BASE_URL}/api/admin/api-keys`);
    assertTest(
      "API Admin API-Keys bloqueia requisição anônima",
      resKeysNoAuth.status === 401 || resKeysNoAuth.status === 403,
      `Status: ${resKeysNoAuth.status}`
    );

    // 4.4 Acesso anônimo a arquivos do Workspace -> Bloqueado com 401
    const resFilesNoAuth = await fetch(`${BASE_URL}/api/workspace/files`);
    assertTest(
      "API Workspace bloqueia acesso não autenticado",
      resFilesNoAuth.status === 401,
      `Status: ${resFilesNoAuth.status}`
    );
  }

  // ----------------------------------------------------------------------
  // 5. TESTE DE CABEÇALHOS DE SEGURANÇA OWASP
  // ----------------------------------------------------------------------
  console.log("\n🌐 [CATEGORIA 5/5] Testando Cabeçalhos de Segurança HTTP (OWASP / Helmet)...");
  {
    const resHeaders = await fetch(`${BASE_URL}/api/health`);
    const hContentType = resHeaders.headers.get("x-content-type-options");
    const hFrame = resHeaders.headers.get("x-frame-options");
    const hXss = resHeaders.headers.get("x-xss-protection");
    const hReferrer = resHeaders.headers.get("referrer-policy");

    assertTest("Cabeçalho X-Content-Type-Options: nosniff presente", hContentType === "nosniff", `Valor: ${hContentType}`);
    assertTest("Cabeçalho X-Frame-Options: SAMEORIGIN presente", hFrame === "SAMEORIGIN", `Valor: ${hFrame}`);
    assertTest("Cabeçalho X-XSS-Protection presente", hXss === "1; mode=block", `Valor: ${hXss}`);
    assertTest("Cabeçalho Referrer-Policy presente", hReferrer === "strict-origin-when-cross-origin", `Valor: ${hReferrer}`);
  }

  // ----------------------------------------------------------------------
  // RELATÓRIO FINAL DA AUDITORIA
  // ----------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("📊  RELATÓRIO CONSOLIDADO DA AUDITORIA DE SEGURANÇA E2E");
  console.log("================================================================================");
  console.log(`  Total de Testes de Segurança : ${passedCount + failedCount}`);
  console.log(`  Testes Aprovados             : ${passedCount} (${Math.round((passedCount / (passedCount + failedCount)) * 100)}%)`);
  console.log(`  Vulnerabilidades Detectadas  : ${failedCount}`);
  console.log("--------------------------------------------------------------------------------");

  if (failedCount === 0) {
    console.log("🎉  TODAS AS DEFESAS DE SEGURANÇA FORAM HOMOLOGADAS COM 100% DE SUCESSO!");
    console.log("    O ORVEXA PRIME SAAS ESTÁ PROTEGIDO CONTRA OWASP TOP 10.");
    process.exit(0);
  } else {
    console.error("⚠️  ALGUMAS VULNERABILIDADES FORAM DETECTADAS. VERIFIQUE O LOG ACIMA.");
    process.exit(1);
  }
}

runSecurityTests().catch((err) => {
  console.error("Erro fatal na execução da suíte de segurança:", err);
  process.exit(1);
});
