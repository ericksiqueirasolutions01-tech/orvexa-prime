"use client";

import { useState } from "react";
import {
  FileText,
  UploadCloud,
  FileSpreadsheet,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calculator,
  ShieldAlert,
  Copy,
  Check,
  RefreshCw,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function DocumentAnalyzerPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisType, setAnalysisType] = useState<"RESUMO_EXECUTIVO" | "AUDITORIA_RISCOS" | "CALCULOS_FINANCEIROS">("CALCULOS_FINANCEIROS");
  const [customQuestion, setCustomQuestion] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("analysisType", analysisType);
      if (customQuestion.trim()) {
        formData.append("question", customQuestion.trim());
      }

      const res = await fetch("/api/ai/document-analyzer", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao analisar documento.");

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Erro durante o processamento do documento.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (!result?.analysis) return;
    navigator.clipboard.writeText(result.analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-cyan-500/20 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
          <FileCheck className="w-3.5 h-3.5" />
          ORVEXA DOCUMENT ANALYZER • AUDITORIA & METRICAS MULTIMODAIS
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Análise Inteligente de Documentos & Planilhas
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Suporte a <strong>PDF, DOCX, XLSX, CSV e Imagens</strong>. 
          O motor extrai tabelas, calcula totais financeiros automaticamente e audita cláusulas de risco com os modelos de IA mais avançados.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário de Upload e Configuração */}
        <div className="space-y-6">
          <form onSubmit={handleAnalyze} className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800 shadow-xl space-y-5">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-cyan-400" />
              Upload do Arquivo
            </h2>

            {/* Dropzone */}
            <div className="relative border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-2xl p-6 text-center transition-all bg-slate-900/50 cursor-pointer group">
              <input
                type="file"
                required
                accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.json,image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-2 flex flex-col items-center">
                {selectedFile ? (
                  <>
                    <FileSpreadsheet className="w-10 h-10 text-emerald-400" />
                    <div className="text-xs font-bold text-white truncate max-w-[220px]">
                      {selectedFile.name}
                    </div>
                    <span className="text-[10px] text-cyan-300 font-mono">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Pronto para análise
                    </span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-10 h-10 text-cyan-400/60 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-semibold text-slate-300">
                      Arraste ou clique para selecionar
                    </div>
                    <span className="text-[10px] text-slate-500">
                      PDF, DOCX, XLSX, CSV ou Imagens
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Modo de Auditoria */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Modo de Análise</label>
              <div className="space-y-2">
                {[
                  {
                    id: "CALCULOS_FINANCEIROS",
                    label: "Cálculos Financeiros & Totais",
                    desc: "Soma de caixas, ticket médio e auditoria de números",
                    icon: Calculator,
                  },
                  {
                    id: "RESUMO_EXECUTIVO",
                    label: "Resumo Executivo Estratégico",
                    desc: "Síntese dos pontos vitais e plano de ação",
                    icon: Sparkles,
                  },
                  {
                    id: "AUDITORIA_RISCOS",
                    label: "Auditoria de Riscos & Cláusulas",
                    desc: "Conformidade, multas e responsabilidades",
                    icon: ShieldAlert,
                  },
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = analysisType === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setAnalysisType(mode.id as any)}
                      className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                        isSelected
                          ? "bg-cyan-950/40 border-cyan-500/50 text-cyan-300 ring-1 ring-cyan-500/30"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? "text-cyan-400" : "text-slate-500"}`} />
                      <div>
                        <div className="text-xs font-bold">{mode.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{mode.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pergunta Específica (Opcional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Pergunta Específica (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Qual o valor total vendido em Salvador?"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Botão de Análise */}
            <button
              type="submit"
              disabled={analyzing || !selectedFile}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs shadow-neon-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {analyzing ? "Processando e Auditando Dados..." : "Executar Auditoria Inteligente"}
            </button>
          </form>

          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Painel de Resultados */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-cyan-500/30 shadow-2xl space-y-5 animate-in fade-in duration-300">
              {/* Header do Resultado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-base font-bold text-white">
                      Relatório de Auditoria Concluído
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1 font-mono">
                    <span className="text-cyan-300">{result.fileName}</span>
                    <span>•</span>
                    <span>Modelo: {result.modelUsed}</span>
                    {result.tableMetrics?.totalRows && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-300">{result.tableMetrics.totalRows} linhas</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-cyan-400 font-medium flex items-center gap-1.5 transition-colors self-start sm:self-center"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copiado!" : "Copiar Relatório"}
                </button>
              </div>

              {/* Corpo da Análise em Markdown */}
              <div className="prose prose-invert prose-xs max-w-none text-slate-200 leading-relaxed space-y-3 font-sans whitespace-pre-wrap">
                {result.analysis}
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-[#0A0E1A] border border-slate-800 shadow-xl flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
              <FileText className="w-12 h-12 text-slate-700" />
              <div className="max-w-md">
                <h3 className="text-sm font-bold text-white mb-1">Aguardando Envio de Documento</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Envie relatórios financeiros, notas fiscais, planilhas de caixas (XLSX) ou contratos em PDF para obter o diagnóstico e cálculos completos em segundos.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
