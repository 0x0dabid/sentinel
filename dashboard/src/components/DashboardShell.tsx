"use client";

import { useEffect, useState } from "react";
import { Brief } from "@/lib/types";
import { mockBrief } from "@/lib/mock";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [brief, setBrief] = useState<Brief>(mockBrief);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/brief")
      .then((r) => r.json())
      .then((data) => setBrief(data))
      .catch(() => setBrief(mockBrief))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[220px] p-6">
        {loading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[#C8FF00] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-[#666]">Loading alpha data...</p>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
