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
    return {
      totalUsers: 0,
      activeRoles: 0,
      totalMessages: 0,
      leaderboard: []
    };
  }
}

export default async function StatsPage() {
  const stats = await getStats();

  return (
    <main className="min-h-screen p-8 lg:p-24 font-sans max-w-7xl mx-auto space-y-12">
        <header className="flex justify-between items-center pb-8 border-b border-white/10">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
              Message Statistics
            </h1>
            <p className="mt-2 text-zinc-400 font-medium">Real-time message tracking for all server members.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-panel p-6 rounded-2xl text-center">
                <div className="text-3xl font-bold text-emerald-500">{stats.totalMessages.toLocaleString()}</div>
                <div className="text-sm text-zinc-400 mt-2">Total Messages</div>
            </div>
            <div className="glass-panel p-6 rounded-2xl text-center">
                <div className="text-3xl font-bold text-blue-500">{stats.totalUsers.toLocaleString()}</div>
                <div className="text-sm text-zinc-400 mt-2">Active Users</div>
            </div>
            <div className="glass-panel p-6 rounded-2xl text-center">
                <div className="text-3xl font-bold text-purple-500">
                    {stats.leaderboard.length > 0 ? Math.round(stats.totalMessages / stats.totalUsers).toLocaleString() : 0}
                </div>
                <div className="text-sm text-zinc-400 mt-2">Avg per User</div>
            </div>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden mt-8">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h2 className="text-xl font-bold">Leaderboard (Top 100)</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 text-sm text-zinc-400">
                            <th className="p-4 font-medium">#</th>
                            <th className="p-4 font-medium">Username</th>
                            <th className="p-4 font-medium text-right">Messages</th>
                            <th className="p-4 font-medium text-right">Last Active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.leaderboard.map((user: any, idx: number) => (
                            <tr key={user.userId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="p-4 text-zinc-500 font-mono">{idx + 1}</td>
                                <td className="p-4 font-medium text-white flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500/20 to-blue-500/20 flex items-center justify-center text-xs border border-white/10">
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                    {user.username}
                                </td>
                                <td className="p-4 text-right font-mono text-emerald-400 font-bold">{user.count.toLocaleString()}</td>
                                <td className="p-4 text-right text-sm text-zinc-500">
                                    {user.lastMessage ? new Date(user.lastMessage).toLocaleString() : '—'}
                                </td>
                            </tr>
                        ))}
                        {stats.leaderboard.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-zinc-500">No messages tracked yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </main>
  );
}
