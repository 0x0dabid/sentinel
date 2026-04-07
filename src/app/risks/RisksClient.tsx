"use client";

import { useEffect, useState } from "react";
import { Brief } from "@/lib/types";
import { mockBrief } from "@/lib/mock";
import { Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export default function RisksClient() {
  const [brief, setBrief] = useState<Brief>(mockBrief);

  useEffect(() => {
    fetch("/api/brief")
      .then((r) => r.json())
      .then(setBrief)
      .catch(() => {});
  }, []);

  const levelConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    CRITICAL: {
      icon: <XCircle size={20} />,
      color: "#ff4444",
      bg: "rgba(255, 68, 68, 0.08)",
    },
    HIGH: {
      icon: <AlertTriangle size={20} />,
      color: "#ff8800",
      bg: "rgba(255, 136, 0, 0.08)",
    },
    MEDIUM: {
      icon: <AlertTriangle size={20} />,
      color: "#ffaa00",
      bg: "rgba(255, 170, 0, 0.08)",
    },
    LOW: {
      icon: <CheckCircle size={20} />,
      color: "#00ff88",
      bg: "rgba(0, 255, 136, 0.08)",
    },
  };

  // Combine risk alerts with signal exit risks
  const allRisks = [
    ...brief.riskAlerts.map((r) => ({
      token: r.token,
      level: r.level,
      factors: r.factors,
      source: "exit_signal",
    })),
    ...brief.topSignals
      .filter((s) => s.exitRisk && s.exitRisk !== "LOW")
      .map((s) => ({
        token: s.token,
        level: s.exitRisk || "UNKNOWN",
        factors: s.agentInsight ? [s.agentInsight.slice(0, 100) + "..."] : [],
        source: "signal_analysis",
      })),
  ];

  const safeSignals = brief.topSignals.filter((s) => s.exitRisk === "LOW");

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-center gap-3">
        <Shield size={20} className="text-[#C8FF00]" />
        <h2 className="text-xl font-bold">Risk Monitor</h2>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((level) => {
          const config = levelConfig[level];
          const count = allRisks.filter((r) => r.level === level).length;
          return (
            <div
              key={level}
              className="card"
              style={{ background: config.bg, borderColor: `${config.color}20` }}
            >
              <div className="flex items-center gap-2 mb-2" style={{ color: config.color }}>
                {config.icon}
                <span className="text-xs uppercase tracking-wider font-semibold">{level}</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: config.color }}>
                {count}
              </p>
              <p className="text-xs text-[#555]">
                {level === "LOW" ? "safe signals" : "alerts"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Active Alerts */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#888] mb-3">
          Active Alerts
        </h3>
        {allRisks.filter((r) => r.level !== "LOW").length === 0 ? (
          <div className="card text-center py-12">
            <CheckCircle size={40} className="text-[#00ff88] mx-auto mb-3" />
            <p className="text-[#888]">No active risk alerts. All clear.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allRisks
              .filter((r) => r.level !== "LOW")
              .sort((a, b) => {
                const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
                return (order[a.level] || 99) - (order[b.level] || 99);
              })
              .map((risk, i) => {
                const config = levelConfig[risk.level] || levelConfig.MEDIUM;
                return (
                  <div
                    key={i}
                    className="card fade-in"
                    style={{ borderLeft: `3px solid ${config.color}` }}
                  >
                    <div className="flex items-center gap-3">
                      <div style={{ color: config.color }}>{config.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold">{risk.token}</span>
                          <span
                            className="badge"
                            style={{
                              background: `${config.color}15`,
                              color: config.color,
                            }}
                          >
                            {risk.level}
                          </span>
                          <span className="text-[10px] text-[#555] uppercase">
                            {risk.source.replace(/_/g, " ")}
                          </span>
                        </div>
                        {risk.factors.map((f, j) => (
                          <p key={j} className="text-sm text-[#888]">{f}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Safe Signals */}
      {safeSignals.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#888] mb-3">
            Safe Signals (Low Risk)
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {safeSignals.map((s) => (
              <div key={s.token} className="card flex items-center gap-3">
                <CheckCircle size={16} className="text-[#00ff88] flex-shrink-0" />
                <div>
                  <span className="font-bold">{s.token}</span>
                  <p className="text-[10px] text-[#555]">
                    Conviction: {s.convictionScore} | Chains: {s.chains.join(", ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
