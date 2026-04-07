"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Radar,
  Activity,
  Network,
  TrendingUp,
  AlertTriangle,
  Settings,
  Zap,
} from "lucide-react";

const nav = [
  { href: "/", label: "Overview", icon: Radar },
  { href: "/signals", label: "Signals", icon: TrendingUp },
  { href: "/coordination", label: "Coordination", icon: Network },
  { href: "/perps", label: "Perps", icon: Activity },
  { href: "/risks", label: "Risks", icon: AlertTriangle },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-[#0e0e0e] border-r border-[#1a1a1a] flex flex-col z-50">
      {/* Logo */}
      <div className="p-5 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#C8FF00] flex items-center justify-center">
            <Zap size={18} className="text-black" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider">SENTINEL</h1>
            <p className="text-[10px] text-[#666] tracking-widest uppercase">
              Alpha Oracle
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? "bg-[#C8FF00]/10 text-[#C8FF00] border border-[#C8FF00]/20"
                  : "text-[#888] hover:text-[#ccc] hover:bg-[#1a1a1a]"
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-[#1a1a1a]">
        <div className="flex items-center gap-2 text-xs text-[#555]">
          <div className="w-2 h-2 rounded-full bg-[#C8FF00] pulse-dot" />
          Pipeline Active
        </div>
        <p className="text-[10px] text-[#444] mt-1">
          Powered by Nansen CLI
        </p>
      </div>
    </aside>
  );
}
