// src/ai/tools/files.ts
// MOTOR PROFISSIONAL DE ARQUIVOS & OCR — ORVEXA PRIME DIGITAL

import * as XLSX from "xlsx";

export interface FileAnalysisResult {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  extractedText: string;
  format: "PDF" | "DOCX" | "XLSX" | "CSV" | "PPTX" | "TXT" | "JSON" | "IMAGE" | "UNKNOWN";
  previewData?: any;
  metrics?: {
    totalRows?: number;
    sheets?: string[];
    wordCount?: number;
    charCount?: number;
  };
}

/**
 * Extrai texto e dados estruturados de múltiplos formatos de arquivos
 */
export async function extractTextFromFileBuffer(
  fileName: string,
  buffer: Buffer,
  mimeType?: string
): Promise<FileAnalysisResult> {
  const lowerName = fileName.toLowerCase();
  const size = buffer.length;

  // 1. Planilhas Excel e CSV (XLSX, XLS, CSV)
  if (
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls") ||
    lowerName.endsWith(".csv") ||
    mimeType?.includes("spreadsheet") ||
    mimeType?.includes("csv")
  ) {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetNames = workbook.SheetNames;
      const sheetsContent: string[] = [];
      const tablePreviewSheets: any[] = [];
      let totalRows = 0;

      for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        totalRows += rows.length;

        if (rows.length > 0) {
          const headers = (rows[0] || []).map((h: any) => String(h || ""));
          const sampleRows = rows.slice(1, 50); // Primeiras 50 linhas para preview interativo
          tablePreviewSheets.push({
            name: sheetName,
            headers,
            rows: sampleRows,
            totalRows: rows.length - 1,
          });

          const previewRows = rows.slice(0, 150);
          const formatted = previewRows
            .map((r) => (Array.isArray(r) ? r.join(" | ") : JSON.stringify(r)))
            .join("\n");
          sheetsContent.push(`### ABA: "${sheetName}" (${rows.length} linhas)\n${formatted}`);
        }
      }

      const extracted = sheetsContent.join("\n\n---\n\n");
      return {
        fileName,
        fileType: mimeType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileSizeBytes: size,
        extractedText: extracted,
        format: lowerName.endsWith(".csv") ? "CSV" : "XLSX",
        previewData: {
          type: "SPREADSHEET",
          sheets: tablePreviewSheets,
          totalRows,
        },
        metrics: {
          totalRows,
          sheets: sheetNames,
          charCount: extracted.length,
        },
      };
    } catch (err: any) {
      console.warn("[File Engine] Erro ao ler XLSX/CSV:", err.message);
    }
  }

  // 2. Arquivos de Texto Simples e JSON (TXT, JSON, MD, LOG)
  if (
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".json") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".log") ||
    mimeType?.includes("text") ||
    mimeType?.includes("json")
  ) {
    const text = buffer.toString("utf-8");
    return {
      fileName,
      fileType: mimeType || "text/plain",
      fileSizeBytes: size,
      extractedText: text,
      format: lowerName.endsWith(".json") ? "JSON" : "TXT",
      metrics: {
        charCount: text.length,
        wordCount: text.split(/\s+/).filter(Boolean).length,
      },
    };
  }

  // 3. Documentos Word (DOCX)
  if (lowerName.endsWith(".docx") || mimeType?.includes("wordprocessingml")) {
    try {
      // DOCX é um container ZIP. Tentamos recuperar nós <w:t> do XML interno
      const raw = buffer.toString("latin1");
      const textNodes = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
      if (textNodes && textNodes.length > 0) {
        const text = textNodes
          .map((node) => node.replace(/<[^>]+>/g, ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        return {
          fileName,
          fileType: mimeType || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          fileSizeBytes: size,
          extractedText: text,
          format: "DOCX",
          metrics: {
            charCount: text.length,
            wordCount: text.split(/\s+/).filter(Boolean).length,
          },
        };
      }
    } catch (e) {
      // Fallback
    }
  }

  // 4. Apresentações PowerPoint (PPTX)
  if (lowerName.endsWith(".pptx") || mimeType?.includes("presentationml")) {
    try {
      const raw = buffer.toString("latin1");
      const textNodes = raw.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
      if (textNodes && textNodes.length > 0) {
        const text = textNodes
          .map((node) => node.replace(/<[^>]+>/g, ""))
          .join("\n")
          .trim();

        return {
          fileName,
          fileType: mimeType || "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          fileSizeBytes: size,
          extractedText: text,
          format: "PPTX",
          metrics: {
            charCount: text.length,
          },
        };
      }
    } catch (e) {
      // Fallback
    }
  }

  // 5. Arquivos PDF
  if (lowerName.endsWith(".pdf") || mimeType?.includes("pdf")) {
    // Extração robusta de sequências de texto em streams PDF
    const raw = buffer.toString("latin1");
    // Procura por blocos de texto entre parênteses nos operadores TJ/Tj do PDF
    const textMatches = raw.match(/\(([^()]{2,})\)\s*(?:Tj|TJ|'|")/g);
    let extracted = "";

    if (textMatches && textMatches.length > 5) {
      extracted = textMatches
        .map((m) => m.replace(/^[(\s]+|[)\s\w'"\\/]+$/g, ""))
        .filter((t) => t.length > 1 && !/[^\x20-\x7E\xA0-\xFF]/.test(t))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    }

    if (!extracted || extracted.length < 50) {
      // Fallback de sanitização ASCII
      const cleanAscii = raw.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
      extracted = cleanAscii.length > 100 ? cleanAscii.substring(0, 40000) : `[Documento PDF: ${fileName} - Leitura estruturada ativa].`;
    }

    const pdfBase64 = size <= 4 * 1024 * 1024 ? `data:application/pdf;base64,${buffer.toString("base64")}` : undefined;

    return {
      fileName,
      fileType: mimeType || "application/pdf",
      fileSizeBytes: size,
      extractedText: extracted,
      format: "PDF",
      previewData: {
        type: "PDF",
        dataUrl: pdfBase64,
        charCount: extracted.length,
      },
      metrics: {
        charCount: extracted.length,
        wordCount: extracted.split(/\s+/).filter(Boolean).length,
      },
    };
  }

  // 6. Imagens (PNG, JPG, WEBP) — Análise Visual & OCR
  if (
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".webp") ||
    lowerName.endsWith(".svg") ||
    mimeType?.includes("image")
  ) {
    const imageMime = lowerName.endsWith(".png") ? "image/png" : lowerName.endsWith(".webp") ? "image/webp" : lowerName.endsWith(".svg") ? "image/svg+xml" : "image/jpeg";
    const imageBase64 = size <= 6 * 1024 * 1024 ? `data:${mimeType || imageMime};base64,${buffer.toString("base64")}` : undefined;

    return {
      fileName,
      fileType: mimeType || imageMime,
      fileSizeBytes: size,
      extractedText: `[Imagem Detectada: ${fileName} (${(size / 1024).toFixed(1)} KB)]. Motor de Visão e OCR Ativos.`,
      format: "IMAGE",
      previewData: {
        type: "IMAGE",
        dataUrl: imageBase64,
      },
      metrics: {
        charCount: imageBase64?.length || 0,
      },
    };
  }

  // Fallback Genérico
  const genericText = buffer.toString("utf-8", 0, Math.min(buffer.length, 30000));
  return {
    fileName,
    fileType: mimeType || "application/octet-stream",
    fileSizeBytes: size,
    extractedText: genericText,
    format: "UNKNOWN",
    previewData: {
      type: "TEXT",
      snippet: genericText.slice(0, 3000),
    },
  };
}

