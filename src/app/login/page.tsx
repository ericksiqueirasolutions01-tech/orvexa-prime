"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha na autenticação.");
      }

      // Redireciona baseado no papel do usuário
      if (data.user?.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (type: "admin" | "cliente") => {
    if (type === "admin") {
      setEmail("admin@orvexa.digital");
      setPassword("AdminOrvexa2026!");
    } else {
      setEmail("cliente@orvexa.digital");
      setPassword("ClienteOrvexa2026!");
    }
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#080C14] bg-grid flex items-center justify-center p-4 relative">
      {/* Background glow orb */}
      <div className="absolute w-[500px] h-[300px] bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-[#0D1322] border border-cyan-500/20 rounded-2xl p-8 relative shadow-2xl backdrop-blur-xl">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="relative w-16 h-16 rounded-full overflow-hidden ring-4 ring-cyan-500/30 mb-3 shadow-neon-cyan hover:scale-105 transition-transform">
            <Image src="/logo.jpg" alt="ORVEXA Logo" fill className="object-cover" />
          </Link>
          <h1 className="text-2xl font-black text-white tracking-wide">ORVEXA PRIME</h1>
          <p className="text-xs font-mono text-cyan-400 mt-1">AI GATEWAY & PLATAFORMA SAAS</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">E-mail corporativo</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@empresa.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Senha de acesso</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold text-sm shadow-neon-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block animate-spin mr-2">⟳</span>
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {loading ? "Autenticando..." : "Entrar na Plataforma"}
          </button>
        </form>

        {/* Botões de Acesso Rápido para Demonstração / Auditoria */}
        <div className="mt-6 pt-6 border-t border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium mb-2.5 text-center">
            Acesso Rápido de Demonstração:
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill("admin")}
              className="px-3 py-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-all"
            >
              Admin Master
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("cliente")}
              className="px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-all"
            >
              Cliente Ativo (PRO)
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Ainda não tem conta?{" "}
          <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold">
            Criar conta agora
          </Link>
        </div>
      </div>
    </div>
  );
}

