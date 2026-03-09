"use client";
import { useState, useEffect, useCallback } from "react";

/* ─── types ─── */
interface RoleRequest {
  id: string;
  userId: string;
  userTag: string;
  factionTag: string;
  factionTitle: string;
  factionEmoji: string;
  roleType?: string;
  roleName: string;
  status: "pending" | "approved" | "denied";
  approvedBy: string | null;
  approverTag: string | null;
  createdAt: string;
  decidedAt: string | null;
}

interface FactionMemberRole {
  roleId: string;
  roleName: string;
  roleType: string;
  roleEmoji: string;
  roleLabel: string;
}

interface FactionMember {
  userId: string;
  userTag: string;
  displayName: string;
  avatar: string;
  roles: FactionMemberRole[];
}

/* ─── constants ─── */
const FACTIONS = [
  { tag: "MAYOR", emoji: "🏛️", title: "Мэрия" },
  { tag: "FBI", emoji: "🕵️", title: "ФБР" },
  { tag: "LSPD", emoji: "🚓", title: "ЛСПД" },
  { tag: "SFPD", emoji: "🚓", title: "СФПД" },
  { tag: "LVPD", emoji: "🚓", title: "ЛВПД" },
  { tag: "ARMY-LV", emoji: "🪖", title: "Армия ЛВ" },
  { tag: "ARMY-SF", emoji: "🪖", title: "Армия СФ" },
  { tag: "MOH", emoji: "🚑", title: "Минздрав" },
  { tag: "INST", emoji: "🏫", title: "Инструкторы" },
  { tag: "COURT", emoji: "⚖️", title: "Суд" },
];

