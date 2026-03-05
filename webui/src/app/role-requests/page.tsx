"use client";
import { useState, useEffect, useCallback } from "react";

interface RoleRequest {
  id: string;
  userId: string;
  userTag: string;
  factionTag: string;
  factionTitle: string;
  factionEmoji: string;
  roleName: string;
  status: "pending" | "approved" | "denied";
  approvedBy: string | null;
  approverTag: string | null;
  createdAt: string;
  decidedAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  approved: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  denied: "text-red-400 bg-red-500/10 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "⏳ Ожидает",
  approved: "✅ Одобрен",
  denied: "❌ Отклонён",
};

export default function RoleRequestsPage() {
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [panelLoading, setPanelLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? "/api/proxy/role-requests" : `/api/proxy/role-requests?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setRequests(data.requests || []);
      setTotal(data.total || 0);
    } catch {
      setRequests([]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchRequests();
    const id = setInterval(fetchRequests, 5000);
    return () => clearInterval(id);
  }, [fetchRequests]);

  const handleAction = async (id: string, action: "approve" | "deny") => {
    setActionLoading((p) => ({ ...p, [id]: true }));
    try {
      const endpoint = action === "approve" ? "/api/proxy/role-request-approve" : "/api/proxy/role-request-deny";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ text: data.message, ok: true });
        fetchRequests();
      } else {
        setMessage({ text: data.error || "Ошибка", ok: false });
      }
    } catch (e: any) {
      setMessage({ text: e.message, ok: false });
    }
    setActionLoading((p) => ({ ...p, [id]: false }));
  };

  const postPanel = async () => {
    if (!confirm("Отправить панель запроса ролей в канал 📩│запрос-роли?\nИгроки увидят кнопку для подачи заявки.")) return;
    setPanelLoading(true);
    try {
      const res = await fetch("/api/proxy/role-request-panel", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMessage({ text: "Панель запроса ролей отправлена!", ok: true });
      } else {
        setMessage({ text: data.error || "Ошибка", ok: false });
      }
    } catch (e: any) {
      setMessage({ text: e.message, ok: false });
    }
    setPanelLoading(false);
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <main className="min-h-screen p-6 lg:p-16 font-sans max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="pb-6 border-b border-white/10">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-500">
          📩 Запросы ролей
        </h1>
        <p className="mt-2 text-zinc-400 text-sm">
          Система запроса ролей организаций. Игроки запрашивают → руководство одобряет → бот выдаёт роль.
        </p>
      </header>

      {/* Alert */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm border ${
            message.ok ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          {message.ok ? "✅" : "❌"} {message.text}
          <button onClick={() => setMessage(null)} className="float-right text-zinc-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Actions bar */}
      <div className="glass-panel p-5 rounded-2xl border border-pink-500/20 flex flex-wrap items-center gap-4">
        <button
          onClick={postPanel}
          disabled={panelLoading}
          className="px-5 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-500/50 transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] disabled:opacity-50 text-sm"
        >
          {panelLoading ? "⏳..." : "📩 Отправить панель запроса в Discord"}
        </button>

        <div className="flex-1" />

        <div className="flex gap-2 text-sm">
          {["all", "pending", "approved", "denied"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                filter === s
                  ? "bg-white/10 border-white/30 text-white font-bold"
                  : "bg-white/5 border-white/10 text-zinc-500 hover:text-white"
              }`}
            >
              {s === "all" ? `📋 Все (${total})` : STATUS_LABELS[s]}
              {s === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10">
        <h2 className="font-bold text-white text-sm mb-3">🔄 Как работает система</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="p-3 bg-indigo-500/5 rounded-lg border border-indigo-500/20 text-center">
            <span className="text-2xl">📩</span>
            <p className="text-zinc-300 mt-1">Игрок нажимает<br /><b>"Запросить роль"</b></p>
          </div>
          <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/20 text-center">
            <span className="text-2xl">🏢</span>
            <p className="text-zinc-300 mt-1">Выбирает<br /><b>организацию</b></p>
          </div>
          <div className="p-3 bg-pink-500/5 rounded-lg border border-pink-500/20 text-center">
            <span className="text-2xl">👑</span>
            <p className="text-zinc-300 mt-1">Лидер/Зам<br /><b>одобряет или нет</b></p>
          </div>
          <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20 text-center">
            <span className="text-2xl">🤖</span>
            <p className="text-zinc-300 mt-1">Бот <b>автоматически</b><br />выдаёт роль</p>
          </div>
        </div>
        <div className="mt-3 p-3 bg-white/5 rounded-lg text-zinc-400 text-xs">
          <b>Кто может одобрить:</b> Для каждой организации — только <b>👑 Лидер</b> и <b>👔 Зам. Лидера</b> этой организации.
          <b>🛡️ Админы</b> и <b>🔨 Модераторы</b> могут одобрить запрос в любую организацию.
        </div>
      </div>

      {/* Requests table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-bold text-white">
            📋 Запросы{" "}
            <span className="text-zinc-500 text-sm font-normal">({requests.length})</span>
          </h2>
          <button onClick={fetchRequests} className="text-zinc-500 hover:text-white text-sm transition-colors">
            🔄 Обновить
          </button>
        </div>

        {loading && requests.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">⏳ Загрузка...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <span className="text-4xl block mb-3">📭</span>
            Запросов пока нет.
            {filter !== "all" && (
              <button onClick={() => setFilter("all")} className="block mx-auto mt-2 text-indigo-400 text-sm hover:underline">
                Показать все
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {requests.map((r) => (
              <div key={r.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                {/* Faction badge */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-lg border border-white/10">
                  {r.factionEmoji}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm truncate">{r.userTag}</span>
                    <span className="text-zinc-600 text-xs font-mono">{r.userId}</span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    <span className="font-medium">{r.factionEmoji} {r.factionTitle}</span>
                    <span className="mx-1.5 text-zinc-600">→</span>
                    <span>{r.roleName}</span>
                  </div>
                </div>

                {/* Status */}
                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${STATUS_COLORS[r.status]}`}>
                  {STATUS_LABELS[r.status]}
                </div>

                {/* Date */}
                <div className="text-zinc-600 text-xs tabular-nums whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>

                {/* Actions */}
                {r.status === "pending" ? (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAction(r.id, "approve")}
                      disabled={!!actionLoading[r.id]}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-all disabled:opacity-50"
                    >
                      {actionLoading[r.id] ? "..." : "✅ Одобрить"}
                    </button>
                    <button
                      onClick={() => handleAction(r.id, "deny")}
                      disabled={!!actionLoading[r.id]}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/40 transition-all disabled:opacity-50"
                    >
                      {actionLoading[r.id] ? "..." : "❌ Отклонить"}
                    </button>
                  </div>
                ) : (
                  <div className="text-zinc-600 text-xs whitespace-nowrap">
                    {r.approverTag && <span>от {r.approverTag}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
