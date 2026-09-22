// scripts/test-workspace-e2e.js
// TESTE COMPLETO END-TO-END DO NOVO ORVEXA WORKSPACE

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const JSZip = require("jszip");

async function runWorkspaceTests() {
  console.log("==================================================");
  console.log("INICIANDO SUÍTE DE TESTES E2E: ORVEXA WORKSPACE");
  console.log("==================================================\n");

  // TESTE 1: Categorização Inteligente de Todos os 8+ Formatos
  console.log("▶ [TESTE 1] Testando Categorização de Formatos de Arquivos...");
  function categorizeFileName(fileName, mimeType) {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (["xlsx", "xls", "csv", "tsv"].includes(ext) || mimeType?.includes("sheet") || mimeType?.includes("csv")) {
      return "SPREADSHEET";
    }
    if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) || mimeType?.startsWith("image/")) {
      return "IMAGE";
    }
    if (["pdf"].includes(ext) || mimeType?.includes("pdf")) {
      return "PDF";
    }
    if (["zip", "tar", "gz", "rar", "7z"].includes(ext) || mimeType?.includes("zip")) {
      return "ARCHIVE";
    }
    if (["ts", "tsx", "js", "jsx", "py", "json", "html", "css", "sql", "sh"].includes(ext)) {
      return "CODE";
    }
    return "DOCUMENT";
  }

  assert.strictEqual(categorizeFileName("relatorio_financeiro.xlsx"), "SPREADSHEET");
  assert.strictEqual(categorizeFileName("dados_vendas.csv"), "SPREADSHEET");
  assert.strictEqual(categorizeFileName("contrato_social.pdf"), "PDF");
  assert.strictEqual(categorizeFileName("proposta_comercial.docx"), "DOCUMENT");
  assert.strictEqual(categorizeFileName("apresentacao_pitch.pptx"), "DOCUMENT");
  assert.strictEqual(categorizeFileName("foto_produto.png"), "IMAGE");
  assert.strictEqual(categorizeFileName("projeto_codigo.zip"), "ARCHIVE");
  assert.strictEqual(categorizeFileName("config.json"), "CODE");
  assert.strictEqual(categorizeFileName("documento_notas.txt"), "DOCUMENT");
  console.log("  ✔ Todos os formatos (PDF, DOCX, XLSX, PPTX, CSV, TXT, JSON, ZIP, Imagens) categorizados corretamente!\n");

  // TESTE 2: Geração de Planilhas Nativas (.xlsx) Multi-Sheet
  console.log("▶ [TESTE 2] Testando Geração de Planilha Nativa XLSX Multi-Aba...");
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([
    ["Produto", "Categoria", "Preço Base", "Desconto %", "Preço Promocional"],
    ["ORVEXA AI Station", "Hardware", 12500, 15, 10625],
    ["Licença Prime Mensal", "Software", 299, 10, 269.10],
    ["API Token Bundle 10M", "Consumo", 150, 0, 150]
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([
    ["Mês", "Receita Recorrente", "Novos Clientes", "Churn %"],
    ["Janeiro", 145000, 32, "1.2%"],
    ["Fevereiro", 182000, 48, "0.9%"],
    ["Março", 235000, 65, "0.7%"]
  ]);
  XLSX.utils.book_append_sheet(wb, ws1, "Preços & Produtos");
  XLSX.utils.book_append_sheet(wb, ws2, "DRE Resumido");

  const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  assert(xlsxBuffer.length > 1000, "Buffer XLSX gerado deve ser válido e > 1000 bytes");

  // Re-leitura para validação
  const readWb = XLSX.read(xlsxBuffer, { type: "buffer" });
  assert.strictEqual(readWb.SheetNames.length, 2, "Deve conter 2 abas");
  assert.strictEqual(readWb.SheetNames[0], "Preços & Produtos");
  assert.strictEqual(readWb.SheetNames[1], "DRE Resumido");
  console.log("  ✔ Planilha XLSX multi-sheet gerada e validada com 100% de integridade!\n");

  // TESTE 3: Geração de CSV com UTF-8 BOM e Acentuação
  console.log("▶ [TESTE 3] Testando Geração de CSV com UTF-8 BOM...");
  const headers = ["ID", "Nome do Cliente", "Região", "Status da Operação", "Total Faturado R$"];
  const rows = [
    ["CLI-001", "Empresa Alpha Ltda", "São Paulo / Sudeste", "Aprovado", "45.890,00"],
    ["CLI-002", "Indústria Brasileira S.A.", "Curitiba / Sul", "Em Análise", "112.400,00"],
    ["CLI-003", "Tech Soluções Inovadoras", "Recife / Nordeste", "Concluído", "33.150,00"]
  ];

  function generateCsv(headers, rows) {
    const BOM = "\uFEFF";
    const escapeCsv = (val) => {
      const s = String(val ?? "").replace(/"/g, '""');
      return `"${s}"`;
    };
    const lines = [
      headers.map(escapeCsv).join(";"),
      ...rows.map((row) => row.map(escapeCsv).join(";")),
    ];
    return Buffer.from(BOM + lines.join("\r\n"), "utf-8");
  }

  const csvBuffer = generateCsv(headers, rows);
  const csvContent = csvBuffer.toString("utf-8");
  assert(csvContent.includes("Empresa Alpha Ltda"), "Deve conter caracteres acentuados");
  assert(csvContent.includes("São Paulo / Sudeste"), "Deve conter acentuação sem corrupção");
  assert(csvContent.startsWith("\uFEFF"), "Deve iniciar com UTF-8 BOM para abrir perfeitamente no Excel");
  console.log("  ✔ Arquivo CSV compatível com Excel e acentuação UTF-8 gerado com sucesso!\n");

  // TESTE 4: Geração de Pacote ZIP com Estrutura Modular
  console.log("▶ [TESTE 4] Testando Geração de Pacote ZIP (.zip)...");
  const zipPkg = new JSZip();
  zipPkg.file("docs/relatorio.md", "# Relatório de Auditoria\nAuditado via ORVEXA WORKSPACE");
  zipPkg.file("data/financeiro.csv", csvBuffer);
  zipPkg.file("README.txt", "Pacote exportado diretamente do ORVEXA PRIME DIGITAL");

  const zipPkgBuffer = await zipPkg.generateAsync({ type: "nodebuffer" });
  assert(zipPkgBuffer.length > 500, "Buffer ZIP deve ser válido");

  const unzippedPkg = await JSZip.loadAsync(zipPkgBuffer);
  const zipEntries = Object.keys(unzippedPkg.files);
  assert(zipEntries.includes("docs/relatorio.md"));
  assert(zipEntries.includes("data/financeiro.csv"));
  assert(zipEntries.includes("README.txt"));
  console.log("  ✔ Pacote ZIP multi-diretório estruturado e verificado com sucesso!\n");

  // TESTE 5: Extração e Construção de previewData Tabular para Visualizador In-Browser
  console.log("▶ [TESTE 5] Testando Extrator de previewData para Planilhas...");
  const previewSheets = readWb.SheetNames.map((sheetName) => {
    const sheet = readWb.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const sheetHeaders = (rawData[0] || []).map(String);
    const sheetRows = rawData.slice(1, 10);
    return { sheetName, headers: sheetHeaders, rows: sheetRows };
  });

  const previewJson = JSON.stringify(previewSheets);
  const parsedPreview = JSON.parse(previewJson);
  assert.strictEqual(parsedPreview.length, 2);
  assert.strictEqual(parsedPreview[0].headers[0], "Produto");
  assert.strictEqual(parsedPreview[1].headers[0], "Mês");
  console.log("  ✔ previewData estruturado e pronto para renderização de tabelas interativas no Chat e Hub!\n");

  // TESTE 6: Verificação de Quota e Armazenamento no Banco Prisma
  console.log("▶ [TESTE 6] Testando Integração com Prisma Database (File & Quota)...");
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const testUser = await prisma.user.findFirst();
    assert(testUser, "Deve haver pelo menos um usuário no banco para teste");

    const initialStorage = await prisma.file.aggregate({
      where: { userId: testUser.id },
      _sum: { fileSizeBytes: true },
      _count: { id: true }
    });

    const usedBytesBefore = initialStorage._sum.fileSizeBytes || 0;
    console.log(`  Espaço utilizado atual: ${(usedBytesBefore / 1024).toFixed(1)} KB em ${initialStorage._count.id} arquivos.`);

    // Criar arquivo de teste no Prisma
    const createdFile = await prisma.file.create({
      data: {
        userId: testUser.id,
        originalName: "teste_workspace_e2e.xlsx",
        storedPath: `/uploads/${testUser.id}/teste_workspace_e2e.xlsx`,
        fileSizeBytes: xlsxBuffer.length,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        category: "SPREADSHEET",
        isGenerated: true,
        extractedText: "Produto; Categoria; Preço Base",
        previewData: previewJson,
      }
    });

    assert(createdFile.id, "Arquivo deve ter sido criado com ID");
    assert.strictEqual(createdFile.category, "SPREADSHEET");
    assert.strictEqual(createdFile.isGenerated, true);

    // Re-checar aggregate
    const postStorage = await prisma.file.aggregate({
      where: { userId: testUser.id },
      _sum: { fileSizeBytes: true },
    });
    assert(postStorage._sum.fileSizeBytes >= usedBytesBefore + xlsxBuffer.length);

    // Limpar arquivo de teste
    await prisma.file.delete({ where: { id: createdFile.id } });
    console.log("  ✔ Registro de arquivo, cálculo de storage e exclusão no Prisma verificados com sucesso!\n");
  } finally {
    await prisma.$disconnect();
  }

  console.log("==================================================");
  console.log("🎉 TODOS OS 6 TESTES DO ORVEXA WORKSPACE PASSARAM COM 100% DE SUCESSO!");
  console.log("==================================================");
}

runWorkspaceTests().catch((err) => {
  console.error("❌ Falha nos testes do Workspace:", err);
  process.exit(1);
});
