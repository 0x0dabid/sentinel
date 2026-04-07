import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    isRunning: false,
    lastRun: new Date().toISOString(),
    nextRun: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    totalRuns: 42,
  });
}
