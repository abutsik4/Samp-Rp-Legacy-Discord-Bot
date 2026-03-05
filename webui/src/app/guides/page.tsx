"use client";
import { useState, useEffect, useCallback } from "react";

/* ─── types ─── */
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
interface LiveRole {
  id: string;
  name: string;
  color: string;
  position: number;
}
interface LiveStructure {
  guildName: string;
  categories: LiveCategory[];
  roles: LiveRole[];
}

interface GuideEmbed {
  key: string;
  title: string;
  description: string;
  color: string;
  fields?: { name: string; value: string; inline?: boolean }[];
}

interface SentRecord {
  channelId: string;
  messageId: string;
}

interface Channel {
  id: string;
  name: string;
  parentName: string | null;
}

/* ─── colour palette for auto-colouring factions ─── */
const PALETTE = [
  { hex: "#F59E0B", card: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30" },
  { hex: "#64748B", card: "from-slate-500/20 to-slate-600/10 border-slate-500/30" },
  { hex: "#3B82F6", card: "from-blue-500/20 to-blue-600/10 border-blue-500/30" },
  { hex: "#0EA5E9", card: "from-sky-500/20 to-sky-600/10 border-sky-500/30" },
  { hex: "#14B8A6", card: "from-teal-500/20 to-teal-600/10 border-teal-500/30" },
  { hex: "#22C55E", card: "from-green-500/20 to-green-600/10 border-green-500/30" },
  { hex: "#10B981", card: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30" },
  { hex: "#EF4444", card: "from-red-500/20 to-red-600/10 border-red-500/30" },
  { hex: "#A855F7", card: "from-purple-500/20 to-purple-600/10 border-purple-500/30" },
  { hex: "#F97316", card: "from-orange-500/20 to-orange-600/10 border-orange-500/30" },
  { hex: "#EC4899", card: "from-pink-500/20 to-pink-600/10 border-pink-500/30" },
  { hex: "#8B5CF6", card: "from-violet-500/20 to-violet-600/10 border-violet-500/30" },
];

/* ─── helpers: detect faction-like categories by their structure ─── */
// A faction category has text channels matching patterns like "объявления", "общий-чат" etc.
function isFactionCategory(cat: LiveCategory): boolean {
  const textNames = cat.channels.filter(ch => ch.typeName === "text").map(ch => ch.name.toLowerCase());
  const hasCoreChannels =
    textNames.some(n => n.includes("объявления") || n.includes("announce")) &&
    textNames.some(n => n.includes("общий") || n.includes("чат") || n.includes("general"));
  return hasCoreChannels && cat.channels.length >= 3;
}

function stripEmojis(str: string): string {
  return str
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
    .replace(/[\u200B-\u200D\uFE0F\uFE0E\u2060\u00A0]/g, "") // variation selectors, ZWJ, etc.
    .trim();
}

function extractTagFromCategory(catName: string): string {
  // e.g. "🕵️ FBI" → "FBI", "🚓 ЛСПД" → "ЛСПД", "🏛️ Мэрия" → "Мэрия"
  const cleaned = stripEmojis(catName);
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts[0] || cleaned;
}

function extractEmojiFromCategory(catName: string): string {
  const match = catName.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu);
  return match ? match[0] : "📁";
}

function channelNameHasEmoji(name: string): boolean {
  return /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(name);
}

function cleanChannelName(name: string): string {
  // "📌│объявления" → "объявления"
  return name.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}][\u200B-\u200D\uFE0F\uFE0E]*[│|]?/gu, "").trim();
}

