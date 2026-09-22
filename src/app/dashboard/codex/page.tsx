// src/app/dashboard/codex/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Code2,
  Play,
  ShieldCheck,
  ShieldAlert,
  Wand2,
  HelpCircle,
  Download,
  Plus,
  Trash2,
  Folder,
  FolderOpen,
  FileCode,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Layers,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Cpu,
  Database,
  Globe,
  FileType,
  Flame,
} from "lucide-react";
import {
  CODEX_TEMPLATES,
  CodexProject,
  CodexFile,
  SupportedLanguage,
  SecurityAuditResult,
  CodeExplanationResult,
  AutoFixResult,
  createCodexProject,
  parseProjectStructure,
} from "@/ai/codex/engine";
import { ExecutionResult } from "@/ai/codex/sandbox";

export default function CodexDashboardPage() {
  // Estado do projeto
  const [project, setProject] = useState<CodexProject>(() =>
    createCodexProject("nextjs-fullstack", "Orvexa-Next-Fullstack")
  );
  const [activeFilePath, setActiveFilePath] = useState<string>("src/app/page.tsx");
  const [openTabs, setOpenTabs] = useState<string[]>([
    "src/app/page.tsx",
    "src/app/api/hello/route.ts",
    "package.json",
  ]);

  // Modais e templates
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileLang, setNewFileLang] = useState<SupportedLanguage>("typescript");
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("nextjs-fullstack");

  // Painéis inferiores e estado de ferramentas
  const [activeBottomTab, setActiveBottomTab] = useState<
    "terminal" | "preview" | "security" | "explanation" | "autofix"
  >("terminal");

  // Estados de execução e IA
  const [isExecuting, setIsExecuting] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Resultados
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [securityResult, setSecurityResult] = useState<SecurityAuditResult | null>(null);
  const [explanationResult, setExplanationResult] = useState<CodeExplanationResult | null>(null);
  const [autoFixResult, setAutoFixResult] = useState<AutoFixResult | null>(null);

  // Editor ref
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Arquivo ativo atual
  const activeFile = project.files.find((f) => f.path === activeFilePath) || project.files[0];

  // Cálculo da estrutura do projeto
  const structure = parseProjectStructure(project.files);

  // Atualização de conteúdo de arquivo
  const handleContentChange = (newContent: string) => {
    if (!activeFile) return;
    setProject((prev) => ({
      ...prev,
      files: prev.files.map((f) =>
        f.path === activeFile.path ? { ...f, content: newContent, isModified: true } : f
      ),
    }));
  };

  // Suporte a indentação com TAB no textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const currentValue = target.value;
      const updatedValue =
        currentValue.substring(0, start) + "  " + currentValue.substring(end);

      handleContentChange(updatedValue);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // Abrir ou focar aba
  const handleSelectFile = (path: string) => {
    if (!openTabs.includes(path)) {
      setOpenTabs((prev) => [...prev, path]);
    }
    setActiveFilePath(path);
  };

  // Fechar aba
  const handleCloseTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = openTabs.filter((t) => t !== path);
    setOpenTabs(remaining);
    if (activeFilePath === path) {
      if (remaining.length > 0) {
        setActiveFilePath(remaining[remaining.length - 1]);
      } else if (project.files.length > 0) {
        setActiveFilePath(project.files[0].path);
        setOpenTabs([project.files[0].path]);
      }
    }
  };

  // Criar novo arquivo
  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    const cleanPath = newFileName.trim().replace(/^\/+/, "");
    if (project.files.some((f) => f.path === cleanPath)) {
      alert("Arquivo com esse nome já existe.");
      return;
    }

    const newFile: CodexFile = {
      path: cleanPath,
      language: newFileLang,
      content: `// ${cleanPath}\n// Criado via ORVEXA CODEX ENGINE\n`,
      isModified: true,
    };

    setProject((prev) => ({
      ...prev,
      files: [...prev.files, newFile],
    }));
    setOpenTabs((prev) => [...prev, cleanPath]);
    setActiveFilePath(cleanPath);
    setNewFileName("");
    setIsNewFileModalOpen(false);
  };

  // Excluir arquivo
  const handleDeleteFile = (path: string) => {
    if (project.files.length <= 1) {
      alert("O projeto deve conter pelo menos um arquivo.");
      return;
    }
    if (!confirm(`Tem certeza que deseja excluir '${path}'?`)) return;

    setProject((prev) => ({
      ...prev,
      files: prev.files.filter((f) => f.path !== path),
    }));
    const remaining = openTabs.filter((t) => t !== path);
    setOpenTabs(remaining);
    if (activeFilePath === path) {
      setActiveFilePath(project.files.find((f) => f.path !== path)?.path || "");
    }
  };

  // Criar projeto a partir de template
  const handleLoadTemplate = () => {
    const tmpl = CODEX_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (!tmpl) return;

    const newProj = createCodexProject(
      tmpl.id,
      newProjectName.trim() || tmpl.name.replace(/\s+/g, "-")
    );
    setProject(newProj);
    setActiveFilePath(newProj.files[0]?.path || "");
    setOpenTabs(newProj.files.slice(0, 3).map((f) => f.path));
    setIsTemplateModalOpen(false);
    setNewProjectName("");
    setExecutionResult(null);
    setSecurityResult(null);
    setExplanationResult(null);
    setAutoFixResult(null);
  };

  // 1. Executar código no Sandbox
  const handleExecute = async () => {
    if (!activeFile) return;
    setIsExecuting(true);
    setActiveBottomTab("terminal");

    try {
      // Se for HTML, tenta localizar folha CSS correspondente no projeto
      let cssCode = "";
      if (activeFile.language === "html") {
        const cssFile = project.files.find((f) => f.language === "css");
        if (cssFile) cssCode = cssFile.content;
      }

      const res = await fetch("/api/ai/codex/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activeFile.content,
          language: activeFile.language,
          cssCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na execução.");

      setExecutionResult(data);
      if (activeFile.language === "html" || activeFile.language === "css") {
        setActiveBottomTab("preview");
      }
    } catch (err: any) {
      setExecutionResult({
        language: activeFile.language,
        success: false,
        stdout: [],
        stderr: [err.message || "Erro desconhecido ao executar sandbox."],
        executionTimeMs: 0,
        status: "ERROR",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // 2. Revisão de Segurança
  const handleSecurityReview = async () => {
    if (!activeFile) return;
    setIsAuditing(true);
    setActiveBottomTab("security");

    try {
      const res = await fetch("/api/ai/codex/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activeFile.content,
          language: activeFile.language,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na auditoria.");
      setSecurityResult(data);
    } catch (err: any) {
      alert("Erro ao auditar segurança: " + err.message);
    } finally {
      setIsAuditing(false);
    }
  };

  // 3. Explicação de Código (Big-O & Arquitetura)
  const handleExplainCode = async () => {
    if (!activeFile) return;
    setIsExplaining(true);
    setActiveBottomTab("explanation");

    try {
      const res = await fetch("/api/ai/codex/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activeFile.content,
          language: activeFile.language,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na explicação.");
      setExplanationResult(data);
    } catch (err: any) {
      alert("Erro ao explicar código: " + err.message);
    } finally {
      setIsExplaining(false);
    }
  };

  // 4. Auto-Correção
  const handleAutoFix = async () => {
    if (!activeFile) return;
    setIsAutoFixing(true);
    setActiveBottomTab("autofix");

    try {
      const res = await fetch("/api/ai/codex/autofix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activeFile.content,
          language: activeFile.language,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na auto-correção.");
      setAutoFixResult(data);
    } catch (err: any) {
      alert("Erro ao aplicar auto-correção: " + err.message);
    } finally {
      setIsAutoFixing(false);
    }
  };

  // Aplicar código corrigido
  const handleApplyFix = () => {
    if (!autoFixResult || !activeFile) return;
    handleContentChange(autoFixResult.fixedCode);
    alert("✓ Código corrigido aplicado com sucesso!");
  };

  // 5. Baixar Projeto em ZIP
  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/ai/codex/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Falha ao gerar arquivo ZIP.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert("Erro ao baixar ZIP: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Copiar código do arquivo ativo
  const handleCopyCode = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Helper de ícone por extensão
  const getFileIcon = (lang: SupportedLanguage, path: string) => {
    if (path.endsWith("json")) return <FileText className="w-3.5 h-3.5 text-amber-400" />;
    if (path.endsWith("md")) return <FileText className="w-3.5 h-3.5 text-slate-400" />;
    switch (lang) {
      case "typescript":
        return <FileType className="w-3.5 h-3.5 text-cyan-400" />;
      case "javascript":
        return <FileType className="w-3.5 h-3.5 text-yellow-400" />;
      case "python":
        return <Flame className="w-3.5 h-3.5 text-emerald-400" />;
      case "html":
        return <Globe className="w-3.5 h-3.5 text-orange-400" />;
      case "css":
        return <Globe className="w-3.5 h-3.5 text-blue-400" />;
      case "sql":
        return <Database className="w-3.5 h-3.5 text-purple-400" />;
      case "csharp":
        return <Cpu className="w-3.5 h-3.5 text-violet-400" />;
      default:
        return <FileCode className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-1rem)] bg-[#070B13] text-slate-100 overflow-hidden font-sans border border-slate-800/80 rounded-2xl shadow-2xl">
      {/* ============================================================== */}
      {/* 1. HEADER / TOOLBAR SUPERIOR                                  */}
      {/* ============================================================== */}
      <header className="h-14 bg-[#0A0F1D] border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-neon-cyan">
            <Code2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white tracking-wide">
                ORVEXA CODEX ENGINE
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                PRO DEV ASSISTANT
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span className="font-semibold text-slate-200">{project.name}</span>
              <span>•</span>
              <span className="text-cyan-400 font-mono text-[10px]">
                {structure.totalFiles} arquivos ({structure.totalLines} linhas)
              </span>
            </div>
          </div>
        </div>

        {/* Ações centrais e ferramentas */}
        <div className="flex items-center gap-2">
          {/* Botão Novo Projeto / Templates */}
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Templates ({CODEX_TEMPLATES.length})</span>
          </button>

          <div className="h-5 w-[1px] bg-slate-800 mx-1" />

          {/* Botão Executar */}
          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition disabled:opacity-50"
            title="Executar código no sandbox isolado"
          >
            {isExecuting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Executar</span>
          </button>

          {/* Botão Auditoria de Segurança */}
          <button
            onClick={handleSecurityReview}
            disabled={isAuditing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition disabled:opacity-50"
            title="Análise de vulnerabilidades e segurança"
          >
            {isAuditing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>Auditoria</span>
          </button>

          {/* Botão Auto-Correção */}
          <button
            onClick={handleAutoFix}
            disabled={isAutoFixing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 transition disabled:opacity-50"
            title="Detecção e correção automática de bugs"
          >
            {isAutoFixing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Auto-Fix</span>
          </button>

          {/* Botão Explicar */}
          <button
            onClick={handleExplainCode}
            disabled={isExplaining}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/50 transition disabled:opacity-50"
            title="Explicar lógica do código e complexidade Big-O"
          >
            {isExplaining ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            ) : (
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>Explicar</span>
          </button>

          <div className="h-5 w-[1px] bg-slate-800 mx-1" />

          {/* Baixar ZIP */}
          <button
            onClick={handleExportZip}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/40 transition disabled:opacity-50"
            title="Exportar projeto completo empacotado em .zip"
          >
            {isExporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Baixar ZIP</span>
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. CORPO PRINCIPAL (EXPLORER + EDITOR + CONSOLE)                */}
      {/* ============================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================== */}
        {/* 2.1 BARRA LATERAL ESQUERDA: EXPLORADOR     */}
        {/* ========================================== */}
        <aside className="w-64 bg-[#090D18] border-r border-slate-800/80 flex flex-col shrink-0 select-none">
          {/* Título do explorador */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
              Explorador
            </span>
            <button
              onClick={() => setIsNewFileModalOpen(true)}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition"
              title="Adicionar arquivo"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Lista de arquivos do projeto */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs">
            {project.files.map((file) => {
              const isActive = file.path === activeFilePath;
              return (
                <div
                  key={file.path}
                  onClick={() => handleSelectFile(file.path)}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition ${
                    isActive
                      ? "bg-cyan-500/15 text-cyan-300 font-semibold border-l-2 border-cyan-400"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {getFileIcon(file.language, file.path)}
                    <span className="truncate">{file.path}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    {project.files.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(file.path);
                        }}
                        className="p-1 hover:text-rose-400 transition"
                        title="Excluir arquivo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Métricas do Projeto */}
          <div className="p-3 border-t border-slate-800 bg-[#070A12] text-[11px] space-y-1.5 text-slate-400">
            <div className="flex justify-between items-center">
              <span>Linguagem Base:</span>
              <span className="font-mono text-cyan-400 uppercase font-semibold">
                {project.language}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Total de Linhas:</span>
              <span className="font-mono text-slate-200">{structure.totalLines}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Segurança:</span>
              <span className="text-emerald-400 font-medium">Sandbox Ativo</span>
            </div>
          </div>
        </aside>

        {/* ========================================== */}
        {/* 2.2 ÁREA CENTRAL: EDITOR + TABS            */}
        {/* ========================================== */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#060911]">
          {/* Abas de arquivos abertos */}
          <div className="h-10 bg-[#080C16] border-b border-slate-800 flex items-center overflow-x-auto px-2 shrink-0 select-none">
            {openTabs.map((tabPath) => {
              const file = project.files.find((f) => f.path === tabPath);
              if (!file) return null;
              const isActive = tabPath === activeFilePath;
              const fileName = tabPath.split("/").pop() || tabPath;

              return (
                <div
                  key={tabPath}
                  onClick={() => setActiveFilePath(tabPath)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-t-md cursor-pointer border-t-2 transition mr-1 ${
                    isActive
                      ? "bg-[#060911] text-cyan-300 border-cyan-400 font-medium"
                      : "bg-[#0A0E1A] text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-300"
                  }`}
                >
                  {getFileIcon(file.language, tabPath)}
                  <span>{fileName}</span>
                  {file.isModified && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                  <button
                    onClick={(e) => handleCloseTab(tabPath, e)}
                    className="hover:text-rose-400 text-slate-500 rounded p-0.5 ml-1 transition"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          {/* Toolbar do editor ativo */}
          <div className="h-8 bg-[#090D18] border-b border-slate-800/80 px-3 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-cyan-400">{activeFile?.path}</span>
              <span className="text-slate-600">|</span>
              <span className="text-[11px] uppercase font-mono text-slate-400">
                {activeFile?.language}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 hover:text-cyan-400 transition"
                title="Copiar código"
              >
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedCode ? "Copiado!" : "Copiar"}</span>
              </button>
              <span>Linhas: {activeFile?.content.split("\n").length || 0}</span>
              <span>UTF-8</span>
            </div>
          </div>

          {/* Área de edição de código (Textarea estilo IDE com números de linha) */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Números de linha */}
            <div className="w-12 bg-[#05080E] py-3 pr-2 text-right font-mono text-[11px] text-slate-600 select-none border-r border-slate-800/60 overflow-hidden shrink-0">
              {(activeFile?.content || "").split("\n").map((_, i) => (
                <div key={i} className="leading-5">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Editor de código */}
            <textarea
              ref={textareaRef}
              value={activeFile?.content || ""}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="flex-1 w-full bg-[#060911] text-slate-100 font-mono text-xs p-3 leading-5 resize-none focus:outline-none focus:ring-0 overflow-auto selection:bg-cyan-500/30"
              placeholder="Digite seu código ou selecione um template..."
            />
          </div>

          {/* ============================================================== */}
          {/* 3. PAINEL INFERIOR: CONSOLE / PREVIEW / SEGURANÇA / AUTO-FIX   */}
          {/* ============================================================== */}
          <div className="h-64 bg-[#080C16] border-t border-slate-800 flex flex-col shrink-0">
            {/* Tabs do painel inferior */}
            <div className="h-9 bg-[#090D18] border-b border-slate-800 px-3 flex items-center justify-between text-xs select-none">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveBottomTab("terminal")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                    activeBottomTab === "terminal"
                      ? "bg-slate-800 text-cyan-300 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Terminal / Console</span>
                  {executionResult && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        executionResult.success ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    />
                  )}
                </button>

                {(activeFile?.language === "html" || activeFile?.language === "css") && (
                  <button
                    onClick={() => setActiveBottomTab("preview")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                      activeBottomTab === "preview"
                        ? "bg-slate-800 text-cyan-300 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Live Preview</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveBottomTab("security")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                    activeBottomTab === "security"
                      ? "bg-slate-800 text-rose-300 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                  <span>Auditoria de Segurança</span>
                  {securityResult && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800/60">
                      Score: {securityResult.score}/100
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveBottomTab("explanation")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                    activeBottomTab === "explanation"
                      ? "bg-slate-800 text-indigo-300 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Explicação & Big-O</span>
                </button>

                <button
                  onClick={() => setActiveBottomTab("autofix")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                    activeBottomTab === "autofix"
                      ? "bg-slate-800 text-amber-300 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Auto-Correção</span>
                  {autoFixResult && (
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </button>
              </div>

              {/* Status ou Limpar */}
              <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                {executionResult && (
                  <span>
                    Executado em {executionResult.executionTimeMs}ms • Status:{" "}
                    {executionResult.status}
                  </span>
                )}
                {activeBottomTab === "terminal" && (
                  <button
                    onClick={() => setExecutionResult(null)}
                    className="hover:text-slate-300 transition"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Conteúdo da aba inferior */}
            <div className="flex-1 overflow-auto p-3 font-mono text-xs">
              {/* ABA 1: TERMINAL / CONSOLE */}
              {activeBottomTab === "terminal" && (
                <div>
                  {!executionResult ? (
                    <div className="text-slate-500 flex flex-col items-center justify-center h-44">
                      <Terminal className="w-8 h-8 mb-2 opacity-40 text-cyan-400" />
                      <p>Nenhuma execução recente.</p>
                      <p className="text-[11px]">
                        Pressione o botão &quot;Executar&quot; para rodar o código ativo em sandbox seguro.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[11px] font-semibold pb-1 border-b border-slate-800 text-slate-400">
                        <span>Linguagem: {executionResult.language.toUpperCase()}</span>
                        <span>•</span>
                        <span
                          className={
                            executionResult.success ? "text-emerald-400" : "text-rose-400"
                          }
                        >
                          {executionResult.success ? "✓ SUCESSO" : "✗ FALHA"}
                        </span>
                        <span>•</span>
                        <span>Tempo: {executionResult.executionTimeMs}ms</span>
                        {executionResult.memoryUsageMb && (
                          <>
                            <span>•</span>
                            <span>Memória: {executionResult.memoryUsageMb} MB</span>
                          </>
                        )}
                      </div>

                      {/* Saídas padrão (STDOUT) */}
                      {executionResult.stdout.length > 0 && (
                        <div className="space-y-1">
                          {executionResult.stdout.map((line, idx) => (
                            <div key={idx} className="text-cyan-300 leading-relaxed">
                              {line}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Erros (STDERR) */}
                      {executionResult.stderr.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {executionResult.stderr.map((err, idx) => (
                            <div key={idx} className="text-rose-400 font-semibold leading-relaxed">
                              {err}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Visualização de Tabela SQL */}
                      {executionResult.tableData && (
                        <div className="mt-3 border border-slate-700 rounded-lg overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-800/80 text-cyan-300 border-b border-slate-700">
                                {executionResult.tableData.columns.map((col, idx) => (
                                  <th key={idx} className="p-2 font-semibold font-mono">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {executionResult.tableData.rows.map((row, rIdx) => (
                                <tr
                                  key={rIdx}
                                  className="border-b border-slate-800/50 hover:bg-slate-800/30"
                                >
                                  {row.map((val, cIdx) => (
                                    <td key={cIdx} className="p-2 font-mono text-slate-300">
                                      {String(val)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ABA 2: LIVE PREVIEW HTML/CSS */}
              {activeBottomTab === "preview" && (
                <div className="h-full w-full bg-white rounded-lg overflow-hidden border border-slate-700">
                  {executionResult?.previewHtml ? (
                    <iframe
                      srcDoc={executionResult.previewHtml}
                      title="Preview Sandbox"
                      className="w-full h-full border-none"
                      sandbox="allow-scripts"
                    />
                  ) : (
                    <div className="text-slate-800 flex items-center justify-center h-full">
                      Execute o arquivo HTML para visualizar o renderizador ao vivo.
                    </div>
                  )}
                </div>
              )}

              {/* ABA 3: AUDITORIA DE SEGURANÇA */}
              {activeBottomTab === "security" && (
                <div>
                  {!securityResult ? (
                    <div className="text-slate-500 flex flex-col items-center justify-center h-44">
                      <ShieldAlert className="w-8 h-8 mb-2 opacity-40 text-rose-400" />
                      <p>Nenhuma auditoria realizada ainda.</p>
                      <p className="text-[11px]">
                        Clique em &quot;Auditoria&quot; para analisar o código em busca de vulnerabilidades.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 font-sans">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                              securityResult.score >= 80
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-600"
                                : securityResult.score >= 50
                                ? "bg-amber-950 text-amber-400 border border-amber-600"
                                : "bg-rose-950 text-rose-400 border border-rose-600"
                            }`}
                          >
                            {securityResult.score}
                          </div>
                          <div>
                            <div className="font-semibold text-white">
                              Status: {securityResult.status}
                            </div>
                            <div className="text-xs text-slate-400">{securityResult.summary}</div>
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {securityResult.analyzedLines} linhas analisadas
                        </div>
                      </div>

                      {securityResult.issues.length === 0 ? (
                        <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            Parabéns! Nenhuma vulnerabilidade ou segredo exposto detectado no código.
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {securityResult.issues.map((issue, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg bg-slate-900/90 border border-rose-900/40 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-rose-400 text-xs">
                                  {issue.rule}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
                                  {issue.severity}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300">{issue.description}</p>
                              {issue.snippet && (
                                <div className="p-1.5 bg-black/60 rounded text-[11px] font-mono text-amber-300">
                                  {issue.snippet}
                                </div>
                              )}
                              <div className="text-[11px] text-cyan-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 shrink-0" />
                                <span>Remediação: {issue.remediation}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ABA 4: EXPLICAÇÃO & BIG-O */}
              {activeBottomTab === "explanation" && (
                <div>
                  {!explanationResult ? (
                    <div className="text-slate-500 flex flex-col items-center justify-center h-44">
                      <HelpCircle className="w-8 h-8 mb-2 opacity-40 text-indigo-400" />
                      <p>Nenhuma explicação gerada ainda.</p>
                      <p className="text-[11px]">
                        Clique em &quot;Explicar&quot; para decompor o algoritmo, complexidade e arquitetura.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 font-sans text-xs">
                      {/* Complexidades */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-slate-400 text-[11px] uppercase font-mono">
                            Complexidade Temporal (Time)
                          </span>
                          <div className="text-base font-bold font-mono text-cyan-400 mt-0.5">
                            {explanationResult.timeComplexity}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-slate-400 text-[11px] uppercase font-mono">
                            Complexidade Espacial (Space)
                          </span>
                          <div className="text-base font-bold font-mono text-indigo-400 mt-0.5">
                            {explanationResult.spaceComplexity}
                          </div>
                        </div>
                      </div>

                      {/* Visão Geral & Arquitetura */}
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                        <div className="font-semibold text-white">Visão Geral</div>
                        <p className="text-slate-300 leading-relaxed">
                          {explanationResult.overview}
                        </p>
                        <div className="font-semibold text-white pt-2">Arquitetura</div>
                        <p className="text-slate-300 leading-relaxed">
                          {explanationResult.architecture}
                        </p>
                      </div>

                      {/* Passo a Passo */}
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                        <div className="font-semibold text-white">Fluxo de Execução</div>
                        <ul className="space-y-1 list-disc list-inside text-slate-300">
                          {explanationResult.stepByStep.map((step, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ABA 5: AUTO-FIX */}
              {activeBottomTab === "autofix" && (
                <div>
                  {!autoFixResult ? (
                    <div className="text-slate-500 flex flex-col items-center justify-center h-44">
                      <Wand2 className="w-8 h-8 mb-2 opacity-40 text-amber-400" />
                      <p>Nenhuma correção pendente.</p>
                      <p className="text-[11px]">
                        Clique em &quot;Auto-Fix&quot; para inspecionar e corrigir problemas no código.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 font-sans text-xs">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-amber-950/30 border border-amber-800/40">
                        <div>
                          <div className="font-semibold text-amber-300">
                            Auto-Correção Sugerida (Confiança: {autoFixResult.confidence}%)
                          </div>
                          <div className="text-slate-300 text-xs mt-0.5">
                            {autoFixResult.explanation}
                          </div>
                        </div>
                        <button
                          onClick={handleApplyFix}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg transition"
                        >
                          Aceitar Alterações
                        </button>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="font-semibold text-white mb-2">Alterações Aplicadas:</div>
                        <ul className="space-y-1 list-disc list-inside text-slate-300">
                          {autoFixResult.changesApplied.map((chg, idx) => (
                            <li key={idx}>{chg}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ============================================================== */}
      {/* 4. MODAL: CATÁLOGO DE TEMPLATES                                */}
      {/* ============================================================== */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B101E] border border-cyan-500/30 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0E1528]">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">Templates Profissionais ORVEXA CODEX</h3>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Projeto (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: meu-projeto-saas"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {CODEX_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplateId === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                        isSelected
                          ? "bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-500/50"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-white">{tmpl.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                            {tmpl.primaryLanguage.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                          {tmpl.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                        <span>{tmpl.files.length} arquivos pré-configurados</span>
                        <span className="text-cyan-400 font-medium">{tmpl.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#0E1528] flex justify-end gap-2">
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleLoadTemplate}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-neon-cyan transition"
              >
                Instanciar Projeto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. MODAL: ADICIONAR NOVO ARQUIVO                               */}
      {/* ============================================================== */}
      {isNewFileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B101E] border border-cyan-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0E1528]">
              <h3 className="font-bold text-white text-sm">Criar Novo Arquivo</h3>
              <button
                onClick={() => setIsNewFileModalOpen(false)}
                className="text-slate-400 hover:text-white text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Caminho / Nome do Arquivo:
                </label>
                <input
                  type="text"
                  placeholder="Ex: src/services/auth.ts ou utils/math.py"
                  value={newFileName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewFileName(val);
                    // auto-detecta linguagem pela extensão
                    if (val.endsWith(".ts") || val.endsWith(".tsx")) setNewFileLang("typescript");
                    else if (val.endsWith(".js") || val.endsWith(".jsx")) setNewFileLang("javascript");
                    else if (val.endsWith(".py")) setNewFileLang("python");
                    else if (val.endsWith(".html")) setNewFileLang("html");
                    else if (val.endsWith(".css")) setNewFileLang("css");
                    else if (val.endsWith(".sql")) setNewFileLang("sql");
                    else if (val.endsWith(".cs")) setNewFileLang("csharp");
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Linguagem do Arquivo:
                </label>
                <select
                  value={newFileLang}
                  onChange={(e) => setNewFileLang(e.target.value as SupportedLanguage)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="typescript">TypeScript (.ts, .tsx)</option>
                  <option value="javascript">JavaScript (.js, .jsx)</option>
                  <option value="python">Python (.py)</option>
                  <option value="html">HTML5 (.html)</option>
                  <option value="css">CSS3 (.css)</option>
                  <option value="sql">SQL (.sql)</option>
                  <option value="csharp">C# (.cs)</option>
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#0E1528] flex justify-end gap-2">
              <button
                onClick={() => setIsNewFileModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateFile}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition"
              >
                Criar Arquivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
