import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SRP Legacy Dashboard",
  description: "Next.js UI for SRP Legacy Discord Bot",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark selection:bg-purple-500/30">
      <body className={`${inter.className} antialiased selection:text-white min-h-screen flex flex-col`}>
        {/* Navigation Bar */}
        <nav className="glass-panel sticky top-0 z-50 px-8 py-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-blue-500 shadow-[0_0_15px_rgba(147,51,234,0.5)]"></div>
            <Link href="/" className="font-bold text-lg tracking-wider hover:text-white transition-colors">SRP LEGACY</Link>
          </div>
          <div className="flex gap-8 text-sm font-medium text-zinc-400">
            <Link href="/" className="hover:text-white transition-colors">Overview</Link>
            <Link href="/stats" className="hover:text-white transition-colors">Stats</Link>
            <Link href="/embeds" className="hover:text-white transition-colors">Embeds</Link>
            <Link href="/channels" className="hover:text-white transition-colors">📂 Channels</Link>
            <Link href="/roles" className="hover:text-white transition-colors">Roles</Link>
            <Link href="/factions" className="hover:text-white transition-colors">Factions</Link>
            <Link href="/guides" className="hover:text-white transition-colors">📖 Гайды</Link>
            <Link href="/role-requests" className="font-bold text-pink-400 hover:text-pink-300 transition-colors">📩 Запросы</Link>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <span className="text-xs font-bold">A</span>
          </div>
        </nav>
        
        {/* Main Content */}
        <div className="flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