/* ─── build general guide from live structure ─── */
function buildGeneralGuide(structure: LiveStructure): GuideEmbed {
  // Find the start/verification category
  const startCat = structure.categories.find(c =>
    c.name.toLowerCase().includes("старт") ||
    c.channels.some(ch => ch.name.includes("верификац"))
  );

  const adminCat = structure.categories.find(c =>
    c.name.toLowerCase().includes("админ") || c.name.toLowerCase().includes("admin")
  );

  const fields: { name: string; value: string; inline?: boolean }[] = [];

  if (startCat) {
    const chList = startCat.channels
      .filter(ch => ch.typeName === "text" || ch.typeName === "announcement")
      .map(ch => {
        if (ch.name.includes("правила") || ch.name.includes("верификации")) {
          return `**#${ch.name}** — правила сервера и инструкция по верификации (только чтение)`;
        }
        if (ch.name.includes("верификац")) {
          return `**#${ch.name}** — напишите свой ник и ссылку на форумный аккаунт для получения роли`;
        }
        if (ch.name.includes("запрос") || ch.name.includes("role")) {
          return `**#${ch.name}** — запрос вступления в организацию (после верификации)`;
        }
        return `**#${ch.name}**`;
      });
    fields.push({ name: `🚀 ${startCat.name}`, value: chList.join("\n") || "_Нет текстовых каналов_" });
  }

  if (adminCat) {
    const chList = adminCat.channels.map(ch => {
      const icon = ch.typeName === "voice" ? "🔊" : "📢";
      const desc = ch.typeName === "voice"
        ? "голосовой канал для совещаний руководства"
        : "внутренний чат администрации и модераторов";
      return `**${icon} ${ch.name}** — ${desc}`;
    });
    fields.push({
      name: "🛡️ Администрация",
      value: chList.join("\n") + "\n_Эти каналы видны только Админам и Модераторам_"
    });
  }

  fields.push({
    name: "✅ Верификация — как пройти?",
    value:
      "1. Прочитайте канал с правилами верификации\n" +
      "2. Перейдите в канал верификации\n" +
      "3. Напишите: **Ник в игре** + **ссылка на форумный аккаунт**\n" +
      "4. Дождитесь одобрения от Админа/Модератора\n" +
      "5. Вам выдадут роль → откроется доступ ко всему серверу",
  });

  fields.push({
    name: "📩 Как запросить роль?",
    value:
      "1. Пройдите верификацию\n" +
      "2. Перейдите в канал запроса ролей\n" +
      "3. Нажмите кнопку **Запросить роль** и выберите организацию\n" +
      "4. Одобрить может: **Админ**, **Модератор**, **Лидер** или **Зам. Лидера**",
  });

  return {
    key: "general",
    title: `📖 Гайд по общим каналам сервера ${structure.guildName}`,
    color: "#5865F2",
    description: `Добро пожаловать на сервер **${structure.guildName}**!\nНиже — описание общих каналов, доступных всем участникам.`,
    fields
  };
}

