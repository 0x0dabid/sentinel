"use client";

import { Brief } from "@/lib/types";
import { mockBrief } from "@/lib/mock";
import ScoreRing from "@/components/ScoreRing";
import StatCard from "@/components/StatCard";
import SignalRow from "@/components/SignalRow";
import {
  Zap,
  Target,
  Users,
  Radio,
  Shield,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function OverviewPage() {
  const [brief, setBrief] = useState<Brief>(mockBrief);
  const [scanning, setScanning] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/brief")
      .then((r) => r.json())
      .then((data) => {
        setBrief(data);
        setIsDemo(!!data._demo);
        setIsLive(!!data._live);
        setApiErrors(data._errors || []);
      })
      .catch(() => {});
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      await fetch("/api/scan", { method: "POST" });
      const r = await fetch("/api/brief");
      const data = await r.json();
      setBrief(data);
      setIsDemo(!!data._demo);
      setIsLive(!!data._live);
      setApiErrors(data._errors || []);
    } finally {
      setScanning(false);
    }
  };
  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* Demo banner */}
      {isDemo && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[#C8FF00]/5 border border-[#C8FF00]/20">
          <AlertTriangle size={18} className="text-[#C8FF00] flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-[#C8FF00] font-semibold">Demo Mode — Showing sample data</p>
            <p className="text-xs text-[#888]">
              Add your <code className="bg-[#222] px-1 rounded">NANSEN_API_KEY</code> as a Vercel
              environment variable to fetch live smart money data. Get one at{" "}
              <a
                href="https://app.nansen.ai/auth/agent-setup"
                target="_blank"
                className="underline text-[#C8FF00]"
              >
                app.nansen.ai/auth/agent-setup
              </a>
            </p>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#C8FF00] text-black rounded-lg text-xs font-semibold hover:bg-[#d4ff33] transition disabled:opacity-50"
          >
            <RefreshCw size={12} className={scanning ? "animate-spin" : ""} />
            {scanning ? "Scanning..." : "Try Scan"}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Alpha Brief{isLive && <span className="ml-2 inline-flex items-center"><span className="w-2 h-2 rounded-full bg-[#00ff88] pulse-dot mr-1" /><span className="text-xs text-[#00ff88] font-normal">LIVE</span></span>}</h2>
          <p className="text-xs text-[#666] mt-1">
            {isLive
              ? `LIVE — ${new Date(brief.generatedAt).toLocaleString()}`
              : isDemo
              ? "Sample data (no API key)"
              : `Last updated: ${new Date(brief.generatedAt).toLocaleString()}`}
          </p>
          {apiErrors.length > 0 && (
            <p className="text-[10px] text-[#ff8800] mt-0.5">
              Partial data: {apiErrors.join("; ")}
            </p>
          )}
        </div>
        {!isDemo && (
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-[#C8FF00] text-black rounded-lg text-sm font-semibold hover:bg-[#d4ff33] transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={scanning ? "animate-spin" : ""} />
            {scanning ? "Scanning..." : "Run Scan"}
          </button>
        )}
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-5 gap-4">
        <div className="card glow flex flex-col items-center justify-center">
          <ScoreRing score={brief.alphaScore} size={100} />
          <span className="text-xs text-[#666] mt-2">Alpha Score</span>
        </div>
        <StatCard
          label="Tokens Scanned"
          value={brief.rawStats.tokensScanned}
          icon={<Target size={16} />}
        />
        <StatCard
          label="SM Wallets"
          value={brief.rawStats.smWalletsDetected}
          sub={`Across ${brief.rawStats.chainsCovered} chains`}
          icon={<Users size={16} />}
        />
        <StatCard
          label="Coordination"
          value={`${brief.coordination.coordinationScore}%`}
          sub={brief.summary.coordinationLevel}
          icon={<Radio size={16} />}
          accent={brief.coordination.coordinationScore > 50}
        />
        <StatCard
          label="Risk Alerts"
          value={brief.riskAlerts.length}
          sub={
            brief.riskAlerts.length > 0
              ? `${brief.riskAlerts.filter((r) => r.level === "HIGH" || r.level === "CRITICAL").length} critical`
              : "All clear"
          }
          icon={<Shield size={16} />}
        />
      </div>

      {/* Narrative */}
      <div className="card glow">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-[#C8FF00]" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#C8FF00]">
            Narrative Prediction
          </h3>
        </div>
        <p className="text-xl font-bold mb-2">{brief.narrative.theme}</p>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1">
            <div className="w-16 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C8FF00] rounded-full"
                style={{ width: `${brief.narrative.confidence}%` }}
              />
            </div>
            <span className="text-xs font-mono text-[#C8FF00]">
              {brief.narrative.confidence}%
            </span>
          </div>
          <span className="text-xs text-[#555]">confidence</span>
        </div>
        <div className="space-y-1">
          {brief.narrative.details.map((d, i) => (
            <p key={i} className="text-sm text-[#888]">
              {d}
            </p>
          ))}
        </div>
        {brief.narrative.tokens.length > 0 && (
          <div className="flex gap-2 mt-3">
            {brief.narrative.tokens.map((t) => (
              <span key={t} className="badge badge-accent text-sm px-3 py-1">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Top Signals */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#888] mb-3">
          Top Signals
        </h3>
        {brief.topSignals.slice(0, 5).map((signal, i) => (
          <SignalRow key={signal.token} signal={signal} rank={i + 1} />
        ))}
        {brief.topSignals.length === 0 && (
          <div className="card text-center py-8 text-[#555]">
            No signals detected yet. Run a scan to fetch live data.
          </div>
        )}
      </div>
    </div>
  );
}
