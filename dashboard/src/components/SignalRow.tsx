"use client";

interface SignalRowProps {
  signal: {
    token: string;
    convictionScore: number;
    pattern: string;
    chains: string[];
    totalNetFlow: string;
    fundCount: number;
    exitRisk?: string;
    buyPressure?: string;
    agentInsight?: string | null;
  };
  rank: number;
}

export default function SignalRow({ signal, rank }: SignalRowProps) {
  const riskBadge =
    signal.exitRisk === "LOW"
      ? "badge-green"
      : signal.exitRisk === "MEDIUM"
      ? "badge-orange"
      : signal.exitRisk === "HIGH"
      ? "badge-red"
      : "badge-blue";

  const patternLabel = signal.pattern
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="card fade-in mb-3">
      <div className="flex items-center gap-4">
        {/* Rank */}
        <div className="w-10 h-10 rounded-lg bg-[#C8FF00]/10 flex items-center justify-center flex-shrink-0">
          <span className="text-[#C8FF00] font-bold text-sm">#{rank}</span>
        </div>

        {/* Token + Pattern */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold">{signal.token}</h3>
            {signal.fundCount > 0 && (
              <span className="badge badge-accent">
                {signal.fundCount} Fund{signal.fundCount > 1 ? "s" : ""}
              </span>
            )}
            <span className="badge badge-blue">{patternLabel}</span>
            {signal.exitRisk && (
              <span className={`badge ${riskBadge}`}>{signal.exitRisk}</span>
            )}
          </div>

          {/* Chains */}
          <div className="flex items-center gap-2 mb-2">
            {signal.chains.map((chain) => (
              <span
                key={chain}
                className="text-[10px] px-2 py-0.5 rounded bg-[#1a1a1a] text-[#888] border border-[#222]"
              >
                {chain}
              </span>
            ))}
          </div>

          {/* Insight */}
          {signal.agentInsight && (
            <p className="text-xs text-[#777] leading-relaxed line-clamp-2">
              {signal.agentInsight}
            </p>
          )}
        </div>

        {/* Metrics */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-20 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${signal.convictionScore}%`,
                  background:
                    signal.convictionScore >= 70
                      ? "#C8FF00"
                      : signal.convictionScore >= 40
                      ? "#ff8800"
                      : "#ff4444",
                }}
              />
            </div>
            <span className="text-sm font-mono font-bold min-w-[30px] text-right">
              {signal.convictionScore}
            </span>
          </div>
          <span className="text-xs text-[#666]">
            Flow: {signal.totalNetFlow}
          </span>
          {signal.buyPressure && (
            <span className="text-xs text-[#666]">
              Buy Pressure:{" "}
              <span
                className={
                  parseFloat(signal.buyPressure) > 0.7
                    ? "text-[#00ff88]"
                    : "text-[#ff8800]"
                }
              >
                {(parseFloat(signal.buyPressure) * 100).toFixed(0)}%
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
