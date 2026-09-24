// src/app/dashboard/chat/page.tsx
// INTERFACE DE CHAT MODERNA ESTILO CHATGPT — ORVEXA PRIME (TEMA CLARO & OBJETIVO)

"use client";

import { useEffect, useRef, useState, useMemo, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Send,
  Sparkles,
  Paperclip,
  Trash2,
  Plus,
  Copy,
  Check,
  X,
  ChevronDown,
  Square,
  Bot,
  User,
  MessageSquare,
  FileText,
  Download,
  FolderGit2,
  Globe,
  Cpu,
  Brain,
  Zap,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";
import { FRIENDLY_MODELS, getModelDisplayInfo, ModelDisplayInfo } from "@/lib/model-names";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string | Date;
  attachedFileNames?: string[];
  imageUrl?: string;
  routerBadge?: string;
  isOrvexaAuto?: boolean;
}

interface AttachedFile {
  name: string;
  size: number;
  fileObj?: File;
}

interface AgentItem {
  id: string;
  slug: string;
  name: string;
  role: string;
  avatar?: string;
  badge?: string;
  preferredModel?: string;
}

interface ProjectItem {
  id: string;
  name: string;
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full bg-white flex items-center justify-center text-slate-400 text-sm">
          Carregando ORVEXA PRIME...
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const convIdParam = searchParams.get("c");
  const agentIdParam = searchParams.get("agentId");
  const newParam = searchParams.get("new");

