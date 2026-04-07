"use client";

import { useEffect, useState } from "react";
import { Brief } from "@/lib/types";
import { mockBrief } from "@/lib/mock";
import { Activity, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

export default function PerpsClient() {
  const [brief, setBrief] = useState<Brief>(mockBrief);

  useEffect(() => {
    fetch("/api/brief")
      .then((r) => r.json())
      .then(setBrief)
      .catch(() => {});
  }, []);

  const perp = brief.perpOverview;
  if (!perp) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-[#555]">
        No perp data available
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-center gap-3">
        <Activity size={20} className="text-[#C8FF00]" />
        <h2 className="text-xl font-bold">Perp Market Overview</h2>
      </div>

      {/* Hot Markets */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#888] mb-3">
          Hot Markets
        </h3>
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                <th className="text-left px-4 py-3 text-xs text-[#555] uppercase">Token</th>
                <th className="text-right px-4 py-3 text-xs text-[#555] uppercase">Volume</th>
                <th className="text-right px-4 py-3 text-xs text-[#555] uppercase">OI</th>
                <th className="text-center px-4 py-3 text-xs text-[#555] uppercase">Pressure</th>
                <th className="text-right px-4 py-3 text-xs text-[#555] uppercase">Funding</th>
              </tr>
            </thead>
            <tbody>
              {perp.hotMarkets.map((m) => (
                <tr key={m.token} className="border-b border-[#111] hover:bg-[#1a1a1a] transition">
                  <td className="px-4 py-3">
                    <span className="font-bold">{m.token}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-mono">{m.volume}</td>
                  <td className="px-4 py-3 text-right text-sm font-mono">{m.oi}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${m.pressure === "BULLISH" ? "badge-green" : "badge-red"}`}>
                      {m.pressure === "BULLISH" ? (
                        <TrendingUp size={10} className="inline mr-1" />
                      ) : (
                        <TrendingDown size={10} className="inline mr-1" />
                      )}
                      {m.pressure}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-mono ${
                    parseFloat(m.funding) > 0 ? "text-[#00ff88]" : "text-[#ff4444]"
                  }`}>
                    {m.funding}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SM Perp Positions */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#888] mb-3">
          Smart Money Perp Positions
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(perp.smPerpPositions).map(([token, pos]) => {
            const total = pos.buys + pos.sells;
            const buyRatio = pos.buys / total;
            return (
              <div key={token} className="card">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-lg">{token}</span>
                  <span
                    className={`badge ${buyRatio > 0.6 ? "badge-green" : buyRatio < 0.4 ? "badge-red" : "badge-orange"}`}
                  >
                    {buyRatio > 0.6 ? "Net Long" : buyRatio < 0.4 ? "Net Short" : "Mixed"}
                  </span>
                </div>

                {/* Buy/Sell bar */}
                <div className="flex h-3 rounded-full overflow-hidden bg-[#1a1a1a] mb-3">
                  <div
                    className="bg-[#00ff88] transition-all"
                    style={{ width: `${buyRatio * 100}%` }}
                  />
                  <div
                    className="bg-[#ff4444] transition-all"
                    style={{ width: `${(1 - buyRatio) * 100}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs">
                  <div>
                    <span className="text-[#00ff88]">{pos.buys} buys</span>
                    <span className="text-[#444] mx-1">/</span>
                    <span className="text-[#ff4444]">{pos.sells} sells</span>
                  </div>
                  <span className="text-[#666]">
                    ${(pos.value / 1e6).toFixed(1)}M vol
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
