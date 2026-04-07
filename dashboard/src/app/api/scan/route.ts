import { NextResponse } from "next/server";

export async function POST() {
  // In production, this would trigger the sentinel pipeline
  // For now, return a simulated response
  return NextResponse.json({
    success: true,
    message: "Scan initiated",
    estimatedTime: "45-60 seconds",
  });
}
