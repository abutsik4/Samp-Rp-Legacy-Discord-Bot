"use client";
import { useState, useEffect } from "react";

const FACTIONS_INFO = [
  { tag: 'MAYOR',   emoji: '🏛️', title: 'Мэрия',       color: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30' },
  { tag: 'FBI',     emoji: '🕵️', title: 'ФБР',         color: 'from-slate-500/20 to-slate-600/10 border-slate-500/30' },
  { tag: 'LSPD',    emoji: '🚓', title: 'ЛСПД',        color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30' },
  { tag: 'SFPD',    emoji: '🚓', title: 'СФПД',        color: 'from-sky-500/20 to-sky-600/10 border-sky-500/30' },
  { tag: 'LVPD',    emoji: '🚓', title: 'ЛВПД',        color: 'from-teal-500/20 to-teal-600/10 border-teal-500/30' },
  { tag: 'ARMY-LV', emoji: '🪖', title: 'Армия ЛВ',    color: 'from-green-500/20 to-green-600/10 border-green-500/30' },
  { tag: 'ARMY-SF', emoji: '🪖', title: 'Армия СФ',    color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30' },
  { tag: 'MOH',     emoji: '🚑', title: 'Минздрав',    color: 'from-red-500/20 to-red-600/10 border-red-500/30' },
  { tag: 'INST',    emoji: '🏫', title: 'Инструкторы', color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30' },
  { tag: 'COURT',   emoji: '⚖️', title: 'Суд',         color: 'from-orange-500/20 to-orange-600/10 border-orange-500/30' },
];

export default function FactionsPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/proxy/structure-status");
      if (res.ok) { setStatus(await res.json()); setError(null); }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    checkStatus();
    const id = setInterval(checkStatus, 2000);
    return () => clearInterval(id);
  }, []);

  const deploy = async () => {
    if (!confirm("Создать/обновить всю структуру Discord сервера?\n\n• 10 организаций с каналами\n• Роли и права доступа\n• Админ-панель\n• Каналы верификации и запроса ролей")) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/proxy/structure-deploy", { method: "POST" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Неизвестная ошибка");
    } catch (e: any) { setError(e.message); }
    setLoading(false);
    checkStatus();
  };

  const pct = status?.total > 0 ? Math.round((status.progress / status.total) * 100) : 0;

  return (
    <main className="min-h-screen p-6 lg:p-16 font-sans max-w-7xl mx-auto space-y-10">
      <header className="pb-6 border-b border-white/10">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-500">
          🏢 Организации
        </h1>
        <p className="mt-2 text-zinc-400 text-sm">
          Авто-развёртывание структуры Discord — категории, каналы, роли.
          Существующие каналы обновляются, дубликаты не создаются.
        </p>
      </header>

      {/* ═══ Deploy Panel ═══ */}
      <div className="glass-panel p-6 rounded-2xl border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.08)]">
        <h2 className="text-lg font-bold text-white mb-4">🚀 Панель развёртывания</h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">❌ {error}</div>
        )}

        {status && status.active ? (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-indigo-400 font-medium">{status.currentTask}</span>
              <span className="text-zinc-500 tabular-nums">{status.progress} / {status.total} ({pct}%)</span>
            </div>
            <div className="w-full bg-black/50 rounded-full h-2.5 border border-white/10">
              <div className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            {status.currentTask.includes('✅') && (
              <p className="text-emerald-400 text-sm font-medium mt-2">Готово! Структура развёрнута.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-zinc-400 text-sm">
              Бот создаст или обновит структуру: <b>10 организаций</b>, <b>админ-панель</b>,
              <b>каналы верификации</b> и <b>📩 запрос ролей</b>.
            </p>
            <button onClick={deploy} disabled={loading}
              className="w-full py-3.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-500/50 transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] disabled:opacity-50">
              {loading ? "⏳ Запуск..." : "🚀 Развернуть структуру сервера"}
            </button>
          </div>
        )}
      </div>

      {/* ═══ What Gets Created ═══ */}
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-white mb-4">📐 Что создаётся</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">

          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <h3 className="font-bold text-emerald-400 mb-2">🚀 СТАРТ</h3>
            <ul className="text-zinc-300 space-y-1">
              <li>📋│правила-верификации</li>
              <li>✅│верификация</li>
              <li>📩│запрос-роли</li>
            </ul>
          </div>

          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <h3 className="font-bold text-pink-400 mb-2">🛡️ Администрация</h3>
            <ul className="text-zinc-300 space-y-1">
              <li>📢│админ-чат</li>
              <li>🔊 Админ-совещание</li>
              <li className="text-zinc-500 text-xs mt-1">Только Админы + Модераторы</li>
            </ul>
          </div>

          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <h3 className="font-bold text-indigo-400 mb-2">🏢 Каждая организация</h3>
            <ul className="text-zinc-300 space-y-1">
              <li>📌│объявления (только лидерство)</li>
              <li>💬│общий-чат</li>
              <li>🤝│обсуждения-1на1</li>
              <li>👥│обсуждения-2на2</li>
              <li className="border-t border-white/10 mt-1 pt-1">🔊 Совещание</li>
              <li>🎙️ Рабочая</li>
              <li>🤝 Голос 1×1</li>
              <li>👥 Голос 2×2</li>
            </ul>
          </div>

        </div>
      </div>

      {/* ═══ Factions Grid ═══ */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">📋 Организации</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {FACTIONS_INFO.map((f) => (
            <div key={f.tag} className={`glass-panel rounded-xl p-4 border bg-gradient-to-br ${f.color} text-center`}>
              <span className="text-3xl">{f.emoji}</span>
              <h3 className="font-bold text-white text-sm mt-2">{f.title}</h3>
              <span className="text-[10px] text-zinc-500 font-mono">{f.tag}</span>
              <div className="text-[10px] text-zinc-400 mt-1">👑 👔 👥</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Verification System ═══ */}
      <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20">
        <h2 className="text-lg font-bold text-white mb-4">✅ Верификация</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold text-red-400 text-sm mb-2">❌ Не верифицирован — что это значит?</h3>
            <ul className="text-zinc-400 text-sm space-y-1.5 list-disc list-inside">
              <li>Вы только зашли на сервер</li>
              <li>Видите только каналы 🚀 СТАРТ</li>
              <li>Не имеете доступа к организациям</li>
              <li>Не можете запрашивать роли</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-emerald-400 text-sm mb-2">✅ Верифицирован — что даёт?</h3>
            <ul className="text-zinc-400 text-sm space-y-1.5 list-disc list-inside">
              <li>Подтверждённый игрок SRP Legacy</li>
              <li>Доступ к каналу 📩│запрос-роли</li>
              <li>Возможность вступить в организацию</li>
              <li>Общий доступ к серверу</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
          <h3 className="font-bold text-white text-sm mb-2">📝 Как пройти верификацию?</h3>
          <ol className="text-zinc-300 text-sm space-y-2 list-decimal list-inside">
            <li>Прочитайте правила в канале <b>📋│правила-верификации</b></li>
            <li>Перейдите в канал <b>✅│верификация</b></li>
            <li>Напишите свой <b>никнейм в игре</b> и <b>ссылку на форумный аккаунт</b></li>
            <li>Дождитесь одобрения от <b>Админа</b> или <b>Модератора</b></li>
            <li>После верификации вам будет выдана роль <b>✅ Верифицирован</b></li>
          </ol>
        </div>
      </div>

      {/* ═══ Role Request ═══ */}
      <div className="glass-panel p-6 rounded-2xl border border-blue-500/20">
        <h2 className="text-lg font-bold text-white mb-4">📩 Запрос ролей</h2>
        <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/20 mb-4">
          <h3 className="font-bold text-white text-sm mb-2">Как запросить роль организации?</h3>
          <ol className="text-zinc-300 text-sm space-y-2 list-decimal list-inside">
            <li>Пройдите верификацию (получите роль ✅)</li>
            <li>Перейдите в канал <b>📩│запрос-роли</b></li>
            <li>Напишите: <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">Организация: ЛСПД | Должность: Участник</code></li>
            <li>Дождитесь одобрения</li>
          </ol>
        </div>
        <h3 className="font-bold text-white text-sm mb-2">Кто может одобрить запрос?</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className="p-2.5 bg-white/5 rounded-lg text-center">
            <span className="text-pink-400 font-bold">🛡️ Админ</span>
            <p className="text-zinc-500 text-xs mt-1">Все роли</p>
          </div>
          <div className="p-2.5 bg-white/5 rounded-lg text-center">
            <span className="text-purple-400 font-bold">🔨 Модератор</span>
            <p className="text-zinc-500 text-xs mt-1">Все роли</p>
          </div>
          <div className="p-2.5 bg-white/5 rounded-lg text-center">
            <span className="text-yellow-400 font-bold">👑 Лидер</span>
            <p className="text-zinc-500 text-xs mt-1">Своя организация</p>
          </div>
          <div className="p-2.5 bg-white/5 rounded-lg text-center">
            <span className="text-indigo-400 font-bold">👔 Зам. Лидера</span>
            <p className="text-zinc-500 text-xs mt-1">Участники</p>
          </div>
        </div>
      </div>

      {/* ═══ Admin Permissions ═══ */}
      <div className="glass-panel p-6 rounded-2xl border border-pink-500/20">
        <h2 className="text-lg font-bold text-white mb-4">🛡️ Права администрации</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="text-emerald-400 font-bold mb-2">✅ Могут:</h3>
            <ul className="text-zinc-300 space-y-1 list-disc list-inside">
              <li>Перемещать пользователей между каналами</li>
              <li>Кикать и банить</li>
              <li>Мутить и размутить</li>
              <li>Управлять сообщениями</li>
              <li>Менять никнеймы</li>
              <li>Видеть все организации</li>
            </ul>
          </div>
          <div>
            <h3 className="text-red-400 font-bold mb-2">❌ Не могут:</h3>
            <ul className="text-zinc-300 space-y-1 list-disc list-inside">
              <li>Изменять структуру сервера</li>
              <li>Создавать/удалять каналы</li>
              <li>Создавать/удалять роли</li>
              <li>Менять настройки сервера</li>
              <li>Управлять интеграциями</li>
            </ul>
          </div>
        </div>
      </div>

    </main>
  );
}
