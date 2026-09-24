// src/components/chat/markdown-renderer.tsx
// RENDERIZADOR RICO DE MARKDOWN, CÓDIGO COM SYNTAX & TABELAS — ESTILO CHATGPT

"use client";

import React, { useState } from "react";
import { Check, Copy, ExternalLink, Code } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
  theme?: "light" | "dark";
}

export function MarkdownRenderer({
  content,
  isStreaming,
  theme = "light",
}: MarkdownRendererProps) {
  if (!content) return null;

  // Divide o conteúdo entre blocos de código (```) e blocos de texto/tabelas
  const blocks = splitCodeBlocks(content);

  const containerClasses =
    theme === "light"
      ? "max-w-none text-sm text-slate-800 leading-relaxed space-y-3 font-sans selection:bg-slate-900 selection:text-white"
      : "prose prose-invert max-w-none text-sm text-slate-100 leading-relaxed space-y-3 font-sans selection:bg-cyan-500/30";

  return (
    <div className={containerClasses}>
      {blocks.map((block, idx) => {
        if (block.type === "code") {
          return (
            <CodeBlockCard
              key={idx}
              language={block.language || "code"}
              code={block.content}
              theme={theme}
            />
          );
        }
        return <TextBlockRenderer key={idx} text={block.content} theme={theme} />;
      })}

      {isStreaming && (
        <span
          className={`inline-block w-2 h-4 ml-1 animate-pulse align-middle rounded-xs ${
            theme === "light" ? "bg-slate-800" : "bg-cyan-400 shadow-neon-cyan"
          }`}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BLOCO DE CÓDIGO COM BOTÃO COPIAR E CABEÇALHO ELEGANTE
// ---------------------------------------------------------------------------
function CodeBlockCard({
  language,
  code,
  theme = "light",
}: {
  language: string;
  code: string;
  theme?: "light" | "dark";
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanLang = language.trim().toLowerCase() || "código";

  return (
    <div className="my-3.5 rounded-xl overflow-hidden border border-slate-700/80 bg-[#0B0F19] shadow-md group">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono select-none">
        <span className="flex items-center gap-1.5 text-slate-300 font-semibold lowercase">
          <Code className="w-3.5 h-3.5 text-cyan-400" />
          {cleanLang}
        </span>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all border border-slate-700/60 active:scale-95"
          title="Copiar código para a área de transferência"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" />
              <span>Copiar código</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area with Syntax Scrolling */}
      <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed bg-[#060911]/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RENDERIZADOR DE TEXTO, CABEÇALHOS, TABELAS E LISTAS
// ---------------------------------------------------------------------------
function TextBlockRenderer({
  text,
  theme = "light",
}: {
  text: string;
  theme?: "light" | "dark";
}) {
  const paragraphs = text.split(/\n\s*\n/);
  const isLight = theme === "light";

  return (
    <>
      {paragraphs.map((para, pIdx) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        // 1. Tabela Markdown (| ... |)
        if (isMarkdownTable(trimmed)) {
          return <TableRenderer key={pIdx} tableMarkdown={trimmed} theme={theme} />;
        }

        // 2. Títulos
        if (trimmed.startsWith("### ")) {
          return (
            <h3
              key={pIdx}
              className={`text-base font-bold mt-4 mb-2 flex items-center gap-2 ${
                isLight ? "text-slate-900" : "text-white"
              }`}
            >
              {renderInlineStyles(trimmed.slice(4), isLight)}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2
              key={pIdx}
              className={`text-lg font-bold mt-5 mb-2.5 pb-1 border-b ${
                isLight
                  ? "text-slate-950 border-slate-200"
                  : "text-white border-slate-800/80"
              }`}
            >
              {renderInlineStyles(trimmed.slice(3), isLight)}
            </h2>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h1
              key={pIdx}
              className={`text-xl font-extrabold mt-6 mb-3 pb-1 border-b ${
                isLight
                  ? "text-slate-950 border-slate-200"
                  : "text-white border-slate-800"
              }`}
            >
              {renderInlineStyles(trimmed.slice(2), isLight)}
            </h1>
          );
        }

        // 3. Blockquote
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote
              key={pIdx}
              className={`my-3 pl-4 border-l-2 py-2 pr-3 rounded-r-lg italic text-xs leading-relaxed ${
                isLight
                  ? "border-slate-400 bg-slate-50 text-slate-700"
                  : "border-cyan-400 bg-cyan-950/20 text-slate-300"
              }`}
            >
              {renderInlineStyles(trimmed.replace(/^>\s*/gm, ""), isLight)}
            </blockquote>
          );
        }

        // 4. Listas (bullet ou numeradas)
        const lines = trimmed.split("\n");
        const isBulletList = lines.every((l) => /^\s*[-*•]\s+/.test(l));
        const isNumberedList = lines.every((l) => /^\s*\d+\.\s+/.test(l));

        if (isBulletList) {
          return (
            <ul key={pIdx} className="my-2 space-y-1.5 list-none pl-1">
              {lines.map((l, lIdx) => {
                const itemText = l.replace(/^\s*[-*•]\s+/, "");
                return (
                  <li
                    key={lIdx}
                    className={`flex items-start gap-2 ${
                      isLight ? "text-slate-800" : "text-slate-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                        isLight ? "bg-slate-700" : "bg-cyan-400 shadow-neon-cyan"
                      }`}
                    />
                    <span>{renderInlineStyles(itemText, isLight)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        if (isNumberedList) {
          return (
            <ol key={pIdx} className="my-2 space-y-1.5 list-none pl-1">
              {lines.map((l, lIdx) => {
                const match = l.match(/^\s*(\d+)\.\s+(.*)/);
                const num = match ? match[1] : `${lIdx + 1}`;
                const itemText = match ? match[2] : l;
                return (
                  <li
                    key={lIdx}
                    className={`flex items-start gap-2.5 ${
                      isLight ? "text-slate-800" : "text-slate-200"
                    }`}
                  >
                    <span
                      className={`font-mono text-xs font-bold shrink-0 mt-0.5 min-w-[1.2rem] ${
                        isLight ? "text-slate-900" : "text-cyan-400"
                      }`}
                    >
                      {num}.
                    </span>
                    <span>{renderInlineStyles(itemText, isLight)}</span>
                  </li>
                );
              })}
            </ol>
          );
        }

        // 5. Parágrafo padrão com linhas simples
        return (
          <p
            key={pIdx}
            className={`leading-relaxed break-words ${
              isLight ? "text-slate-800" : "text-slate-200"
            }`}
          >
            {lines.map((line, lineIdx) => (
              <React.Fragment key={lineIdx}>
                {renderInlineStyles(line, isLight)}
                {lineIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// RENDERIZADOR DE TABELA MARKDOWN
// ---------------------------------------------------------------------------
function TableRenderer({
  tableMarkdown,
  theme = "light",
}: {
  tableMarkdown: string;
  theme?: "light" | "dark";
}) {
  const isLight = theme === "light";
  const lines = tableMarkdown.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 2) return <p>{tableMarkdown}</p>;

  const headerLine = lines[0];
  const dataLines = lines.slice(2);

  const parseCells = (line: string) =>
    line
      .split("|")
      .map((c) => c.trim())
      .filter((c, i, a) => !(i === 0 && c === "") && !(i === a.length - 1 && c === ""));

  const headers = parseCells(headerLine);

  return (
    <div
      className={`my-4 overflow-x-auto rounded-xl border shadow-xs ${
        isLight
          ? "border-slate-200 bg-white"
          : "border-slate-800 bg-[#090D18]"
      }`}
    >
      <table className="w-full border-collapse text-left text-xs font-sans">
        <thead>
          <tr
            className={`border-b font-semibold ${
              isLight
                ? "bg-slate-50 border-slate-200 text-slate-900"
                : "bg-slate-900/90 border-slate-700/80 text-cyan-300"
            }`}
          >
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2.5 font-bold">
                {renderInlineStyles(h, isLight)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className={`divide-y ${
            isLight
              ? "divide-slate-100 text-slate-700"
              : "divide-slate-800/60 text-slate-300"
          }`}
        >
          {dataLines.map((rowLine, rIdx) => {
            const cells = parseCells(rowLine);
            return (
              <tr
                key={rIdx}
                className={
                  isLight
                    ? rIdx % 2 === 0
                      ? "bg-white"
                      : "bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
                    : rIdx % 2 === 0
                    ? "bg-transparent"
                    : "bg-slate-900/40 hover:bg-slate-800/40 transition-colors"
                }
              >
                {cells.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4 py-2.5 leading-normal">
                    {renderInlineStyles(cell, isLight)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FORMATAÇÃO DE ESTILOS INLINE (Negrito, Itálico, Código inline, Links, Imagens)
// ---------------------------------------------------------------------------
function renderInlineStyles(text: string, isLight: boolean = true): React.ReactNode {
  const imgRegex = /!\[(.*?)\]\((https?:\/\/.*?)\)/g;
  if (imgRegex.test(text)) {
    const parts = text.split(/(!\[.*?\]\(https?:\/\/.*?\))/g);
    return parts.map((part, idx) => {
      const match = part.match(/!\[(.*?)\]\((https?:\/\/.*?)\)/);
      if (match) {
        const [, alt, src] = match;
        return (
          <span
            key={idx}
            className="block my-2 rounded-xl overflow-hidden border border-slate-200 max-w-md shadow-md"
          >
            <img
              src={src}
              alt={alt || "Imagem gerada"}
              className="w-full h-auto object-cover max-h-80"
            />
            {alt && (
              <span className="block px-3 py-1 bg-slate-50 text-[11px] text-slate-500 font-mono border-t border-slate-200">
                {alt}
              </span>
            )}
          </span>
        );
      }
      return renderInlineFormatting(part, idx, isLight);
    });
  }

  return renderInlineFormatting(text, 0, isLight);
}

function renderInlineFormatting(
  str: string,
  keySeed: number,
  isLight: boolean = true
): React.ReactNode {
  const parts = str.split(/(`[^`]+`)/g);

  return parts.map((part, idx) => {
    const key = `${keySeed}-${idx}`;

    // Código Inline
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={key}
          className={`px-1.5 py-0.5 rounded font-mono text-[12px] font-medium ${
            isLight
              ? "bg-slate-100 border border-slate-200 text-slate-800"
              : "bg-slate-800 border border-slate-700 text-cyan-300"
          }`}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Links: [label](url)
    const linkParts = part.split(/(\[[^\]]+\]\(https?:\/\/[^\)]+\))/g);
    return linkParts.map((lPart, lIdx) => {
      const linkMatch = lPart.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
      if (linkMatch) {
        const [, label, url] = linkMatch;
        return (
          <a
            key={`${key}-${lIdx}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline underline-offset-2 inline-flex items-center gap-1 font-semibold transition-colors ${
              isLight
                ? "text-blue-600 hover:text-blue-800"
                : "text-cyan-400 hover:text-cyan-300"
            }`}
          >
            {label}
            <ExternalLink className="w-3 h-3 inline" />
          </a>
        );
      }

      // Negrito (**text**) e Itálico (*text*)
      return parseBoldItalic(lPart, `${key}-${lIdx}`, isLight);
    });
  });
}

function parseBoldItalic(
  text: string,
  keyPrefix: string,
  isLight: boolean = true
): React.ReactNode {
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  return boldParts.map((bPart, bIdx) => {
    const bKey = `${keyPrefix}-b-${bIdx}`;
    if (bPart.startsWith("**") && bPart.endsWith("**") && bPart.length > 4) {
      return (
        <strong
          key={bKey}
          className={`font-bold ${isLight ? "text-slate-950" : "text-white"}`}
        >
          {bPart.slice(2, -2)}
        </strong>
      );
    }

    const italicParts = bPart.split(/(\*[^*]+\*)/g);
    return italicParts.map((iPart, iIdx) => {
      const iKey = `${bKey}-i-${iIdx}`;
      if (iPart.startsWith("*") && iPart.endsWith("*") && iPart.length > 2) {
        return (
          <em
            key={iKey}
            className={`italic ${isLight ? "text-slate-600" : "text-slate-300"}`}
          >
            {iPart.slice(1, -1)}
          </em>
        );
      }
      return iPart;
    });
  });
}

// ---------------------------------------------------------------------------
// UTILITÁRIOS DE PARSING
// ---------------------------------------------------------------------------
interface MarkdownBlock {
  type: "text" | "code";
  language?: string;
  content: string;
}

function splitCodeBlocks(markdown: string): MarkdownBlock[] {
  const codeBlockRegex = /```([a-zA-Z0-9_\-\.\+]*)\n([\s\S]*?)```/g;
  const blocks: MarkdownBlock[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    const textBefore = markdown.slice(lastIndex, match.index);
    if (textBefore) {
      blocks.push({ type: "text", content: textBefore });
    }

    blocks.push({
      type: "code",
      language: match[1] || "text",
      content: match[2],
    });

    lastIndex = match.index + match[0].length;
  }

  const remaining = markdown.slice(lastIndex);
  if (remaining) {
    blocks.push({ type: "text", content: remaining });
  }

  return blocks;
}

function isMarkdownTable(text: string): boolean {
  const lines = text.split("\n").map((l) => l.trim());
  if (lines.length < 2) return false;
  return (
    lines[0].startsWith("|") &&
    lines[0].endsWith("|") &&
    lines[1].startsWith("|") &&
    lines[1].includes("-")
  );
}
