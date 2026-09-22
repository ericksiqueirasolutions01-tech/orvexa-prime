"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  Shield,
  CreditCard,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calendar,
  Layers,
  HardDrive,
  Lock,
  ArrowRight,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { CardSkeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const toast = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/profile");
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setName(data.user.name || "");
      }
    } catch (e) {
      toast.error("Erro de conexão", "Não foi possível carregar as informações do seu perfil.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning("Nome obrigatório", "Por favor, digite seu nome completo.");
      return;
    }

    try {
      setSavingProfile(true);
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Perfil atualizado!", "Suas informações cadastrais foram salvas com sucesso.");
        setUser((prev: any) => ({ ...prev, name: data.user.name }));
      } else {
        toast.error("Erro ao atualizar", data.error || "Não foi possível atualizar seus dados.");
      }
    } catch (e: any) {
      toast.error("Falha no servidor", "Ocorreu um erro ao salvar suas alterações.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.warning("Senha atual necessária", "Digite sua senha atual para autorizar a alteração.");
      return;
    }

    if (newPassword.length < 6) {
      toast.warning("Senha curta", "A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.warning("Senhas divergentes", "A confirmação da senha não coincide com a nova senha.");
      return;
    }

    try {
      setSavingPassword(true);
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Senha alterada com sucesso!", "Sua credencial de acesso foi atualizada.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error("Não foi possível alterar a senha", data.error || "Verifique se a senha atual está correta.");
      }
    } catch (e) {
      toast.error("Falha na solicitação", "Ocorreu um erro ao processar a troca de senha.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
        <div className="p-6 rounded-2xl bg-[#0D1322] border border-slate-800">
          <div className="h-6 w-48 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-72 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <CardSkeleton count={2} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#0D1322] border border-cyan-500/20 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-neon-cyan shrink-0">
            {user?.name ? user.name.substring(0, 2).toUpperCase() : "OP"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">{user?.name}</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {user?.status || "ACTIVE"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                Papel: <strong className="text-white">{user?.role}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Membro desde {new Date(user?.createdAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/billing"
          className="px-4 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0"
        >
          <CreditCard className="w-4 h-4 text-cyan-400" />
          Gerenciar Assinatura
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#0D1322] border border-slate-800">
          <span className="text-xs text-slate-400">Plano Contratado</span>
          <div className="text-lg font-black text-white mt-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            {user?.plan?.name || "START"}
          </div>
          <span className="text-[10px] text-cyan-400 block mt-1">
            {(user?.plan?.monthlyTokens || 0).toLocaleString("pt-BR")} tokens/mês
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0D1322] border border-slate-800">
          <span className="text-xs text-slate-400">Conversas Criadas</span>
          <div className="text-lg font-black text-emerald-400 mt-1">
            {user?.stats?.conversationsCount || 0}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Histórico sincronizado</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0D1322] border border-slate-800">
          <span className="text-xs text-slate-400">Arquivos no Workspace</span>
          <div className="text-lg font-black text-cyan-300 mt-1">
            {user?.stats?.filesCount || 0}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Disponíveis para análise e RAG</span>
        </div>
      </div>

      {/* Forms Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados Cadastrais */}
        <div className="p-6 rounded-2xl bg-[#0D1322] border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            Informações Cadastrais
          </h2>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nome Completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">E-mail Cadastrado</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/40 border border-slate-800 text-sm text-slate-400 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                O e-mail é o identificador único da conta e não pode ser alterado diretamente.
              </span>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-neon-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {savingProfile ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Salvando dados...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar Informações
                </>
              )}
            </button>
          </form>
        </div>

        {/* Alterar Senha */}
        <div className="p-6 rounded-2xl bg-[#0D1322] border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            Segurança & Senha de Acesso
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Senha Atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Digite sua senha atual"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Nova Senha (mínimo 6 caracteres)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Crie uma nova senha segura"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Confirmar Nova Senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Repita a nova senha"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {savingPassword ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Atualizando senha...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  Atualizar Senha
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

