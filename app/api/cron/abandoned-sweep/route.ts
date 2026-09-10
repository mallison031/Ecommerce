import { NextRequest, NextResponse } from "next/server";
import { sweepAbandonedOrders } from "@/lib/abandoned-cart";

export async function POST(req: NextRequest) {
  return handleSweep(req);
}

export async function GET(req: NextRequest) {
  return handleSweep(req);
}

async function handleSweep(req: NextRequest) {
  // Validate cron secret if configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let thresholdMinutes = 30;

  // Check URL query parameters
  const url = new URL(req.url);
  const paramThreshold = url.searchParams.get("thresholdMinutes");
  if (paramThreshold !== null && !isNaN(Number(paramThreshold))) {
    thresholdMinutes = Number(paramThreshold);
  }

  // Check JSON body if POST
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body?.thresholdMinutes !== undefined && !isNaN(Number(body.thresholdMinutes))) {
        thresholdMinutes = Number(body.thresholdMinutes);
      }
    } catch {
      // Body may be empty
    }
  }

  try {
    const result = await sweepAbandonedOrders({ thresholdMinutes });
    return NextResponse.json({
      success: true,
      thresholdMinutesUsed: thresholdMinutes,
      ...result,
    });
  } catch (error: unknown) {
    console.error("[Cron Sweep] Error running abandoned cart sweep:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
