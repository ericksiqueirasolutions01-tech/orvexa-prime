"use client";

import { useEffect, useState } from "react";
import { Users, Shield, CheckCircle2, Ban, RefreshCw, AlertCircle } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: newStatus }),
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlanChange = async (userId: string, newPlanId: string) => {
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, planId: newPlanId }),
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-cyan-500/20 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
          <Users className="w-3.5 h-3.5" />
          GOVERNANÇA & SEGURANÇA
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Gestão de Usuários & Assinantes
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Controle permissões de acesso, status da conta (ACTIVE, BLOCKED, PENDING_PAYMENT) e planos de cada cliente.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-[#0A0E1A] border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Base de Contas Cadastradas ({users.length})
          </h2>
          <button
            onClick={fetchUsers}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-xs text-slate-500">Carregando usuários...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Nome</th>
                  <th className="py-3 px-4 font-semibold">E-mail</th>
                  <th className="py-3 px-4 font-semibold">Papel</th>
                  <th className="py-3 px-4 font-semibold">Plano Ativo</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Ações de Controle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{u.name}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono">{u.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          u.role === "ADMIN"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={u.plan?.id || ""}
                        onChange={(e) => handlePlanChange(u.id, e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-cyan-300 focus:outline-none"
                      >
                        <option value="">Sem plano</option>
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (R$ {(p.priceCents / 100).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          u.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : u.status === "BLOCKED"
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {u.status !== "BLOCKED" ? (
                        <button
                          onClick={() => handleStatusChange(u.id, "BLOCKED")}
                          className="px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 text-[10px] font-medium transition-all"
                        >
                          Bloquear
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(u.id, "ACTIVE")}
                          className="px-2.5 py-1 rounded bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium transition-all"
                        >
                          Ativar Acesso
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

