"use client";
import { useState, useEffect, useCallback } from "react";

interface Channel {
  id: string;
  name: string;
  type: number;
  parentName?: string;
}

interface WelcomeConfig {
  enabled: boolean;
  channelId: string;
  message: string;
  autoRoleIds: string[];
}

export default function WelcomePage() {
  const [config, setConfig] = useState<WelcomeConfig>({
    enabled: false,
    channelId: "",
    message: "",
    autoRoleIds: [],
  });
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [sendingPreview, setSendingPreview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [welcomeRes, channelsRes] = await Promise.all([
        fetch("/api/proxy/welcome"),
        fetch("/api/proxy/channels"),
      ]);
      const welcomeData = await welcomeRes.json();
      const channelsData = await channelsRes.json();

      const w = welcomeData.welcome || {};
      setConfig({
        enabled: !!w.enabled,
        channelId: w.channelId || "",
        message: w.message || "",
        autoRoleIds: w.autoRoleIds || [],
      });
      setChannels(channelsData.channels || []);
    } catch {
      setMsg({ text: "Не удалось загрузить данные", ok: false });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (updated?: WelcomeConfig) => {
    const toSave = updated || config;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/proxy/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
      const data = await res.json();
      if (data.ok) {
        setConfig(data.welcome);
        setMsg({ text: "Настройки сохранены!", ok: true });
      } else {
        setMsg({ text: data.error || "Ошибка сохранения", ok: false });
      }
    } catch (e: unknown) {
      setMsg({ text: (e as Error).message, ok: false });
    }
    setSaving(false);
  };

  const toggleEnabled = () => {
    const updated = { ...config, enabled: !config.enabled };
    setConfig(updated);
    save(updated);
  };

  const updateField = (field: keyof WelcomeConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const sendPreview = async () => {
    if (!config.channelId) {
      setMsg({ text: "Сначала выберите канал", ok: false });
      return;
    }
    setSendingPreview(true);
    setMsg(null);
    try {
      const res = await fetch("/api/proxy/welcome-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: config.channelId }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ text: "Превью отправлено в канал!", ok: true });
      } else {
        setMsg({ text: data.error || "Ошибка отправки", ok: false });
      }
    } catch (e: unknown) {
      setMsg({ text: (e as Error).message, ok: false });
    }
    setSendingPreview(false);
  };

  const textChannels = channels.filter((c) => c.type === 0);
  const selectedChannelName =
    channels.find((c) => c.id === config.channelId)?.name || "";

  /* Placeholders for the message template */
  const placeholders = [
    { tag: "{user}", desc: "Упоминание пользователя" },
    { tag: "{username}", desc: "Имя пользователя" },
    { tag: "{server}", desc: "Название сервера" },
    { tag: "{memberCount}", desc: "Количество участников" },
  ];

  if (loading) {
    return (
      <main className="min-h-screen p-6 lg:p-16 font-sans max-w-5xl mx-auto flex items-center justify-center">
        <div className="text-zinc-500 text-lg animate-pulse">
          Загрузка настроек приветствия...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 lg:p-16 font-sans max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <header className="pb-6 border-b border-white/10">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">
          👋 Приветствие
        </h1>
        <p className="mt-2 text-zinc-400 text-sm">
          Настройте автоматическое приветственное сообщение для новых участников
          сервера.
        </p>
      </header>

      {/* Status message */}
      {msg && (
        <div
          className={`p-3 rounded-lg text-sm border ${
            msg.ok
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          {msg.ok ? "✅" : "❌"} {msg.text}
          <button
            onClick={() => setMsg(null)}
            className="float-right text-zinc-500 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Enable / Disable toggle */}
      <div className="glass-panel p-6 rounded-2xl border border-amber-500/20 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              Статус приветствия
            </h2>
            <p className="text-zinc-400 text-xs mt-1">
              {config.enabled
                ? "Приветствие включено — новые участники получат сообщение при входе."
                : "Приветствие выключено — сообщение не отправляется."}
            </p>
          </div>
          <button
            onClick={toggleEnabled}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              config.enabled ? "bg-emerald-500" : "bg-zinc-700"
            }`}
          >
            <div
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${
                config.enabled ? "left-7" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {!config.enabled && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-xs">
            ⚠️ Приветственные сообщения отключены. Включите переключатель выше,
            чтобы новые участники получали приветствие.
          </div>
        )}
      </div>

      {/* Channel selector */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h2 className="text-lg font-bold text-white">📢 Канал приветствия</h2>
        <p className="text-zinc-400 text-xs">
          Выберите канал, куда бот будет отправлять приветственное сообщение.
        </p>

        <select
          value={config.channelId}
          onChange={(e) => updateField("channelId", e.target.value)}
          className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-amber-500/50 transition-colors"
        >
          <option value="">— Выберите канал —</option>
          {textChannels.map((ch) => (
            <option key={ch.id} value={ch.id}>
              #{ch.name} {ch.parentName ? `(${ch.parentName})` : ""}
            </option>
          ))}
        </select>

        {config.channelId && (
          <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
            <span className="text-emerald-400 text-sm">
              📌 Текущий канал:
            </span>
            <code className="text-emerald-300 text-xs bg-emerald-500/10 px-2 py-1 rounded font-mono">
              #{selectedChannelName || config.channelId}
            </code>
          </div>
        )}

        {!config.channelId && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-xs">
            ❌ Канал не выбран — приветствие не будет отправляться даже при
            включённом переключателе.
          </div>
        )}
      </div>

      {/* Message editor */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              💬 Текст приветствия
            </h2>
            <p className="text-zinc-400 text-xs mt-1">
              Поддерживает Discord Markdown. Используйте переменные ниже для
              динамического контента.
            </p>
          </div>
        </div>

        {/* Placeholders */}
        <div className="flex flex-wrap gap-2">
          {placeholders.map((ph) => (
            <button
              key={ph.tag}
              onClick={() =>
                updateField("message", config.message + ph.tag)
              }
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono border border-amber-500/30 transition-all"
              title={ph.desc}
            >
              {ph.tag}
              <span className="ml-1.5 text-zinc-500 font-sans text-[10px]">
                {ph.desc}
              </span>
            </button>
          ))}
        </div>

        <textarea
          value={config.message}
          onChange={(e) => updateField("message", e.target.value)}
          rows={6}
          placeholder="Добро пожаловать на сервер, {user}! 🎉"
          className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 outline-none focus:border-amber-500/50 resize-y font-mono text-sm leading-relaxed transition-colors"
        />

        {/* Live preview */}
        {config.message && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Предпросмотр
            </p>
            <div className="p-4 rounded-xl bg-[#2b2d31] border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500" />
                <span className="text-sm font-bold text-white">
                  Samp-Rp Legacy
                </span>
                <span className="text-[10px] text-zinc-500 bg-[#5865f2] px-1 rounded text-white font-bold">
                  APP
                </span>
              </div>
              <div className="pl-8">
                <p className="text-white font-bold text-sm mb-1">
                  👋 Добро пожаловать на SRP Legacy
                </p>
                <p className="text-zinc-300 text-sm whitespace-pre-wrap break-words">
                  {config.message
                    .replace(/\{user\}/g, "@ИмяУчастника")
                    .replace(/\{username\}/g, "ИмяУчастника")
                    .replace(/\{server\}/g, "SRP Legacy")
                    .replace(/\{memberCount\}/g, "100")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => save()}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/50 transition-all disabled:opacity-40 text-sm"
        >
          {saving ? "⏳ Сохранение..." : "💾 Сохранить настройки"}
        </button>

        <button
          onClick={sendPreview}
          disabled={sendingPreview || !config.channelId}
          className="px-6 py-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-500/50 transition-all disabled:opacity-40 text-sm"
        >
          {sendingPreview
            ? "⏳ Отправка..."
            : "📨 Отправить превью в канал"}
        </button>

        <button
          onClick={load}
          className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-all text-sm"
        >
          🔄 Обновить
        </button>
      </div>

      {/* Info box */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
        <h3 className="text-sm font-bold text-zinc-300">
          ℹ️ Как это работает
        </h3>
        <ul className="text-zinc-400 text-xs space-y-1.5 list-disc list-inside">
          <li>
            Когда новый участник заходит на сервер, бот отправляет embed-
            приветствие в выбранный канал.
          </li>
          <li>
            Аватар нового участника отображается как миниатюра в embed.
          </li>
          <li>
            Переменные <code className="text-amber-400">{"{user}"}</code>,{" "}
            <code className="text-amber-400">{"{username}"}</code>,{" "}
            <code className="text-amber-400">{"{server}"}</code>,{" "}
            <code className="text-amber-400">{"{memberCount}"}</code>{" "}
            автоматически заменяются на реальные значения.
          </li>
          <li>
            Бот-аккаунты не получают приветственного сообщения.
          </li>
          <li>
            Используйте кнопку «Отправить превью» чтобы увидеть, как будет
            выглядеть сообщение в Discord.
          </li>
        </ul>
      </div>
    </main>
  );
}
