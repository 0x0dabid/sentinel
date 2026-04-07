import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.NANSEN_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      message: "NANSEN_API_KEY not configured. Add it as a Vercel environment variable.",
    });
  }

  // The scan is now real-time via the /api/brief route
  // Just tell the client to refetch
  return NextResponse.json({
    success: true,
    message: "Scan complete — data fetched live from Nansen API",
    estimatedTime: "0s (live)",
  });
}
