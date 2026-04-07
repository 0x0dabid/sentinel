"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: boolean;
}

export default function StatCard({ label, value, sub, icon, accent }: StatCardProps) {
  return (
    <div className={`card ${accent ? "glow" : ""}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-[#666] uppercase tracking-wider">
          {label}
        </span>
        <div className={accent ? "text-[#C8FF00]" : "text-[#555]"}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold ${accent ? "text-[#C8FF00] glow-accent" : ""}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-[#555] mt-1">{sub}</p>}
    </div>
  );
}
