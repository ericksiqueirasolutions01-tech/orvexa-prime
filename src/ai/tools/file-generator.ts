// src/ai/tools/file-generator.ts
// MOTOR DE CRIAÇÃO E EXPORTAÇÃO DE ARQUIVOS — ORVEXA WORKSPACE

import * as XLSX from "xlsx";
import JSZip from "jszip";

export type WorkspaceFileCategory =
  | "DOCUMENT"
  | "SPREADSHEET"
  | "PRESENTATION"
  | "IMAGE"
  | "CODE"
  | "ARCHIVE";

/**
 * Classifica a extensão ou MIME type em categoria do Workspace
 */
export function categorizeFileName(fileName: string, mimeType?: string): WorkspaceFileCategory {
  const lower = fileName.toLowerCase();

  if (
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".csv") ||
    mimeType?.includes("spreadsheet") ||
    mimeType?.includes("csv")
  ) {
    return "SPREADSHEET";
  }

  if (
    lower.endsWith(".pptx") ||
    lower.endsWith(".ppt") ||
    mimeType?.includes("presentation")
  ) {
    return "PRESENTATION";
  }

  if (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".svg") ||
    lower.endsWith(".gif") ||
    mimeType?.includes("image")
  ) {
    return "IMAGE";
  }

  if (
    lower.endsWith(".zip") ||
    lower.endsWith(".tar") ||
    lower.endsWith(".gz") ||
    lower.endsWith(".rar") ||
    mimeType?.includes("zip") ||
    mimeType?.includes("compressed")
  ) {
    return "ARCHIVE";
  }

  if (
    lower.endsWith(".ts") ||
    lower.endsWith(".tsx") ||
    lower.endsWith(".js") ||
    lower.endsWith(".jsx") ||
    lower.endsWith(".py") ||
    lower.endsWith(".json") ||
    lower.endsWith(".sql") ||
    lower.endsWith(".html") ||
    lower.endsWith(".css")
  ) {
    return "CODE";
  }

  return "DOCUMENT";
}

/**
 * Cria buffer binário de planilha real XLSX
 */
export function generateSpreadsheetBuffer(params: {
  sheets: Array<{
    name: string;
    headers: string[];
    rows: any[][];
  }>;
}): Buffer {
  const wb = XLSX.utils.book_new();

  for (const sheet of params.sheets) {
    const data = [sheet.headers, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Ajusta largura de colunas automaticamente
    const colWidths = sheet.headers.map((h, colIdx) => {
      let maxLen = h.length;
      for (const row of sheet.rows) {
        const cell = row[colIdx];
        if (cell != null) {
          maxLen = Math.max(maxLen, String(cell).length);
        }
      }
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

/**
 * Cria buffer de arquivo CSV formatado
 */
export function generateCsvBuffer(params: {
  headers: string[];
  rows: any[][];
}): Buffer {
  const lines: string[] = [];
  lines.push(params.headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(","));

  for (const row of params.rows) {
    lines.push(
      row.map((c) => (c != null ? `"${String(c).replace(/"/g, '""')}"` : '""')).join(",")
    );
  }

  return Buffer.from("\uFEFF" + lines.join("\n"), "utf-8"); // Com BOM para Excel ler acentos
}

/**
 * Cria buffer de relatório ou documento textual estruturado
 */
export function generateDocumentBuffer(params: {
  title: string;
  subtitle?: string;
  content: string;
  format?: "md" | "txt" | "html";
}): Buffer {
  const { title, subtitle, content, format = "md" } = params;

  if (format === "html") {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #1e293b; }
    h1 { color: #0f172a; border-bottom: 2px solid #06b6d4; padding-bottom: 8px; }
    .subtitle { color: #64748b; font-size: 1.1em; margin-bottom: 24px; }
    .content { white-space: pre-wrap; }
    footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 0.85em; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ""}
  <div class="content">${content}</div>
  <footer>Gerado por ORVEXA WORKSPACE • ${new Date().toLocaleDateString("pt-BR")}</footer>
</body>
</html>`;
    return Buffer.from(html, "utf-8");
  }

  const header = `# ${title}
${subtitle ? `> ${subtitle}\n` : ""}
*Documento gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} via ORVEXA WORKSPACE*

---

${content}
`;
  return Buffer.from(header, "utf-8");
}

/**
 * Cria buffer de arquivo compactado ZIP
 */
export async function generateZipArchiveBuffer(params: {
  files: Array<{ path: string; content: string | Buffer }>;
}): Promise<Buffer> {
  const zip = new JSZip();

  for (const f of params.files) {
    zip.file(f.path, f.content);
  }

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
}

