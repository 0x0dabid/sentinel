"use client";

import { useEffect, useState } from "react";
import { Brief, Cluster } from "@/lib/types";
import { mockBrief } from "@/lib/mock";
import ScoreRing from "@/components/ScoreRing";
import { Network, Users, GitBranch, AlertCircle } from "lucide-react";

export default function CoordClient() {
  const [brief, setBrief] = useState<Brief>(mockBrief);

  useEffect(() => {
    fetch("/api/brief")
      .then((r) => r.json())
      .then(setBrief)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-center gap-3">
        <Network size={20} className="text-[#C8FF00]" />
        <h2 className="text-xl font-bold">Coordination Analysis</h2>
      </div>

      {/* Score + Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card glow flex flex-col items-center justify-center py-6">
          <ScoreRing score={brief.coordination.coordinationScore} size={100} />
          <span className="text-xs text-[#666] mt-2">Coordination Score</span>
          <span className="badge badge-accent mt-2">
            {brief.summary.coordinationLevel}
          </span>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-[#888]" />
            <span className="text-xs text-[#666] uppercase tracking-wider">
              Detection Summary
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-[#888]">SM Wallets Detected</span>
              <span className="text-sm font-bold">{brief.rawStats.smWalletsDetected}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[#888]">Clusters Found</span>
              <span className="text-sm font-bold">{brief.rawStats.clustersFound}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[#888]">Chains Covered</span>
              <span className="text-sm font-bold">{brief.rawStats.chainsCovered}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="text-[#888]" />
            <span className="text-xs text-[#666] uppercase tracking-wider">
              Coordination Events
            </span>
          </div>
          <div className="space-y-2">
            {brief.coordination.coordinationDetails.map((d, i) => (
              <div key={i} className="flex items-start gap-2">
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    d.type === "coordinated_trading"
                      ? "bg-[#C8FF00]"
                      : d.type === "wallet_cluster"
                      ? "bg-[#4488ff]"
                      : "bg-[#ff8800]"
                  }`}
                />
                <div>
                  <p className="text-sm text-[#ccc]">{d.detail || d.type.replace(/_/g, " ")}</p>
                  <p className="text-[10px] text-[#555] uppercase">{d.type.replace(/_/g, " ")}</p>
                </div>
              </div>
            ))}
            {brief.coordination.coordinationDetails.length === 0 && (
              <p className="text-sm text-[#555]">No coordination events detected</p>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Clusters */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#888] mb-3">
          Wallet Clusters
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {brief.coordination.clusters.map((cluster, i) => (
            <ClusterCard key={i} cluster={cluster} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ClusterCard({ cluster }: { cluster: Cluster }) {
  const shortAddr = (a: string) =>
    a.length > 16 ? `${a.slice(0, 8)}..${a.slice(-6)}` : a;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <GitBranch size={14} className="text-[#4488ff]" />
        <span className="text-sm font-semibold">
          Cluster: {shortAddr(cluster.anchor)}
        </span>
        <span className="badge badge-blue">{cluster.size} wallets</span>
      </div>

      {/* Anchor labels */}
      <div className="flex gap-1 mb-3">
        {cluster.anchorLabels.map((l) => (
          <span key={l} className="badge badge-accent">
            {l}
          </span>
        ))}
      </div>

      {/* Related wallets */}
      <div className="space-y-2">
        {cluster.related.map((r, i) => (
          <div key={i} className="flex items-center justify-between py-1 px-2 rounded bg-[#111]">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C8FF00]" />
              <span className="text-xs text-[#ccc]">
                {r.label || shortAddr(r.address)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C8FF00] rounded-full"
                  style={{ width: `${r.score * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-[#666]">
                {(r.score * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
