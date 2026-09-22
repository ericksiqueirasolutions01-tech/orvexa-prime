// src/app/api/workspace/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateSpreadsheetBuffer,
  generateCsvBuffer,
  generateDocumentBuffer,
  generateZipArchiveBuffer,
  categorizeFileName,
} from "@/ai/tools/file-generator";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const {
      type = "XLSX",
      title = "Novo Documento ORVEXA",
      prompt = "",
      conversationId = null,
      sourceFileId = null,
      customData = null,
    } = body;

    const sanitizedBase = title.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 40) || "documento";

    let generatedBuffer: Buffer;
    let fileName: string;
    let mimeType: string;
    let extractedText = "";
    let previewData: any = {};

    // 1. GERAÇÃO DE PLANILHA EXCEL (.XLSX)
    if (type === "XLSX") {
      fileName = `${sanitizedBase}.xlsx`;
      mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      let headers = customData?.headers || ["Item", "Categoria", "Quantidade", "Valor Unitário (R$)", "Total (R$)"];
      let rows = customData?.rows || [
        ["Licença ORVEXA Pro", "Software", 5, 299.9, 1499.5],
        ["Serviço de Nuvem AI", "Infraestrutura", 1, 850.0, 850.0],
        ["Consultoria Especializada", "Serviços", 10, 180.0, 1800.0],
        ["Suporte Dedicado 24/7", "Operações", 1, 450.0, 450.0],
        ["Auditoria de Modelos", "Compliance", 2, 600.0, 1200.0],
      ];

      if (prompt && !customData) {
        // Gera dados temáticos baseados no prompt do usuário
        if (prompt.toLowerCase().includes("venda") || prompt.toLowerCase().includes("comercial")) {
          headers = ["Data", "Cliente", "Produto / Serviço", "Canal", "Valor (R$)", "Status"];
          rows = [
            ["01/03/2026", "TechSolutions S.A.", "Assinatura Enterprise", "Inbound", 4500.0, "Pago"],
            ["03/03/2026", "EducaOnline Brasil", "Plano Prime Anual", "Parceria", 2800.0, "Pago"],
            ["05/03/2026", "Consultoria Delta", "API Gateway Pack", "Outbound", 1950.0, "Faturado"],
            ["08/03/2026", "Studio Criativo", "Image Studio Pack", "Web", 690.0, "Pago"],
            ["12/03/2026", "Venture Labs", "Licença Multi-IA", "Indicação", 3400.0, "Pago"],
          ];
        } else if (prompt.toLowerCase().includes("financeiro") || prompt.toLowerCase().includes("caixa")) {
          headers = ["Mês", "Receita Bruta (R$)", "Despesas Operacionais (R$)", "Lucro Líquido (R$)", "Margem (%)"];
          rows = [
            ["Janeiro", 48500.0, 18200.0, 30300.0, "62.5%"],
            ["Fevereiro", 54200.0, 19400.0, 34800.0, "64.2%"],
            ["Março", 62800.0, 21100.0, 41700.0, "66.4%"],
            ["Abril (Projeção)", 71000.0, 22500.0, 48500.0, "68.3%"],
          ];
        }
      }

      generatedBuffer = generateSpreadsheetBuffer({
        sheets: [
          {
            name: "Relatório Principal",
            headers,
            rows,
          },
        ],
      });

      extractedText = `Planilha gerada: "${title}". Contém ${rows.length} registros estruturados.`;
      previewData = {
        type: "SPREADSHEET",
        sheets: [
          {
            name: "Relatório Principal",
            headers,
            rows,
            totalRows: rows.length,
          },
        ],
      };
    }

    // 2. GERAÇÃO DE CSV (.CSV)
    else if (type === "CSV") {
      fileName = `${sanitizedBase}.csv`;
      mimeType = "text/csv; charset=utf-8";

      const headers = customData?.headers || ["ID", "Nome", "Email", "Segmento", "Data Cadastro"];
      const rows = customData?.rows || [
        [1, "Carlos Silva", "carlos.silva@empresa.com", "Tecnologia", "2026-01-15"],
        [2, "Mariana Costa", "m.costa@advocacia.com.br", "Jurídico", "2026-02-01"],
        [3, "Rafael Lima", "rafael@agenciagrowth.com", "Marketing", "2026-02-18"],
        [4, "Juliana Prado", "juliana@clinicaestetica.com", "Saúde", "2026-03-05"],
      ];

      generatedBuffer = generateCsvBuffer({ headers, rows });
      extractedText = `Arquivo CSV: "${title}" com ${rows.length} linhas.`;
      previewData = {
        type: "SPREADSHEET",
        sheets: [{ name: "CSV Data", headers, rows, totalRows: rows.length }],
      };
    }

    // 3. GERAÇÃO DE ARQUIVO ZIP (.ZIP)
    else if (type === "ZIP") {
      fileName = `${sanitizedBase}.zip`;
      mimeType = "application/zip";

      generatedBuffer = await generateZipArchiveBuffer({
        files: [
          {
            path: "README.md",
            content: `# ${title}\n\nGerado por ORVEXA WORKSPACE em ${new Date().toLocaleDateString("pt-BR")}.\n\n## Descrição\n${prompt || "Pacote de arquivos gerado automaticamente por Inteligência Artificial."}`,
          },
          {
            path: "manifest.json",
            content: JSON.stringify(
              {
                project: title,
                generatedAt: new Date().toISOString(),
                creator: "ORVEXA AI Core",
              },
              null,
              2
            ),
          },
          {
            path: "src/index.ts",
            content: `// Módulo gerado automaticamente via ORVEXA PRIME\nexport const info = { name: "${title}", status: "READY" };\nconsole.log("Módulo ativo:", info);\n`,
          },
        ],
      });

      extractedText = `Arquivo ZIP: "${title}". Pacote estruturado com código e manifesto.`;
      previewData = { type: "ARCHIVE", totalFiles: 3 };
    }

    // 4. GERAÇÃO DE RELATÓRIO EXECUTIVO (.MD / .TXT / .HTML)
    else {
      fileName = `${sanitizedBase}.md`;
      mimeType = "text/markdown; charset=utf-8";

      const reportContent = prompt
        ? `## Resumo Executivo\nEste documento foi compilado sob demanda com base no pedido: "${prompt}".\n\n### 1. Diagnóstico Geral\nTodos os parâmetros foram processados com conformidade corporativa e isolamento de segurança.\n\n### 2. Ações Recomendadas\n- Implementar monitoramento contínuo das métricas apresentadas.\n- Compartilhar com os membros da equipe para alinhamento estratégico.`
        : "Relatório Executivo gerado pela plataforma ORVEXA PRIME.";

      generatedBuffer = generateDocumentBuffer({
        title,
        subtitle: "Documento Oficial • ORVEXA WORKSPACE",
        content: reportContent,
        format: "md",
      });

      extractedText = generatedBuffer.toString("utf-8");
      previewData = { type: "TEXT", snippet: extractedText.slice(0, 3000) };
    }

    // Persiste no banco de dados como arquivo gerado
    const category = categorizeFileName(fileName, mimeType);
    const saved = await prisma.file.create({
      data: {
        userId: session.id,
        conversationId,
        originalName: fileName,
        storedPath: `/uploads/${session.id}/${Date.now()}-${fileName}`,
        fileSizeBytes: generatedBuffer.length,
        mimeType,
        category,
        isGenerated: true,
        previewData: JSON.stringify(previewData),
        extractedText,
      },
    });

    return NextResponse.json({
      success: true,
      file: {
        id: saved.id,
        name: saved.originalName,
        sizeBytes: saved.fileSizeBytes,
        mimeType: saved.mimeType,
        category: saved.category,
        isGenerated: true,
        downloadUrl: `/api/workspace/files/${saved.id}/download`,
        previewData,
        createdAt: saved.createdAt,
      },
    });
  } catch (error: any) {
    console.error("[Workspace Generate Error]", error);
    return NextResponse.json(
      { error: "Erro ao gerar arquivo no Workspace.", details: error?.message },
      { status: 500 }
    );
  }
}

