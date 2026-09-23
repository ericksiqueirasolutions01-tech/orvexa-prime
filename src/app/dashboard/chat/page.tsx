// src/app/dashboard/chat/page.tsx
// INTERFACE DE CHAT MODERNA ESTILO CHATGPT — ORVEXA PRIME DIGITAL

"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import {
  Send,
  Sparkles,
  Paperclip,
  Trash2,
  Plus,
  Search,
  Pin,
  PinOff,
  Edit2,
  Check,
  X,
  Copy,
  ChevronDown,
  Square,
  Bot,
  User,
  PanelLeftClose,
  PanelLeft,
  MessageSquare,
  FileText,
  FileSpreadsheet,
  Palette,
  Archive,
  ArrowUp,
  Clock,
  Calendar,
  Folder,
  FolderPlus,
  FolderKanban,
  Brain,
  Info,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";

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

interface ConversationItem {
  id: string;
  title: string;
  modelPreference: string;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
  messagesCount: number;
  lastMessage?: string;
}

interface ProjectItem {
  id: string;
  name: string;
  description?: string | null;
  customInstructions?: string | null;
  status: string;
  filesCount: number;
  memoriesCount: number;
  conversationsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ProjectDetail extends ProjectItem {
  files: Array<{ id: string; fileName: string; fileSize: number; fileType?: string | null; createdAt: string }>;
  memories: Array<{ id: string; content: string; key?: string | null; category: string; createdAt: string }>;
  conversations: Array<{ id: string; title: string; modelPreference: string; createdAt: string; updatedAt: string; messagesCount: number; lastMessage?: string }>;
}

interface AttachedFile {
  name: string;
  size: number;
  url?: string;
  fileObj?: File;
}

const AI_MODELS = [
  { id: "orvexa-prime", name: "ORVEXA AUTO", label: "Auto Inteligente", badge: "Recomendado" },
  { id: "openai", name: "GPT", label: "OpenAI GPT-4o / Codex", badge: "Rápido" },
  { id: "claude", name: "Claude", label: "Anthropic Claude 3.5", badge: "Refinado" },
  { id: "gemini", name: "Gemini", label: "Google Gemini", badge: "Multimodal" },
];

export default function ChatModernPage() {
  // Estado das conversas
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  // Estados de edição inline
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState("");

  // Estado das mensagens e streaming
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState("orvexa-prime");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  // Sidebar e layout
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Estados de Projetos e Memória Contextual
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [projectManageModalOpen, setProjectManageModalOpen] = useState(false);
  const [projectDetails, setProjectDetails] = useState<ProjectDetail | null>(null);
  const [projectModalTab, setProjectModalTab] = useState<"memories" | "instructions" | "files">("memories");

  // Formulário de novo projeto
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectInstructions, setNewProjectInstructions] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  // Formulário de memória contextual
  const [newMemoryInput, setNewMemoryInput] = useState("");
  const [savingMemory, setSavingMemory] = useState(false);

  // Edição de instruções personalizadas
  const [editInstructionsInput, setEditInstructionsInput] = useState("");
  const [savingInstructions, setSavingInstructions] = useState(false);

  // Upload de arquivos do projeto
  const [uploadingProjFile, setUploadingProjFile] = useState(false);
  const projectFileInputRef = useRef<HTMLInputElement | null>(null);