  // Estados principais
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState("orvexa-prime");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Anexos
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Agentes e Projetos
  const [availableAgents, setAvailableAgents] = useState<AgentItem[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [availableProjects, setAvailableProjects] = useState<ProjectItem[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Lista dinâmica de modelos suportados
  const [supportedModels, setSupportedModels] = useState<ModelDisplayInfo[]>(
    Object.values(FRIENDLY_MODELS)
  );

  // Copiado
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Agente e Projeto ativos computados
  const activeAgent = useMemo(
    () => availableAgents.find((a) => a.id === activeAgentId) || null,
    [availableAgents, activeAgentId]
  );

  const activeProject = useMemo(
    () => availableProjects.find((p) => p.id === activeProjectId) || null,
    [availableProjects, activeProjectId]
  );

  // 1. Carrega modelos disponíveis e agentes ao inicializar
  useEffect(() => {
    fetch("/api/ai/models")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.models && Array.isArray(data.models) && data.models.length > 0) {
          setSupportedModels(data.models);
        }
      })
      .catch(() => {});

    fetch("/api/ai/agents")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.agents) {
          setAvailableAgents(data.agents);
        }
      })
      .catch(() => {});

    fetch("/api/ai/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.projects) {
          setAvailableProjects(data.projects);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Reage a alterações na URL (conversa específica, novo chat, agente selecionado)
  useEffect(() => {
    if (convIdParam) {
      loadConversation(convIdParam);
    } else if (newParam === "true") {
      startNewChat();
    }
  }, [convIdParam, newParam]);

  useEffect(() => {
    if (agentIdParam) {
      setActiveAgentId(agentIdParam);
    }
  }, [agentIdParam]);

  // Carrega histórico de uma conversa específica
  const loadConversation = async (convId: string) => {
    if (convId === activeConversationId && messages.length > 0) return;

    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }

    setActiveConversationId(convId);

    try {
      const res = await fetch(`/api/ai/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        const conv = data.conversation;
        if (conv) {
          setMessages(conv.messages || []);
          if (conv.modelPreference) setSelectedModel(conv.modelPreference);
          if (conv.agentId) setActiveAgentId(conv.agentId);
          if (conv.projectId) setActiveProjectId(conv.projectId);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar conversa:", err);
    }
  };

  // Inicia um novo chat limpo
  const startNewChat = () => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
    setActiveConversationId(null);
    setMessages([]);
    setInput("");
    setAttachedFiles([]);
    setActiveAgentId(null);
    setActiveProjectId(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Auto-scroll para a mensagem mais recente
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Ajuste dinâmico de altura do Textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    }
  };

  // Seleção e upload de arquivos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: AttachedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      newAttachments.push({ name: f.name, size: f.size, fileObj: f });
    }

    setAttachedFiles((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Envio de mensagem com SSE Streaming
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt !== undefined ? customPrompt : input;
    if ((!textToSend.trim() && attachedFiles.length === 0) || isStreaming) return;

    const userMessageId = `usr-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: textToSend.trim(),
      attachedFileNames: attachedFiles.map((f) => f.name),
      createdAt: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Upload dos arquivos anexados se existirem
    let fileUploadedOk = false;
    const uploadedFileIds: string[] = [];
    if (attachedFiles.length > 0) {
      setUploadingFiles(true);
      try {
        for (const fileItem of attachedFiles) {
          if (fileItem.fileObj) {
            const formData = new FormData();
            formData.append("file", fileItem.fileObj);
            if (activeConversationId) {
              formData.append("conversationId", activeConversationId);
            }
            const uploadRes = await fetch("/api/workspace/upload", {
              method: "POST",
              body: formData,
            });
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              if (uploadData.uploaded && Array.isArray(uploadData.uploaded)) {
                for (const u of uploadData.uploaded) {
                  if (u.id) uploadedFileIds.push(u.id);
                }
              }
              fileUploadedOk = true;
            }
          }
        }
      } catch (err) {
        console.error("Falha no upload dos anexos:", err);
      } finally {
        setUploadingFiles(false);
        setAttachedFiles([]);
      }
    }

    // Mensagem da IA em streaming
    const assistantMessageId = `ast-${Date.now()}`;
    const isAuto = selectedModel === "orvexa-prime";
    const placeholderAssistant: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: new Date(),
      isOrvexaAuto: isAuto,
      routerBadge: isAuto ? "ORVEXA escolheu a melhor IA para esta tarefa." : undefined,
    };

    setMessages([...updatedMessages, placeholderAssistant]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          conversationId: activeConversationId || undefined,
          modelPreference: selectedModel,
          projectId: activeProjectId || undefined,
          agentId: activeAgentId || undefined,
          hasFiles: fileUploadedOk || (userMessage.attachedFileNames && userMessage.attachedFileNames.length > 0),
          fileIds: uploadedFileIds.length > 0 ? uploadedFileIds : undefined,
        }),
      });

      // Captura ID da conversa criado pelo backend
      const convIdHeader = response.headers.get("x-orvexa-conversation-id");
      if (convIdHeader && (!activeConversationId || activeConversationId !== convIdHeader)) {
        setActiveConversationId(convIdHeader);
      }

      // Captura selo do Smart Router se houver
      const routerBadgeHeader = response.headers.get("x-orvexa-router-badge");
      if (routerBadgeHeader) {
        try {
          const decodedBadge = decodeURIComponent(routerBadgeHeader);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, isOrvexaAuto: true, routerBadge: decodedBadge }
                : msg
            )
          );
        } catch {}
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP (${response.status}) ao processar.`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, content: accumulated } : msg
            )
          );
        }
      }

      // Notifica o layout para sincronizar a lista de conversas
      window.dispatchEvent(new Event("orvexa-conversations-updated"));
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Streaming interrompido.");
      } else {
        console.error("Erro no chat:", err);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content:
                    msg.content ||
                    `⚠️ **Não foi possível gerar a resposta.**\n\n${err.message || "Tente novamente em instantes."}`,
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Interromper resposta
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Copiar mensagem
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Exportar conversa em Markdown
  const handleExportMarkdown = () => {
    if (messages.length === 0) return;
    const doc = messages
      .map(
        (m) =>
          `### ${m.role === "user" ? "👤 Você" : "🤖 ORVEXA PRIME"}\n\n${m.content}\n\n---\n`
      )
      .join("\n");
    const blob = new Blob([doc], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversa-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentModelDisplay = getModelDisplayInfo(selectedModel);

  return (
    <div className="flex flex-col h-screen w-full bg-white text-slate-900 overflow-hidden font-sans">
      {/* Top Header Bar Estilo ChatGPT */}
      <header className="h-14 border-b border-slate-200/80 px-4 md:px-6 flex items-center justify-between bg-white/95 backdrop-blur-xs shrink-0 z-20">
        {/* Seletor de Modelo Inteligente */}
        <div className="relative">
          <button
            onClick={() => setModelDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors text-xs font-bold text-slate-800"
          >
            <span>{currentModelDisplay.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${currentModelDisplay.badgeColor}`}>
              {currentModelDisplay.badge}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Dropdown de Modelos Amigáveis */}
          {modelDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setModelDropdownOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 p-2 space-y-1 animate-fadeIn">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Modelos de IA Disponíveis
                </div>
                {supportedModels.map((m) => {
                  const isSelected = selectedModel === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedModel(m.id);
                        setModelDropdownOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-left transition-all flex items-start justify-between gap-2 ${
                        isSelected
                          ? "bg-slate-100 border border-slate-200"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{m.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full border ${m.badgeColor}`}>
                            {m.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight">{m.description}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Indicadores Ativos (Agente / Projeto) & Ações */}
        <div className="flex items-center gap-2">
          {/* Tag de Agente Ativo se houver */}
          {activeAgent && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <span>{activeAgent.avatar || "🤖"}</span>
              <span>{activeAgent.name}</span>
              <button
                onClick={() => setActiveAgentId(null)}
                className="hover:text-blue-900 p-0.5"
                title="Desativar Agente"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Tag de Projeto Ativo se houver */}
          {activeProject && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-semibold">
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>{activeProject.name}</span>
              <button
                onClick={() => setActiveProjectId(null)}
                className="hover:text-cyan-950 p-0.5"
                title="Desativar Projeto"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Botão Novo Chat */}
          <button
            onClick={startNewChat}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            title="Novo Chat"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Botão Exportar */}
          {messages.length > 0 && (
            <button
              onClick={handleExportMarkdown}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              title="Exportar Markdown"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* Botão Limpar */}
          {messages.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Limpar mensagens desta conversa?")) setMessages([]);
              }}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Limpar mensagens"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Área Central de Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
        {messages.length === 0 ? (
          /* Estado Vazio Inspirado no ChatGPT */
          <div className="max-w-2xl mx-auto h-full flex flex-col items-center justify-center text-center space-y-8 my-auto pt-12 md:pt-20">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-xl mx-auto shadow-sm">
                O
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Como posso ajudar você hoje?
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Conectado com a tecnologia ORVEXA PRIME. Escolha uma das sugestões abaixo ou digite
                sua solicitação diretamente.
              </p>
            </div>

            {/* Grid de 4 Atalhos de Alto Impacto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
              {/* Card 1: Landing Page */}
              <Link
                href="/dashboard/landing-builder"
                className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 transition-all space-y-1.5 group"
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 group-hover:text-emerald-700">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  Criador de Landing Page
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Gere copy de alta conversão, estrutura pronta e código HTML responsivo.
                </p>
              </Link>

              {/* Card 2: SaaS Builder */}
              <Link
                href="/dashboard/system-builder"
                className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 transition-all space-y-1.5 group"
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 group-hover:text-purple-700">
                  <Cpu className="w-4 h-4 text-purple-600" />
                  Criador de SaaS / Sistema
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Projete arquitetura completa, Prisma schema, endpoints e fluxo de telas.
                </p>
              </Link>

              {/* Card 3: Análise de Documentos */}
              <button
                type="button"
                onClick={() => {
                  setInput("Gostaria de analisar um documento ou contrato. Como você pode me orientar?");
                  textareaRef.current?.focus();
                }}
                className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 transition-all space-y-1.5 text-left group"
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 group-hover:text-amber-700">
                  <FileText className="w-4 h-4 text-amber-600" />
                  Analisar Documento ou PDF
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Extração profunda de dados, riscos jurídicos e resumos executivos.
                </p>
              </button>

              {/* Card 4: Código & Scripts */}
              <button
                type="button"
                onClick={() => {
                  setInput("Preciso criar uma API em TypeScript com validação Zod e boas práticas.");
                  textareaRef.current?.focus();
                }}
                className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 transition-all space-y-1.5 text-left group"
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 group-hover:text-cyan-700">
                  <Zap className="w-4 h-4 text-cyan-600" />
                  Programação & Arquitetura
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Desenvolvimento full-stack, refatoração de código e scripts inteligentes.
                </p>
              </button>
            </div>
          </div>
        ) : (
          /* Lista de Mensagens */
          <div className="max-w-3xl mx-auto w-full space-y-6">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className="flex flex-col space-y-1.5">
                  {isUser ? (
                    /* Mensagem do Usuário */
                    <div className="ml-auto max-w-[85%] space-y-1.5">
                      <div className="bg-slate-100 text-slate-900 rounded-3xl px-5 py-3 text-sm leading-relaxed border border-slate-200/50 shadow-xs">
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>

                      {/* Anexos se houver */}
                      {msg.attachedFileNames && msg.attachedFileNames.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          {msg.attachedFileNames.map((fn, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono border border-slate-200"
                            >
                              <Paperclip className="w-2.5 h-2.5" />
                              {fn}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Mensagem da IA */
                    <div className="flex items-start gap-3 max-w-full">
                      {/* Avatar IA */}
                      <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-1 shadow-xs">
                        O
                      </div>

                      <div className="flex-1 space-y-2 overflow-hidden">
                        {/* Selo do Smart Router se aplicável */}
                        {msg.isOrvexaAuto && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-medium border border-emerald-200">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>{msg.routerBadge || "ORVEXA Auto selecionou a melhor IA."}</span>
                          </div>
                        )}

                        {/* Conteúdo Renderizado com Markdown */}
                        <div className="text-slate-900 leading-relaxed text-sm">
                          <MarkdownRenderer
                            content={msg.content}
                            isStreaming={isStreaming && messages[messages.length - 1]?.id === msg.id}
                            theme="light"
                          />
                        </div>

                        {/* Barra de Ações (Copiar) */}
                        {msg.content && (
                          <div className="pt-1 flex items-center gap-2 text-xs text-slate-400">
                            <button
                              onClick={() => handleCopyMessage(msg.id, msg.content)}
                              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
                              title="Copiar resposta"
                            >
                              {copiedMsgId === msg.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600 font-semibold">Copiado</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Caixa de Entrada Fixa no Rodapé (Estilo ChatGPT) */}
      <div className="bg-gradient-to-t from-white via-white to-transparent pt-3 pb-4 px-4 shrink-0">
        <div className="max-w-3xl mx-auto w-full space-y-2">
          {/* Chips de Arquivos Anexados */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {attachedFiles.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs border border-slate-200 shadow-xs"
                >
                  <Paperclip className="w-3 h-3 text-slate-500" />
                  <span className="font-medium max-w-[140px] truncate">{f.name}</span>
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="p-0.5 hover:text-red-600 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Card de Digitação */}
          <div className="relative rounded-3xl border border-slate-300/80 bg-white shadow-md shadow-slate-100 focus-within:border-slate-500 focus-within:shadow-lg transition-all p-2.5 flex items-end gap-2">
            {/* Input Oculto de Upload */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.txt,.zip,.csv,.docx,.json,.md,image/*"
            />

            {/* Botão de Anexo (Paperclip) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors shrink-0 mb-0.5"
              title="Anexar arquivo (PDF, TXT, ZIP, Imagens)"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Textarea Auto-ajustável */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte qualquer coisa ao ORVEXA PRIME..."
              rows={1}
              className="flex-1 bg-transparent border-0 text-slate-900 placeholder-slate-400 text-sm focus:outline-none resize-none py-1.5 max-h-44 leading-relaxed"
            />

            {/* Botão de Enviar ou Parar */}
            {isStreaming ? (
              <button
                type="button"
                onClick={handleStopStreaming}
                className="p-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-colors shrink-0 mb-0.5 shadow-xs"
                title="Parar resposta"
              >
                <Square className="w-4 h-4 fill-white" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() && attachedFiles.length === 0}
                className="p-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 disabled:bg-slate-300 transition-all shrink-0 mb-0.5 shadow-xs"
                title="Enviar mensagem"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Assinatura ChatGPT Footer */}
          <p className="text-center text-[11px] text-slate-400 font-normal">
            O ORVEXA PRIME pode cometer erros. Verifique informações importantes.
          </p>
        </div>
      </div>
    </div>
  );
}