/* ─── build faction guide from live category data ─── */
function buildFactionGuide(cat: LiveCategory, color: string, structure: LiveStructure): GuideEmbed {
  const emoji = extractEmojiFromCategory(cat.name);
  const tag = extractTagFromCategory(cat.name);

  const textChannels = cat.channels.filter(ch => ch.typeName === "text");
  const voiceChannels = cat.channels.filter(ch => ch.typeName === "voice");

  const fields: { name: string; value: string; inline?: boolean }[] = [];

  // Build descriptions for each text channel based on name patterns
  for (const ch of textChannels) {
    const n = ch.name.toLowerCase();
    const clean = cleanChannelName(ch.name);
    let desc = "Канал для общения участников.";
    if (n.includes("объявлен")) desc = "Официальные объявления руководства организации.\nПисать могут только **👑 Лидер** и **👔 Зам. Лидера**.";
    else if (n.includes("оператив")) desc = "Канал для оперативных сообщений и координации смен.";
    else if (n.includes("общий") || n.includes("чат")) desc = "Общий текстовый чат для всех участников организации.\nОбсуждения, вопросы, координация.";
    else if (n.includes("1на1") || n.includes("1x1") || n.includes("1-1")) desc = "Канал для личных обсуждений между двумя участниками.\nИспользуйте для разборов, собеседований, тет-а-тет.";
    else if (n.includes("2на2") || n.includes("2x2") || n.includes("2-2")) desc = "Канал для групповых обсуждений (2 на 2).\nНапример, переговоры между подразделениями.";
    else if (n.includes("запрос")) desc = "Канал для подачи заявок и запросов в организацию.";
    else if (n.includes("отчёт") || n.includes("отчет") || n.includes("report")) desc = "Канал для сдачи отчётов и отслеживания активности.";
    else if (n.includes("брифинг") || n.includes("briefing")) desc = "Канал для подготовки, инструктажа и координации перед операциями.";

    // Use channel name as-is if it has emoji, otherwise prepend icon
    let label: string;
    if (channelNameHasEmoji(ch.name)) {
      label = ch.name;
    } else {
      const icon = n.includes("объявлен") ? "📌" : n.includes("общий") || n.includes("чат") ? "💬" : n.includes("оператив") ? "📡" : n.includes("1на1") || n.includes("1x1") ? "🤝" : n.includes("2на2") || n.includes("2x2") ? "👥" : "📝";
      label = `${icon}│${ch.name}`;
    }
    fields.push({ name: label, value: desc, inline: true });
  }

  for (const ch of voiceChannels) {
    const n = ch.name.toLowerCase();
    let desc = "Голосовой канал.";
    if (n.includes("совещан")) desc = "Голосовой канал для плановых совещаний и собраний.\nПодключайтесь, когда есть повестка.";
    else if (n.includes("рабоч")) desc = "Рабочий голосовой канал.\nДля повседневной связи во время игры.";
    else if (n.includes("брифинг") || n.includes("briefing")) desc = "Голосовой канал для инструктажа и координации.";
    else if (n.includes("оперштаб") || n.includes("штаб")) desc = "Оперативный голосовой канал для быстрой координации.";
    else if (n.includes("1") && (n.includes("x") || n.includes("×") || n.includes("на"))) desc = "Голосовой канал на 2 участника.\nДля приватных голосовых разговоров.";
    else if (n.includes("2") && (n.includes("x") || n.includes("×") || n.includes("на"))) desc = "Голосовой канал для малых групп.\nНапример, совместное патрулирование или операция.";

    // Use channel name as-is if it has emoji, otherwise prepend icon
    let label: string;
    if (channelNameHasEmoji(ch.name)) {
      label = ch.name;
    } else {
      const icon = n.includes("совещан") ? "🔊" : n.includes("рабоч") ? "🎙️" : n.includes("оперштаб") || n.includes("штаб") ? "📡" : n.includes("брифинг") ? "🎯" : "🔉";
      label = `${icon} ${ch.name}`;
    }
    fields.push({ name: label, value: desc, inline: true });
  }

  // Find matching roles for this faction by TAG
  // Roles are named like "👑 MAYOR │ Лидер", "👔 FBI │ Зам. Лидера"
  // We search for " TAG │" or " TAG |" pattern, or roles containing the cleaned category name
  const catClean = stripEmojis(cat.name);
  const factionRoles = structure.roles.filter(r => {
    const rClean = stripEmojis(r.name);
    // Match by tag surrounded by delimiters (" TAG │" or " TAG |")
    if (rClean.includes(`${tag} │`) || rClean.includes(`${tag} |`) || rClean.includes(`${tag}]`)) return true;
    // Also match if clean name contains the faction title (for custom roles)
    if (catClean.length >= 3 && rClean.toLowerCase().includes(catClean.toLowerCase())) return true;
    return false;
  });

  if (factionRoles.length > 0) {
    const roleList = factionRoles.map(r => `${r.name}`).join("\n");
    fields.push({ name: "🏅 Роли организации", value: roleList });
  }

  return {
    key: cat.id,
    title: `${emoji} Гайд по каналам — ${catClean}`,
    color,
    description: `Описание каналов организации **${catClean}**.`,
    fields
  };
}

