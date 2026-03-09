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

/* Discord permission flags (most common) */
const PERM_FLAGS: { key: string; label: string; bit: bigint }[] = [
  { key: "Administrator", label: "Администратор", bit: BigInt(1) << BigInt(3) },
  { key: "ManageGuild", label: "Управление сервером", bit: BigInt(1) << BigInt(5) },
  { key: "ManageRoles", label: "Управление ролями", bit: BigInt(1) << BigInt(28) },
  { key: "ManageChannels", label: "Управление каналами", bit: BigInt(1) << BigInt(4) },
  { key: "ManageMessages", label: "Управление сообщениями", bit: BigInt(1) << BigInt(13) },
  { key: "ManageNicknames", label: "Управление никами", bit: BigInt(1) << BigInt(27) },
  { key: "ManageWebhooks", label: "Управление вебхуками", bit: BigInt(1) << BigInt(29) },
  { key: "ManageEmojisAndStickers", label: "Управление эмодзи", bit: BigInt(1) << BigInt(30) },
  { key: "ManageEvents", label: "Управление мероприятиями", bit: BigInt(1) << BigInt(33) },
  { key: "ManageThreads", label: "Управление форумами", bit: BigInt(1) << BigInt(34) },
  { key: "ViewAuditLog", label: "Просмотр журнала аудита", bit: BigInt(1) << BigInt(7) },
  { key: "KickMembers", label: "Кик участников", bit: BigInt(1) << BigInt(1) },
  { key: "BanMembers", label: "Бан участников", bit: BigInt(1) << BigInt(2) },
  { key: "ModerateMembers", label: "Тайм-аут участников", bit: BigInt(1) << BigInt(40) },
  { key: "MentionEveryone", label: "Упоминание @everyone", bit: BigInt(1) << BigInt(17) },
  { key: "SendMessages", label: "Отправка сообщений", bit: BigInt(1) << BigInt(11) },
  { key: "SendMessagesInThreads", label: "Сообщения в форумах", bit: BigInt(1) << BigInt(38) },
  { key: "EmbedLinks", label: "Embed-ссылки", bit: BigInt(1) << BigInt(14) },
  { key: "AttachFiles", label: "Прикрепление файлов", bit: BigInt(1) << BigInt(15) },
  { key: "AddReactions", label: "Реакции", bit: BigInt(1) << BigInt(6) },
  { key: "UseExternalEmojis", label: "Внешние эмодзи", bit: BigInt(1) << BigInt(18) },
  { key: "ReadMessageHistory", label: "История сообщений", bit: BigInt(1) << BigInt(16) },
  { key: "ViewChannel", label: "Просмотр каналов", bit: BigInt(1) << BigInt(10) },
  { key: "Connect", label: "Подключение (голос)", bit: BigInt(1) << BigInt(20) },
  { key: "Speak", label: "Говорить (голос)", bit: BigInt(1) << BigInt(21) },
  { key: "MuteMembers", label: "Мут участников", bit: BigInt(1) << BigInt(22) },
  { key: "DeafenMembers", label: "Оглушение участников", bit: BigInt(1) << BigInt(23) },
  { key: "MoveMembers", label: "Перемещение участников", bit: BigInt(1) << BigInt(24) },
  { key: "CreateInstantInvite", label: "Создание инвайтов", bit: BigInt(1) << BigInt(0) },
  { key: "ChangeNickname", label: "Изменение ника", bit: BigInt(1) << BigInt(26) },
];

type Tab = "manage" | "auto-roles";

