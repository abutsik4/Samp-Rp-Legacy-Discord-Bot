"use client";
import { useState, useEffect, useCallback } from "react";

interface Role {
  id: string;
  name: string;
  color: string;
  position: number;
  managed: boolean;
  memberCount: number;
}

interface AutoRolesConfig {
  enabled: boolean;
  botEnabled: boolean;
  autoRoles: string[];
  botRoles: string[];
  inviteRoles: { code: string; roleId: string }[];
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [config, setConfig] = useState<AutoRolesConfig>({
    enabled: false, botEnabled: false, autoRoles: [], botRoles: [], inviteRoles: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [roleSearch, setRoleSearch] = useState("");
  const [addingTo, setAddingTo] = useState<"global" | "bot" | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, cfgRes] = await Promise.all([
        fetch("/api/proxy/roles"),
        fetch("/api/proxy/auto-roles-save")
      ]);
      const rolesData = await rolesRes.json();
      const cfgData = await cfgRes.json();
      setRoles(rolesData.roles || []);
      const ar = cfgData.autoRoles || {};
      setConfig({
        enabled: !!ar.enabled,
        botEnabled: !!ar.botEnabled,
        autoRoles: ar.autoRoles || [],
        botRoles: ar.botRoles || [],
        inviteRoles: ar.inviteRoles || []
      });
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (newConfig: AutoRolesConfig) => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/proxy/auto-roles-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig)
      });
      const data = await res.json();
      if (data.ok) {
        setConfig(data.autoRoles);
        setMsg({ text: "Сохранено!", ok: true });
      } else {
        setMsg({ text: data.error || "Ошибка", ok: false });
      }
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
    }
    setSaving(false);
  };

  const addRole = (type: "global" | "bot", roleId: string) => {
    const key = type === "global" ? "autoRoles" : "botRoles";
    if (config[key].includes(roleId)) return;
    const updated = { ...config, [key]: [...config[key], roleId] };
    setConfig(updated);
    save(updated);
    setAddingTo(null);
    setRoleSearch("");
  };

  const removeRole = (type: "global" | "bot", roleId: string) => {
    const key = type === "global" ? "autoRoles" : "botRoles";
    const updated = { ...config, [key]: config[key].filter((id: string) => id !== roleId) };
    setConfig(updated);
    save(updated);
  };

  const toggleEnabled = (type: "global" | "bot") => {
    const key = type === "global" ? "enabled" : "botEnabled";
    const updated = { ...config, [key]: !config[key] };
    setConfig(updated);
    save(updated);
  };

  const addInviteRole = () => {
    if (!inviteCode.trim() || !inviteRoleId) return;
    const updated = {
      ...config,
      inviteRoles: [...config.inviteRoles, { code: inviteCode.trim(), roleId: inviteRoleId }]
    };
    setConfig(updated);
    save(updated);
    setInviteCode("");
    setInviteRoleId("");
  };

  const removeInviteRole = (idx: number) => {
    const updated = { ...config, inviteRoles: config.inviteRoles.filter((_: any, i: number) => i !== idx) };
    setConfig(updated);
    save(updated);
  };

  const getRoleName = (id: string) => roles.find((r: Role) => r.id === id)?.name || id;
  const getRoleColor = (id: string) => roles.find((r: Role) => r.id === id)?.color || "#99AAB5";

  const filteredRoles = roles.filter((r: Role) =>
    !r.managed && r.name.toLowerCase().includes(roleSearch.toLowerCase())
  );

  if (loading) {
    return (
      <main className="min-h-screen p-6 lg:p-16 font-sans max-w-7xl mx-auto flex items-center justify-center">
        <div className="text-zinc-500 text-lg animate-pulse">Загрузка ролей...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 lg:p-16 font-sans max-w-7xl mx-auto space-y-8">
      <header className="pb-6 border-b border-white/10">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-500">
          Авто-роли
        </h1>
        <p className="mt-2 text-zinc-400 text-sm">
          Роли, которые автоматически выдаются новым участникам и ботам при входе на сервер.
        </p>
      </header>

      {msg && (
        <div className={`p-3 rounded-lg text-sm border ${msg.ok ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
          {msg.ok ? "✅" : "❌"} {msg.text}
          <button onClick={() => setMsg(null)} className="float-right text-zinc-500 hover:text-white">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Auto-Roles */}
        {(["global", "bot"] as const).map((type) => {
          const key = type === "global" ? "autoRoles" : "botRoles";
          const isEnabled = type === "global" ? config.enabled : config.botEnabled;
          const title = type === "global" ? "👥 Авто-роли для пользователей" : "🤖 Авто-роли для ботов";
          const subtitle = type === "global"
            ? "Выдаются автоматически каждому новому пользователю при входе."
            : "Выдаются автоматически каждому боту при добавлении на сервер.";

          return (
            <div key={type} className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">{title}</h2>
                  <p className="text-zinc-400 text-xs mt-1">{subtitle}</p>
                </div>
                <button
                  onClick={() => toggleEnabled(type)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${isEnabled ? "bg-emerald-500" : "bg-zinc-700"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isEnabled ? "left-6" : "left-0.5"}`} />
                </button>
              </div>

              {!isEnabled && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-xs">
                  ⚠️ Выключено — роли не будут выдаваться автоматически
                </div>
              )}

              <div className="space-y-2">
                {(config as any)[key].length === 0 ? (
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5 text-zinc-500 text-sm text-center">
                    Роли не добавлены
                  </div>
                ) : (
                  (config as any)[key].map((roleId: string) => (
                    <div key={roleId} className="p-3 rounded-lg bg-black/20 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getRoleColor(roleId) }} />
                        <span className="text-white text-sm font-medium">{getRoleName(roleId)}</span>
                        <span className="text-zinc-600 text-xs font-mono">{roleId}</span>
                      </div>
                      <button onClick={() => removeRole(type, roleId)} className="text-zinc-500 hover:text-red-400 transition-colors p-1">✕</button>
                    </div>
                  ))
                )}
              </div>

              {addingTo === type ? (
                <div className="space-y-2 p-3 bg-white/5 rounded-lg border border-white/10">
                  <input
                    type="text"
                    placeholder="Поиск ролей..."
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    autoFocus
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500/50"
                  />
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredRoles.filter((r: Role) => !(config as any)[key].includes(r.id)).map((r: Role) => (
                      <button
                        key={r.id}
                        onClick={() => addRole(type, r.id)}
                        className="w-full text-left p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2"
                      >
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                        <span className="text-white text-sm">{r.name}</span>
                        <span className="text-zinc-600 text-xs ml-auto">{r.memberCount} чел.</span>
                      </button>
                    ))}
                    {filteredRoles.filter((r: Role) => !(config as any)[key].includes(r.id)).length === 0 && (
                      <div className="text-zinc-500 text-xs text-center py-2">Ничего не найдено</div>
                    )}
                  </div>
                  <button
                    onClick={() => { setAddingTo(null); setRoleSearch(""); }}
                    className="w-full py-1.5 text-zinc-500 hover:text-white text-xs transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingTo(type); setRoleSearch(""); }}
                  className="w-full py-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all text-sm font-medium"
                >
                  + Добавить роль
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Invite-based roles */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h2 className="text-lg font-bold text-white">🔗 Роли по инвайт-ссылке</h2>
        <p className="text-zinc-400 text-xs">
          Пользователю выдаётся роль в зависимости от того, по какой ссылке он вошёл.
        </p>

        <div className="space-y-2">
          {config.inviteRoles.length === 0 ? (
            <div className="p-4 rounded-lg bg-white/5 border border-white/5 text-zinc-500 text-sm text-center">
              Нет настроенных инвайт-ролей
            </div>
          ) : (
            config.inviteRoles.map((ir: { code: string; roleId: string }, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-black/20 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <code className="text-indigo-400 text-xs bg-indigo-500/10 px-2 py-0.5 rounded">{ir.code}</code>
                  <span className="text-zinc-500">→</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getRoleColor(ir.roleId) }} />
                    <span className="text-white text-sm">{getRoleName(ir.roleId)}</span>
                  </div>
                </div>
                <button onClick={() => removeInviteRole(i)} className="text-zinc-500 hover:text-red-400 transition-colors p-1">✕</button>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="text"
            placeholder="Код инвайта (без discord.gg/)"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="flex-1 min-w-[200px] bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500/50"
          />
          <select
            value={inviteRoleId}
            onChange={(e) => setInviteRoleId(e.target.value)}
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50"
          >
            <option value="">Роль...</option>
            {roles.filter((r: Role) => !r.managed).map((r: Role) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button
            onClick={addInviteRole}
            disabled={!inviteCode.trim() || !inviteRoleId}
            className="px-4 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-sm font-medium border border-indigo-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Добавить
          </button>
        </div>
      </div>

      {/* All roles reference */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h2 className="text-lg font-bold text-white">📋 Все роли сервера ({roles.length})</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
          {roles.map((r: Role) => (
            <div key={r.id} className="p-2 bg-white/5 rounded-lg flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
              <span className="text-white truncate">{r.name}</span>
              <span className="text-zinc-600 ml-auto">{r.memberCount}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
