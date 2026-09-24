// src/app/dashboard/system-builder/page.tsx
// CRIADOR DE SAAS & ARQUITETURA DE SISTEMAS — ORVEXA PRIME (TEMA CLARO & INTUITIVO)

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Layers,
  Database,
  Layout,
  Server,
  ShieldCheck,
  Copy,
  Check,
  Download,
  Sparkles,
  ArrowRight,
  Code2,
  RefreshCw,
  Cpu,
  CheckCircle2,
} from "lucide-react";

export default function SystemBuilderPage() {
  const [appName, setAppName] = useState("DocuSigner AI");
  const [problemStatement, setProblemStatement] = useState(
    "Assinatura digital e validação jurídica de contratos com inteligência artificial para detecção de cláusulas abusivas."
  );
  const [targetAudience, setTargetAudience] = useState("Escritórios de Advocacia e Startups B2B");
  const [mainFeatures, setMainFeatures] = useState(
    "Upload de PDF, assinatura eletrônica com ICP-Brasil/hash seguro, análise de riscos por IA, dashboard de status e faturamento por documento."
  );
  const [techStack, setTechStack] = useState(
    "Next.js 14 App Router, TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS, NextAuth/JWT"
  );

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"architecture" | "database" | "screens" | "api" | "specs">(
    "architecture"
  );
  const [copiedPrisma, setCopiedPrisma] = useState(false);
  const [copiedDoc, setCopiedDoc] = useState(false);

  const presetAudiences = [
    "Escritórios de Advocacia e Startups B2B",
    "PMEs & Prestadores de Serviço",
    "E-commerces & Varejistas",
    "Clínicas Médicas & Saúde",
    "Desenvolvedores & Agências",
  ];

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!appName.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/ai/system-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName,
          problemStatement,
          targetAudience,
          mainFeatures,
          techStack,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data.data);
      } else {
        alert(data.error || "Ocorreu um erro ao gerar a arquitetura do sistema.");
      }
    } catch (err: any) {
      alert("Falha de conexão: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrisma = () => {
    if (!result?.databaseSchema?.prismaSnippet) return;
    navigator.clipboard.writeText(result.databaseSchema.prismaSnippet);
    setCopiedPrisma(true);
    setTimeout(() => setCopiedPrisma(false), 2500);
  };

  const handleCopyFullDoc = () => {
    if (!result) return;
    const doc = `# ESPECIFICAÇÃO DE SISTEMA: ${appName}
## Visão Geral
${result.summary}

## 1. Arquitetura Geral
- **Frontend**: ${result.architecture.frontend}
- **Backend**: ${result.architecture.backend}
- **Banco de Dados**: ${result.architecture.database}
- **Serviços Integrados**: ${result.architecture.services}

## 2. Modelagem de Banco (Prisma Schema)
\`\`\`prisma
${result.databaseSchema.prismaSnippet}
\`\`\`

## 3. Fluxo de Telas
${result.screenFlows.map((s: any) => `### ${s.step}. ${s.screen} (${s.route})\n- Ações: ${s.actions}`).join("\n\n")}

## 4. Endpoints de API
${result.apiEndpoints.map((ep: any) => `- \`${ep.method} ${ep.path}\`: ${ep.description}`).join("\n")}

## 5. Especificações Técnicas & Variáveis
- **Segurança**: ${result.technicalSpecs.security}
- **Escalabilidade**: ${result.technicalSpecs.scalability}
- **Variáveis de Ambiente**:
${result.technicalSpecs.envVariables.map((ev: string) => `  - \`${ev}\``).join("\n")}
`;
    navigator.clipboard.writeText(doc);
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Cpu className="w-3.5 h-3.5" />
            Criador de SaaS & Sistema
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Arquitetura de Software Pronta para Codificar
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Defina a ideia do seu software e receba a modelagem de dados, arquitetura em camadas, fluxo
            de telas e endpoints documentados com boas práticas de engenharia.
          </p>
        </div>

        <Link
          href="/dashboard/chat"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-sm transition-all self-start md:self-auto"
        >
          ← Voltar ao Chat
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Formulário de Configuração (Esquerda) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600" />
            Especificação do SaaS
          </h2>

          <form onSubmit={handleGenerate} className="space-y-4">
            {/* Nome do SaaS */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nome do SaaS / Aplicação
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Ex: NexusCRM, TaskFlow, DocuSigner"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-semibold"
                required
              />
            </div>

            {/* Problema que Resolve */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Problema Central que Resolve
              </label>
              <textarea
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                rows={2}
                placeholder="Qual dor ou gargalo operacional o sistema elimina?"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white transition-all leading-relaxed"
                required
              />
            </div>

            {/* Público Alvo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Público-Alvo
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {presetAudiences.map((pa) => (
                  <button
                    key={pa}
                    type="button"
                    onClick={() => setTargetAudience(pa)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                      targetAudience === pa
                        ? "bg-purple-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {pa}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Ex: Pequenos escritórios, times remotos, etc."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
                required
              />
            </div>

            {/* Funcionalidades Principais */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Funcionalidades Principais
              </label>
              <textarea
                value={mainFeatures}
                onChange={(e) => setMainFeatures(e.target.value)}
                rows={3}
                placeholder="Liste as 3 a 5 funcionalidades essenciais (ex: Dashboard, Checkout, Upload de arquivos...)"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white transition-all leading-relaxed"
                required
              />
            </div>

            {/* Stack Tecnológica */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Stack Tecnológica Sugerida
              </label>
              <input
                type="text"
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                placeholder="Ex: Next.js 14, TypeScript, Prisma, PostgreSQL"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-mono"
              />
            </div>

            {/* Botão de Envio */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-slate-900 text-white text-xs font-extrabold flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.99] transition-all shadow-md disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                  <span>A IA está arquitetando seu SaaS...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Gerar Arquitetura do SaaS</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Blueprint Interativo (Direita) */}
        <div className="lg:col-span-7 space-y-4">
          {result ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              {/* Barra de Abas */}
              <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    onClick={() => setActiveTab("architecture")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === "architecture"
                        ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    Arquitetura
                  </button>
                  <button
                    onClick={() => setActiveTab("database")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === "database"
                        ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Database className="w-3.5 h-3.5 text-purple-600" />
                    Banco (Prisma)
                  </button>
                  <button
                    onClick={() => setActiveTab("screens")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === "screens"
                        ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Layout className="w-3.5 h-3.5 text-purple-600" />
                    Telas
                  </button>
                  <button
                    onClick={() => setActiveTab("api")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === "api"
                        ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Server className="w-3.5 h-3.5 text-purple-600" />
                    APIs
                  </button>
                  <button
                    onClick={() => setActiveTab("specs")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === "specs"
                        ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    Specs
                  </button>
                </div>

                <button
                  onClick={handleCopyFullDoc}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs"
                >
                  {copiedDoc ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Documentação Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Documento Completo</span>
                    </>
                  )}
                </button>
              </div>

              {/* Conteúdo das Abas */}
              <div className="p-6 space-y-6 max-h-[640px] overflow-y-auto">
                {/* 1. Arquitetura */}
                {activeTab === "architecture" && (
                  <div className="space-y-6">
                    <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200/80">
                      <span className="text-xs font-bold text-purple-900 uppercase tracking-wider block mb-1">
                        Resumo Executivo
                      </span>
                      <p className="text-xs text-purple-950 leading-relaxed font-medium">
                        {result.summary}
                      </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                          <Layout className="w-4 h-4 text-purple-600" />
                          Camada Frontend
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {result.architecture.frontend}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                          <Server className="w-4 h-4 text-purple-600" />
                          Camada Backend & APIs
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {result.architecture.backend}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                          <Database className="w-4 h-4 text-purple-600" />
                          Banco de Dados & Cache
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {result.architecture.database}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                          <Cpu className="w-4 h-4 text-purple-600" />
                          Serviços de Terceiros
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {result.architecture.services}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Banco de Dados (Prisma) */}
                {activeTab === "database" && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-600 font-medium">
                        {result.databaseSchema.description}
                      </p>
                      <button
                        onClick={handleCopyPrisma}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all"
                      >
                        {copiedPrisma ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Schema Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar schema.prisma</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Tabelas e Campos */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Tabelas Projetadas
                      </span>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {result.databaseSchema.tables?.map((table: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-purple-700 font-mono">
                                {table.name}
                              </span>
                              <span className="text-[10px] text-slate-400">{table.description}</span>
                            </div>
                            <div className="space-y-1">
                              {table.fields?.map((f: string, fIdx: number) => (
                                <div
                                  key={fIdx}
                                  className="text-[11px] font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200/60"
                                >
                                  {f}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Código Prisma */}
                    <div className="rounded-xl bg-slate-950 p-4 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                      <pre>{result.databaseSchema.prismaSnippet}</pre>
                    </div>
                  </div>
                )}

                {/* 3. Telas */}
                {activeTab === "screens" && (
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                      Fluxo de Telas & Jornada do Usuário
                    </span>
                    <div className="space-y-3">
                      {result.screenFlows?.map((sf: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start gap-4"
                        >
                          <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                            {sf.step || idx + 1}
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-xs text-slate-900">{sf.screen}</h4>
                              <span className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                {sf.route}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{sf.actions}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. APIs */}
                {activeTab === "api" && (
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                      Endpoints REST & Contratos de API
                    </span>
                    <div className="space-y-2.5">
                      {result.apiEndpoints?.map((ep: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                ep.method === "GET"
                                  ? "bg-blue-100 text-blue-800"
                                  : ep.method === "POST"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : ep.method === "PUT"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {ep.method}
                            </span>
                            <span className="font-mono text-xs text-slate-800 font-semibold">
                              {ep.path}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 text-right">{ep.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Specs */}
                {activeTab === "specs" && (
                  <div className="space-y-5">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Segurança & Conformidade
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {result.technicalSpecs.security}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-purple-600" />
                        Escalabilidade & Performance
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {result.technicalSpecs.scalability}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                        Variáveis de Ambiente Sugeridas (.env)
                      </span>
                      <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-emerald-400 space-y-1.5 border border-slate-800">
                        {result.technicalSpecs.envVariables?.map((ev: string, idx: number) => (
                          <div key={idx}>{ev}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Estado Inicial Vazio */
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[480px] space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                O Blueprint do seu SaaS aparecerá aqui
              </h3>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                Preencha os campos ao lado com a proposta do sistema e clique em{" "}
                <span className="font-semibold text-slate-700">"Gerar Arquitetura do SaaS"</span>.
                A IA estruturará entidades, esquema de banco, endpoints e fluxo de telas completos.
              </p>
              <div className="pt-2 flex items-center gap-6 text-[11px] font-medium text-slate-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Prisma Schema Pronto
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Endpoints REST
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Exportação Completa
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

