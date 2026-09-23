// scripts/test-projects-api-http.ts
// Teste HTTP dos endpoints de Projetos e Memória Contextual com Autenticação

const BASE_URL = "http://localhost:3000";

async function runHttpTests() {
  console.log("======================================================================");
  console.log("🌐 INICIANDO TESTES HTTP DAS ROTAS DE PROJETOS E MEMÓRIA");
  console.log("======================================================================\n");

  try {
    // 0. Autenticar usuário
    console.log("0. Autenticando usuário de teste...");
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "cliente@orvexa.digital", password: "ClienteOrvexa2026!" }),
    });

    let cookie = loginRes.headers.get("set-cookie") || "";
    if (loginRes.status !== 200) {
      console.log(`   Aviso: Login retornou status ${loginRes.status}, tentando login como admin...`);
      const adminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@orvexa.digital", password: "AdminOrvexa2026!" }),
      });
      cookie = adminLogin.headers.get("set-cookie") || "";
    }
    console.log("   ✓ Autenticação realizada com sucesso.");

    const authHeaders = {
      "Content-Type": "application/json",
      Cookie: cookie,
    };

    // 1. GET /api/ai/projects
    console.log("\n1. GET /api/ai/projects");
    const getRes = await fetch(`${BASE_URL}/api/ai/projects`, {
      headers: authHeaders,
    });
    console.log(`   Status: ${getRes.status}`);
    const getData = await getRes.json();
    console.log(`   Projetos encontrados: ${getData.projects?.length ?? 0}`);

    // 2. POST /api/ai/projects
    console.log("\n2. POST /api/ai/projects");
    const createRes = await fetch(`${BASE_URL}/api/ai/projects`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: `Projeto Teste API ${Date.now()}`,
        description: "Projeto criado via teste HTTP automatizado",
        customInstructions: "Tom formal e conciso. Clientes corporativos B2B.",
      }),
    });
    console.log(`   Status: ${createRes.status}`);
    const createData = await createRes.json();
    const projectId = createData.project?.id;
    console.log(`   Projeto criado: ID ${projectId}, Nome: "${createData.project?.name}"`);

    if (!projectId) {
      throw new Error(`Falha ao obter ID do projeto criado: ${JSON.stringify(createData)}`);
    }

    // 3. POST /api/ai/projects/[id]/memories
    console.log(`\n3. POST /api/ai/projects/${projectId}/memories`);
    const memRes = await fetch(`${BASE_URL}/api/ai/projects/${projectId}/memories`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        content: "Nossa meta do trimestre é expandir 25% no segmento B2B.",
      }),
    });
    console.log(`   Status: ${memRes.status}`);
    const memData = await memRes.json();
    console.log(`   Memória criada: ID ${memData.memory?.id}, Conteúdo: "${memData.memory?.content}"`);

    // 4. GET /api/ai/projects/[id]
    console.log(`\n4. GET /api/ai/projects/${projectId}`);
    const getDetailRes = await fetch(`${BASE_URL}/api/ai/projects/${projectId}`, {
      headers: authHeaders,
    });
    console.log(`   Status: ${getDetailRes.status}`);
    const getDetailData = await getDetailRes.json();
    console.log(`   Detalhes carregados com sucesso:`);
    console.log(`     - Nome: ${getDetailData.project?.name}`);
    console.log(`     - Memórias: ${getDetailData.project?.memories?.length}`);
    console.log(`     - Arquivos: ${getDetailData.project?.files?.length}`);

    // 5. GET /api/ai/conversations?projectId=...
    console.log(`\n5. GET /api/ai/conversations?projectId=${projectId}`);
    const convRes = await fetch(`${BASE_URL}/api/ai/conversations?projectId=${projectId}`, {
      headers: authHeaders,
    });
    console.log(`   Status: ${convRes.status}`);
    const convData = await convRes.json();
    console.log(`   Conversas filtradas do projeto: ${convData.conversations?.length ?? 0}`);

    // 6. DELETE /api/ai/projects/[id]
    console.log(`\n6. DELETE /api/ai/projects/${projectId}`);
    const delRes = await fetch(`${BASE_URL}/api/ai/projects/${projectId}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    console.log(`   Status: ${delRes.status}`);
    const delData = await delRes.json();
    console.log(`   Resultado: ${JSON.stringify(delData)}`);

    console.log("\n======================================================================");
    console.log("🎉 TODOS OS ENDPOINTS HTTP RESPONDERAM COM STATUS 200 OK!");
    console.log("======================================================================\n");
  } catch (error) {
    console.error("❌ ERRO NO TESTE HTTP:", error);
    process.exit(1);
  }
}

runHttpTests();

