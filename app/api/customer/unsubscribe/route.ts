import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, email } = body;

    if (!token && !email) {
      return NextResponse.json(
        { success: false, error: "Unsubscribe token or email is required" },
        { status: 400 }
      );
    }

    let customer = null;
    if (token) {
      customer = await prisma.customer.findUnique({
        where: { unsubscribe_token: token },
      });
    } else if (email) {
      customer = await prisma.customer.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
    }

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found or invalid token" },
        { status: 404 }
      );
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        marketing_emails_opt_in: false,
        marketing_whatsapp_opt_in: false,
        replenishment_opt_in: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: `You have successfully unsubscribed ${customer.email} from all marketing communications.`,
    });
  } catch (error: any) {
    console.error("Error processing unsubscribe request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process unsubscribe request" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const email = url.searchParams.get("email");

    if (!token && !email) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head><title>Unsubscribe Error - Aura</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2>Missing Unsubscribe Link</h2>
            <p>The link you clicked appears to be invalid or incomplete.</p>
          </body>
        </html>`,
        { headers: { "Content-Type": "text/html" }, status: 400 }
      );
    }

    let customer = null;
    if (token) {
      customer = await prisma.customer.findUnique({
        where: { unsubscribe_token: token },
      });
    } else if (email) {
      customer = await prisma.customer.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
    }

    if (!customer) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head><title>Invalid Token - Aura</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h2>Subscription Not Found</h2>
            <p>We could not find an active subscription associated with this link.</p>
          </body>
        </html>`,
        { headers: { "Content-Type": "text/html" }, status: 404 }
      );
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        marketing_emails_opt_in: false,
        marketing_whatsapp_opt_in: false,
        replenishment_opt_in: false,
      },
    });

    const isJson = req.headers.get("accept")?.includes("application/json");
    if (isJson) {
      return NextResponse.json({
        success: true,
        message: `Successfully unsubscribed ${customer.email}`,
      });
    }

    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Unsubscribed Successfully — Aura Store</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { max-width: 480px; width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 36px 28px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
            .icon { width: 56px; height: 56px; border-radius: 50%; background: rgba(236, 72, 153, 0.15); color: #ec4899; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 20px; }
            h1 { font-size: 22px; font-weight: 700; margin: 0 0 10px; }
            p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px; }
            .badge { display: inline-block; background: #334155; color: #e2e8f0; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 24px; }
            a.btn { display: inline-block; background: #ec4899; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; transition: background 0.2s; }
            a.btn:hover { background: #db2777; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h1>You're Successfully Unsubscribed</h1>
            <p>You have been safely removed from marketing emails, promotional discounts, and replenishment reminders.</p>
            <div class="badge">${customer.email}</div>
            <div>
              <a href="/" class="btn">Return to Storefront</a>
            </div>
          </div>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error processing unsubscribe GET:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