export default function RolesPage() {
  const [tab, setTab] = useState<Tab>("manage");
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

  /* ─ Create role state ─ */
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#5865F2");
  const [newRoleHoist, setNewRoleHoist] = useState(false);
  const [newRoleMentionable, setNewRoleMentionable] = useState(false);
  const [newRolePerms, setNewRolePerms] = useState<bigint>(BigInt(0));

  /* ─ Edit role state ─ */
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#5865F2");
  const [editHoist, setEditHoist] = useState(false);
  const [editMentionable, setEditMentionable] = useState(false);
  const [editPerms, setEditPerms] = useState<bigint>(BigInt(0));
  const [editLoading, setEditLoading] = useState(false);

  /* ─ Filter for role management ─ */
  const [manageSearch, setManageSearch] = useState("");

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
        enabled: !!ar.enabled, botEnabled: !!ar.botEnabled,
        autoRoles: ar.autoRoles || [], botRoles: ar.botRoles || [],
        inviteRoles: ar.inviteRoles || []
      });
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveAutoRoles = async (newConfig: AutoRolesConfig) => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/proxy/auto-roles-save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig)
      });
      const data = await res.json();
      if (data.ok) { setConfig(data.autoRoles); setMsg({ text: "Сохранено!", ok: true }); }
      else setMsg({ text: data.error || "Ошибка", ok: false });
    } catch (e: unknown) { setMsg({ text: (e as Error).message, ok: false }); }
    setSaving(false);
  };

  const addRole = (type: "global" | "bot", roleId: string) => {
    const key = type === "global" ? "autoRoles" : "botRoles";
    if (config[key].includes(roleId)) return;
    const updated = { ...config, [key]: [...config[key], roleId] };
    setConfig(updated); saveAutoRoles(updated);
    setAddingTo(null); setRoleSearch("");
  };

  const removeRole = (type: "global" | "bot", roleId: string) => {
    const key = type === "global" ? "autoRoles" : "botRoles";
    const updated = { ...config, [key]: config[key].filter((id: string) => id !== roleId) };
    setConfig(updated); saveAutoRoles(updated);
  };

  const toggleEnabled = (type: "global" | "bot") => {
    const key = type === "global" ? "enabled" : "botEnabled";
    const updated = { ...config, [key]: !config[key] };
    setConfig(updated); saveAutoRoles(updated);
  };

  const addInviteRole = () => {
    if (!inviteCode.trim() || !inviteRoleId) return;
    const updated = { ...config, inviteRoles: [...config.inviteRoles, { code: inviteCode.trim(), roleId: inviteRoleId }] };
    setConfig(updated); saveAutoRoles(updated);
    setInviteCode(""); setInviteRoleId("");
  };

  const removeInviteRole = (idx: number) => {
    const updated = { ...config, inviteRoles: config.inviteRoles.filter((_: { code: string; roleId: string }, i: number) => i !== idx) };
    setConfig(updated); saveAutoRoles(updated);
  };

  const getRoleName = (id: string) => roles.find(r => r.id === id)?.name || id;
  const getRoleColor = (id: string) => roles.find(r => r.id === id)?.color || "#99AAB5";

  const filteredRoles = roles.filter(r => !r.managed && r.name.toLowerCase().includes(roleSearch.toLowerCase()));
  const managedFilteredRoles = roles.filter(r => r.name.toLowerCase().includes(manageSearch.toLowerCase()));

  /* ─ Role management API calls ─ */
  const createRole = async () => {
    if (!newRoleName.trim()) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/proxy/roles-manage", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: newRoleName.trim(), color: newRoleColor, hoist: newRoleHoist, mentionable: newRoleMentionable, permissions: newRolePerms.toString() }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ text: `Роль «${data.role.name}» создана!`, ok: true });
        setShowCreateRole(false); setNewRoleName(""); setNewRolePerms(BigInt(0));
        await load();
      } else setMsg({ text: data.message || "Ошибка", ok: false });
    } catch (e: unknown) { setMsg({ text: (e as Error).message, ok: false }); }
    setSaving(false);
  };

  const deleteRole = async (roleId: string, name: string) => {
    if (!confirm(`Удалить роль «${name}»? Это необратимо!`)) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/proxy/roles-manage", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", roleId }),
      });
      const data = await res.json();
      if (data.ok) { setMsg({ text: `Роль «${data.name}» удалена`, ok: true }); await load(); }
      else setMsg({ text: data.message || "Ошибка", ok: false });
    } catch (e: unknown) { setMsg({ text: (e as Error).message, ok: false }); }
    setSaving(false);
  };

  const openEditRole = async (roleId: string) => {
    setEditLoading(true); setEditingRole(roleId);
    try {
      const res = await fetch(`/api/proxy/roles-manage?roleId=${roleId}`);
      const data = await res.json();
      setEditName(data.name || "");
      setEditColor(data.color || "#99AAB5");
      setEditHoist(!!data.hoist);
      setEditMentionable(!!data.mentionable);
      setEditPerms(BigInt(data.permissions || "0"));
    } catch { setEditingRole(null); }
    setEditLoading(false);
  };

  const saveEditRole = async () => {
    if (!editingRole) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/proxy/roles-manage", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", roleId: editingRole, name: editName.trim(), color: editColor, hoist: editHoist, mentionable: editMentionable, permissions: editPerms.toString() }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ text: `Роль обновлена!`, ok: true });
        setEditingRole(null); await load();
      } else setMsg({ text: data.message || "Ошибка", ok: false });
    } catch (e: unknown) { setMsg({ text: (e as Error).message, ok: false }); }
    setSaving(false);
  };

  const togglePerm = (perms: bigint, bit: bigint): bigint => (perms & bit) ? perms & ~bit : perms | bit;
  const hasPerm = (perms: bigint, bit: bigint): boolean => (perms & bit) === bit;

  /* ─ Permission editor component ─ */
  const PermEditor = ({ perms, onChange }: { perms: bigint; onChange: (p: bigint) => void }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
      {PERM_FLAGS.map(pf => (
        <label key={pf.key} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer p-1.5 rounded hover:bg-white/5 transition-colors">
          <input type="checkbox" checked={hasPerm(perms, pf.bit)} onChange={() => onChange(togglePerm(perms, pf.bit))} className="rounded accent-indigo-500" />
          <span className={hasPerm(perms, pf.bit) ? "text-white font-medium" : "text-zinc-400"}>{pf.label}</span>
        </label>
      ))}
    </div>
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
          🎭 Управление ролями
        </h1>
        <p className="mt-2 text-zinc-400 text-sm">Создавайте, редактируйте, удаляйте роли и управляйте авто-ролями. Изменения синхронизируются с Discord.</p>
      </header>

      {msg && (
        <div className={`p-3 rounded-lg text-sm border ${msg.ok ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
          {msg.ok ? "✅" : "❌"} {msg.text}
          <button onClick={() => setMsg(null)} className="float-right text-zinc-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("manage")} className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${tab === "manage" ? "bg-pink-500/20 border-pink-500/50 text-pink-300" : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"}`}>
          🎨 Управление ролями
        </button>
        <button onClick={() => setTab("auto-roles")} className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${tab === "auto-roles" ? "bg-orange-500/20 border-orange-500/50 text-orange-300" : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"}`}>
          ⚙️ Авто-роли
        </button>
      </div>

      {/* ═══════════ TAB: Manage Roles ═══════════ */}
      {tab === "manage" && (
        <div className="space-y-6">
          {/* Create Role */}
          <div className="glass-panel p-5 rounded-2xl border border-pink-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white text-sm">✨ Создать новую роль</h2>
              <button onClick={() => setShowCreateRole(!showCreateRole)} className="px-4 py-2 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-sm font-medium transition-all">
                {showCreateRole ? "✕ Закрыть" : "+ Создать роль"}
              </button>
            </div>

            {showCreateRole && (
              <div className="space-y-4 pt-2 border-t border-white/10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Название</label>
                    <input type="text" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Название роли..." maxLength={100} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 outline-none focus:border-pink-500/50" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Цвет</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={newRoleColor} onChange={e => setNewRoleColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-white/10" />
                      <span className="text-zinc-500 text-xs font-mono">{newRoleColor}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input type="checkbox" checked={newRoleHoist} onChange={e => setNewRoleHoist(e.target.checked)} className="rounded accent-pink-500" />
                    Отображать отдельно
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input type="checkbox" checked={newRoleMentionable} onChange={e => setNewRoleMentionable(e.target.checked)} className="rounded accent-pink-500" />
                    Можно упоминать
                  </label>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Разрешения</label>
                  <PermEditor perms={newRolePerms} onChange={setNewRolePerms} />
                </div>
                <button onClick={createRole} disabled={saving || !newRoleName.trim()} className="px-6 py-2.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 font-bold border border-pink-500/50 transition-all disabled:opacity-40 text-sm">
                  {saving ? "⏳ Создание..." : "✨ Создать роль"}
                </button>
              </div>
            )}
          </div>

          {/* All roles grid */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-bold text-white text-lg">📋 Все роли сервера ({roles.length})</h2>
              <input type="text" placeholder="Поиск ролей..." value={manageSearch} onChange={e => setManageSearch(e.target.value)} className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-pink-500/50 w-64" />
            </div>
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
              {managedFilteredRoles.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-colors">
                  <div className="w-4 h-4 rounded-full flex-shrink-0 border border-white/10" style={{ backgroundColor: r.color }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-sm font-medium truncate block">{r.name}</span>
                    <span className="text-zinc-600 text-[10px] font-mono">{r.id}</span>
                  </div>
                  <span className="text-zinc-500 text-xs">{r.memberCount} чел.</span>
                  <span className="text-zinc-700 text-xs">pos:{r.position}</span>
                  {r.managed && <span className="text-amber-400/60 text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded">управл.</span>}
                  {!r.managed && (
                    <div className="flex gap-1">
                      <button onClick={() => openEditRole(r.id)} className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-zinc-500 hover:text-indigo-400 text-xs transition-colors" title="Редактировать">✏️</button>
                      <button onClick={() => deleteRole(r.id, r.name)} disabled={saving} className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 text-xs transition-colors disabled:opacity-40" title="Удалить">🗑️</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB: Auto-Roles ═══════════ */}
      {tab === "auto-roles" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(["global", "bot"] as const).map(type => {
              const key = type === "global" ? "autoRoles" : "botRoles";
              const isEnabled = type === "global" ? config.enabled : config.botEnabled;
              const title = type === "global" ? "👥 Авто-роли для пользователей" : "🤖 Авто-роли для ботов";
              const subtitle = type === "global" ? "Выдаются каждому новому пользователю при входе." : "Выдаются каждому боту при добавлении на сервер.";
              return (
                <div key={type} className="glass-panel p-6 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white">{title}</h2>
                      <p className="text-zinc-400 text-xs mt-1">{subtitle}</p>
                    </div>
                    <button onClick={() => toggleEnabled(type)} className={`relative w-12 h-6 rounded-full transition-colors ${isEnabled ? "bg-emerald-500" : "bg-zinc-700"}`}>
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isEnabled ? "left-6" : "left-0.5"}`} />
                    </button>
                  </div>
                  {!isEnabled && <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-xs">⚠️ Выключено</div>}
                  <div className="space-y-2">
                    {((config as unknown as Record<string, string[]>)[key]).length === 0 ? (
                      <div className="p-4 rounded-lg bg-white/5 border border-white/5 text-zinc-500 text-sm text-center">Роли не добавлены</div>
                    ) : (
                      ((config as unknown as Record<string, string[]>)[key]).map((roleId: string) => (
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
                      <input type="text" placeholder="Поиск ролей..." value={roleSearch} onChange={e => setRoleSearch(e.target.value)} autoFocus className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500/50" />
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {filteredRoles.filter(r => !((config as unknown as Record<string, string[]>)[key]).includes(r.id)).map(r => (
                          <button key={r.id} onClick={() => addRole(type, r.id)} className="w-full text-left p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                            <span className="text-white text-sm">{r.name}</span>
                            <span className="text-zinc-600 text-xs ml-auto">{r.memberCount} чел.</span>
                          </button>
                        ))}
                      </div>
                      <button onClick={() => { setAddingTo(null); setRoleSearch(""); }} className="w-full py-1.5 text-zinc-500 hover:text-white text-xs transition-colors">Отмена</button>
                    </div>
                  ) : (
                    <button onClick={() => { setAddingTo(type); setRoleSearch(""); }} className="w-full py-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all text-sm font-medium">+ Добавить роль</button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Invite-based roles */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">🔗 Роли по инвайт-ссылке</h2>
            <p className="text-zinc-400 text-xs">Пользователю выдаётся роль в зависимости от инвайт-ссылки.</p>
            <div className="space-y-2">
              {config.inviteRoles.length === 0 ? (
                <div className="p-4 rounded-lg bg-white/5 border border-white/5 text-zinc-500 text-sm text-center">Нет настроенных инвайт-ролей</div>
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
              <input type="text" placeholder="Код инвайта (без discord.gg/)" value={inviteCode} onChange={e => setInviteCode(e.target.value)} className="flex-1 min-w-[200px] bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500/50" />
              <select value={inviteRoleId} onChange={e => setInviteRoleId(e.target.value)} className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50">
                <option value="">Роль...</option>
                {roles.filter(r => !r.managed).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <button onClick={addInviteRole} disabled={!inviteCode.trim() || !inviteRoleId} className="px-4 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-sm font-medium border border-indigo-500/40 transition-all disabled:opacity-40">+ Добавить</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ Edit Role Modal ═══════════ */}
      {editingRole && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-6">
          <div className="glass-panel rounded-2xl w-full max-w-2xl my-8 border border-white/10">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">✏️ Редактировать роль</h2>
              <button onClick={() => setEditingRole(null)} className="text-zinc-500 hover:text-white transition-colors text-xl">✕</button>
            </div>

            {editLoading ? (
              <div className="p-12 text-center text-zinc-500 animate-pulse">Загрузка...</div>
            ) : (
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Название</label>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} maxLength={100} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-pink-500/50" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Цвет</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-white/10" />
                      <span className="text-zinc-500 text-xs font-mono">{editColor}</span>
                      <div className="w-6 h-6 rounded-full border border-white/10" style={{ backgroundColor: editColor }} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input type="checkbox" checked={editHoist} onChange={e => setEditHoist(e.target.checked)} className="rounded accent-pink-500" />
                    Отображать отдельно
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input type="checkbox" checked={editMentionable} onChange={e => setEditMentionable(e.target.checked)} className="rounded accent-pink-500" />
                    Можно упоминать
                  </label>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Разрешения</label>
                  <PermEditor perms={editPerms} onChange={setEditPerms} />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 p-6 border-t border-white/10">
              <button onClick={() => setEditingRole(null)} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 text-sm font-medium transition-colors">Отмена</button>
              <button onClick={saveEditRole} disabled={saving || !editName.trim()} className="px-5 py-2.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 font-bold border border-pink-500/50 transition-all disabled:opacity-40 text-sm">
                {saving ? "⏳ Сохранение..." : "💾 Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