/* ─── component ─── */
export default function GuidesPage() {
  const [structure, setStructure] = useState<LiveStructure | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [guides, setGuides] = useState<GuideEmbed[]>([]);
  const [factionCats, setFactionCats] = useState<{ cat: LiveCategory; color: string; card: string }[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<string>("general");
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [channelSearch, setChannelSearch] = useState("");
  const [channelError, setChannelError] = useState<string | null>(null);
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [sentRecords, setSentRecords] = useState<Record<string, SentRecord>>({});
  const [loading, setLoading] = useState(true);

  // Load live structure + channels
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [structRes, chRes] = await Promise.all([
          fetch("/api/proxy/structure-live"),
          fetch("/api/proxy/channels")
        ]);
        const structData = await structRes.json();
        const chData = await chRes.json();

        if (structData.categories) {
          setStructure(structData);
          // Detect faction categories
          const fCats = structData.categories
            .filter((c: LiveCategory) => isFactionCategory(c))
            .map((c: LiveCategory, i: number) => ({
              cat: c,
              color: PALETTE[i % PALETTE.length].hex,
              card: PALETTE[i % PALETTE.length].card
            }));
          setFactionCats(fCats);

          // Build guides
          const allGuides: GuideEmbed[] = [
            buildGeneralGuide(structData),
            ...fCats.map((fc: { cat: LiveCategory; color: string }) => buildFactionGuide(fc.cat, fc.color, structData))
          ];
          setGuides(allGuides);
        }
        setChannels(chData.channels || []);
      } catch (e: any) {
        setChannelError(e.message);
      }
      setLoading(false);
    };
    fetchAll();

    // Load sent records from localStorage
    try {
      const saved = localStorage.getItem("srp-guide-sent");
      if (saved) setSentRecords(JSON.parse(saved));
    } catch {}
  }, []);

  // Persist sent records
  const saveSentRecord = (key: string, rec: SentRecord) => {
    setSentRecords(prev => {
      const updated = { ...prev, [key]: rec };
      localStorage.setItem("srp-guide-sent", JSON.stringify(updated));
      return updated;
    });
  };

  const guide = guides.find((g) => g.key === selectedGuide) || guides[0];

  const filteredChannels = channels.filter((ch) => {
    const q = channelSearch.toLowerCase();
    return ch.name.toLowerCase().includes(q) || (ch.parentName || "").toLowerCase().includes(q);
  });

  const sendGuide = useCallback(
    async (g: GuideEmbed) => {
      if (!selectedChannel) {
        setResults((p) => ({ ...p, [g.key]: { ok: false, msg: "Выберите канал!" } }));
        return;
      }
      setSending((p) => ({ ...p, [g.key]: true }));
      setResults((p) => ({ ...p, [g.key]: undefined as any }));
      try {
        const res = await fetch("/api/proxy/send-embed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId: selectedChannel,
            title: g.title,
            description: g.description,
            color: g.color,
            fields: g.fields,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          setResults((p) => ({ ...p, [g.key]: { ok: true, msg: `Отправлено в #${data.channelName}` } }));
          saveSentRecord(g.key, { channelId: selectedChannel, messageId: data.messageId });
        } else {
          setResults((p) => ({ ...p, [g.key]: { ok: false, msg: data.message || "Ошибка" } }));
        }
      } catch (e: any) {
        setResults((p) => ({ ...p, [g.key]: { ok: false, msg: e.message } }));
      }
      setSending((p) => ({ ...p, [g.key]: false }));
    },
    [selectedChannel]
  );

  const editGuide = useCallback(
    async (g: GuideEmbed) => {
      const rec = sentRecords[g.key];
      if (!rec) {
        setResults((p) => ({ ...p, [g.key]: { ok: false, msg: "Сначала отправьте гайд — нет записи для редактирования" } }));
        return;
      }
      setSending((p) => ({ ...p, [g.key]: true }));
      setResults((p) => ({ ...p, [g.key]: undefined as any }));
      try {
        const res = await fetch("/api/proxy/edit-embed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId: rec.channelId,
            messageId: rec.messageId,
            title: g.title,
            description: g.description,
            color: g.color,
            fields: g.fields,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          setResults((p) => ({ ...p, [g.key]: { ok: true, msg: `Обновлено в #${data.channelName}` } }));
        } else {
          setResults((p) => ({ ...p, [g.key]: { ok: false, msg: data.message || "Ошибка редактирования" } }));
        }
      } catch (e: any) {
        setResults((p) => ({ ...p, [g.key]: { ok: false, msg: e.message } }));
      }
      setSending((p) => ({ ...p, [g.key]: false }));
    },
    [sentRecords]
  );

  const sendAll = async () => {
    if (!selectedChannel) {
      alert("Сначала выберите канал!");
      return;
    }
    if (!confirm(`Отправить ВСЕ ${guides.length} гайдов в выбранный канал?`)) return;
    for (const g of guides) {
      await sendGuide(g);
      await new Promise((r) => setTimeout(r, 1200));
    }
  };

  const editAll = async () => {
    const editable = guides.filter(g => sentRecords[g.key]);
    if (editable.length === 0) {
      alert("Нет отправленных гайдов для обновления!");
      return;
    }
    if (!confirm(`Обновить ${editable.length} ранее отправленных гайдов?`)) return;
    for (const g of editable) {
      await editGuide(g);
      await new Promise((r) => setTimeout(r, 1200));
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-6 lg:p-16 font-sans max-w-7xl mx-auto flex items-center justify-center">
        <div className="text-zinc-500 text-lg animate-pulse">Загрузка структуры сервера...</div>
      </main>
    );
  }

  if (!guide) {
    return (
      <main className="min-h-screen p-6 lg:p-16 font-sans max-w-7xl mx-auto flex items-center justify-center">
        <div className="text-zinc-500 text-lg">Не удалось загрузить гайды. Проверьте подключение бота.</div>
      </main>
    );
  }

  const sentCount = guides.filter(g => sentRecords[g.key]).length;

  return (
    <main className="min-h-screen p-6 lg:p-16 font-sans max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <header className="pb-6 border-b border-white/10">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
          📖 Гайды по каналам
        </h1>
        <p className="mt-2 text-zinc-400 text-sm">
          Динамические embed-гайды, созданные из текущей структуры сервера{structure ? ` «${structure.guildName}»` : ""}.
          {factionCats.length > 0 && ` Найдено ${factionCats.length} организаций.`}
        </p>
      </header>

      {/* Channel selector */}
      <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 space-y-3">
        <h2 className="font-bold text-white text-sm">📡 Канал для отправки</h2>
        <input
          type="text"
          placeholder="Поиск каналов..."
          value={channelSearch}
          onChange={(e) => setChannelSearch(e.target.value)}
          className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-amber-500/50 outline-none"
        />
        <select
          value={selectedChannel}
          onChange={(e) => setSelectedChannel(e.target.value)}
          className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-amber-500/50 outline-none"
        >
          <option value="">— Выберите канал ({filteredChannels.length}) —</option>
          {filteredChannels.map((ch) => (
            <option key={ch.id} value={ch.id}>
              #{ch.name} {ch.parentName ? `(${ch.parentName})` : ""}
            </option>
          ))}
        </select>
        {channelError && (
          <div className="text-red-400 text-xs">❌ Ошибка загрузки: {channelError}</div>
        )}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={sendAll}
            disabled={!selectedChannel}
            className="px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/50 transition-all hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] disabled:opacity-40 text-sm"
          >
            📨 Отправить ВСЕ ({guides.length})
          </button>
          {sentCount > 0 && (
            <button
              onClick={editAll}
              className="px-5 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-500/50 transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] text-sm"
            >
              ✏️ Обновить ВСЕ ({sentCount})
            </button>
          )}
          <span className="text-zinc-500 text-xs self-center">
            Выберите конкретный гайд ниже ↓
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedGuide("general")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
            selectedGuide === "general"
              ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
              : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
          }`}
        >
          🌐 Общие каналы
          {sentRecords["general"] && <span className="ml-1 text-emerald-400 text-[10px]">●</span>}
        </button>
        {factionCats.map((fc) => (
          <button
            key={fc.cat.id}
            onClick={() => setSelectedGuide(fc.cat.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
              selectedGuide === fc.cat.id
                ? `bg-gradient-to-br ${fc.card} text-white`
                : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            {extractEmojiFromCategory(fc.cat.name)} {stripEmojis(fc.cat.name)}
            {sentRecords[fc.cat.id] && <span className="ml-1 text-emerald-400 text-[10px]">●</span>}
          </button>
        ))}
      </div>

      {/* Preview + send/edit */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: guide.color }} />
            <div>
              <h3 className="font-bold text-white text-lg">{guide.title}</h3>
              <p className="text-zinc-500 text-xs">
                Предпросмотр embed
                {sentRecords[guide.key] && (
                  <span className="ml-2 text-emerald-400">
                    ● Отправлено (msg: {sentRecords[guide.key].messageId.slice(-6)})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {sentRecords[guide.key] && (
              <button
                onClick={() => editGuide(guide)}
                disabled={sending[guide.key]}
                className="px-4 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-500/50 transition-all disabled:opacity-40 text-sm"
              >
                {sending[guide.key] ? "⏳..." : "✏️ Обновить"}
              </button>
            )}
            <button
              onClick={() => sendGuide(guide)}
              disabled={sending[guide.key] || !selectedChannel}
              className="px-5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/50 transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-40 text-sm"
            >
              {sending[guide.key] ? "⏳ Отправка..." : "📤 Отправить"}
            </button>
          </div>
        </div>

        {results[guide.key] && (
          <div className={`mx-6 mt-4 p-3 rounded-lg text-sm ${
            results[guide.key].ok
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border border-red-500/30 text-red-300"
          }`}>
            {results[guide.key].ok ? "✅" : "❌"} {results[guide.key].msg}
          </div>
        )}

        <div className="p-6 space-y-4">
          <div
            className="rounded-lg p-4 border-l-4"
            style={{ borderColor: guide.color, backgroundColor: "rgba(0,0,0,0.3)" }}
          >
            <p className="text-zinc-300 text-sm whitespace-pre-line">{guide.description}</p>
          </div>
          {guide.fields && guide.fields.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {guide.fields.map((field, i) => (
                <div
                  key={i}
                  className={`p-3 bg-white/5 rounded-lg border border-white/10 ${!field.inline ? "md:col-span-2" : ""}`}
                >
                  <h4 className="font-bold text-white text-sm mb-1">{field.name}</h4>
                  <p className="text-zinc-400 text-xs whitespace-pre-line">{field.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick-send grid */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">⚡ Быстрая отправка по организациям</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {factionCats.map((fc) => {
            const g = guides.find(x => x.key === fc.cat.id);
            if (!g) return null;
            const r = results[fc.cat.id];
            const s = sending[fc.cat.id];
            const hasSent = !!sentRecords[fc.cat.id];
            return (
              <div
                key={fc.cat.id}
                className={`glass-panel rounded-xl p-4 border bg-gradient-to-br ${fc.card} text-center space-y-2`}
              >
                <span className="text-3xl">{extractEmojiFromCategory(fc.cat.name)}</span>
                <h3 className="font-bold text-white text-sm">{stripEmojis(fc.cat.name)}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => sendGuide(g)}
                    disabled={s || !selectedChannel}
                    className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all disabled:opacity-40"
                  >
                    {s ? "⏳" : "📤"}
                  </button>
                  {hasSent && (
                    <button
                      onClick={() => editGuide(g)}
                      disabled={s}
                      className="flex-1 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-medium transition-all disabled:opacity-40"
                    >
                      ✏️
                    </button>
                  )}
                </div>
                {r && (
                  <span className={`text-[10px] block ${r.ok ? "text-emerald-400" : "text-red-400"}`}>
                    {r.ok ? "✅ Готово" : "❌ Ошибка"}
                  </span>
                )}
                {hasSent && !r && <span className="text-[10px] block text-emerald-400/60">● отпр.</span>}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
