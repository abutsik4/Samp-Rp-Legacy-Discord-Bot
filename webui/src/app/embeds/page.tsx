"use client";
import { useState, useEffect, useCallback } from "react";

interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

interface EmbedData {
  id: string;
  title: string;
  description: string;
  color: string;
  fields: EmbedField[];
}

interface Channel {
  id: string;
  name: string;
  parentName: string | null;
}

interface BotMessage {
  id: string;
  channelId: string;
  channelName: string;
  content: string;
  embeds: {
    title: string;
    description: string;
    color: string;
    fields: EmbedField[];
    footer: string;
    thumbnail: string;
    image: string;
  }[];
  components: number;
  createdAt: string;
  editedAt: string | null;
}

const COLORS = [
  { label: "Discord Blue", hex: "#5865F2" },
  { label: "Emerald", hex: "#10B981" },
  { label: "Red", hex: "#EF4444" },
  { label: "Amber", hex: "#F59E0B" },
  { label: "Purple", hex: "#8B5CF6" },
  { label: "Rose", hex: "#F43F5E" },
  { label: "Sky", hex: "#0EA5E9" },
  { label: "Orange", hex: "#F97316" },
];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

type Tab = "templates" | "bot-messages";

export default function EmbedsPage() {
  const [tab, setTab] = useState<Tab>("templates");
  const [embeds, setEmbeds] = useState<EmbedData[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [editing, setEditing] = useState<EmbedData | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editingEmbedIndex, setEditingEmbedIndex] = useState<number | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("");
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [sentMessages, setSentMessages] = useState<Record<string, { channelId: string; messageId: string }>>({});

  /* Bot Messages state */
  const [botMessages, setBotMessages] = useState<BotMessage[]>([]);
  const [botMsgChannel, setBotMsgChannel] = useState("");
  const [botMsgChannelSearch, setBotMsgChannelSearch] = useState("");
  const [botMsgLoading, setBotMsgLoading] = useState(false);
  const [botMsgError, setBotMsgError] = useState<string | null>(null);
  const [botMsgResults, setBotMsgResults] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [botMsgSending, setBotMsgSending] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("srp-embeds");
      if (saved) setEmbeds(JSON.parse(saved));
      const sentSaved = localStorage.getItem("srp-embed-sent");
      if (sentSaved) setSentMessages(JSON.parse(sentSaved));
    } catch {}
    fetch("/api/proxy/channels")
      .then(r => r.json())
      .then(d => setChannels(d.channels || []))
      .catch(() => {});
  }, []);

  const saveEmbeds = (list: EmbedData[]) => {
    setEmbeds(list);
    localStorage.setItem("srp-embeds", JSON.stringify(list));
  };

  const saveSentMessage = (embedId: string, channelId: string, messageId: string) => {
    setSentMessages(prev => {
      const updated = { ...prev, [embedId]: { channelId, messageId } };
      localStorage.setItem("srp-embed-sent", JSON.stringify(updated));
      return updated;
    });
  };

  const newEmbed = (): EmbedData => ({
    id: genId(), title: "", description: "", color: "#5865F2", fields: [],
  });

  const openEditor = (embed?: EmbedData, messageId?: string, channelId?: string, embedIdx?: number) => {
    setEditing(embed ? { ...embed, fields: embed.fields.map(f => ({ ...f })) } : newEmbed());
    setEditingMessageId(messageId || null);
    setEditingChannelId(channelId || null);
    setEditingEmbedIndex(embedIdx ?? null);
    setShowEditor(true);
  };

  const saveEmbed = () => {
    if (!editing) return;
    if (editingMessageId && editingChannelId) {
      editBotMessage(editingChannelId, editingMessageId, editing, editingEmbedIndex);
      setShowEditor(false); setEditing(null); setEditingMessageId(null); setEditingChannelId(null); setEditingEmbedIndex(null);
      return;
    }
    const idx = embeds.findIndex(e => e.id === editing.id);
    const updated = idx >= 0 ? embeds.map((e, i) => i === idx ? editing : e) : [...embeds, editing];
    saveEmbeds(updated);
    setShowEditor(false); setEditing(null);
  };

  const deleteEmbed = (id: string) => {
    if (!confirm("Удалить этот embed?")) return;
    saveEmbeds(embeds.filter(e => e.id !== id));
  };

  const duplicateEmbed = (embed: EmbedData) => {
    const dup = { ...embed, id: genId(), title: embed.title + " (копия)", fields: embed.fields.map(f => ({ ...f })) };
    saveEmbeds([...embeds, dup]);
  };

  const addField = () => {
    if (!editing) return;
    setEditing({ ...editing, fields: [...editing.fields, { name: "", value: "", inline: false }] });
  };

  const updateField = (idx: number, key: keyof EmbedField, value: string | boolean) => {
    if (!editing) return;
    const fields = editing.fields.map((f, i) => i === idx ? { ...f, [key]: value } : f);
    setEditing({ ...editing, fields });
  };

  const removeField = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, fields: editing.fields.filter((_, i) => i !== idx) });
  };

  const sendEmbed = useCallback(async (embed: EmbedData, channelId: string) => {
    if (!channelId) return;
    setSending(p => ({ ...p, [embed.id]: true }));
    setResults(p => { const n = { ...p }; delete n[embed.id]; return n; });
    try {
      const res = await fetch("/api/proxy/send-embed", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, title: embed.title, description: embed.description, color: embed.color, fields: embed.fields.filter(f => f.name || f.value) }),
      });
      const data = await res.json();
      if (data.ok) {
        setResults(p => ({ ...p, [embed.id]: { ok: true, msg: "Отправлено в #" + data.channelName } }));
        saveSentMessage(embed.id, channelId, data.messageId);
      } else {
        setResults(p => ({ ...p, [embed.id]: { ok: false, msg: data.message || "Ошибка" } }));
      }
    } catch (e: unknown) {
      setResults(p => ({ ...p, [embed.id]: { ok: false, msg: (e as Error).message } }));
    }
    setSending(p => ({ ...p, [embed.id]: false }));
  }, []);

  const editSentEmbed = useCallback(async (embed: EmbedData) => {
    const rec = sentMessages[embed.id];
    if (!rec) return;
    setSending(p => ({ ...p, [embed.id]: true }));
    setResults(p => { const n = { ...p }; delete n[embed.id]; return n; });
    try {
      const res = await fetch("/api/proxy/edit-embed", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: rec.channelId, messageId: rec.messageId, title: embed.title, description: embed.description, color: embed.color, fields: embed.fields.filter(f => f.name || f.value) }),
      });
      const data = await res.json();
      if (data.ok) {
        setResults(p => ({ ...p, [embed.id]: { ok: true, msg: "Обновлено в #" + data.channelName } }));
      } else {
        setResults(p => ({ ...p, [embed.id]: { ok: false, msg: data.message || "Ошибка" } }));
      }
    } catch (e: unknown) {
      setResults(p => ({ ...p, [embed.id]: { ok: false, msg: (e as Error).message } }));
    }
    setSending(p => ({ ...p, [embed.id]: false }));
  }, [sentMessages]);

  /* ─── Bot Messages functions ─── */
  const fetchBotMessages = useCallback(async (chId: string) => {
    if (!chId) return;
    setBotMsgLoading(true); setBotMsgError(null);
    try {
      const res = await fetch(`/api/proxy/bot-messages?channelId=${chId}&limit=50`);
      const data = await res.json();
      if (data.error) { setBotMsgError(data.error); setBotMessages([]); }
      else setBotMessages(data.messages || []);
    } catch (e: unknown) { setBotMsgError((e as Error).message); }
    setBotMsgLoading(false);
  }, []);

  const editBotMessage = async (channelId: string, messageId: string, embed: EmbedData, embedIdx?: number | null) => {
    setBotMsgSending(p => ({ ...p, [messageId]: true }));
    try {
      const payload: Record<string, unknown> = { channelId, messageId, title: embed.title, description: embed.description, color: embed.color, fields: embed.fields.filter(f => f.name || f.value) };
      if (typeof embedIdx === 'number') payload.embedIndex = embedIdx;
      const res = await fetch("/api/proxy/edit-embed", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setBotMsgResults(p => ({ ...p, [messageId]: { ok: true, msg: "Обновлено!" } }));
        setTimeout(() => fetchBotMessages(channelId), 500);
      } else {
        setBotMsgResults(p => ({ ...p, [messageId]: { ok: false, msg: data.message || "Ошибка" } }));
      }
    } catch (e: unknown) {
      setBotMsgResults(p => ({ ...p, [messageId]: { ok: false, msg: (e as Error).message } }));
    }
    setBotMsgSending(p => ({ ...p, [messageId]: false }));
  };

  const removeEmbed = async (channelId: string, messageId: string, embedIndex: number, embedTitle: string) => {
    if (!confirm(`Удалить embed "${embedTitle || '#' + (embedIndex + 1)}" из сообщения?`)) return;
    setBotMsgSending(p => ({ ...p, [messageId]: true }));
    try {
      const res = await fetch("/api/proxy/remove-embed", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, messageId, embedIndex }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.deleted) {
          setBotMessages(prev => prev.filter(m => m.id !== messageId));
        }
        setBotMsgResults(p => ({ ...p, [messageId]: { ok: true, msg: data.deleted ? "Сообщение удалено (последний embed)" : `Embed удалён, осталось: ${data.remainingEmbeds}` } }));
        if (!data.deleted) setTimeout(() => fetchBotMessages(channelId), 500);
      } else {
        setBotMsgResults(p => ({ ...p, [messageId]: { ok: false, msg: data.message || "Ошибка" } }));
      }
    } catch (e: unknown) {
      setBotMsgResults(p => ({ ...p, [messageId]: { ok: false, msg: (e as Error).message } }));
    }
    setBotMsgSending(p => ({ ...p, [messageId]: false }));
  };

  const deleteBotMessage = async (channelId: string, messageId: string) => {
    if (!confirm("Удалить это сообщение бота?")) return;
    setBotMsgSending(p => ({ ...p, [messageId]: true }));
    try {
      const res = await fetch("/api/proxy/delete-message", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, messageId }),
      });
      const data = await res.json();
      if (data.ok) {
        setBotMessages(prev => prev.filter(m => m.id !== messageId));
        setBotMsgResults(p => ({ ...p, [messageId]: { ok: true, msg: "Удалено" } }));
      } else {
        setBotMsgResults(p => ({ ...p, [messageId]: { ok: false, msg: data.message || "Ошибка" } }));
      }
    } catch (e: unknown) {
      setBotMsgResults(p => ({ ...p, [messageId]: { ok: false, msg: (e as Error).message } }));
    }
    setBotMsgSending(p => ({ ...p, [messageId]: false }));
  };

  const importToTemplates = (msg: BotMessage) => {
    if (msg.embeds.length === 0) return;
    const emb = msg.embeds[0];
    const newE: EmbedData = {
      id: genId(), title: emb.title || "", description: emb.description || "",
      color: emb.color || "#5865F2",
      fields: (emb.fields || []).map(f => ({ name: f.name, value: f.value, inline: !!f.inline })),
    };
    saveEmbeds([...embeds, newE]);
    saveSentMessage(newE.id, msg.channelId, msg.id);
    setTab("templates");
    setResults(p => ({ ...p, [newE.id]: { ok: true, msg: "Импортировано из #" + msg.channelName } }));
  };

  const filteredChannels = channels.filter(ch => {
    const q = channelSearch.toLowerCase();
    return ch.name.toLowerCase().includes(q) || (ch.parentName || "").toLowerCase().includes(q);
  });
  const filteredBotMsgChannels = channels.filter(ch => {
    const q = botMsgChannelSearch.toLowerCase();
    return ch.name.toLowerCase().includes(q) || (ch.parentName || "").toLowerCase().includes(q);
  });

  return (
    <main className="min-h-screen p-6 lg:p-16 font-sans max-w-7xl mx-auto space-y-10">
      <header className="flex justify-between items-center pb-6 border-b border-white/10 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Embed-сообщения</h1>
          <p className="mt-2 text-zinc-400 text-sm">Создавайте, редактируйте и управляйте embed-сообщениями бота.</p>
        </div>
        {tab === "templates" && (
          <button onClick={() => openEditor()} className="px-6 py-2.5 rounded-full font-semibold transition-all glass-panel bg-blue-500/10 hover:bg-blue-500/20 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-blue-500/30 text-white flex items-center gap-2">
            <span className="text-lg">+</span> Создать Embed
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("templates")} className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${tab === "templates" ? "bg-blue-500/20 border-blue-500/50 text-blue-300" : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"}`}>
          📝 Шаблоны
        </button>
        <button onClick={() => setTab("bot-messages")} className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${tab === "bot-messages" ? "bg-purple-500/20 border-purple-500/50 text-purple-300" : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"}`}>
          🤖 Сообщения бота
        </button>
      </div>

      {/* TAB: Templates */}
      {tab === "templates" && (
        <>
          <div className="glass-panel p-5 rounded-2xl border border-blue-500/20 space-y-3">
            <h2 className="font-bold text-white text-sm">📡 Канал для отправки</h2>
            <input type="text" placeholder="Поиск каналов..." value={channelSearch} onChange={e => setChannelSearch(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 outline-none" />
            <select value={selectedChannel} onChange={e => setSelectedChannel(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500/50 outline-none">
              <option value="">— Выберите канал ({filteredChannels.length}) —</option>
              {filteredChannels.map(ch => <option key={ch.id} value={ch.id}>#{ch.name} {ch.parentName ? "(" + ch.parentName + ")" : ""}</option>)}
            </select>
          </div>

          {embeds.length === 0 ? (
            <div className="py-16 text-center glass-panel rounded-2xl border-dashed border-white/20">
              <div className="text-5xl mb-4">📝</div>
              <p className="text-zinc-400 font-medium">Нет сохранённых embeds.</p>
              <p className="text-zinc-500 text-sm mt-1">Нажмите «Создать Embed» или перейдите во вкладку «Сообщения бота».</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {embeds.map(embed => (
                <div key={embed.id} className="glass-panel p-5 rounded-2xl flex flex-col group relative overflow-hidden transition-all hover:border-purple-500/30">
                  <div className="absolute top-0 left-0 w-full h-1 rounded-t-2xl" style={{ backgroundColor: embed.color }} />
                  <div className="mb-4 pt-2">
                    <h3 className="text-lg font-bold text-white mb-2 truncate">{embed.title || "Без заголовка"}</h3>
                    <div className="text-sm text-zinc-300 line-clamp-3 bg-black/20 p-3 rounded-lg border-l-2" style={{ borderColor: embed.color }}>{embed.description || "Без описания"}</div>
                    {embed.fields.length > 0 && <p className="text-zinc-500 text-xs mt-2">{embed.fields.length} полей</p>}
                  </div>
                  {results[embed.id] && (
                    <div className={"mb-3 p-2 rounded-lg text-xs " + (results[embed.id].ok ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border border-red-500/30 text-red-300")}>
                      {results[embed.id].ok ? "✅" : "❌"} {results[embed.id].msg}
                    </div>
                  )}
                  {sentMessages[embed.id] && !results[embed.id] && <div className="mb-3 text-xs text-emerald-400/60">● Отправлено ранее</div>}
                  <div className="mt-auto flex gap-2 pt-4 border-t border-white/10 flex-wrap">
                    <button onClick={() => openEditor(embed)} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium text-zinc-300">✏️ Ред.</button>
                    <button onClick={() => sendEmbed(embed, selectedChannel)} disabled={!selectedChannel || sending[embed.id]} className="flex-1 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors text-sm font-medium disabled:opacity-40">{sending[embed.id] ? "⏳" : "📤 Отпр."}</button>
                    {sentMessages[embed.id] && (
                      <button onClick={() => editSentEmbed(embed)} disabled={sending[embed.id]} className="flex-1 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-colors text-sm font-medium disabled:opacity-40">🔄 Обн.</button>
                    )}
                    <button onClick={() => duplicateEmbed(embed)} className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-zinc-500" title="Дублировать">📋</button>
                    <button onClick={() => deleteEmbed(embed.id)} className="py-2 px-3 rounded-lg bg-white/5 hover:bg-red-500/10 transition-colors text-sm text-zinc-500 hover:text-red-400" title="Удалить">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB: Bot Messages */}
      {tab === "bot-messages" && (
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 space-y-3">
            <h2 className="font-bold text-white text-sm">🔍 Выберите канал для просмотра сообщений бота</h2>
            <input type="text" placeholder="Поиск каналов..." value={botMsgChannelSearch} onChange={e => setBotMsgChannelSearch(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500/50 outline-none" />
            <div className="flex gap-2">
              <select value={botMsgChannel} onChange={e => setBotMsgChannel(e.target.value)} className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-purple-500/50 outline-none">
                <option value="">— Выберите канал ({filteredBotMsgChannels.length}) —</option>
                {filteredBotMsgChannels.map(ch => <option key={ch.id} value={ch.id}>#{ch.name} {ch.parentName ? "(" + ch.parentName + ")" : ""}</option>)}
              </select>
              <button onClick={() => fetchBotMessages(botMsgChannel)} disabled={!botMsgChannel || botMsgLoading} className="px-5 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-bold border border-purple-500/50 transition-all disabled:opacity-40 text-sm">
                {botMsgLoading ? "⏳ Загрузка..." : "🔍 Загрузить"}
              </button>
            </div>
          </div>

          {botMsgError && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">❌ {botMsgError}</div>}

          {botMessages.length === 0 && !botMsgLoading && !botMsgError && botMsgChannel && (
            <div className="py-12 text-center glass-panel rounded-2xl border-dashed border-white/20">
              <div className="text-4xl mb-3">🤖</div>
              <p className="text-zinc-400">Нет сообщений бота в этом канале.</p>
            </div>
          )}

          {!botMsgChannel && (
            <div className="py-12 text-center glass-panel rounded-2xl border-dashed border-white/20">
              <div className="text-4xl mb-3">👆</div>
              <p className="text-zinc-400">Выберите канал и нажмите «Загрузить», чтобы увидеть сообщения бота.</p>
              <p className="text-zinc-500 text-sm mt-1">Вы сможете редактировать, удалять и импортировать embed-сообщения в шаблоны.</p>
            </div>
          )}

          {botMessages.length > 0 && (
            <div className="space-y-4">
              <p className="text-zinc-400 text-sm">Найдено {botMessages.length} сообщений бота</p>
              {botMessages.map(msg => (
                <div key={msg.id} className="glass-panel rounded-2xl overflow-hidden transition-all hover:border-purple-500/30">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <span className="text-purple-400 text-lg">🤖</span>
                      <div>
                        <span className="text-white text-sm font-medium">#{msg.channelName}</span>
                        <span className="text-zinc-600 text-xs ml-2 font-mono">ID: {msg.id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>{new Date(msg.createdAt).toLocaleString()}</span>
                      {msg.editedAt && <span className="text-amber-400/60">(ред.)</span>}
                    </div>
                  </div>

                  {msg.embeds.map((emb, ei) => (
                    <div key={ei} className="mx-5 my-3 group/embed relative">
                      <div className="bg-[#2b2d31] rounded-lg overflow-hidden border border-white/5">
                        <div className="flex">
                          <div className="w-1 rounded-l" style={{ backgroundColor: emb.color || "#5865F2" }} />
                          <div className="p-4 space-y-2 flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                {emb.title && <h4 className="font-bold text-white text-sm">{emb.title}</h4>}
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover/embed:opacity-100 transition-opacity shrink-0">
                                <button
                                  onClick={() => openEditor(
                                    { id: msg.id + '-' + ei, title: emb.title || "", description: emb.description || "", color: emb.color || "#5865F2", fields: (emb.fields || []).map(f => ({ name: f.name, value: f.value, inline: !!f.inline })) },
                                    msg.id, msg.channelId, ei
                                  )}
                                  disabled={botMsgSending[msg.id]}
                                  className="px-1.5 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-xs disabled:opacity-40 transition-colors"
                                  title="Редактировать этот embed"
                                >✏️</button>
                                <button
                                  onClick={() => removeEmbed(msg.channelId, msg.id, ei, emb.title || '')}
                                  disabled={botMsgSending[msg.id]}
                                  className="px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs disabled:opacity-40 transition-colors"
                                  title="Удалить этот embed"
                                >🗑️</button>
                              </div>
                            </div>
                            {emb.description && <p className="text-zinc-300 text-xs whitespace-pre-line line-clamp-6">{emb.description}</p>}
                            {emb.fields && emb.fields.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mt-2">
                                {emb.fields.slice(0, 6).map((f, fi) => (
                                  <div key={fi} className={!f.inline ? "md:col-span-2" : ""}>
                                    {f.name && <div className="font-semibold text-white text-xs">{f.name}</div>}
                                    {f.value && <div className="text-zinc-400 text-xs whitespace-pre-line line-clamp-2">{f.value}</div>}
                                  </div>
                                ))}
                                {emb.fields.length > 6 && <div className="text-zinc-600 text-xs md:col-span-2">...и ещё {emb.fields.length - 6} полей</div>}
                              </div>
                            )}
                            {emb.footer && <div className="text-zinc-500 text-[10px] mt-2 border-t border-white/5 pt-1">{emb.footer}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {msg.content && (
                    <div className="mx-5 mb-3 p-3 rounded-lg bg-black/20 border border-white/5">
                      <p className="text-zinc-300 text-sm whitespace-pre-line">{msg.content}</p>
                    </div>
                  )}
                  {msg.embeds.length === 0 && !msg.content && <div className="mx-5 my-3 text-zinc-500 text-xs italic">Пустое сообщение (компоненты: {msg.components})</div>}

                  {botMsgResults[msg.id] && (
                    <div className={`mx-5 mb-3 p-2 rounded-lg text-xs ${botMsgResults[msg.id].ok ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border border-red-500/30 text-red-300"}`}>
                      {botMsgResults[msg.id].ok ? "✅" : "❌"} {botMsgResults[msg.id].msg}
                    </div>
                  )}

                  <div className="flex gap-2 px-5 py-3 border-t border-white/10 flex-wrap">
                    {msg.embeds.length > 0 && (
                      <>
                        {msg.embeds.length === 1 && (
                          <button
                            onClick={() => {
                              const emb = msg.embeds[0];
                              openEditor(
                                { id: msg.id, title: emb.title || "", description: emb.description || "", color: emb.color || "#5865F2", fields: (emb.fields || []).map(f => ({ name: f.name, value: f.value, inline: !!f.inline })) },
                                msg.id, msg.channelId, 0
                              );
                            }}
                            disabled={botMsgSending[msg.id]}
                            className="px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-colors text-sm font-medium disabled:opacity-40"
                          >✏️ Редактировать</button>
                        )}
                        {msg.embeds.length > 1 && (
                          <span className="text-zinc-500 text-xs self-center">Наведите на embed для ✏️/🗑️</span>
                        )}
                        <button onClick={() => importToTemplates(msg)} className="px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors text-sm font-medium">📥 В шаблоны</button>
                      </>
                    )}
                    <button onClick={() => deleteBotMessage(msg.channelId, msg.id)} disabled={botMsgSending[msg.id]} className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors text-sm font-medium disabled:opacity-40 ml-auto">🗑️ Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Editor modal (shared) */}
      {showEditor && editing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-6">
          <div className="glass-panel rounded-2xl w-full max-w-3xl my-8 border border-white/10">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">
                {editingMessageId ? "✏️ Редактировать сообщение бота" : embeds.some(e => e.id === editing.id) ? "✏️ Редактировать Embed" : "✨ Новый Embed"}
              </h2>
              <button onClick={() => { setShowEditor(false); setEditing(null); setEditingMessageId(null); setEditingChannelId(null); setEditingEmbedIndex(null); }} className="text-zinc-500 hover:text-white transition-colors text-xl">✕</button>
            </div>

            {editingMessageId && (
              <div className="mx-6 mt-4 p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs">
                🤖 Редактирование live-сообщения (ID: {editingMessageId}){typeof editingEmbedIndex === 'number' ? ` — Embed #${editingEmbedIndex + 1}` : ''}
              </div>
            )}

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Заголовок</label>
                <input type="text" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Заголовок embed..." maxLength={256} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 outline-none focus:border-blue-500/50" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Описание</label>
                <textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Описание embed (Markdown)..." rows={4} maxLength={4096} className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-500 outline-none focus:border-blue-500/50 resize-y" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Цвет</label>
                <div className="flex gap-2 flex-wrap items-center">
                  {COLORS.map(c => (
                    <button key={c.hex} onClick={() => setEditing({ ...editing, color: c.hex })} className={"w-8 h-8 rounded-full transition-all border-2 " + (editing.color === c.hex ? "border-white scale-110" : "border-transparent hover:border-white/30")} style={{ backgroundColor: c.hex }} title={c.label} />
                  ))}
                  <input type="color" value={editing.color} onChange={e => setEditing({ ...editing, color: e.target.value })} className="w-8 h-8 rounded-full cursor-pointer bg-transparent border border-white/10" title="Свой цвет" />
                  <span className="text-zinc-500 text-xs ml-1 font-mono">{editing.color}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Поля ({editing.fields.length}/25)</label>
                <div className="space-y-3">
                  {editing.fields.map((field, i) => (
                    <div key={i} className="bg-black/20 rounded-lg p-3 border border-white/5 space-y-2">
                      <div className="flex gap-2 items-center">
                        <input type="text" value={field.name} onChange={e => updateField(i, "name", e.target.value)} placeholder="Название поля" maxLength={256} className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-blue-500/50" />
                        <button onClick={() => removeField(i)} className="text-zinc-500 hover:text-red-400 transition-colors px-2">✕</button>
                      </div>
                      <textarea value={field.value} onChange={e => updateField(i, "value", e.target.value)} placeholder="Значение поля..." rows={2} maxLength={1024} className="w-full bg-black/30 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-blue-500/50 resize-y" />
                      <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                        <input type="checkbox" checked={field.inline} onChange={e => updateField(i, "inline", e.target.checked)} className="rounded" /> Inline
                      </label>
                    </div>
                  ))}
                </div>
                {editing.fields.length < 25 && (
                  <button onClick={addField} className="mt-2 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 text-sm transition-colors border border-white/10 border-dashed">+ Добавить поле</button>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Предпросмотр</label>
                <div className="bg-[#2b2d31] rounded-lg overflow-hidden border border-white/5">
                  <div className="flex">
                    <div className="w-1 rounded-l" style={{ backgroundColor: editing.color }} />
                    <div className="p-4 space-y-2 flex-1">
                      {editing.title && <h4 className="font-bold text-white">{editing.title}</h4>}
                      {editing.description && <p className="text-zinc-300 text-sm whitespace-pre-line">{editing.description}</p>}
                      {editing.fields.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          {editing.fields.map((f, i) => (
                            <div key={i} className={!f.inline ? "md:col-span-2" : ""}>
                              {f.name && <div className="font-semibold text-white text-xs">{f.name}</div>}
                              {f.value && <div className="text-zinc-400 text-xs whitespace-pre-line">{f.value}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-white/10">
              <button onClick={() => { setShowEditor(false); setEditing(null); setEditingMessageId(null); setEditingChannelId(null); setEditingEmbedIndex(null); }} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 text-sm font-medium transition-colors">Отмена</button>
              <button onClick={saveEmbed} disabled={!editing.title && !editing.description} className="px-5 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-bold border border-blue-500/50 transition-all disabled:opacity-40 text-sm">
                {editingMessageId ? "✏️ Обновить сообщение" : "💾 Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
