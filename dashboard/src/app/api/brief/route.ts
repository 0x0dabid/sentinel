import { NextResponse } from "next/server";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { mockBrief } from "@/lib/mock";

export async function GET() {
  // Try to read the latest brief from the output directory
  const outputDir = join(process.cwd(), "..", "output");

  try {
    if (existsSync(outputDir)) {
      const files = readdirSync(outputDir)
        .filter((f) => f.startsWith("brief-") && f.endsWith(".json"))
        .sort()
        .reverse();

      if (files.length > 0) {
        const latest = files[0];
        const raw = readFileSync(join(outputDir, latest), "utf-8");
        const brief = JSON.parse(raw);
        return NextResponse.json(brief);
      }
    }
  } catch {
    // Fall through to mock
  }

  // Return mock data for demo
  return NextResponse.json(mockBrief);
}
