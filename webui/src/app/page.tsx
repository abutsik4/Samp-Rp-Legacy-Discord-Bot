import Image from "next/image";

async function getStats() {
  try {
    const res = await fetch(`${process.env.DISCORD_API_URL}/api/stats`, {
      headers: {
        'Authorization': `Bearer ${process.env.WEBUI_AUTH_TOKEN}`,
        'Accept': 'application/json'
      },
      next: { revalidate: 30 }
    });
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  } catch (error) {
    console.error(error);
    return {
      totalUsers: 0,
      activeRoles: 0,
      totalMessages: 0,
      leaderboard: []
    };
  }
}

async function getLogs() {
  try {
    const res = await fetch(`${process.env.DISCORD_API_URL}/api/logs`, {
      headers: {
        'Authorization': `Bearer ${process.env.WEBUI_AUTH_TOKEN}`,
        'Accept': 'application/json'
      },
      next: { revalidate: 30 }
    });
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    return data.logs || [];
  } catch(e) {
    return [
      { time: "Ошибка", msg: "Не удалось подключиться к Discord API", brand: "text-red-400" }
    ];
  }
}

export default async function Home() {
  const stats = await getStats();
  const logs = await getLogs();

  return (
    <main className="min-h-screen p-8 lg:p-24 font-sans">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex justify-between items-center pb-8 border-b border-white/10">
          <div>
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
              SRP Legacy
            </h1>
            <p className="mt-2 text-zinc-400 font-medium">Панель управления Discord сервером</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-emerald-400 text-sm font-semibold">Бот онлайн</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="glass-panel rounded-2xl p-8 flex flex-col justify-between group transition-transform hover:-translate-y-1">
            <div className="flex items-center gap-4 text-purple-400 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
              <h2 className="text-xl font-bold text-white">📊 Статистика</h2>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-zinc-400">Участников</span>
                <span className="text-3xl font-mono text-white text-shadow-glow">{stats.totalUsers.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-zinc-400">Сообщений</span>
                <span className="text-xl font-mono text-white">{stats.totalMessages.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-zinc-400">Ролей</span>
                <span className="text-xl font-mono text-white">{stats.activeRoles || 0}</span>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 flex gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs text-emerald-500 font-semibold tracking-wider uppercase">Онлайн</span>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-8 flex flex-col justify-between group transition-transform hover:-translate-y-1">
             <div className="flex items-center gap-4 text-blue-400 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <h2 className="text-xl font-bold text-white">⚙️ Управление</h2>
            </div>
            <p className="text-zinc-400 mb-8">Настройка организаций, авто-ролей, приветствий и эмбедов.</p>
            <a href="/factions" className="block w-full text-left px-5 py-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors text-sm font-medium text-indigo-300">
              🏢 Организации →
            </a>
            <a href="/embeds" className="block w-full mt-3 text-left px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-sm font-medium">
              📝 Эмбеды →
            </a>
            <a href="/roles" className="block w-full mt-3 text-left px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-sm font-medium">
              🎭 Роли →
            </a>
          </div>

          <div className="glass-panel rounded-2xl p-8 lg:col-span-1 md:col-span-2 flex flex-col">
             <div className="flex items-center gap-4 text-pink-400 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <h2 className="text-xl font-bold text-white">📡 Активность</h2>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 min-h-[160px]">
              {logs.map((log: any, i: number) => (
                <div key={i} className="flex gap-4 text-sm bg-black/20 p-3 rounded-lg border border-white/5">
                  <span className={`font-mono ${log.brand || 'text-zinc-400'}`}>{log.time}</span>
                  <span className="text-zinc-300">{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
