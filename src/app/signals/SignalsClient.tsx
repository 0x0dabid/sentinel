"use client";

import { useEffect, useState } from "react";
import { Brief, Signal } from "@/lib/types";
import { mockBrief } from "@/lib/mock";
import SignalRow from "@/components/SignalRow";
import { TrendingUp, Filter } from "lucide-react";

export default function SignalsClient() {
  const [brief, setBrief] = useState<Brief>(mockBrief);
  const [filter, setFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("conviction");

  useEffect(() => {
    fetch("/api/brief")
      .then((r) => r.json())
      .then(setBrief)
      .catch(() => {});
  }, []);

  const filtered = brief.topSignals
    .filter((s) => filter === "all" || s.pattern === filter)
    .sort((a, b) => {
      if (sort === "conviction") return b.convictionScore - a.convictionScore;
      if (sort === "flow") return b.fundCount - a.fundCount;
      return 0;
    });

  const patterns = ["all", ...new Set(brief.topSignals.map((s) => s.pattern))];

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp size={20} className="text-[#C8FF00]" />
          <h2 className="text-xl font-bold">Signal Explorer</h2>
          <span className="badge badge-accent">{brief.topSignals.length} signals</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[#666]" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-[#1a1a1a] border border-[#222] rounded-lg px-3 py-1.5 text-sm text-[#ccc] outline-none"
            >
              {patterns.map((p) => (
                <option key={p} value={p}>
                  {p === "all" ? "All Patterns" : p.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-[#1a1a1a] border border-[#222] rounded-lg px-3 py-1.5 text-sm text-[#ccc] outline-none"
          >
            <option value="conviction">Sort: Conviction</option>
            <option value="flow">Sort: Fund Activity</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Multi-Chain Accumulation",
            count: brief.topSignals.filter((s) => s.pattern === "multi_chain_accumulation").length,
            color: "#C8FF00",
          },
          {
            label: "Capital Rotation",
            count: brief.topSignals.filter((s) => s.pattern === "capital_rotation").length,
            color: "#4488ff",
          },
          {
            label: "Chain-Specific Play",
            count: brief.topSignals.filter((s) => s.pattern === "chain_specific_play").length,
            color: "#ff8800",
          },
          {
            label: "With AI Insight",
            count: brief.topSignals.filter((s) => s.agentInsight).length,
            color: "#C8FF00",
          },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-xs text-[#666] uppercase tracking-wider mb-1">
              {stat.label}
            </p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.count}
            </p>
          </div>
        ))}
      </div>

      {/* Signal List */}
      <div>
        {filtered.map((signal, i) => (
          <SignalRow key={signal.token} signal={signal} rank={i + 1} />
        ))}
        {filtered.length === 0 && (
          <div className="card text-center py-12 text-[#555]">
            No signals matching filter
          </div>
        )}
      </div>
    </div>
  );
}