  // Anexos
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Projeto ativo computado
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  // Carrega favoritos do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("orvexa_pinned_chats");
      if (saved) {
        setPinnedIds(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Salva favoritos no localStorage
  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [id, ...prev];
      localStorage.setItem("orvexa_pinned_chats", JSON.stringify(next));
      return next;
    });
  };

  // Carrega lista de projetos
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const res = await fetch("/api/ai/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error("Erro ao carregar projetos:", err);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Carrega detalhes completos do projeto
  const fetchProjectDetails = async (projectId: string) => {
    try {
      const res = await fetch(`/api/ai/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProjectDetails(data.project);
        setEditInstructionsInput(data.project.customInstructions || "");
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes do projeto:", err);
    }
  };

  // Carrega lista de conversas da API (filtrada por projeto se aplicável)
  const fetchConversations = async (targetProjectId?: string | null) => {
    try {
      setLoadingHistory(true);
      const projId = targetProjectId !== undefined ? targetProjectId : activeProjectId;
      const url = projId ? `/api/ai/conversations?projectId=${projId}` : "/api/ai/conversations";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchConversations();
  }, []);

  // Seleciona um projeto (ou null para Geral)
  const handleSelectProject = (projectId: string | null) => {
    setActiveProjectId(projectId);
    startNewConversation();
    fetchConversations(projectId);
    if (projectId) {
      fetchProjectDetails(projectId);
    } else {
      setProjectDetails(null);
    }
  };

  // Criar novo projeto
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      setCreatingProject(true);
      const res = await fetch("/api/ai/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDesc.trim() || undefined,
          customInstructions: newProjectInstructions.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const created = data.project;
        setProjects((prev) => [created, ...prev]);
        setActiveProjectId(created.id);
        setProjectDetails({
          ...created,
          files: [],
          memories: [],
          conversations: [],
        });
        setNewProjectName("");
        setNewProjectDesc("");
        setNewProjectInstructions("");
        setNewProjectModalOpen(false);
        startNewConversation();
        fetchConversations(created.id);
      }
    } catch (err) {
      console.error("Erro ao criar projeto:", err);
    } finally {
      setCreatingProject(false);
    }
  };

  // Salvar memória contextual manualmente
  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId || !newMemoryInput.trim()) return;

    try {
      setSavingMemory(true);
      const res = await fetch(`/api/ai/projects/${activeProjectId}/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMemoryInput.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        if (projectDetails) {
          setProjectDetails({
            ...projectDetails,
            memories: [data.memory, ...projectDetails.memories],
            memoriesCount: (projectDetails.memoriesCount || 0) + 1,
          });
        }
        setNewMemoryInput("");
        fetchProjects();
      }
    } catch (err) {
      console.error("Erro ao salvar memória:", err);
    } finally {
      setSavingMemory(false);
    }
  };

  // Excluir memória contextual
  const handleDeleteMemory = async (memoryId: string) => {
    if (!activeProjectId) return;
    try {
      const res = await fetch(`/api/ai/projects/${activeProjectId}/memories?memoryId=${memoryId}`, {
        method: "DELETE",
      });
      if (res.ok && projectDetails) {
        setProjectDetails({
          ...projectDetails,
          memories: projectDetails.memories.filter((m) => m.id !== memoryId),
          memoriesCount: Math.max(0, (projectDetails.memoriesCount || 1) - 1),
        });
        fetchProjects();
      }
    } catch (err) {
      console.error("Erro ao excluir memória:", err);
    }
  };

  // Upload de arquivo para o projeto
  const handleProjectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;

    try {
      setUploadingProjFile(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/ai/projects/${activeProjectId}/files`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (projectDetails) {
          setProjectDetails({
            ...projectDetails,
            files: [data.file, ...projectDetails.files],
            filesCount: (projectDetails.filesCount || 0) + 1,
          });
        }
        fetchProjects();
      }
    } catch (err) {
      console.error("Erro ao anexar arquivo ao projeto:", err);
    } finally {
      setUploadingProjFile(false);
      if (projectFileInputRef.current) projectFileInputRef.current.value = "";
    }
  };

  // Excluir arquivo do projeto
  const handleDeleteProjectFile = async (fileId: string) => {
    if (!activeProjectId) return;
    try {
      const res = await fetch(`/api/ai/projects/${activeProjectId}/files?fileId=${fileId}`, {
        method: "DELETE",
      });
      if (res.ok && projectDetails) {
        setProjectDetails({
          ...projectDetails,
          files: projectDetails.files.filter((f) => f.id !== fileId),
          filesCount: Math.max(0, (projectDetails.filesCount || 1) - 1),
        });
        fetchProjects();
      }
    } catch (err) {
      console.error("Erro ao excluir arquivo do projeto:", err);
    }
  };

  // Salvar instruções personalizadas editadas
  const handleSaveInstructions = async () => {
    if (!activeProjectId) return;
    try {
      setSavingInstructions(true);
      const res = await fetch(`/api/ai/projects/${activeProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customInstructions: editInstructionsInput.trim() }),
      });
      if (res.ok && projectDetails) {
        setProjectDetails({
          ...projectDetails,
          customInstructions: editInstructionsInput.trim(),
        });
        fetchProjects();
      }
    } catch (err) {
      console.error("Erro ao atualizar instruções:", err);
    } finally {
      setSavingInstructions(false);
    }
  };

  // Carrega mensagens da conversa ativa
  const selectConversation = async (convId: string) => {
    if (convId === activeConversationId) return;

    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }

    setActiveConversationId(convId);
    setMobileSidebarOpen(false);

    try {
      const res = await fetch(`/api/ai/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        const conv = data.conversation;
        if (conv) {
          setMessages(conv.messages || []);
          if (conv.modelPreference) {
            setSelectedModel(conv.modelPreference);
          }
        }
      }
    } catch (err) {
      console.error("Erro ao carregar conversa:", err);
    }
  };

  // Inicia Nova Conversa
  const startNewConversation = () => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
    setActiveConversationId(null);
    setMessages([]);
    setInput("");
    setAttachedFiles([]);
    setMobileSidebarOpen(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Renomear conversa
  const handleStartRename = (conv: ConversationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConvId(conv.id);
    setEditTitleInput(conv.title);
  };

  const handleSaveRename = async (convId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editTitleInput.trim()) {
      setEditingConvId(null);
      return;
    }

    try {
      const res = await fetch(`/api/ai/conversations/${convId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitleInput.trim() }),
      });

      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: editTitleInput.trim() } : c))
        );
      }
    } catch (err) {
      console.error("Erro ao renomear conversa:", err);
    } finally {
      setEditingConvId(null);
    }
  };

  // Excluir conversa
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Deseja realmente excluir esta conversa?")) return;

    try {
      const res = await fetch(`/api/ai/conversations/${convId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        setPinnedIds((prev) => prev.filter((id) => id !== convId));
        if (activeConversationId === convId) {
          startNewConversation();
        }
      }
    } catch (err) {
      console.error("Erro ao excluir conversa:", err);
    }
  };

  // Scroll suave para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Auto-resize do textarea conforme o usuário digita
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  // Tratamento de anexo de arquivos
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: AttachedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      newAttachments.push({
        name: f.name,
        size: f.size,
        fileObj: f,
      });
    }

    setAttachedFiles((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Enviar Mensagem com Streaming SSE
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

    // Upload de arquivos associados se houver
    let fileUploadedOk = false;
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
            await fetch("/api/workspace/upload", {
              method: "POST",
              body: formData,
            });
            fileUploadedOk = true;
          }
        }
      } catch (err) {
        console.error("Falha no upload dos anexos:", err);
      } finally {
        setUploadingFiles(false);
        setAttachedFiles([]);
      }
    }

    // Prepara mensagem da IA para streaming
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
          hasFiles: fileUploadedOk || (userMessage.attachedFileNames && userMessage.attachedFileNames.length > 0),
        }),
      });

      // Captura ID da conversa criado pelo backend se for a primeira mensagem
      const convIdHeader = response.headers.get("x-orvexa-conversation-id");
      if (convIdHeader && (!activeConversationId || activeConversationId !== convIdHeader)) {
        setActiveConversationId(convIdHeader);
      }

      // Captura selo do Smart Router se presente
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
        throw new Error(errorData.error || `Erro HTTP (${response.status}) ao processar resposta.`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedContent += chunk;

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, content: accumulatedContent } : msg
            )
          );
        }
      }

      // Recarrega lista de conversas para atualizar títulos e horários
      fetchConversations();
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Streaming interrompido pelo usuário.");
      } else {
        console.error("Erro na comunicação com o AI Gateway:", err);
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

  // Parar geração em andamento
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Atalhos de teclado no textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filtragem e agrupamento de conversas por data e favoritos
  const groupedConversations = useMemo(() => {
    const filtered = conversations.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pinned: ConversationItem[] = [];
    const today: ConversationItem[] = [];
    const yesterday: ConversationItem[] = [];
    const last7Days: ConversationItem[] = [];
    const older: ConversationItem[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const sevenDaysAgo = todayStart - 6 * 86400000;

    for (const c of filtered) {
      if (pinnedIds.includes(c.id)) {
        pinned.push(c);
        continue;
      }

      const date = new Date(c.updatedAt).getTime();
      if (date >= todayStart) {
        today.push(c);
      } else if (date >= yesterdayStart) {
        yesterday.push(c);
      } else if (date >= sevenDaysAgo) {
        last7Days.push(c);
      } else {
        older.push(c);
      }
    }

    return { pinned, today, yesterday, last7Days, older };
  }, [conversations, searchQuery, pinnedIds]);

  const activeModelObj = AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0];

  return (
    <div className="flex h-screen w-full bg-[#080C14] text-slate-100 overflow-hidden font-sans">
      {/* ------------------------------------------------------------------- */}
      {/* 1. SIDEBAR DE CONVERSAS (DESKTOP E MOBILE) */}
      {/* ------------------------------------------------------------------- */}
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-0 -ml-72 md:ml-0 md:w-0"
        } transition-all duration-300 ease-in-out shrink-0 bg-[#0A0E1A] border-r border-slate-800/80 flex flex-col h-full z-30 select-none overflow-hidden`}
      >
        {/* Top Header da Sidebar */}
        <div className="p-3.5 border-b border-slate-800/70 space-y-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={startNewConversation}
              type="button"
              className="flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 border border-cyan-500/30 text-white text-xs font-semibold shadow-sm transition-all group"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400 group-hover:rotate-90 transition-transform" />
                Nova Conversa
              </span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900/80 text-slate-400 border border-slate-700/60">
                ⌘N
              </kbd>
            </button>

            <button
              onClick={() => setSidebarOpen(false)}
              className="hidden md:flex ml-2 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              title="Recolher barra lateral"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Seção de Projetos e Espaços Inteligentes */}
        <div className="px-3 pt-2 pb-2 border-b border-slate-800/80 space-y-1.5 shrink-0">
          <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
              Projetos
            </span>
            <button
              type="button"
              onClick={() => setNewProjectModalOpen(true)}
              className="p-1 px-1.5 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors flex items-center gap-1 text-[11px] font-medium"
              title="Criar novo projeto com memória contextual"
            >
              <Plus className="w-3 h-3" />
              <span>Novo Projeto</span>
            </button>
          </div>

          <div className="space-y-0.5 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-0.5">
            {/* Opção Geral (Sem Projeto) */}
            <button
              type="button"
              onClick={() => handleSelectProject(null)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-all ${
                activeProjectId === null
                  ? "bg-slate-800/90 text-white font-medium border border-slate-700/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Geral (Sem projeto)</span>
              </span>
            </button>

            {/* Lista de Projetos do Usuário */}
            {projects.map((proj) => {
              const isSelected = activeProjectId === proj.id;
              return (
                <div
                  key={proj.id}
                  className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                    isSelected
                      ? "bg-cyan-500/15 text-cyan-300 font-medium border border-cyan-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectProject(proj.id)}
                    className="flex-1 flex items-center gap-2 truncate text-left"
                    title={proj.description || proj.name}
                  >
                    <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-cyan-400" : "text-slate-500"}`} />
                    <span className="truncate">{proj.name}</span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    {(proj.memoriesCount > 0 || proj.filesCount > 0) && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 group-hover:bg-slate-700">
                        {proj.memoriesCount + proj.filesCount}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveProjectId(proj.id);
                        fetchProjectDetails(proj.id);
                        setProjectManageModalOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-cyan-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Gerenciar memórias e arquivos do projeto"
                    >
                      <Brain className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista de Conversas com Agrupamento Temporal */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-800">
          {loadingHistory && conversations.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-xs">Carregando histórico...</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs space-y-2">
              <MessageSquare className="w-6 h-6 mx-auto opacity-30 text-cyan-400" />
              <p>Nenhuma conversa ainda.</p>
              <p className="text-[11px] text-slate-600">Inicie um novo chat para começar.</p>
            </div>
          ) : (
            <>
              {/* Grupo: Favoritos */}
              {groupedConversations.pinned.length > 0 && (
                <ConversationGroup
                  title="Fixados"
                  icon={Pin}
                  items={groupedConversations.pinned}
                  activeId={activeConversationId}
                  pinnedIds={pinnedIds}
                  editingId={editingConvId}
                  editInput={editTitleInput}
                  onSelect={selectConversation}
                  onTogglePin={togglePin}
                  onStartRename={handleStartRename}
                  onSaveRename={handleSaveRename}
                  onDelete={handleDeleteConversation}
                  onEditInputChange={setEditTitleInput}
                />
              )}

              {/* Grupo: Hoje */}
              {groupedConversations.today.length > 0 && (
                <ConversationGroup
                  title="Hoje"
                  items={groupedConversations.today}
                  activeId={activeConversationId}
                  pinnedIds={pinnedIds}
                  editingId={editingConvId}
                  editInput={editTitleInput}
                  onSelect={selectConversation}
                  onTogglePin={togglePin}
                  onStartRename={handleStartRename}
                  onSaveRename={handleSaveRename}
                  onDelete={handleDeleteConversation}
                  onEditInputChange={setEditTitleInput}
                />
              )}

              {/* Grupo: Ontem */}
              {groupedConversations.yesterday.length > 0 && (
                <ConversationGroup
                  title="Ontem"
                  items={groupedConversations.yesterday}
                  activeId={activeConversationId}
                  pinnedIds={pinnedIds}
                  editingId={editingConvId}
                  editInput={editTitleInput}
                  onSelect={selectConversation}
                  onTogglePin={togglePin}
                  onStartRename={handleStartRename}
                  onSaveRename={handleSaveRename}
                  onDelete={handleDeleteConversation}
                  onEditInputChange={setEditTitleInput}
                />
              )}

              {/* Grupo: Últimos 7 dias */}
              {groupedConversations.last7Days.length > 0 && (
                <ConversationGroup
                  title="Últimos 7 dias"
                  items={groupedConversations.last7Days}
                  activeId={activeConversationId}
                  pinnedIds={pinnedIds}
                  editingId={editingConvId}
                  editInput={editTitleInput}
                  onSelect={selectConversation}
                  onTogglePin={togglePin}
                  onStartRename={handleStartRename}
                  onSaveRename={handleSaveRename}
                  onDelete={handleDeleteConversation}
                  onEditInputChange={setEditTitleInput}
                />
              )}

              {/* Grupo: Anteriores */}
              {groupedConversations.older.length > 0 && (
                <ConversationGroup
                  title="Anteriores"
                  items={groupedConversations.older}
                  activeId={activeConversationId}
                  pinnedIds={pinnedIds}
                  editingId={editingConvId}
                  editInput={editTitleInput}
                  onSelect={selectConversation}
                  onTogglePin={togglePin}
                  onStartRename={handleStartRename}
                  onSaveRename={handleSaveRename}
                  onDelete={handleDeleteConversation}
                  onEditInputChange={setEditTitleInput}
                />
              )}
            </>
          )}
        </div>
      </aside>

      {/* ------------------------------------------------------------------- */}
      {/* 2. ÁREA PRINCIPAL DO CHAT */}
      {/* ------------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#080C14]">
        {/* Barra Superior / Header do Chat */}
        <header className="h-14 px-4 border-b border-slate-800/80 bg-[#080C14]/90 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="hidden md:flex p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors"
                title="Abrir barra lateral de conversas"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            {/* Seletor de Inteligência Simplificado */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setModelDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-xs font-semibold text-white transition-all shadow-sm group"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>{activeModelObj.name}</span>
                <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                  • {activeModelObj.label}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>

              {/* Menu Dropdown de Modelos */}
              {modelDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setModelDropdownOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-[#0D1322] border border-slate-800 rounded-2xl shadow-2xl p-1.5 z-50 animate-scaleIn space-y-1">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      Selecione o Motor de IA
                    </div>
                    {AI_MODELS.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          setSelectedModel(model.id);
                          setModelDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all text-xs ${
                          selectedModel === model.id
                            ? "bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30"
                            : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-[10px] text-slate-400">{model.label}</div>
                        </div>
                        {selectedModel === model.id && (
                          <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Chip do Projeto Ativo no Header */}
            {activeProject && (
              <button
                type="button"
                onClick={() => {
                  fetchProjectDetails(activeProject.id);
                  setProjectManageModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium transition-all group"
                title="Configurações, memórias e arquivos do projeto ativo"
              >
                <FolderKanban className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="max-w-[120px] sm:max-w-[200px] truncate">{activeProject.name}</span>
                <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-200">
                  {(activeProject.memoriesCount || 0) + (activeProject.filesCount || 0)} dados
                </span>
              </button>
            )}
          </div>

          {/* Ações da Direita */}
          <div className="flex items-center gap-2">
            <button
              onClick={startNewConversation}
              className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo Chat</span>
            </button>
          </div>
        </header>

        {/* ----------------------------------------------------------------- */}
        {/* THREAD DE MENSAGENS */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 max-w-4xl w-full mx-auto space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          {messages.length === 0 ? (
            /* Estado Inicial / Boas-vindas */
            <div className="h-full flex flex-col items-center justify-center text-center my-auto min-h-[50vh] space-y-8 animate-fadeIn">
              <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-cyan-500/40 shadow-neon-cyan shrink-0">
                <Image src="/logo.jpg" alt="ORVEXA Logo" fill className="object-cover" priority />
              </div>

              <div className="space-y-2 max-w-lg">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Como posso ajudar você hoje?
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Assistente de IA de alta precisão com suporte a múltiplos motores, código,
                  documentos e raciocínio estratégico.
                </p>

                {activeProject && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        fetchProjectDetails(activeProject.id);
                        setProjectManageModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-200 text-xs transition-all"
                    >
                      <Brain className="w-3.5 h-3.5 text-purple-400" />
                      <span>Projeto: <strong>{activeProject.name}</strong></span>
                      <span className="text-purple-400">• {(activeProject.memoriesCount || 0)} memórias salvas</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Cards de Sugestões de Prompt Rápidos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left">
                <PromptSuggestionCard
                  title="Escrever Código Limpo"
                  desc="Gere uma API REST em TypeScript com Clean Architecture"
                  onClick={() =>
                    handleSendMessage(
                      "Crie uma arquitetura de API modular em TypeScript com separação de controllers, services e repositórios."
                    )
                  }
                />
                <PromptSuggestionCard
                  title="Auditoria de Contrato"
                  desc="Identifique riscos, multas e cláusulas sensíveis em um texto"
                  onClick={() =>
                    handleSendMessage(
                      "Analise as cláusulas contratuais de rescisão e indique os pontos de maior risco jurídico e financeiro."
                    )
                  }
                />
                <PromptSuggestionCard
                  title="Estratégia de Negócios"
                  desc="Plano tático para aumentar conversão e reduzir CAC"
                  onClick={() =>
                    handleSendMessage(
                      "Elabore uma estratégia prática para dobrar a taxa de conversão de uma landing page B2B."
                    )
                  }
                />
                <PromptSuggestionCard
                  title="Explicar Conceito Complexo"
                  desc="Didática clara pelo método Feynman em minutos"
                  onClick={() =>
                    handleSendMessage(
                      "Explique o funcionamento de transformadores neurais e atenção de IA como se eu tivesse 12 anos."
                    )
                  }
                />
              </div>
            </div>
          ) : (
            /* Lista de Mensagens do Chat */
            messages.map((msg, index) => {
              const isUser = msg.role === "user";
              const isLastAssistant = !isUser && index === messages.length - 1;

              return (
                <div
                  key={msg.id || index}
                  className={`flex gap-3.5 sm:gap-4 ${isUser ? "justify-end" : "justify-start"} animate-fadeIn`}
                >
                  {/* Avatar da IA */}
                  {!isUser && (
                    <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-cyan-500/30 shrink-0 mt-0.5 shadow-sm bg-slate-900">
                      <Image src="/logo.jpg" alt="ORVEXA" fill className="object-cover" />
                    </div>
                  )}

                  {/* Conteúdo da Mensagem */}
                  <div
                    className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 sm:p-5 text-sm leading-relaxed ${
                      isUser
                        ? "bg-slate-800/90 text-white border border-slate-700/70 rounded-tr-sm shadow-md"
                        : "bg-[#0B0F19] text-slate-100 border border-slate-800 rounded-tl-sm shadow-xl"
                    }`}
                  >
                    {/* Anexos de Arquivos do Usuário */}
                    {isUser && msg.attachedFileNames && msg.attachedFileNames.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2.5 pb-2 border-b border-slate-700/60">
                        {msg.attachedFileNames.map((fn, fIdx) => (
                          <span
                            key={fIdx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-700 text-[11px] font-mono text-cyan-300"
                          >
                            <FileText className="w-3 h-3 text-cyan-400" />
                            {fn}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Selo Discreto do ORVEXA AUTO */}
                    {!isUser && (msg.isOrvexaAuto || msg.routerBadge) && (
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-cyan-400/90 mb-2.5 pb-2 border-b border-cyan-500/10">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{msg.routerBadge || "ORVEXA escolheu a melhor IA para esta tarefa."}</span>
                      </div>
                    )}

                    {/* Texto Renderizado */}
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      <MarkdownRenderer
                        content={msg.content}
                        isStreaming={isStreaming && isLastAssistant}
                      />
                    )}

                    {/* Botão de Cópia da Resposta da IA */}
                    {!isUser && msg.content && (
                      <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(msg.content)}
                          className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-cyan-300 transition-colors"
                          title="Copiar resposta completa"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copiar texto</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Avatar do Usuário */}
                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-cyan-400" />
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* 3. COMPOSITOR DE MENSAGENS INFERIOR ESTILO CHATGPT */}
        {/* ----------------------------------------------------------------- */}
        <div className="p-4 sm:p-5 bg-gradient-to-t from-[#080C14] via-[#080C14]/95 to-transparent shrink-0">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* Lista de Pré-visualização de Anexos */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-900/80 rounded-xl border border-slate-800">
                {attachedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 font-mono"
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-slate-400 hover:text-red-400 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Container Flutuante */}
            <div className="relative rounded-2xl bg-[#0D1322] border border-slate-700/80 focus-within:border-cyan-500/60 shadow-2xl transition-all flex flex-col p-2.5">
              {/* Textarea Auto-expansível */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte ao ORVEXA PRIME... (Shift + Enter para nova linha)"
                rows={1}
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 px-3 py-1.5 resize-none focus:outline-none max-h-48 scrollbar-thin scrollbar-thumb-slate-800 leading-relaxed font-sans"
              />

              {/* Botões de Ação na Base do Compositor */}
              <div className="flex items-center justify-between pt-2 px-2 border-t border-slate-800/60 mt-1">
                {/* Botão de Anexo e Salvar Memória */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFiles || isStreaming}
                    className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-all disabled:opacity-50"
                    title="Anexar arquivo (PDF, Planilha, Código, Imagem)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {activeProject && (
                    <button
                      type="button"
                      onClick={() => {
                        fetchProjectDetails(activeProject.id);
                        setProjectModalTab("memories");
                        setProjectManageModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-all"
                      title="Salvar informação importante na memória deste projeto"
                    >
                      <Brain className="w-3.5 h-3.5 text-purple-400" />
                      <span className="hidden sm:inline font-medium">Salvar Informação</span>
                    </button>
                  )}
                </div>

                {/* Botão Enviar / Parar Geração */}
                <div>
                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={handleStopStreaming}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-semibold transition-all"
                      title="Interromper geração da resposta"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Parar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={!input.trim() && attachedFiles.length === 0}
                      className="w-8 h-8 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-cyan-500 shadow-neon-cyan"
                      title="Enviar mensagem (Enter)"
                    >
                      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Aviso Sutil de Rodapé */}
            <div className="text-center text-[11px] text-slate-500 select-none">
              ORVEXA PRIME pode cometer erros. Verifique informações essenciais.
            </div>
          </div>
        </div>
      </main>

      {/* --------------------------------------------------------------- */}
      {/* MODAL: NOVO PROJETO                                             */}
      {/* --------------------------------------------------------------- */}
      {newProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0B101D] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Novo Projeto Inteligente</h3>
                  <p className="text-xs text-slate-400">Crie um espaço de trabalho com memória e contexto dedicados</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewProjectModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome do Projeto <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Minha Empresa, Redator Tech, Finanças 2026..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Espaço para desenvolvimento dos relatórios e estratégia corporativa"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Instruções Personalizadas (Diretrizes da IA)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Empresa atua no ramo X. Tom de comunicação profissional. Clientes principais são Y."
                  value={newProjectInstructions}
                  onChange={(e) => setNewProjectInstructions(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors resize-none leading-relaxed"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Essas instruções serão aplicadas automaticamente em todas as conversas deste projeto.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingProject || !newProjectName.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all disabled:opacity-50"
                >
                  {creatingProject ? "Criando..." : "Criar Projeto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------- */}
      {/* MODAL: GERENCIAR PROJETO & MEMÓRIA CONTEXTUAL                   */}
      {/* --------------------------------------------------------------- */}
      {projectManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0B101D] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {projectDetails?.name || activeProject?.name || "Espaço do Projeto"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Memória contextual, instruções personalizadas e base de conhecimento
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProjectManageModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Abas */}
            <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setProjectModalTab("memories")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  projectModalTab === "memories"
                    ? "bg-purple-500/20 text-purple-200 border border-purple-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Memória Contextual ({projectDetails?.memories?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setProjectModalTab("instructions")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  projectModalTab === "instructions"
                    ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Instruções</span>
              </button>

              <button
                type="button"
                onClick={() => setProjectModalTab("files")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  projectModalTab === "files"
                    ? "bg-blue-500/20 text-blue-200 border border-blue-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>Arquivos ({projectDetails?.files?.length || 0})</span>
              </button>
            </div>

            {/* Conteúdo da Aba */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-800 min-h-[260px]">
              {/* ABA 1: MEMÓRIA CONTEXTUAL */}
              {projectModalTab === "memories" && (
                <div className="space-y-4">
                  {/* Formulário para salvar nova informação */}
                  <form onSubmit={handleSaveMemory} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="block text-xs font-medium text-slate-300">
                      + Salvar informação importante na memória do projeto
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: Empresa atua no ramo X. Tom de comunicação profissional. Clientes são Y."
                        value={newMemoryInput}
                        onChange={(e) => setNewMemoryInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                      />
                      <button
                        type="submit"
                        disabled={savingMemory || !newMemoryInput.trim()}
                        className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-all disabled:opacity-50 shrink-0"
                      >
                        {savingMemory ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Dica: você também pode pedir no chat: &quot;Guarde que minha empresa usa linguagem formal&quot;.
                    </p>
                  </form>

                  {/* Lista de Memórias */}
                  <div className="space-y-2">
                    {projectDetails?.memories && projectDetails.memories.length > 0 ? (
                      projectDetails.memories.map((mem) => (
                        <div
                          key={mem.id}
                          className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-200 group"
                        >
                          <div className="flex items-start gap-2.5">
                            <Brain className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                            <div className="space-y-0.5">
                              <p className="leading-relaxed">{mem.content}</p>
                              <span className="text-[10px] text-slate-500">
                                {new Date(mem.createdAt).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteMemory(mem.id)}
                            className="p-1 text-slate-500 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remover memória"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-slate-500 text-xs space-y-1">
                        <Brain className="w-6 h-6 mx-auto opacity-30 text-purple-400" />
                        <p>Nenhuma memória gravada ainda neste projeto.</p>
                        <p className="text-[11px] text-slate-600">
                          Adicione informações importantes acima ou ensine o ORVEXA conversando diretamente.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ABA 2: INSTRUÇÕES PERSONALIZADAS */}
              {projectModalTab === "instructions" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-300">
                      Diretrizes Permanentes do Assistente
                    </label>
                    <p className="text-xs text-slate-400">
                      Defina como a IA deve se comportar, tom de voz, regras de negócio e restrições.
                    </p>
                  </div>

                  <textarea
                    rows={7}
                    value={editInstructionsInput}
                    onChange={(e) => setEditInstructionsInput(e.target.value)}
                    placeholder="Ex: Empresa atua no ramo X. Tom de comunicação profissional. Clientes principais são Y. Sempre formate relatórios com tabelas sintéticas."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 leading-relaxed font-sans"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveInstructions}
                      disabled={savingInstructions}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-all disabled:opacity-50"
                    >
                      {savingInstructions ? "Salvando..." : "Salvar Diretrizes"}
                    </button>
                  </div>
                </div>
              )}

              {/* ABA 3: ARQUIVOS DO PROJETO */}
              {projectModalTab === "files" && (
                <div className="space-y-3">
                  {/* Upload Trigger */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div>
                      <div className="text-xs font-medium text-slate-200">Adicionar Arquivos à Base do Projeto</div>
                      <div className="text-[11px] text-slate-400">PDFs, planilhas ou documentos de referência</div>
                    </div>
                    <input
                      type="file"
                      ref={projectFileInputRef}
                      onChange={handleProjectFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => projectFileInputRef.current?.click()}
                      disabled={uploadingProjFile}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{uploadingProjFile ? "Processando..." : "Enviar Arquivo"}</span>
                    </button>
                  </div>

                  {/* Lista de Arquivos */}
                  <div className="space-y-2">
                    {projectDetails?.files && projectDetails.files.length > 0 ? (
                      projectDetails.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-200 group"
                        >
                          <div className="flex items-center gap-2.5 truncate min-w-0">
                            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                            <div className="truncate">
                              <p className="truncate font-medium">{file.fileName}</p>
                              <span className="text-[10px] text-slate-500">
                                {(file.fileSize / 1024).toFixed(1)} KB •{" "}
                                {new Date(file.createdAt).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteProjectFile(file.id)}
                            className="p-1 text-slate-500 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remover arquivo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-slate-500 text-xs space-y-1">
                        <Folder className="w-6 h-6 mx-auto opacity-30 text-blue-400" />
                        <p>Nenhum arquivo associado a este projeto.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
              <span className="text-[11px] text-slate-500">
                O Smart Router utiliza automaticamente esta base ao responder.
              </span>
              <button
                type="button"
                onClick={() => setProjectManageModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-COMPONENTE: GRUPO DE CONVERSAS NA SIDEBAR
// ---------------------------------------------------------------------------
function ConversationGroup({
  title,
  icon: Icon,
  items,
  activeId,
  pinnedIds,
  editingId,
  editInput,
  onSelect,
  onTogglePin,
  onStartRename,
  onSaveRename,
  onDelete,
  onEditInputChange,
}: {
  title: string;
  icon?: any;
  items: ConversationItem[];
  activeId: string | null;
  pinnedIds: string[];
  editingId: string | null;
  editInput: string;
  onSelect: (id: string) => void;
  onTogglePin: (id: string, e: React.MouseEvent) => void;
  onStartRename: (conv: ConversationItem, e: React.MouseEvent) => void;
  onSaveRename: (id: string, e?: React.FormEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onEditInputChange: (val: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        {Icon ? <Icon className="w-3 h-3 text-cyan-400" /> : null}
        <span>{title}</span>
      </div>

      <div className="space-y-0.5">
        {items.map((conv) => {
          const isActive = conv.id === activeId;
          const isPinned = pinnedIds.includes(conv.id);
          const isEditing = conv.id === editingId;

          if (isEditing) {
            return (
              <form
                key={conv.id}
                onSubmit={(e) => onSaveRename(conv.id, e)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/50"
              >
                <input
                  type="text"
                  autoFocus
                  value={editInput}
                  onChange={(e) => onEditInputChange(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-white px-1.5 focus:outline-none font-sans"
                />
                <button
                  type="submit"
                  className="p-1 text-emerald-400 hover:text-emerald-300"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </form>
            );
          }

          return (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all ${
                isActive
                  ? "bg-slate-800/90 text-white font-medium shadow-sm border border-slate-700/60"
                  : "text-slate-300 hover:bg-slate-900/80 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate min-w-0 flex-1 mr-2">
                <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                <span className="truncate text-xs">{conv.title}</span>
              </div>

              {/* Botões de Ação na Linha (Hover) */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
                <button
                  type="button"
                  onClick={(e) => onTogglePin(conv.id, e)}
                  className="p-1 text-slate-400 hover:text-cyan-300 rounded"
                  title={isPinned ? "Desafixar" : "Fixar no topo"}
                >
                  {isPinned ? <PinOff className="w-3 h-3 text-cyan-400" /> : <Pin className="w-3 h-3" />}
                </button>

                <button
                  type="button"
                  onClick={(e) => onStartRename(conv, e)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                  title="Renomear"
                >
                  <Edit2 className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={(e) => onDelete(conv.id, e)}
                  className="p-1 text-slate-400 hover:text-red-400 rounded"
                  title="Excluir"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-COMPONENTE: CARD DE SUGESTÃO DE PROMPT (ESTADO INICIAL)
// ---------------------------------------------------------------------------
function PromptSuggestionCard({
  title,
  desc,
  onClick,
}: {
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-3.5 rounded-2xl bg-[#0D1322] border border-slate-800 hover:border-cyan-500/40 text-left transition-all hover:bg-slate-900/90 shadow-sm group"
    >
      <div className="font-semibold text-xs text-white group-hover:text-cyan-300 transition-colors">
        {title}
      </div>
      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{desc}</div>
    </button>
  );
}
