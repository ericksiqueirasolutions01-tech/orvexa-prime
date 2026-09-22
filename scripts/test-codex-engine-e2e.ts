// scripts/test-codex-engine-e2e.ts
// Teste E2E automatizado do ORVEXA CODEX ENGINE
// Valida todas as 7 linguagens, templates, sandbox, auditoria de segurança, auto-fix e ZIP

import assert from "node:assert";
import {
  CODEX_TEMPLATES,
  createCodexProject,
  parseProjectStructure,
  securityReview,
  explainCodeSnippet,
  autoFixCode,
  packageCodexZip,
} from "../src/ai/codex/engine.ts";
import { executeInSandbox } from "../src/ai/codex/sandbox.ts";

async function runTests() {
  console.log("==================================================");
  console.log("🚀 INICIANDO TESTE E2E DO ORVEXA CODEX ENGINE");
  console.log("==================================================\n");

  // 1. Validação de Templates
  console.log("TESTE 1: Catálogo de Templates (7 linguagens)");
  assert.strictEqual(CODEX_TEMPLATES.length, 7, "Devem existir 7 templates cadastrados");
  CODEX_TEMPLATES.forEach((t) => {
    console.log(`  ✓ Template '${t.name}' [${t.primaryLanguage.toUpperCase()}] com ${t.files.length} arquivos.`);
    assert(t.files.length > 0, `Template ${t.id} deve conter arquivos`);
  });
  console.log("✓ TESTE 1 PASSOU!\n");

  // 2. Instanciação e Estrutura de Projetos
  console.log("TESTE 2: Criação de Projeto e Leitura de Estrutura");
  const project = createCodexProject("nextjs-fullstack", "Orvexa-Enterprise-App");
  assert.strictEqual(project.name, "Orvexa-Enterprise-App");
  assert(project.files.length >= 3);

  const structure = parseProjectStructure(project.files);
  console.log(`  ✓ Estrutura analisada: ${structure.totalFiles} arquivos, ${structure.totalLines} linhas.`);
  assert(structure.totalFiles >= 3);
  assert(structure.totalLines > 50);
  console.log("✓ TESTE 2 PASSOU!\n");

  // 3. Execução em Sandbox (JavaScript)
  console.log("TESTE 3.1: Sandbox JavaScript");
  const jsCode = `
    const nums = [1, 2, 3, 4, 5];
    const sum = nums.reduce((acc, n) => acc + n, 0);
    console.log("Soma total:", sum);
    return sum * 2;
  `;
  const jsRes = await executeInSandbox({ code: jsCode, language: "javascript" });
  assert.strictEqual(jsRes.success, true);
  assert(jsRes.stdout.some((l) => l.includes("Soma total: 15")));
  console.log(`  ✓ JavaScript executou em ${jsRes.executionTimeMs}ms com saída: ${jsRes.stdout.join(" | ")}`);

  // 4. Execução em Sandbox (TypeScript com transpilação em tempo real)
  console.log("TESTE 3.2: Sandbox TypeScript");
  const tsCode = `
    interface UserProfile {
      id: number;
      name: string;
      role: "ADMIN" | "DEV";
    }
    const user: UserProfile = { id: 10, name: "ORVEXA Architect", role: "ADMIN" };
    console.log("Usuario autenticado:", user.name, "Cargo:", user.role);
  `;
  const tsRes = await executeInSandbox({ code: tsCode, language: "typescript" });
  assert.strictEqual(tsRes.success, true);
  assert(tsRes.stdout.some((l) => l.includes("ORVEXA Architect")));
  console.log(`  ✓ TypeScript transpilado e executado em ${tsRes.executionTimeMs}ms: ${tsRes.stdout.join(" | ")}`);

  // 5. Execução em Sandbox (SQL Relacional)
  console.log("TESTE 3.3: Sandbox SQL (Motor Relacional In-Memory)");
  const sqlCode = `
    CREATE TABLE products (id INT, name VARCHAR, price DECIMAL);
    INSERT INTO products VALUES (1, 'Orvexa Neural Chip', 4999.00);
    INSERT INTO products VALUES (2, 'Quantum Storage 10TB', 1250.50);
    SELECT * FROM products;
  `;
  const sqlRes = await executeInSandbox({ code: sqlCode, language: "sql" });
  assert.strictEqual(sqlRes.success, true);
  assert(sqlRes.tableData !== undefined);
  assert.strictEqual(sqlRes.tableData.rows.length, 2);
  console.log(`  ✓ SQL executado: ${sqlRes.tableData.rows.length} registros inseridos e consultados com sucesso.`);

  // 6. Execução em Sandbox (HTML & CSS Live Preview)
  console.log("TESTE 3.4: Sandbox HTML & CSS");
  const htmlCode = `<main class="hero"><h1>ORVEXA CODEX</h1><p>Motor de Software</p></main>`;
  const cssCode = `.hero { background: #000; color: #00f0ff; }`;
  const htmlRes = await executeInSandbox({ code: htmlCode, language: "html", cssCode });
  assert.strictEqual(htmlRes.success, true);
  assert(htmlRes.previewHtml?.includes("ORVEXA CODEX"));
  assert(htmlRes.previewHtml?.includes(".hero {"));
  console.log(`  ✓ HTML/CSS renderizado em iframe seguro (${htmlRes.previewHtml?.length} bytes).`);

  // 7. Execução em Sandbox (Python)
  console.log("TESTE 3.5: Sandbox Python");
  const pyCode = `
# Calculadora Financeira em Python
taxa = 0.15
valor = 1000
total = valor + (valor * taxa)
print(f"Total calculado com imposto: {total}")
for i in range(3):
    print("Iteracao:", i)
  `;
  const pyRes = await executeInSandbox({ code: pyCode, language: "python" });
  assert.strictEqual(pyRes.success, true);
  assert(pyRes.stdout.some((l) => l.includes("1150")));
  console.log(`  ✓ Python interpretado e executado com sucesso: ${pyRes.stdout.join(" | ")}`);

  // 8. Execução em Sandbox (C# .NET)
  console.log("TESTE 3.6: Sandbox C#");
  const csCode = `
using System;

namespace OrvexaApp
{
    public class Program
    {
        public static void Main(string[] args)
        {
            string engine = "ORVEXA CODEX C#";
            Console.WriteLine($"Iniciando motor de alta performance: {engine}");
        }
    }
}
  `;
  const csRes = await executeInSandbox({ code: csCode, language: "csharp" });
  assert.strictEqual(csRes.success, true);
  assert(csRes.stdout.some((l) => l.includes("ORVEXA CODEX C#")));
  console.log(`  ✓ C# compilado e executado em simulação Roslyn com sucesso: ${csRes.stdout[3]}`);
  console.log("✓ TESTE 3 PASSOU (TODAS AS 7 LINGUAGENS VALIDADAS NO SANDBOX)!\n");

  // 9. Auditoria Estática de Segurança
  console.log("TESTE 4: Auditoria de Segurança");
  const vulnerableCode = `
    const apiKey = "sk-live-99998888777766665555444433332222";
    const query = "SELECT * FROM users WHERE id = " + userId;
    element.innerHTML = userInput;
    eval(untrustedInput);
  `;
  const auditRes = securityReview(vulnerableCode, "javascript");
  console.log(`  ✓ Auditoria concluída: Score ${auditRes.score}/100, Status: ${auditRes.status}`);
  console.log(`  ✓ Vulnerabilidades detectadas: ${auditRes.issues.length}`);
  assert(auditRes.issues.length >= 3, "Deve detectar pelo menos 3 vulnerabilidades");
  assert.strictEqual(auditRes.status, "VULNERAVEL");

  const cleanCode = `
    const valid = true;
    console.log("Hello Secure World");
  `;
  const cleanAudit = securityReview(cleanCode, "javascript");
  assert.strictEqual(cleanAudit.score, 100);
  assert.strictEqual(cleanAudit.status, "APROVADO");
  console.log("✓ TESTE 4 PASSOU!\n");

  // 10. Auto-Correção de Código
  console.log("TESTE 5: Motor de Auto-Correção");
  const brokenCode = `
    const data = fetchData();
    const result = data.items.map(i => i.val);
  `;
  const fixRes = autoFixCode(brokenCode, "typescript", "TypeError: Cannot read properties of undefined");
  console.log(`  ✓ Auto-Correção gerada com confiança de ${fixRes.confidence}%`);
  console.log(`  ✓ Ajustes aplicados: ${fixRes.changesApplied.join(" | ")}`);
  assert(fixRes.changesApplied.length > 0);
  console.log("✓ TESTE 5 PASSOU!\n");

  // 11. Explicação de Código e Análise de Complexidade
  console.log("TESTE 6: Explicação de Código & Big-O");
  const algoCode = `
    function binarySearch(arr: number[], target: number): number {
      let left = 0;
      let right = arr.length - 1;
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (arr[mid] === target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
      }
      return -1;
    }
  `;
  const expl = explainCodeSnippet(algoCode, "typescript");
  console.log(`  ✓ Complexidade Temporal: ${expl.timeComplexity}`);
  console.log(`  ✓ Complexidade Espacial: ${expl.spaceComplexity}`);
  console.log(`  ✓ Passos da lógica: ${expl.stepByStep.length} etapas.`);
  assert(expl.stepByStep.length > 0);
  console.log("✓ TESTE 6 PASSOU!\n");

  // 12. Empacotamento de ZIP
  console.log("TESTE 7: Exportação e Empacotamento ZIP");
  const zipPkg = await packageCodexZip(project);
  console.log(`  ✓ ZIP gerado: ${zipPkg.zipFileName} (${zipPkg.sizeBytes} bytes) com ${zipPkg.filesList.length} arquivos.`);
  assert(zipPkg.sizeBytes > 100, "Buffer ZIP deve conter dados");
  assert.strictEqual(zipPkg.filesList.length, project.files.length);
  console.log("✓ TESTE 7 PASSOU!\n");

  console.log("==================================================");
  console.log("🎉 TODOS OS TESTES DO ORVEXA CODEX ENGINE PASSARAM!");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("❌ ERRO NO TESTE E2E:", err);
  process.exit(1);
});
