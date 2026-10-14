import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "unknown";

  try {
    // Quick query to confirm database responsiveness
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (error) {
    dbStatus = "unreachable";
    console.error("[Health Check] Database connectivity check failed:", error);
  }

  const responsePayload = {
    status: dbStatus === "connected" ? "healthy" : "degraded",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: dbStatus,
    responseTimeMs: Date.now() - startTime,
    env: process.env.NODE_ENV || "development",
  };

  // Render fails a deploy when its health path returns non-200. A cold Neon branch or a
  // transient connection blip during boot would otherwise mark a working service as dead,
  // so liveness answers 200 and the database state travels in the body instead.
  return NextResponse.json(responsePayload, { status: 200 });
}