const ROLE_TYPE_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  member: { emoji: "👥", label: "Участник", color: "text-zinc-300 bg-zinc-500/10 border-zinc-500/30" },
  deputy: { emoji: "👔", label: "Зам. Лидера", color: "text-blue-300 bg-blue-500/10 border-blue-500/30" },
  leader: { emoji: "👑", label: "Лидер", color: "text-amber-300 bg-amber-500/10 border-amber-500/30" },
};

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
  /* ─── state: requests tab ─── */
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [panelLoading, setPanelLoading] = useState(false);
  const [removalPanelLoading, setRemovalPanelLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  /* ─── state: removal tab ─── */
  const [tab, setTab] = useState<"requests" | "removal">("requests");
  const [selectedFaction, setSelectedFaction] = useState("");
  const [factionMembers, setFactionMembers] = useState<FactionMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState<Record<string, boolean>>({});
  const [memberSearch, setMemberSearch] = useState("");

  /* ─── fetch requests ─── */
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

  /* ─── fetch faction members ─── */
  const fetchFactionMembers = useCallback(async (fTag: string) => {
    if (!fTag) { setFactionMembers([]); return; }
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/proxy/faction-members?factionTag=${encodeURIComponent(fTag)}`);
      const data = await res.json();
      setFactionMembers(data.members || []);
    } catch {
      setFactionMembers([]);
    }
    setMembersLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "removal" && selectedFaction) {
      fetchFactionMembers(selectedFaction);
    }
  }, [tab, selectedFaction, fetchFactionMembers]);

  /* ─── actions ─── */
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
    } catch (e: unknown) {
      setMessage({ text: e instanceof Error ? e.message : "Unknown error", ok: false });
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
    } catch (e: unknown) {
      setMessage({ text: e instanceof Error ? e.message : "Unknown error", ok: false });
    }
    setPanelLoading(false);
  };

  const postRemovalPanels = async (factionTag?: string) => {
    const msg = factionTag
      ? `Отправить панель снятия ролей для ${factionTag}?`
      : "Отправить панели снятия ролей во ВСЕ каналы 🗑️│управление-ролями?";
    if (!confirm(msg)) return;
    setRemovalPanelLoading(true);
    try {
      const res = await fetch("/api/proxy/removal-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(factionTag ? { factionTag } : {}),
      });
      const data = await res.json();
      if (data.ok) {
        const count = data.results?.filter((r: { error?: string }) => !r.error).length || 0;
        setMessage({ text: `Панели снятия ролей отправлены (${count} организаций)!`, ok: true });
      } else {
        setMessage({ text: data.error || "Ошибка", ok: false });
      }
    } catch (e: unknown) {
      setMessage({ text: e instanceof Error ? e.message : "Unknown error", ok: false });
    }
    setRemovalPanelLoading(false);
  };

  const handleRemoveRole = async (userId: string, userTag: string, factionTag: string, roleType: string, roleName: string) => {
    if (!confirm(`Снять роль ${roleName} у ${userTag}?`)) return;
    const key = `${userId}:${roleType}`;
    setRemoveLoading((p) => ({ ...p, [key]: true }));
    try {
      const res = await fetch("/api/proxy/faction-role-remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, factionTag, roleType }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ text: data.message, ok: true });
        fetchFactionMembers(factionTag);
      } else {
        setMessage({ text: data.message || "Ошибка", ok: false });
      }
    } catch (e: unknown) {
      setMessage({ text: e instanceof Error ? e.message : "Unknown error", ok: false });
    }
    setRemoveLoading((p) => ({ ...p, [key]: false }));
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const filteredMembers = factionMembers.filter(m => {
    if (!memberSearch) return true;
    const q = memberSearch.toLowerCase();
    return m.userTag.toLowerCase().includes(q) || m.displayName.toLowerCase().includes(q) || m.userId.includes(q);
  });

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
          <button onClick={() => setMessage(null)} className="float-right text-zinc-500 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("requests")}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm border transition-all ${
            tab === "requests"
              ? "bg-pink-500/20 border-pink-500/50 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.3)]"
              : "bg-white/5 border-white/10 text-zinc-500 hover:text-white hover:border-white/20"
          }`}
        >
          📩 Запросы {pendingCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">{pendingCount}</span>}
        </button>
        <button
          onClick={() => setTab("removal")}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm border transition-all ${
            tab === "removal"
              ? "bg-red-500/20 border-red-500/50 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              : "bg-white/5 border-white/10 text-zinc-500 hover:text-white hover:border-white/20"
          }`}
        >
          🗑️ Снятие ролей
        </button>
      </div>

      {/* ═══════════════ REQUESTS TAB ═══════════════ */}
      {tab === "requests" && (
        <>
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
              <div className="p-3 bg-indigo-500/5 rounded-lg border border-indigo-500/20 text-center">
                <span className="text-2xl">📩</span>
                <p className="text-zinc-300 mt-1">Игрок нажимает<br /><b>&quot;Запросить роль&quot;</b></p>
              </div>
              <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/20 text-center">
                <span className="text-2xl">🏢</span>
                <p className="text-zinc-300 mt-1">Выбирает<br /><b>организацию</b></p>
              </div>
              <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20 text-center">
                <span className="text-2xl">🎭</span>
                <p className="text-zinc-300 mt-1">Выбирает <b>тип роли</b><br />👥 / 👔 / 👑</p>
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
            <div className="mt-3 p-3 bg-white/5 rounded-lg text-zinc-400 text-xs space-y-1">
              <p><b>Доступные роли:</b> 👥 Участник, 👔 Зам. Лидера, 👑 Лидер</p>
              <p><b>Кто одобряет 👥 Участника:</b> 👑 Лидер, 👔 Зам. Лидера, 🛡️ Админ, 🔨 Модератор</p>
              <p><b>Кто одобряет 👔 Зам. Лидера:</b> 👑 Лидер организации, 🛡️ Админ, 🔨 Модератор</p>
              <p><b>Кто одобряет 👑 Лидера:</b> Только 🛡️ Админ, 🔨 Модератор</p>
            </div>
          </div>

          {/* Requests table */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-bold text-white">
                📋 Запросы <span className="text-zinc-500 text-sm font-normal">({requests.length})</span>
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
                {requests.map((r) => {
                  const rtInfo = ROLE_TYPE_LABELS[r.roleType || "member"] || ROLE_TYPE_LABELS.member;
                  return (
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
                        <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium">{r.factionEmoji} {r.factionTitle}</span>
                          <span className="text-zinc-600">→</span>
                          <span>{r.roleName}</span>
                        </div>
                      </div>

                      {/* Role type badge */}
                      <div className={`px-2 py-1 rounded-lg text-xs font-bold border ${rtInfo.color}`}>
                        {rtInfo.emoji} {rtInfo.label}
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
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════ REMOVAL TAB ═══════════════ */}
      {tab === "removal" && (
        <>
          {/* Faction selector */}
          <div className="glass-panel p-5 rounded-2xl border border-red-500/20 space-y-4">
            <h2 className="font-bold text-white text-sm">🏢 Выберите организацию</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {FACTIONS.map((f) => (
                <button
                  key={f.tag}
                  onClick={() => setSelectedFaction(f.tag)}
                  className={`p-3 rounded-xl border text-center transition-all text-sm ${
                    selectedFaction === f.tag
                      ? "bg-red-500/20 border-red-500/50 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                      : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  <span className="text-xl block">{f.emoji}</span>
                  <span className="text-xs font-bold mt-1 block">{f.title}</span>
                  <span className="text-[10px] text-zinc-500 block">{f.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedFaction && (
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4">
                <h2 className="font-bold text-white flex items-center gap-2">
                  {FACTIONS.find(f => f.tag === selectedFaction)?.emoji}{" "}
                  {FACTIONS.find(f => f.tag === selectedFaction)?.title}{" "}
                  <span className="text-zinc-500 text-sm font-normal">— участники ({factionMembers.length})</span>
                </h2>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Поиск по нику / ID..."
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 w-52"
                  />
                  <button
                    onClick={() => fetchFactionMembers(selectedFaction)}
                    className="text-zinc-500 hover:text-white text-sm transition-colors"
                  >
                    🔄
                  </button>
                </div>
              </div>

              {membersLoading ? (
                <div className="p-12 text-center text-zinc-500">⏳ Загрузка участников...</div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-12 text-center text-zinc-500">
                  <span className="text-4xl block mb-3">👥</span>
                  {memberSearch ? "Участники не найдены по запросу." : "В этой организации пока нет участников."}
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredMembers.map((m) => (
                    <div key={m.userId} className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                      {/* Avatar */}
                      <img
                        src={m.avatar}
                        alt=""
                        className="w-8 h-8 rounded-full border border-white/10"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />

                      {/* User info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm truncate">{m.displayName}</span>
                          <span className="text-zinc-500 text-xs">({m.userTag})</span>
                          <span className="text-zinc-600 text-xs font-mono">{m.userId}</span>
                        </div>
                      </div>

                      {/* Role badges + remove buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                        {m.roles.map((r) => {
                          const key = `${m.userId}:${r.roleType}`;
                          const rtInfo = ROLE_TYPE_LABELS[r.roleType] || ROLE_TYPE_LABELS.member;
                          return (
                            <div key={r.roleType} className="flex items-center gap-1.5">
                              <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${rtInfo.color}`}>
                                {rtInfo.emoji} {rtInfo.label}
                              </span>
                              <button
                                onClick={() => handleRemoveRole(m.userId, m.userTag, selectedFaction, r.roleType, r.roleName)}
                                disabled={!!removeLoading[key]}
                                className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/40 transition-all disabled:opacity-50"
                                title={`Снять роль ${r.roleName}`}
                              >
                                {removeLoading[key] ? "..." : "✕"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Help box */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10">
            <h2 className="font-bold text-white text-sm mb-3">ℹ️ Снятие ролей организации</h2>
            <div className="text-zinc-400 text-xs space-y-1.5">
              <p>Здесь можно снять роль <b>Участника</b>, <b>Зам. Лидера</b> или <b>Лидера</b> у любого члена организации.</p>
              <p><b>Иерархия снятия ролей:</b></p>
              <p>👑 <b>Лидер</b> — может снять 👔 Зам. Лидера и 👥 Участника</p>
              <p>👔 <b>Зам. Лидера</b> — может снять только 👥 Участника</p>
              <p>🛡️ <b>Админ / 🔨 Модератор</b> — может снять любую роль</p>
              <p className="mt-1.5">👥 <b>Обычные участники</b> — не видят канал 🗑️│управление-ролями в Discord</p>
              <p className="mt-2">Выберите организацию, найдите пользователя, нажмите <b>✕</b> рядом с ролью для её снятия.</p>
            </div>

            {/* Post removal panels button */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <button
                onClick={() => postRemovalPanels()}
                disabled={removalPanelLoading}
                className="px-5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold border border-red-500/50 transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] disabled:opacity-50 text-sm"
              >
                {removalPanelLoading ? "⏳ Отправка..." : "🗑️ Отправить панели снятия ролей во все каналы"}
              </button>
              <p className="text-zinc-600 text-[10px] mt-1.5">Отправит панель с кнопкой \"Снять роль\" в каждый канал 🗑️│управление-ролями. Сначала разверните структуру!</p>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
