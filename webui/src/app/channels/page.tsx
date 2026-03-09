"use client";
import { useState, useEffect, useCallback } from "react";

interface LiveChannel {
  id: string;
  name: string;
  type: number;
  typeName: string;
}
interface LiveCategory {
  id: string;
  name: string;
  position: number;
  channels: LiveChannel[];
}

export default function ChannelsPage() {
  const [categories, setCategories] = useState<LiveCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  /* ─ Create category state ─ */
  const [newCatName, setNewCatName] = useState("");

  /* ─ Create channel state ─ */
  const [newChName, setNewChName] = useState("");
  const [newChParent, setNewChParent] = useState("");
  const [newChType, setNewChType] = useState<"text" | "voice" | "announcement">("text");

  /* ─ Rename state ─ */
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  /* ─ Move state ─ */
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState("");

  /* ─ Expanded categories ─ */
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchStructure = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/proxy/structure-live");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (e: unknown) {
      setMsg({ text: (e as Error).message, ok: false });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStructure(); }, [fetchStructure]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(categories.map(c => c.id)));
  const collapseAll = () => setExpanded(new Set());

  const api = async (action: string, body: Record<string, unknown>) => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/proxy/channels-manage", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ text: "Готово!", ok: true });
        await fetchStructure();
      } else {
        setMsg({ text: data.message || "Ошибка", ok: false });
      }
    } catch (e: unknown) {
      setMsg({ text: (e as Error).message, ok: false });
    }
    setBusy(false);
  };

  const createCategory = () => {
    if (!newCatName.trim()) return;
    api("create-category", { name: newCatName.trim() });
    setNewCatName("");
  };

  const createChannel = () => {
    if (!newChName.trim()) return;
    api("create", { name: newChName.trim(), parentId: newChParent || undefined, type: newChType });
    setNewChName("");
  };

  const deleteChannel = (channelId: string, name: string) => {
    if (!confirm(`Удалить канал/категорию «${name}»? Это необратимо!`)) return;
    api("delete", { channelId });
  };

  const renameChannel = (channelId: string) => {
    if (!renameValue.trim()) return;
    api("rename", { channelId, name: renameValue.trim() });
    setRenamingId(null); setRenameValue("");
  };

  const moveChannel = (channelId: string) => {
    api("move", { channelId, parentId: moveTarget || null });
    setMovingId(null); setMoveTarget("");
  };

  const typeIcon = (type: string) => {
    if (type === "voice") return "🔊";
    if (type === "announcement") return "📢";
    return "💬";
  };

  if (loading) {
    return (
      <main className="min-h-screen p-6 lg:p-16 font-sans max-w-7xl mx-auto flex items-center justify-center">
        <div className="text-zinc-500 text-lg animate-pulse">Загрузка структуры...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 lg:p-16 font-sans max-w-7xl mx-auto space-y-8">
      <header className="pb-6 border-b border-white/10">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          📂 Управление каналами
        </h1>
        <p className="mt-2 text-zinc-400 text-sm">
          Создавайте категории и каналы, переименовывайте, перемещайте и удаляйте. Изменения синхронизируются с Discord.
        </p>
      </header>

      {msg && (
        <div className={`p-3 rounded-lg text-sm border ${msg.ok ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
          {msg.ok ? "✅" : "❌"} {msg.text}
          <button onClick={() => setMsg(null)} className="float-right text-zinc-500 hover:text-white">✕</button>
        </div>
      )}

      {/* ── Actions row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create category */}
        <div className="glass-panel p-5 rounded-2xl border border-cyan-500/20 space-y-3">
          <h2 className="font-bold text-white text-sm">📁 Создать категорию</h2>
          <div className="flex gap-2">
            <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Название категории..." className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-500/50 outline-none" onKeyDown={e => e.key === "Enter" && createCategory()} />
            <button onClick={createCategory} disabled={busy || !newCatName.trim()} className="px-5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/50 transition-all disabled:opacity-40 text-sm">+ Создать</button>
          </div>
        </div>

        {/* Create channel */}
        <div className="glass-panel p-5 rounded-2xl border border-blue-500/20 space-y-3">
          <h2 className="font-bold text-white text-sm">💬 Создать канал</h2>
          <input type="text" value={newChName} onChange={e => setNewChName(e.target.value)} placeholder="Название канала..." className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 outline-none" />
          <div className="flex gap-2 flex-wrap">
            <select value={newChParent} onChange={e => setNewChParent(e.target.value)} className="flex-1 min-w-[200px] bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50">
              <option value="">Без категории</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={newChType} onChange={e => setNewChType(e.target.value as "text" | "voice" | "announcement")} className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50">
              <option value="text">💬 Текст</option>
              <option value="voice">🔊 Голос</option>
              <option value="announcement">📢 Новости</option>
            </select>
            <button onClick={createChannel} disabled={busy || !newChName.trim()} className="px-5 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-bold border border-blue-500/50 transition-all disabled:opacity-40 text-sm">+ Создать</button>
          </div>
        </div>
      </div>

      {/* ── Structure tree ── */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold text-white text-lg">🗂️ Текущая структура ({categories.length} категорий)</h2>
          <div className="flex gap-2">
            <button onClick={expandAll} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 text-xs transition-colors">Развернуть все</button>
            <button onClick={collapseAll} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 text-xs transition-colors">Свернуть все</button>
            <button onClick={fetchStructure} disabled={loading} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 text-xs transition-colors">🔄 Обновить</button>
          </div>
        </div>

        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="rounded-xl border border-white/10 overflow-hidden">
              {/* Category header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] cursor-pointer hover:bg-white/[0.06] transition-colors" onClick={() => toggleExpand(cat.id)}>
                <span className="text-zinc-500 text-xs">{expanded.has(cat.id) ? "▼" : "▶"}</span>
                <span className="text-lg">📁</span>
                {renamingId === cat.id ? (
                  <div className="flex gap-2 flex-1" onClick={e => e.stopPropagation()}>
                    <input type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)} className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-white outline-none focus:border-cyan-500/50" autoFocus onKeyDown={e => e.key === "Enter" && renameChannel(cat.id)} />
                    <button onClick={() => renameChannel(cat.id)} disabled={busy} className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 text-xs">✓</button>
                    <button onClick={() => setRenamingId(null)} className="px-2 py-1 rounded bg-white/5 text-zinc-400 text-xs">✕</button>
                  </div>
                ) : (
                  <span className="text-white font-medium text-sm flex-1">{cat.name}</span>
                )}
                <span className="text-zinc-600 text-xs">{cat.channels.length} кан.</span>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setRenamingId(cat.id); setRenameValue(cat.name); }} className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-cyan-400 text-xs transition-colors" title="Переименовать">✏️</button>
                  <button onClick={() => deleteChannel(cat.id, cat.name)} disabled={busy} className="p-1 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400 text-xs transition-colors" title="Удалить категорию">🗑️</button>
                </div>
              </div>

              {/* Channels */}
              {expanded.has(cat.id) && (
                <div className="border-t border-white/5">
                  {cat.channels.length === 0 && (
                    <div className="px-6 py-3 text-zinc-600 text-xs italic">Пустая категория</div>
                  )}
                  {cat.channels.map(ch => (
                    <div key={ch.id} className="flex items-center gap-2 px-6 py-2.5 hover:bg-white/[0.03] transition-colors border-b border-white/5 last:border-b-0">
                      <span className="text-sm">{typeIcon(ch.typeName)}</span>

                      {renamingId === ch.id ? (
                        <div className="flex gap-2 flex-1">
                          <input type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)} className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-white outline-none focus:border-cyan-500/50" autoFocus onKeyDown={e => e.key === "Enter" && renameChannel(ch.id)} />
                          <button onClick={() => renameChannel(ch.id)} disabled={busy} className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 text-xs">✓</button>
                          <button onClick={() => setRenamingId(null)} className="px-2 py-1 rounded bg-white/5 text-zinc-400 text-xs">✕</button>
                        </div>
                      ) : movingId === ch.id ? (
                        <div className="flex gap-2 flex-1">
                          <select value={moveTarget} onChange={e => setMoveTarget(e.target.value)} className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-white outline-none focus:border-cyan-500/50">
                            <option value="">Без категории</option>
                            {categories.filter(c => c.id !== cat.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <button onClick={() => moveChannel(ch.id)} disabled={busy} className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs">✓ Перем.</button>
                          <button onClick={() => setMovingId(null)} className="px-2 py-1 rounded bg-white/5 text-zinc-400 text-xs">✕</button>
                        </div>
                      ) : (
                        <span className="text-zinc-300 text-sm flex-1">{ch.name}</span>
                      )}

                      <span className="text-zinc-700 text-[10px] font-mono">{ch.id}</span>
                      <div className="flex gap-1">
                        <button onClick={() => { setRenamingId(ch.id); setRenameValue(ch.name); }} className="p-1 rounded hover:bg-white/10 text-zinc-600 hover:text-cyan-400 text-xs transition-colors" title="Переименовать">✏️</button>
                        <button onClick={() => { setMovingId(ch.id); setMoveTarget(""); }} className="p-1 rounded hover:bg-white/10 text-zinc-600 hover:text-indigo-400 text-xs transition-colors" title="Переместить">↗️</button>
                        <button onClick={() => deleteChannel(ch.id, ch.name)} disabled={busy} className="p-1 rounded hover:bg-red-500/10 text-zinc-600 hover:text-red-400 text-xs transition-colors" title="Удалить">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
