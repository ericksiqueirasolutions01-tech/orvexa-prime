"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus, Lock, Mail, User, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get("plan") || "pro";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(initialPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plans = [
    { slug: "start", name: "START", price: "R$ 49,90" },
    { slug: "pro", name: "PRO", price: "R$ 119,90" },
    { slug: "premium", name: "PREMIUM", price: "R$ 249,90" },
    { slug: "empresa", name: "EMPRESA", price: "R$ 599,90" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          planSlug: selectedPlan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar conta.");
      }

      // Redireciona para tela de checkout / confirmação de pagamento
      router.push("/dashboard/billing?pending=true");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080C14] bg-grid flex items-center justify-center p-4 relative">
      <div className="absolute w-[500px] h-[300px] bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-lg bg-[#0D1322] border border-cyan-500/20 rounded-2xl p-8 relative shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <Link href="/" className="relative w-14 h-14 rounded-full overflow-hidden ring-4 ring-cyan-500/30 mb-2 shadow-neon-cyan">
            <Image src="/logo.jpg" alt="ORVEXA Logo" fill className="object-cover" />
          </Link>
          <h1 className="text-2xl font-black text-white">Criar Nova Conta</h1>
          <p className="text-xs text-slate-400 mt-1">
            Selecione seu plano e acesse o AI Gateway corporativo
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Nome Completo</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos Silva"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">E-mail</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@empresa.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Seleção do Plano */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Plano Escolhido</label>
            <div className="grid grid-cols-2 gap-2">
              {plans.map((p) => (
                <button
                  type="button"
                  key={p.slug}
                  onClick={() => setSelectedPlan(p.slug)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedPlan === p.slug
                      ? "bg-cyan-950/40 border-cyan-400 text-cyan-300 shadow-sm"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{p.name}</span>
                    {selectedPlan === p.slug && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">{p.price}/mês</div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold text-sm shadow-neon-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Processando cadastro..." : "Avançar para Assinatura"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Já possui conta?{" "}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold">
            Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080C14] flex items-center justify-center text-xs text-cyan-400">Carregando registro...</div>}>
      <RegisterForm />
    </Suspense>
  );
}

