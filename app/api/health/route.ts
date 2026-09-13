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

  const statusCode = dbStatus === "connected" ? 200 : 503;

  return NextResponse.json(responsePayload, { status: statusCode });
}
